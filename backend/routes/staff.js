const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateStaff } = require('../middleware/auth');
const sms = require('../services/sms');
const { invalidateAll, invalidateCounters } = require('../config/redis');

// ── Delay timers ──────────────────────────────────────────────────────────────
// Keyed by staffId; each entry sends recurring SMS every 10 min while delayed.
const delayTimers = new Map();

function clearDelayTimer(staffId) {
  if (delayTimers.has(staffId)) {
    clearInterval(delayTimers.get(staffId));
    delayTimers.delete(staffId);
  }
}

async function sendDelayUpdates(staffId, delayMinutes, reason) {
  try {
    const result = await pool.query(
      `SELECT
         qt.phone,
         qt.queue_number,
         qt.estimated_wait,
         EXTRACT(EPOCH FROM (NOW() - qt.checkin_time)) / 60 AS minutes_waited
       FROM QueueTickets qt
       JOIN Services s  ON qt.service_id = s.service_id
       JOIN Staff    st ON s.service_key = ANY(st.service_types)
       WHERE st.staff_id = $1
         AND qt.status   = 'waiting'
         AND qt.phone    IS NOT NULL`,
      [staffId]
    );

    if (result.rows.length === 0) {
      clearDelayTimer(staffId);
      return;
    }

    result.rows.forEach((ticket) => {
      const minutesWaited  = Math.floor(parseFloat(ticket.minutes_waited));
      const remainingWait  = Math.max(0, ticket.estimated_wait - minutesWaited);
      const updatedWait    = remainingWait + delayMinutes;

      sms.sendDelayNotification({
        phone:        ticket.phone,
        queueNumber:  ticket.queue_number,
        delayMinutes,
        reason:       reason || 'unexpected delay',
        updatedWait,
      }).catch(console.error);
    });
  } catch (err) {
    console.error('Delay update SMS error:', err);
  }
}

// ── Called timers ─────────────────────────────────────────────────────────────
// Keyed by ticketId (number); 120-second countdown after staff calls a customer.
// Auto-triggers no-show logic if customer doesn't arrive.
const calledTimers = new Map();
const CALLED_TIMEOUT_MS = 120 * 1000;

function clearCalledTimer(ticketId) {
  if (calledTimers.has(ticketId)) {
    clearTimeout(calledTimers.get(ticketId).timeoutId);
    calledTimers.delete(ticketId);
  }
}

// Core no-show handler — called by both the auto-timer and the manual endpoint.
async function triggerNoShow(ticketId, io) {
  try {
    calledTimers.delete(ticketId);

    const ticketResult = await pool.query(
      `SELECT ticket_id, phone, queue_number, no_show_count, service_id
       FROM QueueTickets
       WHERE ticket_id = $1 AND status = 'called'`,
      [ticketId]
    );

    if (ticketResult.rows.length === 0) return; // Already resolved (arrived or cancelled)

    const ticket = ticketResult.rows[0];

    if (ticket.no_show_count >= 1) {
      // Second miss — cancel the ticket
      await pool.query(
        `UPDATE QueueTickets
         SET status = 'cancelled', cancelled_at = NOW()
         WHERE ticket_id = $1`,
        [ticketId]
      );
      sms.sendFinalCancellation({
        phone: ticket.phone,
        queueNumber: ticket.queue_number,
      }).catch(console.error);
      if (io) io.emit('queue:update', { type: 'ticket_cancelled', ticketId });
    } else {
      // First miss — recycle 3 spots back and increment strike.
      // The new checkin_time is computed entirely in SQL to avoid JS timezone issues.
      // We find the 3rd ticket's checkin_time and set ours 1 second later (more recent
      // = lower effective_wait = behind them in the DESC sort). Falls back to NOW()
      // when fewer than 3 tickets are waiting.
      await pool.query(
        `UPDATE QueueTickets
         SET status           = 'waiting',
             checkin_time     = (
               SELECT COALESCE(
                 (SELECT checkin_time + INTERVAL '1 second'
                  FROM QueueTickets
                  WHERE service_id = $2 AND status = 'waiting'
                  ORDER BY (
                    EXTRACT(EPOCH FROM (NOW() - checkin_time)) +
                    CASE priority_level
                      WHEN 'emergency' THEN 7200
                      WHEN 'disabled'  THEN 3600
                      WHEN 'senior'    THEN 1800
                      ELSE 0
                    END
                  ) DESC
                  LIMIT 1 OFFSET 2),
                 NOW()
               )
             ),
             counter_assigned = NULL,
             called_at        = NULL,
             no_show_count    = no_show_count + 1,
             no_show_at       = NOW()
         WHERE ticket_id = $1`,
        [ticketId, ticket.service_id]
      );
      sms.sendNoShowRecovery({
        phone: ticket.phone,
        queueNumber: ticket.queue_number,
      }).catch(console.error);
      if (io) io.emit('queue:update', { type: 'ticket_recycled', ticketId });
    }

    if (io) io.emit('no_show:triggered', { ticketId });
    await invalidateAll();
  } catch (err) {
    console.error(`[No-show timer] Error for ticket ${ticketId}:`, err);
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function mapTicket(t) {
  const nameParts = [t.first_name, t.last_name].filter(Boolean);
  return {
    id: t.ticket_id.toString(),
    trn: t.trn,
    name: nameParts.length > 0 ? nameParts.join(' ') : null,
    serviceType: t.service_key,
    priorityLevel: t.priority_level,
    queueNumber: t.queue_number,
    estimatedWait: t.estimated_wait,
    position: t.position,
    status: t.status,
    createdAt: t.checkin_time,
    calledAt: t.called_at || null,
    noShowCount: t.no_show_count || 0,
    phone: t.phone,
    hasDisability: t.has_disability,
    counterAssigned: t.counter_assigned || null,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/staff/queue  — tickets waiting for this staff's service types
router.get('/queue', authenticateStaff, async (req, res) => {
  const { serviceTypes } = req.staff;

  try {
    if (!serviceTypes || serviceTypes.length === 0) {
      return res.json({ tickets: [] });
    }

    const servicesResult = await pool.query(
      'SELECT service_id, service_key FROM Services WHERE service_key = ANY($1)',
      [serviceTypes]
    );

    const serviceIds = servicesResult.rows.map((s) => s.service_id);
    if (serviceIds.length === 0) return res.json({ tickets: [] });

    const result = await pool.query(
      `SELECT qt.*, s.service_key, c.first_name, c.last_name
       FROM QueueTickets qt
       JOIN Services s ON qt.service_id = s.service_id
       LEFT JOIN Customers c ON qt.TRN = c.TRN
       WHERE qt.service_id = ANY($1) AND qt.status = 'waiting'
       ORDER BY (
         EXTRACT(EPOCH FROM (NOW() - qt.checkin_time)) +
         CASE qt.priority_level
           WHEN 'emergency' THEN 7200
           WHEN 'disabled'  THEN 3600
           WHEN 'senior'    THEN 1800
           ELSE 0
         END
       ) DESC`,
      [serviceIds]
    );

    res.json({ tickets: result.rows.map(mapTicket) });
  } catch (err) {
    console.error('Staff queue error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/staff/current-ticket
// Returns the active ticket for this staff member: 'called' (on-deck) takes
// priority over 'serving' so the frontend can show the correct panel.
router.get('/current-ticket', authenticateStaff, async (req, res) => {
  const { id: staffId, counterId } = req.staff;

  try {
    // On-deck: called but not yet arrived — keyed by counter assignment
    if (counterId) {
      const calledResult = await pool.query(
        `SELECT qt.*, s.service_key, c.first_name, c.last_name
         FROM QueueTickets qt
         JOIN Services s ON qt.service_id = s.service_id
         LEFT JOIN Customers c ON qt.TRN = c.TRN
         WHERE qt.status = 'called' AND qt.counter_assigned = $1
         LIMIT 1`,
        [counterId]
      );
      if (calledResult.rows.length > 0) {
        return res.json({ ticket: mapTicket(calledResult.rows[0]) });
      }
    }

    // Actively serving
    const result = await pool.query(
      `SELECT qt.*, s.service_key, c.first_name, c.last_name
       FROM QueueTickets qt
       JOIN Services s ON qt.service_id = s.service_id
       JOIN ServiceSessions ss ON ss.ticket_id = qt.ticket_id
       LEFT JOIN Customers c ON qt.TRN = c.TRN
       WHERE ss.staff_id = $1 AND qt.status = 'serving' AND ss.end_time IS NULL
       LIMIT 1`,
      [staffId]
    );

    if (result.rows.length === 0) return res.json({ ticket: null });
    res.json({ ticket: mapTicket(result.rows[0]) });
  } catch (err) {
    console.error('Current ticket error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/staff/status  — update counter status
router.post('/status', authenticateStaff, async (req, res) => {
  const { id: staffId } = req.staff;
  const { status, reason, minutes } = req.body;

  if (!status) return res.status(400).json({ error: 'Status is required.' });

  try {
    const delayStartedAt = status === 'delayed' ? new Date() : null;
    await pool.query(
      `UPDATE Staff SET
         status = $1,
         delay_reason = $2,
         delay_minutes = $3,
         delay_started_at = $4
       WHERE staff_id = $5`,
      [status, reason || null, minutes || null, delayStartedAt, staffId]
    );

    const io = req.app.get('io');
    if (io) io.emit('counter:status', { staffId, status, reason, minutes });

    invalidateCounters().catch(console.error);

    clearDelayTimer(staffId);
    if (status === 'delayed' && minutes) {
      sendDelayUpdates(staffId, minutes, reason);
      const timer = setInterval(() => sendDelayUpdates(staffId, minutes, reason), 10 * 60 * 1000);
      delayTimers.set(staffId, timer);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Staff status error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/staff/call-next
// Pulls the top-priority waiting ticket, moves it to 'called', and starts the
// 120-second on-deck countdown. The ticket only becomes 'serving' once the
// staff confirms the customer arrived via /customer-arrived.
router.post('/call-next', authenticateStaff, async (req, res) => {
  const { id: staffId, counterId, serviceTypes } = req.staff;

  try {
    if (!serviceTypes || serviceTypes.length === 0) {
      return res.json({ ticket: null, message: 'No service types assigned.' });
    }

    const servicesResult = await pool.query(
      'SELECT service_id FROM Services WHERE service_key = ANY($1)',
      [serviceTypes]
    );
    const serviceIds = servicesResult.rows.map((s) => s.service_id);

    const client = await pool.connect();
    let ticketId;
    try {
      await client.query('BEGIN');

      const nextResult = await client.query(
        `SELECT qt.ticket_id FROM QueueTickets qt
         WHERE qt.service_id = ANY($1) AND qt.status = 'waiting'
         ORDER BY (
           EXTRACT(EPOCH FROM (NOW() - qt.checkin_time)) +
           CASE qt.priority_level
             WHEN 'emergency' THEN 7200
             WHEN 'disabled'  THEN 3600
             WHEN 'senior'    THEN 1800
             ELSE 0
           END
         ) DESC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`,
        [serviceIds]
      );

      if (nextResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.json({ ticket: null, message: 'No tickets in queue.' });
      }

      ticketId = nextResult.rows[0].ticket_id;

      // Transition to 'called' — service session created only after customer arrives
      await client.query(
        `UPDATE QueueTickets
         SET status = 'called', counter_assigned = $1, called_at = NOW()
         WHERE ticket_id = $2`,
        [counterId, ticketId]
      );

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    const ticketResult = await pool.query(
      `SELECT qt.*, s.service_key, c.first_name, c.last_name
       FROM QueueTickets qt
       JOIN Services s ON qt.service_id = s.service_id
       LEFT JOIN Customers c ON qt.TRN = c.TRN
       WHERE qt.ticket_id = $1`,
      [ticketId]
    );

    const ticket = ticketResult.rows[0];
    const mapped = mapTicket(ticket);

    await invalidateAll();

    const io = req.app.get('io');
    if (io) {
      io.emit('ticket:called', { ticketId, counterId, queueNumber: ticket.queue_number });
      io.emit('queue:update', { type: 'ticket_called', ticketId });
    }

    // Start 120-second no-show countdown
    const timeoutId = setTimeout(() => triggerNoShow(ticketId, io), CALLED_TIMEOUT_MS);
    calledTimers.set(ticketId, { timeoutId });

    sms.sendTicketCalled({
      phone:       ticket.phone,
      queueNumber: ticket.queue_number,
      counterId,
    }).catch(console.error);

    res.json({ ticket: mapped });
  } catch (err) {
    console.error('Call next error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/staff/customer-arrived
// Staff confirms the on-deck customer showed up. Clears the countdown timer and
// transitions the ticket from 'called' → 'serving', opening the service session.
router.post('/customer-arrived', authenticateStaff, async (req, res) => {
  const { id: staffId } = req.staff;
  const { ticketId } = req.body;

  if (!ticketId) return res.status(400).json({ error: 'ticketId is required.' });

  const tid = parseInt(ticketId, 10);
  clearCalledTimer(tid);

  try {
    const updateResult = await pool.query(
      `UPDATE QueueTickets
       SET status = 'serving'
       WHERE ticket_id = $1 AND status = 'called'
       RETURNING *`,
      [tid]
    );

    if (updateResult.rows.length === 0) {
      return res.status(409).json({ error: 'Ticket is no longer in called state.' });
    }

    await pool.query(
      'INSERT INTO ServiceSessions (ticket_id, staff_id) VALUES ($1, $2)',
      [tid, staffId]
    );

    await invalidateAll();

    const io = req.app.get('io');
    if (io) io.emit('queue:update', { type: 'ticket_arrived', ticketId: tid });

    const ticketResult = await pool.query(
      `SELECT qt.*, s.service_key, c.first_name, c.last_name
       FROM QueueTickets qt
       JOIN Services s ON qt.service_id = s.service_id
       LEFT JOIN Customers c ON qt.TRN = c.TRN
       WHERE qt.ticket_id = $1`,
      [tid]
    );

    res.json({ ticket: mapTicket(ticketResult.rows[0]) });
  } catch (err) {
    console.error('Customer arrived error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/staff/no-show
// Staff manually marks the on-deck customer as a no-show before the timer fires.
// Delegates to the same triggerNoShow logic used by the auto-timer.
router.post('/no-show', authenticateStaff, async (req, res) => {
  const { ticketId } = req.body;
  if (!ticketId) return res.status(400).json({ error: 'ticketId is required.' });

  const tid = parseInt(ticketId, 10);
  clearCalledTimer(tid);

  try {
    const io = req.app.get('io');
    await triggerNoShow(tid, io);
    res.json({ success: true });
  } catch (err) {
    console.error('No-show error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/staff/complete  — mark current ticket as completed
router.post('/complete', authenticateStaff, async (req, res) => {
  const { id: staffId } = req.staff;
  const { ticketId } = req.body;

  if (!ticketId) return res.status(400).json({ error: 'ticketId is required.' });

  try {
    await pool.query(
      "UPDATE QueueTickets SET status = 'completed', completed_at = NOW() WHERE ticket_id = $1",
      [ticketId]
    );

    await pool.query(
      `UPDATE ServiceSessions SET end_time = NOW()
       WHERE ticket_id = $1 AND staff_id = $2 AND end_time IS NULL`,
      [ticketId, staffId]
    );

    await invalidateAll();

    const io = req.app.get('io');
    if (io) io.emit('queue:update', { type: 'ticket_completed', ticketId });

    res.json({ success: true });
  } catch (err) {
    console.error('Complete service error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── Startup restoration ───────────────────────────────────────────────────────

// Re-arms delay SMS timers for any staff still marked delayed after a restart.
async function restoreDelayTimers() {
  try {
    const result = await pool.query(
      `SELECT staff_id, delay_minutes, delay_reason
       FROM Staff
       WHERE status = 'delayed' AND delay_minutes IS NOT NULL`
    );

    if (result.rows.length === 0) return;

    console.log(`[Delay timers] Restoring ${result.rows.length} timer(s) after restart`);
    result.rows.forEach(({ staff_id, delay_minutes, delay_reason }) => {
      clearDelayTimer(staff_id);
      sendDelayUpdates(staff_id, delay_minutes, delay_reason);
      const timer = setInterval(
        () => sendDelayUpdates(staff_id, delay_minutes, delay_reason),
        10 * 60 * 1000
      );
      delayTimers.set(staff_id, timer);
      console.log(`[Delay timers] Restored timer for staff_id ${staff_id}`);
    });
  } catch (err) {
    console.error('[Delay timers] Failed to restore timers on startup:', err);
  }
}

// Re-arms on-deck countdown timers for any tickets still in 'called' state after
// a restart. Uses called_at to calculate remaining hold time; fires immediately
// for tickets whose 2-minute window already elapsed.
async function restoreCalledTimers(io) {
  try {
    const result = await pool.query(
      `SELECT ticket_id, called_at
       FROM QueueTickets
       WHERE status = 'called' AND called_at IS NOT NULL`
    );

    if (result.rows.length === 0) return;

    console.log(`[Called timers] Restoring ${result.rows.length} timer(s) after restart`);
    result.rows.forEach(({ ticket_id, called_at }) => {
      const elapsed   = Date.now() - new Date(called_at).getTime();
      const remaining = CALLED_TIMEOUT_MS - elapsed;

      if (remaining <= 0) {
        // Window already expired — trigger no-show right now
        triggerNoShow(ticket_id, io);
      } else {
        const timeoutId = setTimeout(() => triggerNoShow(ticket_id, io), remaining);
        calledTimers.set(ticket_id, { timeoutId });
        console.log(`[Called timers] Restored timer for ticket ${ticket_id}, fires in ${Math.round(remaining / 1000)}s`);
      }
    });
  } catch (err) {
    console.error('[Called timers] Failed to restore timers on startup:', err);
  }
}

module.exports = { router, restoreDelayTimers, restoreCalledTimers };

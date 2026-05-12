const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateStaff } = require('../middleware/auth');
const sms = require('../services/sms');
const { invalidateAll, invalidateCounters } = require('../config/redis');

// In-memory delay timers — keyed by staffId
// Each entry sends recurring SMS updates every 10 min until delay clears or customer served
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
      // No one left waiting — stop sending updates
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
    phone: t.phone,
    hasDisability: t.has_disability,
    counterAssigned: t.counter_assigned || null,
  };
}

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

// GET /api/staff/current-ticket  — ticket currently being served by this staff member
router.get('/current-ticket', authenticateStaff, async (req, res) => {
  const { id: staffId } = req.staff;

  try {
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

    // Manage recurring delay SMS timer
    clearDelayTimer(staffId);
    if (status === 'delayed' && minutes) {
      // Send immediately, then repeat every 10 minutes until delay clears or customer is served
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

// POST /api/staff/call-next  — pull the next ticket from the queue
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

    // Wrap in a transaction with SELECT FOR UPDATE SKIP LOCKED so two counters
    // calling simultaneously each get a different ticket — no double-assignment.
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

      // Mark as serving and assign counter
      await client.query(
        `UPDATE QueueTickets
         SET status = 'serving', counter_assigned = $1, called_at = NOW()
         WHERE ticket_id = $2`,
        [counterId, ticketId]
      );

      // Open a service session
      await client.query(
        'INSERT INTO ServiceSessions (ticket_id, staff_id) VALUES ($1, $2)',
        [ticketId, staffId]
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

    // Notify customer via SMS (non-blocking)
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

// Called once on server startup — rebuilds in-memory timers for any staff
// still marked as delayed in the DB (survives nodemon restarts / crashes).
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

module.exports = { router, restoreDelayTimers };

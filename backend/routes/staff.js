const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateStaff } = require('../middleware/auth');
const sms = require('../services/sms');
const { invalidateAll, invalidateCounters } = require('../config/redis');

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
    await pool.query(
      `UPDATE Staff SET
         status = $1,
         delay_reason = $2,
         delay_minutes = $3,
         delay_started_at = CASE WHEN $1 = 'delayed' THEN NOW() ELSE NULL END
       WHERE staff_id = $4`,
      [status, reason || null, minutes || null, staffId]
    );

    const io = req.app.get('io');
    if (io) io.emit('counter:status', { staffId, status, reason, minutes });

    invalidateCounters().catch(console.error);
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

    const nextResult = await pool.query(
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
       LIMIT 1`,
      [serviceIds]
    );

    if (nextResult.rows.length === 0) {
      return res.json({ ticket: null, message: 'No tickets in queue.' });
    }

    const ticketId = nextResult.rows[0].ticket_id;

    // Mark as serving and assign counter
    await pool.query(
      `UPDATE QueueTickets
       SET status = 'serving', counter_assigned = $1, called_at = NOW()
       WHERE ticket_id = $2`,
      [counterId, ticketId]
    );

    // Open a service session
    await pool.query(
      'INSERT INTO ServiceSessions (ticket_id, staff_id) VALUES ($1, $2)',
      [ticketId, staffId]
    );

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

    const io = req.app.get('io');
    if (io) {
      io.emit('ticket:called', { ticketId, counterId, queueNumber: ticket.queue_number });
      io.emit('queue:update', { type: 'ticket_called', ticketId });
    }

    invalidateAll().catch(console.error);

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

    const io = req.app.get('io');
    if (io) io.emit('queue:update', { type: 'ticket_completed', ticketId });

    invalidateAll().catch(console.error);
    res.json({ success: true });
  } catch (err) {
    console.error('Complete service error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

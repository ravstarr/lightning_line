const express = require('express');
const router = express.Router();
const pool = require('../config/database');

function priorityPrefix(priorityLevel) {
  switch (priorityLevel) {
    case 'senior':    return 'S';
    case 'disabled':  return 'D';
    case 'emergency': return 'E';
    default:          return 'A';
  }
}

// POST /api/tickets  — create a new queue ticket
router.post('/', async (req, res) => {
  const { trn, serviceType, priorityLevel, estimatedWait, phone, hasDisability } = req.body;

  if (!serviceType) {
    return res.status(400).json({ error: 'serviceType is required.' });
  }

  try {
    const serviceResult = await pool.query(
      'SELECT service_id, estimated_duration FROM Services WHERE service_key = $1',
      [serviceType]
    );

    if (serviceResult.rows.length === 0) {
      return res.status(400).json({ error: `Unknown service type: ${serviceType}` });
    }

    const service = serviceResult.rows[0];
    const level = priorityLevel || 'regular';
    const prefix = priorityPrefix(level);

    // Daily sequence number for this priority prefix
    const seqResult = await pool.query(
      `SELECT COUNT(*) FROM QueueTickets
       WHERE DATE(checkin_time) = CURRENT_DATE
         AND queue_number LIKE $1`,
      [`${prefix}-%`]
    );
    const seq = parseInt(seqResult.rows[0].count) + 1;
    const queueNumber = `${prefix}-${String(seq).padStart(3, '0')}`;

    // Position in full waiting queue
    const posResult = await pool.query(
      "SELECT COUNT(*) FROM QueueTickets WHERE status = 'waiting'"
    );
    const position = parseInt(posResult.rows[0].count) + 1;

    const wait = estimatedWait || service.estimated_duration;

    const insertResult = await pool.query(
      `INSERT INTO QueueTickets
         (TRN, service_id, status, priority_level, queue_number, estimated_wait, position, phone, has_disability)
       VALUES ($1, $2, 'waiting', $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [trn || null, service.service_id, level, queueNumber, wait, position, phone || null, hasDisability || false]
    );

    const ticket = insertResult.rows[0];

    const io = req.app.get('io');
    if (io) io.emit('queue:update', { type: 'new_ticket', ticketId: ticket.ticket_id });

    res.status(201).json({
      ticket: {
        id: ticket.ticket_id.toString(),
        trn: ticket.trn,
        serviceType,
        priorityLevel: ticket.priority_level,
        queueNumber: ticket.queue_number,
        estimatedWait: ticket.estimated_wait,
        position: ticket.position,
        status: ticket.status,
        createdAt: ticket.checkin_time,
        qrCode: `TICKET:${ticket.ticket_id}:${ticket.queue_number}`,
        phone: ticket.phone,
        hasDisability: ticket.has_disability,
        counterAssigned: ticket.counter_assigned || null,
      },
    });
  } catch (err) {
    console.error('Create ticket error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/tickets/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT qt.*, s.service_key
       FROM QueueTickets qt
       JOIN Services s ON qt.service_id = s.service_id
       WHERE qt.ticket_id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const t = result.rows[0];
    res.json({
      ticket: {
        id: t.ticket_id.toString(),
        trn: t.trn,
        serviceType: t.service_key,
        priorityLevel: t.priority_level,
        queueNumber: t.queue_number,
        estimatedWait: t.estimated_wait,
        position: t.position,
        status: t.status,
        createdAt: t.checkin_time,
        qrCode: `TICKET:${t.ticket_id}:${t.queue_number}`,
        phone: t.phone,
        hasDisability: t.has_disability,
        counterAssigned: t.counter_assigned || null,
      },
    });
  } catch (err) {
    console.error('Get ticket error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/tickets/position/:id
router.get('/position/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT qt.*, s.service_key FROM QueueTickets qt
       JOIN Services s ON qt.service_id = s.service_id
       WHERE qt.ticket_id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const ticket = result.rows[0];

    const aheadResult = await pool.query(
      `SELECT COUNT(*) FROM QueueTickets
       WHERE status = 'waiting'
         AND service_id = $1
         AND checkin_time < $2`,
      [ticket.service_id, ticket.checkin_time]
    );

    const position = parseInt(aheadResult.rows[0].count) + 1;
    res.json({ position, estimatedWait: position * ticket.estimated_wait });
  } catch (err) {
    console.error('Ticket position error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

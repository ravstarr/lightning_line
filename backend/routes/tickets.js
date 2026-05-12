const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const http = require('http');
const sms = require('../services/sms');
const { invalidateStatsAndTickets } = require('../config/redis');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function getMLPrediction(serviceType, priorityLevel, queueLength, activeCounters, avgHandleTime) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      service_type:    serviceType,
      priority_level:  priorityLevel,
      queue_length:    queueLength,
      active_counters: activeCounters,
      avg_handle_time: avgHandleTime,
    });

    const url = new URL(`${ML_SERVICE_URL}/predict`);
    const options = {
      hostname: url.hostname,
      port:     url.port || 8000,
      path:     '/predict',
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(Math.round(parsed.estimated_wait_minutes));
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));  // fall back to static estimate on failure
    req.setTimeout(3000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

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
  const { trn, name, serviceType, priorityLevel, estimatedWait, phone, hasDisability } = req.body;

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
    // Ensure customer record exists before inserting ticket (FK requirement)
    if (trn) {
      const parts = name ? name.trim().split(/\s+/) : [];
      const lastName  = parts.length > 1 ? parts.pop() : null;
      const firstName = parts.length > 0 ? parts.join(' ') : (name ? name.trim() : null);
      await pool.query(
        `INSERT INTO Customers (TRN, first_name, last_name, phone)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (TRN) DO UPDATE SET
           first_name = COALESCE(EXCLUDED.first_name, Customers.first_name),
           last_name  = COALESCE(EXCLUDED.last_name,  Customers.last_name),
           phone      = COALESCE(EXCLUDED.phone,      Customers.phone)`,
        [trn, firstName, lastName, phone || null]
      );
    }

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

    // Get active counter count for ML prediction
    const counterResult = await pool.query(
      "SELECT COUNT(*) FROM Staff WHERE status = 'active'"
    );
    const activeCounters = Math.max(1, parseInt(counterResult.rows[0].count));

    // Rolling 7-day average handle time for active staff on this service type
    const handleResult = await pool.query(
      `SELECT COALESCE(
         AVG(EXTRACT(EPOCH FROM (ss.end_time - ss.start_time)) / 60),
         15.0
       ) AS avg_handle_time
       FROM ServiceSessions ss
       JOIN Staff st  ON ss.staff_id   = st.staff_id
       JOIN QueueTickets qt ON ss.ticket_id = qt.ticket_id
       JOIN Services sv ON qt.service_id = sv.service_id
       WHERE st.status = 'active'
         AND ss.end_time IS NOT NULL
         AND ss.start_time >= NOW() - INTERVAL '7 days'
         AND sv.service_key = $1`,
      [serviceType]
    );
    const avgHandleTime = parseFloat(handleResult.rows[0].avg_handle_time) || 15.0;

    // Ask ML service for a prediction; fall back to static duration if unavailable
    const mlWait = await getMLPrediction(serviceType, level, position - 1, activeCounters, avgHandleTime);
    const wait = mlWait || estimatedWait || service.estimated_duration;

    const insertResult = await pool.query(
      `INSERT INTO QueueTickets
         (TRN, service_id, status, priority_level, queue_number, estimated_wait, position, phone, has_disability)
       VALUES ($1, $2, 'waiting', $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [trn || null, service.service_id, level, queueNumber, wait, position, phone || null, hasDisability || false]
    );

    const ticket = insertResult.rows[0];

    await invalidateStatsAndTickets();

    const io = req.app.get('io');
    if (io) io.emit('queue:update', { type: 'new_ticket', ticketId: ticket.ticket_id });

    // Send confirmation SMS (non-blocking)
    sms.sendTicketConfirmation({
      phone:         ticket.phone,
      queueNumber:   ticket.queue_number,
      serviceType,
      estimatedWait: ticket.estimated_wait,
      priorityLevel: ticket.priority_level,
    }).catch(console.error);

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
        qrCode: ticket.queue_number,
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
        qrCode: t.queue_number,
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

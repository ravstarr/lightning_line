const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateAdmin } = require('../middleware/auth');
const { KEYS, cacheGet, cacheSet, invalidateCounters } = require('../config/redis');

// GET /api/admin/stats
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const cached = await cacheGet(KEYS.ADMIN_STATS);
    if (cached) return res.json(cached);

    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'waiting')               AS waiting,
        COUNT(*) FILTER (WHERE status IN ('called', 'serving'))   AS serving,
        COUNT(*) FILTER (WHERE status = 'completed')              AS completed,
        COUNT(*) FILTER (WHERE status = 'waiting' AND priority_level != 'regular') AS priority
      FROM QueueTickets
      WHERE DATE(checkin_time) = CURRENT_DATE
    `);

    const s = result.rows[0];
    const payload = {
      waiting:   parseInt(s.waiting),
      serving:   parseInt(s.serving),
      completed: parseInt(s.completed),
      priority:  parseInt(s.priority),
    };

    await cacheSet(KEYS.ADMIN_STATS, payload, 5);
    res.json(payload);
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/admin/counters
router.get('/counters', authenticateAdmin, async (req, res) => {
  try {
    const cached = await cacheGet(KEYS.ADMIN_COUNTERS);
    if (cached) return res.json(cached);

    const result = await pool.query(`
      SELECT
        s.staff_id, s.first_name, s.last_name, s.counter_id, s.role,
        s.status, s.service_types, s.delay_reason, s.delay_minutes, s.delay_started_at,
        qt.queue_number  AS current_ticket,
        qt.ticket_id     AS current_ticket_id
      FROM Staff s
      LEFT JOIN QueueTickets qt
        ON qt.counter_assigned = s.counter_id
        AND qt.status IN ('called', 'serving')
      ORDER BY s.counter_id
    `);

    const counters = result.rows.map((row) => ({
      id:              row.counter_id,
      staffId:         row.staff_id,
      staffName:       `${row.first_name} ${row.last_name}`,
      role:            row.role,
      status:          row.status,
      serviceTypes:    row.service_types || [],
      currentTicket:   row.current_ticket || null,
      currentTicketId: row.current_ticket_id ? row.current_ticket_id.toString() : null,
      delay: row.delay_reason
        ? {
            reason:           row.delay_reason,
            estimatedMinutes: row.delay_minutes,
            startedAt:        row.delay_started_at,
          }
        : null,
    }));

    const payload = { counters };
    await cacheSet(KEYS.ADMIN_COUNTERS, payload, 5);
    res.json(payload);
  } catch (err) {
    console.error('Admin counters error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/admin/tickets?serviceType=payments&status=waiting
router.get('/tickets', authenticateAdmin, async (req, res) => {
  const { serviceType, status } = req.query;
  const noFilters = !serviceType && !status;

  try {
    if (noFilters) {
      const cached = await cacheGet(KEYS.ADMIN_TICKETS);
      if (cached) return res.json(cached);
    }

    let query = `
      SELECT qt.*, s.service_key, s.service_name
      FROM QueueTickets qt
      JOIN Services s ON qt.service_id = s.service_id
      WHERE DATE(qt.checkin_time) = CURRENT_DATE
    `;
    const params = [];

    if (serviceType) {
      params.push(serviceType);
      query += ` AND s.service_key = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND qt.status = $${params.length}`;
    }

    query += ' ORDER BY qt.checkin_time DESC';

    const result = await pool.query(query, params);

    const tickets = result.rows.map((t) => ({
      id:              t.ticket_id.toString(),
      trn:             t.trn,
      serviceType:     t.service_key,
      priorityLevel:   t.priority_level,
      queueNumber:     t.queue_number,
      estimatedWait:   t.estimated_wait,
      position:        t.position,
      status:          t.status,
      createdAt:       t.checkin_time,
      phone:           t.phone,
      hasDisability:   t.has_disability,
      counterAssigned: t.counter_assigned || null,
    }));

    const payload = { tickets };
    if (noFilters) await cacheSet(KEYS.ADMIN_TICKETS, payload, 5);
    res.json(payload);
  } catch (err) {
    console.error('Admin tickets error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/admin/counters/:id/status
router.post('/counters/:id/status', authenticateAdmin, async (req, res) => {
  const { status } = req.body;
  const counterId = parseInt(req.params.id);

  if (!status) return res.status(400).json({ error: 'Status is required.' });

  try {
    await pool.query(
      'UPDATE Staff SET status = $1 WHERE counter_id = $2',
      [status, counterId]
    );

    const io = req.app.get('io');
    if (io) io.emit('counter:status', { counterId, status });

    invalidateCounters().catch(console.error);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin counter status error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

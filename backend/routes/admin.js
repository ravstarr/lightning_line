const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { authenticateAdmin } = require('../middleware/auth');
const { KEYS, cacheGet, cacheSet, invalidateCounters, invalidateAll } = require('../config/redis');

const ALL_SERVICES = ['payments', 'documents', 'inquiries', 'registration', 'other'];

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

// POST /api/admin/staff — create a new staff member and assign them a counter
router.post('/staff', authenticateAdmin, async (req, res) => {
  const { firstName, lastName, username, password, counterId, serviceTypes, role } = req.body;

  if (!firstName || !lastName || !username || !password || !counterId) {
    return res.status(400).json({ error: 'firstName, lastName, username, password, and counterId are required.' });
  }

  const services = (serviceTypes || []).filter((s) => ALL_SERVICES.includes(s));

  try {
    const existing = await pool.query('SELECT staff_id FROM Staff WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken.' });
    }

    const counterTaken = await pool.query('SELECT staff_id FROM Staff WHERE counter_id = $1', [counterId]);
    if (counterTaken.rows.length > 0) {
      return res.status(409).json({ error: `Counter ${counterId} is already assigned to another staff member.` });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO Staff (first_name, last_name, username, password_hash, counter_id, service_types, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       RETURNING staff_id, first_name, last_name, username, counter_id, service_types, role, status`,
      [firstName, lastName, username, hash, counterId, services, role || 'clerk']
    );

    await invalidateAll();
    res.status(201).json({ staff: result.rows[0] });
  } catch (err) {
    console.error('Create staff error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/admin/staff/:staffId/services — update which services a counter handles
router.put('/staff/:staffId/services', authenticateAdmin, async (req, res) => {
  const staffId = parseInt(req.params.staffId, 10);
  const { serviceTypes } = req.body;

  if (!Array.isArray(serviceTypes)) {
    return res.status(400).json({ error: 'serviceTypes must be an array.' });
  }

  const services = serviceTypes.filter((s) => ALL_SERVICES.includes(s));

  try {
    const result = await pool.query(
      'UPDATE Staff SET service_types = $1 WHERE staff_id = $2 RETURNING staff_id',
      [services, staffId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    await invalidateCounters();
    res.json({ success: true, serviceTypes: services });
  } catch (err) {
    console.error('Update services error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/admin/staff/:staffId — remove a staff member
router.delete('/staff/:staffId', authenticateAdmin, async (req, res) => {
  const staffId = parseInt(req.params.staffId, 10);

  try {
    // Don't delete if they currently have an active ticket
    const active = await pool.query(
      `SELECT qt.ticket_id FROM QueueTickets qt
       JOIN ServiceSessions ss ON ss.ticket_id = qt.ticket_id
       WHERE ss.staff_id = $1 AND qt.status IN ('called', 'serving') AND ss.end_time IS NULL`,
      [staffId]
    );
    if (active.rows.length > 0) {
      return res.status(409).json({ error: 'Cannot remove staff while they have an active ticket.' });
    }

    const result = await pool.query(
      'DELETE FROM Staff WHERE staff_id = $1 RETURNING staff_id',
      [staffId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    await invalidateAll();
    res.json({ success: true });
  } catch (err) {
    console.error('Delete staff error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/admin/analytics — metrics for the analytics dashboard tab
router.get('/analytics', authenticateAdmin, async (req, res) => {
  try {
    // Average wait time and handle time per service type (today)
    const serviceMetrics = await pool.query(`
      SELECT
        s.service_key,
        COUNT(*)                                                        AS total,
        ROUND(AVG(EXTRACT(EPOCH FROM (qt.called_at - qt.checkin_time)) / 60))
                                                                        AS avg_wait_mins,
        ROUND(AVG(EXTRACT(EPOCH FROM (ss.end_time - ss.start_time)) / 60))
                                                                        AS avg_handle_mins
      FROM QueueTickets qt
      JOIN Services s ON qt.service_id = s.service_id
      LEFT JOIN ServiceSessions ss ON ss.ticket_id = qt.ticket_id AND ss.end_time IS NOT NULL
      WHERE DATE(qt.checkin_time) = CURRENT_DATE
        AND qt.status = 'completed'
      GROUP BY s.service_key
      ORDER BY total DESC
    `);

    // Tickets completed per hour (throughput — today only)
    const throughput = await pool.query(`
      SELECT
        EXTRACT(HOUR FROM completed_at)::int AS hour,
        COUNT(*)                             AS count
      FROM QueueTickets
      WHERE DATE(checkin_time) = CURRENT_DATE
        AND status = 'completed'
        AND completed_at IS NOT NULL
      GROUP BY hour
      ORDER BY hour
    `);

    // Per-counter performance (today)
    const counterPerf = await pool.query(`
      SELECT
        st.first_name || ' ' || st.last_name  AS staff_name,
        st.counter_id,
        COUNT(ss.session_id)                   AS tickets_served,
        ROUND(AVG(EXTRACT(EPOCH FROM (ss.end_time - ss.start_time)) / 60))
                                               AS avg_handle_mins
      FROM Staff st
      JOIN ServiceSessions ss ON ss.staff_id = st.staff_id
      WHERE DATE(ss.start_time) = CURRENT_DATE
        AND ss.end_time IS NOT NULL
      GROUP BY st.staff_id, st.first_name, st.last_name, st.counter_id
      ORDER BY tickets_served DESC
    `);

    // No-show rate today
    const noShowStats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE no_show_count > 0)  AS had_no_show,
        COUNT(*)                                    AS total
      FROM QueueTickets
      WHERE DATE(checkin_time) = CURRENT_DATE
    `);

    // Fill in missing hours with 0 for the chart (0-23)
    const throughputMap = new Map(
      throughput.rows.map((r) => [parseInt(r.hour), parseInt(r.count)])
    );
    const throughputFull = Array.from({ length: 24 }, (_, h) => ({
      hour: `${h}:00`,
      tickets: throughputMap.get(h) || 0,
    }));

    const ns = noShowStats.rows[0];
    const noShowRate = ns.total > 0
      ? Math.round((ns.had_no_show / ns.total) * 100)
      : 0;

    res.json({
      serviceMetrics: serviceMetrics.rows,
      throughput: throughputFull,
      counterPerformance: counterPerf.rows,
      noShowRate,
      totalToday: parseInt(ns.total),
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

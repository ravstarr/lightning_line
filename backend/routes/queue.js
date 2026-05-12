const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { KEYS, cacheGet, cacheSet } = require('../config/redis');

// GET /api/queue/metrics
router.get('/metrics', async (req, res) => {
  try {
    const cached = await cacheGet(KEYS.QUEUE_METRICS);
    if (cached) return res.json(cached);

    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'waiting' AND priority_level = 'regular') AS regular,
        COUNT(*) FILTER (WHERE status = 'waiting' AND priority_level != 'regular') AS priority,
        AVG(
          CASE
            WHEN status = 'completed' AND completed_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (completed_at - checkin_time)) / 60
          END
        ) AS avg_wait
      FROM QueueTickets
      WHERE DATE(checkin_time) = CURRENT_DATE
    `);

    const m = result.rows[0];
    const payload = {
      regular:     parseInt(m.regular) || 0,
      priority:    parseInt(m.priority) || 0,
      averageWait: Math.round(parseFloat(m.avg_wait) || 15),
      peakHours:   ['9-10am', '1-2pm', '3-4pm'],
    };

    await cacheSet(KEYS.QUEUE_METRICS, payload, 5);
    res.json(payload);
  } catch (err) {
    console.error('Queue metrics error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/queue/estimates — live ML wait estimates per service type
router.get('/estimates', async (req, res) => {
  try {
    // Active counter count
    const counterResult = await pool.query(
      "SELECT COUNT(*) FROM Staff WHERE status = 'active'"
    );
    const activeCounters = Math.max(1, parseInt(counterResult.rows[0].count));

    // Queue length + avg handle time per service
    const serviceResult = await pool.query(`
      SELECT
        s.service_key,
        s.estimated_duration,
        COUNT(qt.ticket_id) FILTER (WHERE qt.status = 'waiting') AS queue_length,
        COALESCE(
          AVG(
            EXTRACT(EPOCH FROM (ss.end_time - ss.start_time)) / 60
          ) FILTER (WHERE ss.end_time IS NOT NULL AND ss.start_time >= NOW() - INTERVAL '7 days'),
          s.estimated_duration
        ) AS avg_handle_time
      FROM Services s
      LEFT JOIN QueueTickets qt ON qt.service_id = s.service_id
      LEFT JOIN ServiceSessions ss ON ss.ticket_id = qt.ticket_id
      GROUP BY s.service_key, s.estimated_duration
    `);

    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    const http = require('http');

    // Request ML prediction for each service type
    const estimates = await Promise.all(
      serviceResult.rows.map(async (row) => {
        const queueLength = parseInt(row.queue_length) || 0;
        const avgHandleTime = parseFloat(row.avg_handle_time) || 15;

        // Try ML prediction
        const mlWait = await new Promise((resolve) => {
          const body = JSON.stringify({
            service_type:    row.service_key,
            priority_level:  'regular',
            queue_length:    queueLength,
            active_counters: activeCounters,
            avg_handle_time: avgHandleTime,
          });
          const options = {
            hostname: new URL(ML_SERVICE_URL).hostname,
            port:     new URL(ML_SERVICE_URL).port || 8000,
            path:     '/predict',
            method:   'POST',
            headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
          };
          const req = http.request(options, (r) => {
            let data = '';
            r.on('data', (chunk) => { data += chunk; });
            r.on('end', () => {
              try { resolve(Math.round(JSON.parse(data).estimated_wait_minutes)); }
              catch { resolve(null); }
            });
          });
          req.on('error', () => resolve(null));
          req.setTimeout(3000, () => { req.destroy(); resolve(null); });
          req.write(body);
          req.end();
        });

        const smartFallback = queueLength === 0
          ? 0
          : Math.round((queueLength * avgHandleTime) / activeCounters);

        const serviceDuration = parseInt(row.estimated_duration) || 15;
        const queueWait = mlWait ?? smartFallback;

        return {
          serviceKey:    row.service_key,
          estimatedWait: queueWait + serviceDuration, // total time: queue wait + service time
          queueLength,
        };
      })
    );

    res.json({ estimates });
  } catch (err) {
    console.error('Queue estimates error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

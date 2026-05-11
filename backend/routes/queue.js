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

module.exports = router;

const pool = require("../../db/connection");

async function getAnalytics() {
  const totalTicketsResult = await pool.query(
    "SELECT COUNT(*) FROM tickets"
  );

  const waitingTicketsResult = await pool.query(
    "SELECT COUNT(*) FROM tickets WHERE status = 'WAITING'"
  );

  const calledTicketsResult = await pool.query(
    "SELECT COUNT(*) FROM tickets WHERE status = 'CALLED'"
  );

  const completedTicketsResult = await pool.query(
    "SELECT COUNT(*) FROM tickets WHERE status = 'COMPLETED'"
  );

  const averageServiceTimeResult = await pool.query(
    `SELECT AVG(
      EXTRACT(EPOCH FROM (completed_at - called_at)) / 60
    ) AS average_minutes
    FROM tickets
    WHERE status = 'COMPLETED'
    AND called_at IS NOT NULL
    AND completed_at IS NOT NULL`
  );

  const countersResult = await pool.query(
    `SELECT
      id,
      name,
      status,
      CASE
        WHEN status = 'SERVING' THEN TRUE
        ELSE FALSE
      END AS busy
    FROM counters
    ORDER BY id`
  );

  return {
    totalTickets: Number(totalTicketsResult.rows[0].count),
    waitingTickets: Number(waitingTicketsResult.rows[0].count),
    calledTickets: Number(calledTicketsResult.rows[0].count),
    completedTickets: Number(completedTicketsResult.rows[0].count),

    averageServiceMinutes: Math.round(
      Number(averageServiceTimeResult.rows[0].average_minutes || 0)
    ),

    counterUtilization: countersResult.rows
  };
}

module.exports = {
  getAnalytics
};
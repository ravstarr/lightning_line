const pool = require("../../db/connection");

async function getCounters(branchId) {
  const params = [];
  let branchFilter = "";

  if (branchId) {
    params.push(branchId);
    branchFilter = "WHERE c.branch_id = $1";
  }

  const result = await pool.query(
    `SELECT 
      c.*,
      b.name AS branch_name,
      t.ticket_number AS current_ticket_number
    FROM counters c
    JOIN branches b ON c.branch_id = b.id
    LEFT JOIN tickets t ON c.current_ticket_id = t.id
    ${branchFilter}
    ORDER BY c.id`,
    params
  );

  return result.rows;
}

async function updateCounterStatus(id, data) {
  const { status } = data;

  if (!status) {
    throw new Error("status is required");
  }

  const result = await pool.query(
    `UPDATE counters
     SET status = $1,
         current_ticket_id = CASE 
           WHEN $1 = 'AVAILABLE' OR $1 = 'ON_BREAK' OR $1 = 'DELAYED' OR $1 = 'CLOSED'
           THEN NULL
           ELSE current_ticket_id
         END
     WHERE id = $2
     RETURNING *`,
    [status, id]
  );

  return result.rows[0];
}

module.exports = {
  getCounters,
  updateCounterStatus
};
const pool = require("../../db/connection");

async function getServices() {
  const result = await pool.query(
    `SELECT *
     FROM services
     WHERE is_active = TRUE
     ORDER BY id`
  );

  return result.rows;
}

async function createService(data) {
  const { name, code, averageServiceMinutes } = data;

  if (!name || !code) {
    throw new Error("name and code are required");
  }

  const result = await pool.query(
    `INSERT INTO services (name, code, average_service_minutes)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, code, averageServiceMinutes || 10]
  );

  return result.rows[0];
}

module.exports = {
  getServices,
  createService
};
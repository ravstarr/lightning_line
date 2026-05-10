const pool = require("./connection");

async function testDatabase() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("Database connected successfully");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("Database test failed:", error.message);
  }
}

testDatabase();
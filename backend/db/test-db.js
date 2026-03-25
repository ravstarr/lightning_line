const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "lightning_line",
  port: 3307
});

connection.connect(err => {
  if (err) {
    console.error("❌ DB connection failed:", err);
  } else {
    console.log("✅ DB connected successfully");
  }
  connection.end();
});
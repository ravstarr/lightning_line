const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",        
  database: "lightning_line", 
  port: 3307,         //not the default port of 3306
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool;
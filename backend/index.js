const express = require("express");
const app = express();

console.log("🔥 THIS index.js FILE IS RUNNING");

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Lightning Line backend is running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Lightning Line backend is running" });
});

const server = app.listen(3000, () => {
  console.log("Backend server started on port 3000");
});

/* 🔒 FORCE EVENT LOOP TO STAY ALIVE (temporary test) */
setInterval(() => {}, 1000);
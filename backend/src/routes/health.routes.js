const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Lightning Line backend is running"
  });
});

module.exports = router;
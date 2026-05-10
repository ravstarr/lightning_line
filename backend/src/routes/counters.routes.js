const express = require("express");
const router = express.Router();

const {
  getCounters,
  updateCounterStatus
} = require("../controllers/counters.controller");

const {
  protect
} = require("../middleware/auth.middleware");

router.get("/", getCounters);
router.patch("/:id/status", protect, updateCounterStatus);

module.exports = router;
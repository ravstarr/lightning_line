const express = require("express");
const router = express.Router();

const {
  createTicket,
  getQueue,
  getTicketById,
  callNext,
  completeTicket,
  delayTicket,
  updatePriority
} = require("../controllers/tickets.controller");

const {
  protect
} = require("../middleware/auth.middleware");

router.post("/", createTicket);
router.get("/queue", getQueue);
router.get("/:id", getTicketById);
router.post("/call-next", protect, callNext);
router.post("/:id/complete", protect, completeTicket);
router.post("/:id/delay", delayTicket);
router.patch("/:id/priority", protect, updatePriority);

module.exports = router;
const counterService = require("../services/counters.service");

async function getCounters(req, res, next) {
  try {
    const counters = await counterService.getCounters(req.query.branchId);
    res.json({ counters });
  } catch (error) {
    next(error);
  }
}

async function updateCounterStatus(req, res, next) {
  try {
    const counter = await counterService.updateCounterStatus(req.params.id, req.body);

    if (!counter) {
      return res.status(404).json({ message: "Counter not found" });
    }

    res.json({ message: "Counter status updated successfully", counter });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCounters,
  updateCounterStatus
};
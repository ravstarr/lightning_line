const analyticsService = require("../services/analytics.service");

async function getAnalytics(req, res, next) {
  try {
    const analytics = await analyticsService.getAnalytics();

    res.json({
      analytics
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAnalytics
};
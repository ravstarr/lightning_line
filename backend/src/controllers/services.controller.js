const serviceService = require("../services/services.service");

async function getServices(req, res, next) {
  try {
    const services = await serviceService.getServices();
    res.json({ services });
  } catch (error) {
    next(error);
  }
}

async function createService(req, res, next) {
  try {
    const service = await serviceService.createService(req.body);
    res.status(201).json({ message: "Service created successfully", service });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getServices,
  createService
};
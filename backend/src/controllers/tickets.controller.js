const ticketService = require("../services/tickets.service");

async function createTicket(req, res, next) {
  try {
    const ticket = await ticketService.createTicket(req.body);
    res.status(201).json({ message: "Ticket created successfully", ticket });
  } catch (error) {
    next(error);
  }
}

async function getQueue(req, res, next) {
  try {
    const queue = await ticketService.getQueue(req.query.branchId);
    res.json({ message: "Queue retrieved successfully", queue });
  } catch (error) {
    next(error);
  }
}

async function getTicketById(req, res, next) {
  try {
    const ticket = await ticketService.getTicketById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json({ ticket });
  } catch (error) {
    next(error);
  }
}

async function callNext(req, res, next) {
  try {
    const result = await ticketService.callNext(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function completeTicket(req, res, next) {
  try {
    const ticket = await ticketService.completeTicket(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json({ message: "Ticket completed successfully", ticket });
  } catch (error) {
    next(error);
  }
}

async function delayTicket(req, res, next) {
  try {
    const ticket = await ticketService.delayTicket(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json({ message: "Ticket delayed successfully", ticket });
  } catch (error) {
    next(error);
  }
}

async function updatePriority(req, res, next) {
  try {
    const ticket = await ticketService.updatePriority(req.params.id, req.body);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json({ message: "Ticket priority updated successfully", ticket });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createTicket,
  getQueue,
  getTicketById,
  callNext,
  completeTicket,
  delayTicket,
  updatePriority
};
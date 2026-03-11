let tickets = [];

export function createTicket(req, res) {
  const { service_type, priority_level } = req.body;

  const newTicket = {
    id: tickets.length + 1,
    service_type,
    priority_level,
    status: "WAITING"
  };

  tickets.push(newTicket);

  res.json({
    message: "Ticket created",
    ticket: newTicket
  });
}

export function getQueue(req, res) {
  res.json(tickets);
}

export function callNext(req, res) {

  const nextTicket = tickets.find(t => t.status === "WAITING");

  if (!nextTicket) {
    return res.json({ message: "No tickets waiting" });
  }

  nextTicket.status = "CALLED";

  res.json({
    message: "Next ticket called",
    ticket: nextTicket
  });
}

export function completeTicket(req, res) {

  const ticketId = parseInt(req.params.id);

  const ticket = tickets.find(t => t.id === ticketId);

  if (!ticket) {
    return res.status(404).json({ message: "Ticket not found" });
  }

  ticket.status = "DONE";

  res.json({
    message: "Ticket completed",
    ticket: ticket
  });

}
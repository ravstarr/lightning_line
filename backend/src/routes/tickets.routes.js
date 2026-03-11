import { Router } from "express";
import { createTicket, getQueue, callNext, completeTicket } from "../controllers/tickets.controller.js";

const router = Router();

router.post("/", createTicket);
router.get("/queue", getQueue);
router.post("/call-next", callNext);
router.post("/:id/complete", completeTicket);

export default router;
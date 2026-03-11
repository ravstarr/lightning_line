import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({ ok: true, service: "lightning-line-api" });
});

export default router;
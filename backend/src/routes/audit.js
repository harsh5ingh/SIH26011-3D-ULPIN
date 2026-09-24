import { Router } from "express";
import { repository } from "../repository.js";

const router = Router();

// Get complete audit log
router.get("/", (_req, res) => {
  res.json(repository.audit_log);
});

// Get revision history
router.get("/revisions", (_req, res) => {
  res.json(repository.revisions);
});

export default router;
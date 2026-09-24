import { Router } from "express";
import { repository } from "../repository.js";

const router = Router();

// Underground infrastructure
router.get("/underground", (_req, res) => {
  res.json(
    Object.values(repository.underground)
  );
});

// Elevated infrastructure
router.get("/elevated", (_req, res) => {
  res.json(
    Object.values(repository.elevated)
  );
});

export default router;
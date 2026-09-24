import { Router } from "express";
import { lidarEngine } from "../services/lidarEngine.js";

const router = Router();

// Run LiDAR analysis
router.post("/analyze", (req, res) => {
  const propertyId = req.body?.property_id;

  if (!propertyId) {
    return res.status(400).json({
      detail: "property_id is required.",
    });
  }

  const pointCount =
    req.body?.point_count ?? 150000;

  const result =
    lidarEngine.analyzePointCloud(
      propertyId,
      pointCount
    );

  return res.json(result);
});

// Get LiDAR analysis for a property
router.get(
  "/:property_id/lidar-analysis",
  (req, res) => {
    const result =
      lidarEngine.analyzePointCloud(
        req.params.property_id
      );

    return res.json(result);
  }
);

export default router;
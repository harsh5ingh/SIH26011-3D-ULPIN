import { Router } from "express";
import { repository } from "../repository.js";

const router = Router();

// Reset all simulation data
router.post("/reset", (_req, res) => {
  repository.resetData();

  return res.json({
    message:
      "Simulation data reset to synthetic baseline successfully.",
  });
});

// Scenario 4 — Vertical Elevation Overlap
router.post(
  "/spatial-error",
  (_req, res) => {
    const unit =
      Object.values(
        repository.units
      ).find(
        (item) =>
          item.unit_number === "302"
      );

    if (unit) {
      unit.z_min_m = 512.5;
      unit.z_max_m = 516;
      unit.verification_status =
        "CORRECTION_REQUIRED";
    }

    return res.json({
      scenario:
        "Scenario 4 — Vertical Elevation Overlap",
      affected_unit: "Unit 302",
      status: "FAIL",
      message:
        "Unit 302 height range set to 512.5m–516.0m, creating 1.5m vertical overlap with Unit 301 (510.5m–514.0m).",
    });
  }
);

// Scenario 8 — Missing Evidence
router.post(
  "/missing-evidence",
  (_req, res) => {
    const unit =
      Object.values(
        repository.units
      ).find(
        (item) =>
          item.unit_number === "401"
      );

    if (unit) {
      repository.evidences =
        repository.evidences.filter(
          (evidence) =>
            !(
              evidence.object_id ===
                unit.id &&
              evidence.source_type ===
                "FLOOR_PLAN"
            )
        );
    }

    return res.json({
      scenario:
        "Scenario 8 — Missing Evidence",
      affected_unit: "Unit 401",
      message:
        "Removed Architectural Floor Plan evidence record for Unit 401.",
    });
  }
);

// Scenario 3 — Multi-Source Evidence Conflict
router.post(
  "/multi-source-conflict",
  (_req, res) => {
    const floorPlan =
      repository.evidences.find(
        (evidence) =>
          evidence.source_type ===
            "FLOOR_PLAN" &&
          evidence.metadata
            ?.estimated_building_height_m
      );

    if (floorPlan) {
      floorPlan.metadata.estimated_building_height_m = 30;
    }

    const pointCloud =
      repository.evidences.find(
        (evidence) =>
          [
            "LIDAR",
            "POINT_CLOUD",
          ].includes(
            evidence.source_type
          ) &&
          evidence.metadata
            ?.estimated_building_height_m
      );

    if (pointCloud) {
      pointCloud.metadata.estimated_building_height_m = 27;
    }

    return res.json({
      scenario:
        "Scenario 3 — Multi-Source Evidence Conflict",
      floor_plan_height_m: 30,
      point_cloud_height_m: 27,
      discrepancy_m: 3,
      message:
        "Introduced 3.0m height discrepancy between Floor Plan (30m) and Point Cloud (27m).",
    });
  }
);

// Rural Structure Detection & False-Positive Analysis
router.post(
  "/rural-structure",
  (_req, res) => {
    return res.json({
      scenario:
        "Rural Structure Detection & False-Positive Analysis",
      candidates:
        repository.structure_candidates,
    });
  }
);

export default router;
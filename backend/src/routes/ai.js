import { Router } from "express";
import { repository } from "../repository.js";
import { aiEngine } from "../services/aiEngine.js";
import { findByIdOr } from "../utils.js";

const router = Router();

const getParcel = (id) =>
  findByIdOr(repository.parcels, id, [
    "parcel_code",
  ]);

const getBuilding = (id) =>
  findByIdOr(repository.buildings, id, [
    "building_code",
  ]);

const saveAnalysis = (analysis) => {
  repository.ai_analyses.push(analysis);
  return analysis;
};

// Automated building extraction
router.post(
  "/building-extraction",
  (req, res) => {
    const parcelId =
      req.body?.parcel_id ||
      "parcel-urban-001";

    const parcel =
      getParcel(parcelId);

    const footprint =
      parcel?.geometry_2d || [
        [77.412, 23.259],
        [77.413, 23.259],
        [77.413, 23.260],
        [77.412, 23.260],
        [77.412, 23.259],
      ];

    const analysis =
      aiEngine.extractBuilding(
        parcel?.id || parcelId,
        footprint
      );

    return res.json(
      saveAnalysis(analysis)
    );
  }
);

// Floor segmentation
router.post(
  "/floor-segmentation",
  (req, res) => {
    const buildingId =
      req.body?.building_id ||
      "bld-urban-001";

    const building =
      getBuilding(buildingId);

    if (!building) {
      return res.status(404).json({
        detail: `Building '${buildingId}' not found.`,
      });
    }

    const totalHeight =
      Number(
        req.body?.total_height_m ??
          building.height_m ??
          18
      );

    const totalFloors =
      Math.max(
        1,
        Number(
          req.body?.total_floors ??
            building.total_floors ??
            5
        )
      );

    const analysis =
      aiEngine.segmentFloors(
        building.id,
        totalHeight,
        totalFloors
      );

    return res.json(
      saveAnalysis(analysis)
    );
  }
);

// Vertical parcel delineation
router.post(
  "/vertical-delineation",
  (req, res) => {
    const buildingId =
      req.body?.building_id ||
      "bld-urban-001";

    const floorId =
      req.body?.floor_id ||
      "floor-b1-3";

    const floorNumber =
      Number(
        req.body?.floor_number ?? 3
      );

    const building =
      getBuilding(buildingId);

    if (!building) {
      return res.status(404).json({
        detail: `Building '${buildingId}' not found.`,
      });
    }

    const analysis =
      aiEngine.delineateVerticalParcels(
        building.id,
        floorId,
        floorNumber
      );

    return res.json(
      saveAnalysis(analysis)
    );
  }
);

export default router;
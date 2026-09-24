import { Router } from "express";
import { repository } from "../repository.js";
import { findByIdOr } from "../utils.js";

const router = Router();

const getBuilding = (id) =>
  findByIdOr(repository.buildings, id, [
    "building_code",
  ]);

const notFound = (buildingId, res) =>
  res.status(404).json({
    detail: `Building '${buildingId}' not found.`,
  });

// Get all buildings
router.get("/", (_req, res) => {
  res.json(Object.values(repository.buildings));
});

// Get floors of a building
router.get(
  "/:building_id/floors",
  (req, res) => {
    const buildingId =
      req.params.building_id;

    const building =
      getBuilding(buildingId);

    if (!building) {
      return notFound(
        buildingId,
        res
      );
    }

    const floors = Object.values(
      repository.floors
    )
      .filter(
        (floor) =>
          floor.building_id ===
          building.id
      )
      .sort(
        (a, b) =>
          a.floor_number -
          b.floor_number
      );

    return res.json(floors);
  }
);

// Get properties/units of a building
router.get(
  "/:building_id/properties",
  (req, res) => {
    const buildingId =
      req.params.building_id;

    const building =
      getBuilding(buildingId);

    if (!building) {
      return notFound(
        buildingId,
        res
      );
    }

    const properties =
      Object.values(
        repository.units
      ).filter(
        (unit) =>
          unit.building_id ===
          building.id
      );

    return res.json(properties);
  }
);

// Get single building
router.get(
  "/:building_id",
  (req, res) => {
    const buildingId =
      req.params.building_id;

    const building =
      getBuilding(buildingId);

    if (!building) {
      return notFound(
        buildingId,
        res
      );
    }

    return res.json(building);
  }
);

export default router;
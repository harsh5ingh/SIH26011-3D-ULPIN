import { Router } from "express";
import { repository } from "../repository.js";
import {
  findByIdOr,
  round,
} from "../utils.js";
import { spatialEngine } from "../services/spatialEngine.js";
import { confidenceEngine } from "../services/confidenceEngine.js";
import { validationEngine } from "../services/validationEngine.js";

const router = Router();

const getProperty = (id) =>
  findByIdOr(repository.units, id, [
    "proposed_3d_id",
    "property_code",
  ]);

const propertyNotFound = (propertyId, res) =>
  res.status(404).json({
    detail: `Property unit '${propertyId}' not found.`,
  });

const getValidationResults = (unit) => {
  const building =
    repository.buildings[unit.building_id];

  const parcel =
    repository.parcels[unit.parcel_id];

  const floors =
    Object.values(repository.floors);

  const allUnits =
    Object.values(repository.units);

  const evidences =
    repository.evidences.filter(
      (evidence) =>
        [
          unit.id,
          unit.building_id,
          unit.parcel_id,
        ].includes(evidence.object_id)
    );

  return validationEngine.validateProperty(
    unit,
    allUnits,
    building,
    parcel,
    floors,
    evidences
  );
};

const buildValidationResponse = (
  property,
  results
) => {
  const passed = results.filter(
    (item) => item.status === "PASS"
  ).length;

  const warnings = results.filter(
    (item) => item.status === "WARNING"
  ).length;

  const failed = results.filter(
    (item) => item.status === "FAIL"
  ).length;

  const overallStatus =
    failed > 0
      ? "FAIL"
      : warnings > 0
        ? "WARNING"
        : "PASS";

  return {
    property_id: property.id,
    overall_status: overallStatus,
    total_rules_checked: results.length,
    passed_rules: passed,
    warning_rules: warnings,
    failed_rules: failed,
    results,
  };
};

// Get all property units
router.get("/", (_req, res) => {
  res.json(
    Object.values(repository.units)
  );
});

// Get property 3D geometry
router.get(
  "/:property_id/geometry",
  (req, res) => {
    const propertyId =
      req.params.property_id;

    const property =
      getProperty(propertyId);

    if (!property) {
      return propertyNotFound(
        propertyId,
        res
      );
    }

    const area =
      spatialEngine.calculateArea(
        property.footprint_2d
      );

    const volume =
      spatialEngine.calculateVolume(
        property.footprint_2d,
        property.z_min_m,
        property.z_max_m
      );

    return res.json({
      id: property.id,
      proposed_3d_id:
        property.proposed_3d_id,

      footprint_2d:
        property.footprint_2d,

      z_min_m: property.z_min_m,
      z_max_m: property.z_max_m,

      bounding_box_3d:
        spatialEngine.getBoundingBox3D(
          property.footprint_2d,
          property.z_min_m,
          property.z_max_m
        ),

      area_sqm: round(area, 2),
      volume_cum: round(volume, 2),
    });
  }
);

// Get property evidence
router.get(
  "/:property_id/evidence",
  (req, res) => {
    const propertyId =
      req.params.property_id;

    const property =
      getProperty(propertyId);

    if (!property) {
      return propertyNotFound(
        propertyId,
        res
      );
    }

    const evidence =
      repository.evidences.filter(
        (item) =>
          [
            property.id,
            property.building_id,
            property.parcel_id,
          ].includes(item.object_id)
      );

    return res.json(evidence);
  }
);

// Get property confidence score
router.get(
  "/:property_id/confidence",
  (req, res) => {
    const propertyId =
      req.params.property_id;

    const property =
      getProperty(propertyId);

    if (!property) {
      return propertyNotFound(
        propertyId,
        res
      );
    }

    const evidence =
      repository.evidences.filter(
        (item) =>
          [
            property.id,
            property.building_id,
            property.parcel_id,
          ].includes(item.object_id)
      );

    const validationResults =
      getValidationResults(property);

    const confidence =
      confidenceEngine.calculateConfidence(
        property,
        evidence,
        validationResults
      );

    return res.json(confidence);
  }
);

// Get validation report
router.get(
  "/:property_id/validation",
  (req, res) => {
    const propertyId =
      req.params.property_id;

    const property =
      getProperty(propertyId);

    if (!property) {
      return propertyNotFound(
        propertyId,
        res
      );
    }

    const results =
      getValidationResults(property);

    return res.json(
      buildValidationResponse(
        property,
        results
      )
    );
  }
);

// Run validation explicitly
router.post(
  "/:property_id/validate",
  (req, res) => {
    const propertyId =
      req.params.property_id;

    const property =
      getProperty(propertyId);

    if (!property) {
      return propertyNotFound(
        propertyId,
        res
      );
    }

    const results =
      getValidationResults(property);

    return res.json(
      buildValidationResponse(
        property,
        results
      )
    );
  }
);

// Get single property unit
router.get(
  "/:property_id",
  (req, res) => {
    const propertyId =
      req.params.property_id;

    const property =
      getProperty(propertyId);

    if (!property) {
      return propertyNotFound(
        propertyId,
        res
      );
    }

    return res.json(property);
  }
);

export default router;
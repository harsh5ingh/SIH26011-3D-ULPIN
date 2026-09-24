import { Router } from "express";
import { repository } from "../repository.js";
import { validationEngine } from "../services/validationEngine.js";
import { reviewEngine } from "../services/reviewEngine.js";

const router = Router();

const OFFICER_NAME = "Officer R. K. Sharma";

const getReviewCase = (id) =>
  repository.review_cases[id] ||
  Object.values(repository.review_cases).find(
    (item) => item.property_id === id
  );

const caseNotFound = (caseId, res) =>
  res.status(404).json({
    detail: `Review case '${caseId}' not found.`,
  });

const getEvidenceForUnit = (unit) =>
  repository.evidences.filter((evidence) =>
    [
      unit.id,
      unit.building_id,
      unit.parcel_id,
    ].includes(evidence.object_id)
  );

// Get all review cases
router.get("/", (_req, res) => {
  return res.json(
    Object.values(repository.review_cases)
  );
});

// Approve review case
router.post(
  "/:case_id/approve",
  (req, res) => {
    const caseId =
      req.params.case_id;

    const reviewCase =
      getReviewCase(caseId);

    if (!reviewCase) {
      return caseNotFound(
        caseId,
        res
      );
    }

    const reason =
      String(
        req.body?.reason || ""
      ).trim();

    const updated =
      reviewEngine.updateReviewStatus(
        reviewCase,
        "APPROVED",
        OFFICER_NAME,
        reason
      );

    const unit =
      repository.units[
        reviewCase.property_id
      ];

    if (unit) {
      unit.verification_status =
        "APPROVED";

      unit.under_review_note = null;
    }

    return res.json(updated);
  }
);

// Reject review case
router.post(
  "/:case_id/reject",
  (req, res) => {
    const caseId =
      req.params.case_id;

    const reviewCase =
      getReviewCase(caseId);

    if (!reviewCase) {
      return caseNotFound(
        caseId,
        res
      );
    }

    const reason =
      String(
        req.body?.reason || ""
      ).trim();

    const updated =
      reviewEngine.updateReviewStatus(
        reviewCase,
        "REJECTED",
        OFFICER_NAME,
        reason
      );

    const unit =
      repository.units[
        reviewCase.property_id
      ];

    if (unit) {
      unit.verification_status =
        "REJECTED";

      unit.under_review_note =
        `Rejected: ${reason}`;
    }

    return res.json(updated);
  }
);

// Correct property geometry/data and re-validate
router.post(
  "/:case_id/correct",
  (req, res) => {
    const caseId =
      req.params.case_id;

    const reviewCase =
      getReviewCase(caseId);

    if (!reviewCase) {
      return caseNotFound(
        caseId,
        res
      );
    }

    const unit =
      repository.units[
        reviewCase.property_id
      ];

    if (!unit) {
      return res.status(404).json({
        detail: `Associated property unit for case '${caseId}' not found.`,
      });
    }

    const previousValues = {
      z_min_m: unit.z_min_m,
      z_max_m: unit.z_max_m,
      footprint_2d:
        unit.footprint_2d,
    };

    const changedFields = [];
    const newValues = {};

    if (
      req.body?.z_min_m !==
      undefined
    ) {
      const zMin = Number(
        req.body.z_min_m
      );

      if (!Number.isFinite(zMin)) {
        return res.status(400).json({
          detail:
            "z_min_m must be a valid number.",
        });
      }

      unit.z_min_m = zMin;

      changedFields.push(
        "z_min_m"
      );

      newValues.z_min_m = zMin;
    }

    if (
      req.body?.z_max_m !==
      undefined
    ) {
      const zMax = Number(
        req.body.z_max_m
      );

      if (!Number.isFinite(zMax)) {
        return res.status(400).json({
          detail:
            "z_max_m must be a valid number.",
        });
      }

      unit.z_max_m = zMax;

      changedFields.push(
        "z_max_m"
      );

      newValues.z_max_m = zMax;
    }

    if (
      req.body?.footprint_2d !==
      undefined
    ) {
      if (
        !Array.isArray(
          req.body.footprint_2d
        ) ||
        req.body.footprint_2d.length <
          3
      ) {
        return res.status(400).json({
          detail:
            "footprint_2d must contain at least 3 coordinate points.",
        });
      }

      unit.footprint_2d =
        req.body.footprint_2d;

      changedFields.push(
        "footprint_2d"
      );

      newValues.footprint_2d =
        req.body.footprint_2d;
    }

    if (!changedFields.length) {
      return res.status(400).json({
        detail:
          "At least one correctable field is required: z_min_m, z_max_m, or footprint_2d.",
      });
    }

    unit.revision_number =
      (unit.revision_number || 1) +
      1;

    const building =
      repository.buildings[
        unit.building_id
      ];

    const parcel =
      repository.parcels[
        unit.parcel_id
      ];

    const evidence =
      getEvidenceForUnit(unit);

    const validationResults =
      validationEngine.validateProperty(
        unit,
        Object.values(
          repository.units
        ),
        building,
        parcel,
        Object.values(
          repository.floors
        ),
        evidence
      );

    const failed =
      validationResults.filter(
        (item) =>
          item.status === "FAIL"
      );

    const reason =
      String(
        req.body?.reason || ""
      ).trim();

    if (failed.length === 0) {
      unit.verification_status =
        "APPROVED";

      unit.under_review_note =
        null;

      reviewEngine.updateReviewStatus(
        reviewCase,
        "APPROVED",
        OFFICER_NAME,
        `Correction accepted: ${reason}. Re-validation PASSED.`
      );
    } else {
      unit.verification_status =
        "CORRECTION_REQUIRED";

      unit.under_review_note =
        `Correction re-validation failed: ${failed[0].message}`;
    }

    reviewEngine.createRevision({
      property_id: unit.id,
      revision_number:
        unit.revision_number,
      actor_role:
        "INSPECTION_OFFICER",
      changed_fields: changedFields,
      previous_values:
        previousValues,
      new_values: newValues,
      reason,
    });

    reviewEngine.logAudit({
      actor_role:
        "INSPECTION_OFFICER",
      object_id: unit.id,
      object_type:
        "PropertyUnit",
      action:
        "PROPERTY_CORRECTED",
      previous_state:
        previousValues,
      new_state: newValues,
      notes: `Officer corrected geometry: ${reason}`,
    });

    return res.json({
      property: unit,
      validation: {
        total_rules_checked:
          validationResults.length,
        failed_rules:
          failed.length,
        status:
          failed.length === 0
            ? "PASS"
            : "FAIL",
        results:
          validationResults,
      },
    });
  }
);

// Get single review case
router.get(
  "/:case_id",
  (req, res) => {
    const caseId =
      req.params.case_id;

    const reviewCase =
      getReviewCase(caseId);

    if (!reviewCase) {
      return caseNotFound(
        caseId,
        res
      );
    }

    return res.json(reviewCase);
  }
);

export default router;
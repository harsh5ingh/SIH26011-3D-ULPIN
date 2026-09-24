import { now, round } from "../utils.js";

export const confidenceEngine = {
  calculateConfidence(unit, evidences = [], validationResults = []) {
    const safeUnit = unit || {};

    const safeEvidences = Array.isArray(evidences)
      ? evidences
      : [];

    const safeValidationResults = Array.isArray(validationResults)
      ? validationResults
      : [];

    const objectIds = [
      safeUnit.id,
      safeUnit.building_id,
      safeUnit.parcel_id,
    ].filter(Boolean);

    const attached = new Set(
      safeEvidences
        .filter((evidence) =>
          objectIds.includes(evidence?.object_id)
        )
        .map((evidence) => evidence?.source_type)
        .filter(Boolean)
    );

    const expectedEvidenceTypes = [
      "GIS_PARCEL",
      "DRONE_IMAGERY",
      "LIDAR",
      "FLOOR_PLAN",
      "GNSS_CORS",
      "DEM",
      "DSM",
    ];

    const foundEvidenceCount = expectedEvidenceTypes.filter((type) =>
      attached.has(type)
    ).length;

    const evidenceScore = Math.min(
      100,
      (foundEvidenceCount / expectedEvidenceTypes.length) * 100
    );

    let geometryScore = 100;

    const zMin = Number(safeUnit.z_min_m);
    const zMax = Number(safeUnit.z_max_m);
    const area = Number(safeUnit.area_sqm);

    if (
      Number.isFinite(zMin) &&
      Number.isFinite(zMax) &&
      zMax <= zMin
    ) {
      geometryScore -= 50;
    }

    if (Number.isFinite(area) && area <= 0) {
      geometryScore -= 50;
    }

    const positionalScore = safeEvidences.some(
      (evidence) => evidence?.source_type === "GNSS_CORS"
    )
      ? 95
      : 70;

    const conflict = safeValidationResults.find(
      (result) => result?.rule_id === "RULE_09"
    );

    const agreementScore =
      conflict?.status === "FAIL"
        ? 40
        : conflict?.status === "WARNING"
          ? 70
          : 95;

    const passedValidations = safeValidationResults.filter(
      (result) => result?.status === "PASS"
    ).length;

    const validationScore =
      (passedValidations / Math.max(1, safeValidationResults.length)) * 100;

    const overall = round(
      Math.max(
        0,
        Math.min(
          100,
          0.25 * evidenceScore +
            0.25 * geometryScore +
            0.2 * positionalScore +
            0.2 * agreementScore +
            0.1 * validationScore
        )
      ),
      1
    );

    return {
      object_id: safeUnit.id,
      overall_score: overall,
      evidence_completeness: round(evidenceScore, 1),
      geometry_quality: round(geometryScore, 1),
      positional_quality: round(positionalScore, 1),
      cross_source_agreement: round(agreementScore, 1),
      validation_score: round(validationScore, 1),
      calculation_timestamp: now(),
    };
  },
};
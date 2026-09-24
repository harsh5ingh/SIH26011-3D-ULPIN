import { spatialEngine } from "./spatialEngine.js";
import { uuid, now, round } from "../utils.js";

const result = (
  unit,
  rule_id,
  rule_name,
  category,
  status,
  severity,
  message,
  details = {}
) => ({
  id: uuid(),
  target_object_id: unit?.id,
  rule_id,
  rule_name,
  category,
  status,
  severity,
  message,
  details,
  timestamp: now(),
});

export const validationEngine = {
  validateProperty(
    unit,
    allUnits = [],
    building,
    parcel,
    floors = [],
    evidences = []
  ) {
    if (!unit) {
      throw new Error("Property unit is required for validation");
    }

    return [
      this.r1(unit, parcel),
      this.r2(unit, building),
      this.r3(unit),
      this.r4(unit, allUnits),
      this.r5(unit, allUnits),
      this.r6(unit, floors),
      this.r7(unit, evidences),
      this.r8(unit),
      this.r9(unit, evidences),
    ];
  },

  r1(unit, parcel) {
    if (!parcel?.geometry_2d) {
      return result(
        unit,
        "RULE_01",
        "Parcel Containment",
        "2D_TOPOLOGY",
        "FAIL",
        "CRITICAL",
        "Parent parcel geometry is missing.",
        {}
      );
    }

    try {
      const [ok, percentage] =
        spatialEngine.checkContainment2D(
          unit.footprint_2d,
          parcel.geometry_2d
        );

      return ok
        ? result(
            unit,
            "RULE_01",
            "Parcel Containment",
            "2D_TOPOLOGY",
            "PASS",
            "LOW",
            `Unit footprint is fully contained within parent parcel ${parcel.parcel_code} (${percentage.toFixed(
              1
            )}% containment).`,
            {
              containment_percentage: percentage,
              parcel_code: parcel.parcel_code,
            }
          )
        : result(
            unit,
            "RULE_01",
            "Parcel Containment",
            "2D_TOPOLOGY",
            "FAIL",
            "CRITICAL",
            `Unit footprint extends beyond parent parcel ${parcel.parcel_code} boundary (${percentage.toFixed(
              1
            )}% containment).`,
            {
              containment_percentage: percentage,
              parcel_code: parcel.parcel_code,
            }
          );
    } catch (error) {
      return result(
        unit,
        "RULE_01",
        "Parcel Containment",
        "2D_TOPOLOGY",
        "FAIL",
        "CRITICAL",
        `Parcel containment validation failed: ${error.message}.`,
        {
          error: error.message,
        }
      );
    }
  },

  r2(unit, building) {
    if (!building?.id) {
      return result(
        unit,
        "RULE_02",
        "Building Association",
        "HIERARCHY",
        "FAIL",
        "HIGH",
        "Parent building record is missing.",
        {
          unit_building_id: unit.building_id,
        }
      );
    }

    return unit.building_id === building.id
      ? result(
          unit,
          "RULE_02",
          "Building Association",
          "HIERARCHY",
          "PASS",
          "LOW",
          `Property unit correctly associated with parent building ${building.building_code}.`,
          {
            building_id: building.id,
            building_code: building.building_code,
          }
        )
      : result(
          unit,
          "RULE_02",
          "Building Association",
          "HIERARCHY",
          "FAIL",
          "HIGH",
          "Property unit has invalid or missing parent building reference.",
          {
            unit_building_id: unit.building_id,
            actual_building_id: building.id,
          }
        );
  },

  r3(unit) {
    const zMin = Number(unit.z_min_m);
    const zMax = Number(unit.z_max_m);

    if (
      Number.isFinite(zMin) &&
      Number.isFinite(zMax) &&
      zMax > zMin
    ) {
      const height = zMax - zMin;

      return result(
        unit,
        "RULE_03",
        "Height Bounds Validity",
        "3D_GEOMETRY",
        "PASS",
        "LOW",
        `Valid vertical height span: ${height.toFixed(
          2
        )}m (Zmin: ${zMin.toFixed(
          2
        )}m, Zmax: ${zMax.toFixed(2)}m).`,
        {
          z_min_m: zMin,
          z_max_m: zMax,
          height_m: height,
        }
      );
    }

    return result(
      unit,
      "RULE_03",
      "Height Bounds Validity",
      "3D_GEOMETRY",
      "FAIL",
      "CRITICAL",
      `Invalid Z elevation bounds: Zmin (${unit.z_min_m}m) >= Zmax (${unit.z_max_m}m).`,
      {
        z_min_m: unit.z_min_m,
        z_max_m: unit.z_max_m,
      }
    );
  },

  r4(unit, allUnits = []) {
    const others = allUnits.filter(
      (item) =>
        item?.building_id === unit.building_id &&
        item?.floor_number === unit.floor_number &&
        item?.id !== unit.id
    );

    const conflicts = [];

    for (const other of others) {
      try {
        const [hasOverlap, area] =
          spatialEngine.checkOverlap2D(
            unit.footprint_2d,
            other.footprint_2d
          );

        if (hasOverlap && area > 0.1) {
          conflicts.push([
            other.unit_number,
            area,
          ]);
        }
      } catch {
        // Invalid geometry is handled by RULE_08.
      }
    }

    if (!conflicts.length) {
      return result(
        unit,
        "RULE_04",
        "Horizontal Unit Overlap",
        "2D_TOPOLOGY",
        "PASS",
        "LOW",
        "No horizontal footprint overlap detected with other units on the same floor.",
        {
          same_floor_unit_count: others.length,
        }
      );
    }

    return result(
      unit,
      "RULE_04",
      "Horizontal Unit Overlap",
      "2D_TOPOLOGY",
      "FAIL",
      "CRITICAL",
      `Horizontal footprint overlap detected on Floor ${unit.floor_number} with: ${conflicts
        .map(
          ([number, area]) =>
            `Unit ${number} (${area.toFixed(2)}m²)`
        )
        .join(", ")}.`,
      {
        conflicts,
      }
    );
  },

  r5(unit, allUnits = []) {
    const others = allUnits.filter(
      (item) =>
        item?.building_id === unit.building_id &&
        item?.id !== unit.id
    );

    const conflicts = [];

    for (const other of others) {
      try {
        const [
          hasOverlap,
          volume,
        ] =
          spatialEngine.check3DVolumetricOverlap(
            unit.footprint_2d,
            unit.z_min_m,
            unit.z_max_m,
            other.footprint_2d,
            other.z_min_m,
            other.z_max_m
          );

        if (hasOverlap && volume > 0.1) {
          conflicts.push({
            unit_number: other.unit_number,
            floor_number: other.floor_number,
            overlap_vol_m3: round(
              volume,
              2
            ),
            other_z_min: other.z_min_m,
            other_z_max: other.z_max_m,
          });
        }
      } catch {
        // Invalid geometry is handled by RULE_08.
      }
    }

    if (!conflicts.length) {
      return result(
        unit,
        "RULE_05",
        "Vertical Elevation Overlap",
        "3D_TOPOLOGY",
        "PASS",
        "LOW",
        "No 3D volumetric elevation overlap detected with any other property units.",
        {
          checked_units: others.length,
        }
      );
    }

    return result(
      unit,
      "RULE_05",
      "Vertical Elevation Overlap",
      "3D_TOPOLOGY",
      "FAIL",
      "CRITICAL",
      `VERTICAL OVERLAP DETECTED: 3D volume intersects with ${conflicts
        .map(
          (conflict) =>
            `Unit ${conflict.unit_number} (Floor ${conflict.floor_number}, Z:${conflict.other_z_min}–${conflict.other_z_max}m, ${conflict.overlap_vol_m3}m³)`
        )
        .join("; ")}.`,
      {
        conflicts,
      }
    );
  },

  r6(unit, floors = []) {
    const floor = floors.find(
      (item) =>
        item?.building_id === unit.building_id &&
        item?.floor_number === unit.floor_number
    );

    if (!floor) {
      return result(
        unit,
        "RULE_06",
        "Floor Height Monotonicity",
        "3D_GEOMETRY",
        "WARNING",
        "MEDIUM",
        `No matching floor record found for Floor ${unit.floor_number}.`,
        {
          floor_number: unit.floor_number,
        }
      );
    }

    const unitZMin = Number(unit.z_min_m);
    const unitZMax = Number(unit.z_max_m);

    const floorZMin = Number(floor.z_min_m);
    const floorZMax = Number(floor.z_max_m);

    const valid =
      unitZMin >= floorZMin - 0.1 &&
      unitZMax <= floorZMax + 0.1;

    return valid
      ? result(
          unit,
          "RULE_06",
          "Floor Height Monotonicity",
          "3D_GEOMETRY",
          "PASS",
          "LOW",
          `Unit elevation range (Z:${unit.z_min_m}–${unit.z_max_m}m) complies with Floor ${floor.floor_name} bounds (Z:${floor.z_min_m}–${floor.z_max_m}m).`,
          {
            floor_z_min: floor.z_min_m,
            floor_z_max: floor.z_max_m,
          }
        )
      : result(
          unit,
          "RULE_06",
          "Floor Height Monotonicity",
          "3D_GEOMETRY",
          "WARNING",
          "HIGH",
          `Unit elevation bounds (Z:${unit.z_min_m}–${unit.z_max_m}m) exceed Floor ${floor.floor_name} defined bounds (Z:${floor.z_min_m}–${floor.z_max_m}m).`,
          {
            floor_z_min: floor.z_min_m,
            floor_z_max: floor.z_max_m,
          }
        );
  },

  r7(unit, evidences = []) {
    const attached = new Set(
      evidences
        .filter((evidence) =>
          [
            unit.id,
            unit.building_id,
            unit.parcel_id,
          ].includes(evidence?.object_id)
        )
        .map(
          (evidence) =>
            evidence?.source_type
        )
        .filter(Boolean)
    );

    const required = [
      "GIS_PARCEL",
      "FLOOR_PLAN",
      "LIDAR",
      "DRONE_IMAGERY",
    ];

    const missing = required.filter(
      (type) => !attached.has(type)
    );

    return !missing.length
      ? result(
          unit,
          "RULE_07",
          "Spatial Evidence Completeness",
          "EVIDENCE",
          "PASS",
          "LOW",
          `All required spatial evidence sources are attached (${attached.size} sources verified).`,
          {
            attached_sources: [
              ...attached,
            ],
          }
        )
      : result(
          unit,
          "RULE_07",
          "Spatial Evidence Completeness",
          "EVIDENCE",
          "WARNING",
          "MEDIUM",
          `Missing spatial evidence sources: ${missing.join(
            ", "
          )}.`,
          {
            missing_sources: missing,
            attached_sources: [
              ...attached,
            ],
          }
        );
  },

  r8(unit) {
    try {
      const area =
        spatialEngine.polygonArea(
          unit.footprint_2d
        );

      if (area > 0) {
        const areaSqm =
          spatialEngine.calculateArea(
            unit.footprint_2d
          );

        return result(
          unit,
          "RULE_08",
          "Geometry Validity",
          "2D_GEOMETRY",
          "PASS",
          "LOW",
          `Valid 2D footprint geometry with non-zero surface area (${areaSqm.toFixed(
            2
          )} m²).`,
          {
            area_sqm: areaSqm,
          }
        );
      }

      return result(
        unit,
        "RULE_08",
        "Geometry Validity",
        "2D_GEOMETRY",
        "FAIL",
        "HIGH",
        "Invalid 2D footprint polygon geometry (self-intersecting or empty).",
        {}
      );
    } catch (error) {
      return result(
        unit,
        "RULE_08",
        "Geometry Validity",
        "2D_GEOMETRY",
        "FAIL",
        "CRITICAL",
        `Geometry parsing error: ${error.message}.`,
        {
          error: error.message,
        }
      );
    }
  },

  r9(unit, evidences = []) {
    const floorPlanEvidence =
      evidences.find(
        (evidence) =>
          evidence?.source_type ===
          "FLOOR_PLAN"
      );

    const pointCloudEvidence =
      evidences.find((evidence) =>
        [
          "POINT_CLOUD",
          "LIDAR",
        ].includes(
          evidence?.source_type
        )
      );

    const floorPlanHeight =
      floorPlanEvidence?.metadata
        ?.estimated_building_height_m;

    const pointCloudHeight =
      pointCloudEvidence?.metadata
        ?.estimated_building_height_m;

    if (
      floorPlanHeight &&
      pointCloudHeight &&
      Math.abs(
        floorPlanHeight -
          pointCloudHeight
      ) > 1.5
    ) {
      return result(
        unit,
        "RULE_09",
        "Cross-Source Evidence Conflict",
        "EVIDENCE",
        "FAIL",
        "HIGH",
        `MULTI-SOURCE DATA CONFLICT DETECTED: Floor Plan height (${floorPlanHeight}m) disagrees with Point Cloud height (${pointCloudHeight}m). Officer review required.`,
        {
          floor_plan_height_m:
            floorPlanHeight,
          point_cloud_height_m:
            pointCloudHeight,
          discrepancy_m: round(
            Math.abs(
              floorPlanHeight -
                pointCloudHeight
            ),
            2
          ),
        }
      );
    }

    return result(
      unit,
      "RULE_09",
      "Cross-Source Evidence Conflict",
      "EVIDENCE",
      "PASS",
      "LOW",
      "No multi-source data conflict detected across attached spatial sensors.",
      {}
    );
  },
};
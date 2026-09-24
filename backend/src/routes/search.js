import { Router } from "express";
import { repository } from "../repository.js";

const router = Router();

const matches = (values, query) =>
  values.some((value) =>
    String(value ?? "")
      .toUpperCase()
      .includes(query)
  );

router.get("/", (req, res) => {
  const rawQuery = String(
    req.query.q || ""
  ).trim();

  if (!rawQuery) {
    return res.status(400).json({
      detail: "q is required",
    });
  }

  const query =
    rawQuery.toUpperCase();

  const results = [];

  // Property units
  for (const unit of Object.values(
    repository.units
  )) {
    if (
      matches(
        [
          unit.proposed_3d_id,
          unit.property_code,
          unit.unit_number,
          unit.primary_use,
        ],
        query
      )
    ) {
      results.push({
        id: unit.id,
        type: "PROPERTY_UNIT",
        title: `Unit ${unit.unit_number} — ${unit.primary_use}`,
        subtitle: `Proposed 3D ID: ${unit.proposed_3d_id}`,
        proposed_3d_id:
          unit.proposed_3d_id,
        status:
          unit.verification_status,
      });
    }
  }

  // Parcels
  for (const parcel of Object.values(
    repository.parcels
  )) {
    if (
      matches(
        [
          parcel.parcel_code,
          parcel.locality,
          parcel.village,
          parcel.state,
          parcel.district,
        ],
        query
      )
    ) {
      results.push({
        id: parcel.id,
        type: "PARCEL",
        title: `Parcel ${parcel.parcel_code} (${parcel.locality})`,
        subtitle: `Land Use: ${parcel.land_use} | Area: ${Number(
          parcel.area_sqm
        ).toFixed(1)} m²`,
        proposed_3d_id: null,
        status: parcel.status,
      });
    }
  }

  // Buildings
  for (const building of Object.values(
    repository.buildings
  )) {
    if (
      matches(
        [
          building.building_code,
          building.name,
        ],
        query
      )
    ) {
      results.push({
        id: building.id,
        type: "BUILDING",
        title: `${building.name} (${building.building_code})`,
        subtitle: `Floors: ${building.total_floors} | Structure: ${building.structure_type}`,
        proposed_3d_id: null,
        status: building.status,
      });
    }
  }

  // Underground infrastructure
  for (const infrastructure of Object.values(
    repository.underground
  )) {
    if (
      matches(
        [
          infrastructure.infrastructure_code,
          infrastructure.name,
        ],
        query
      )
    ) {
      results.push({
        id: infrastructure.id,
        type: "UNDERGROUND_INFRASTRUCTURE",
        title: `${infrastructure.name} (${infrastructure.infrastructure_code})`,
        subtitle: `Z: ${infrastructure.z_min_m}m to ${infrastructure.z_max_m}m`,
        proposed_3d_id:
          infrastructure.proposed_3d_id,
        status:
          infrastructure.verification_status,
      });
    }
  }

  // Elevated infrastructure
  for (const infrastructure of Object.values(
    repository.elevated
  )) {
    if (
      matches(
        [
          infrastructure.infrastructure_code,
          infrastructure.name,
        ],
        query
      )
    ) {
      results.push({
        id: infrastructure.id,
        type: "ELEVATED_INFRASTRUCTURE",
        title: `${infrastructure.name} (${infrastructure.infrastructure_code})`,
        subtitle: `Z: ${infrastructure.z_min_m}m to ${infrastructure.z_max_m}m`,
        proposed_3d_id:
          infrastructure.proposed_3d_id,
        status:
          infrastructure.verification_status,
      });
    }
  }

  return res.json({
    query: rawQuery,
    total_results: results.length,
    results,
  });
});

export default router;
import { Router } from "express";
import { repository } from "../repository.js";
import { findByIdOr } from "../utils.js";

const router = Router();

const getParcel = (id) =>
  findByIdOr(repository.parcels, id, [
    "parcel_code",
  ]);

const parcelNotFound = (parcelId, res) =>
  res.status(404).json({
    detail: `Parcel with ID or code '${parcelId}' not found.`,
  });

// Get all parcels
router.get("/", (req, res) => {
  let parcels = Object.values(
    repository.parcels
  );

  if (req.query.area_type) {
    const areaType = String(
      req.query.area_type
    ).toUpperCase();

    parcels = parcels.filter(
      (parcel) =>
        String(parcel.area_type).toUpperCase() ===
        areaType
    );
  }

  return res.json(parcels);
});

// Get buildings inside a parcel
router.get(
  "/:parcel_id/buildings",
  (req, res) => {
    const parcelId =
      req.params.parcel_id;

    const parcel = getParcel(parcelId);

    if (!parcel) {
      return parcelNotFound(
        parcelId,
        res
      );
    }

    const buildings = Object.values(
      repository.buildings
    ).filter(
      (building) =>
        building.parcel_id === parcel.id
    );

    return res.json(buildings);
  }
);

// Get infrastructure inside a parcel
router.get(
  "/:parcel_id/infrastructures",
  (req, res) => {
    const parcelId =
      req.params.parcel_id;

    const parcel = getParcel(parcelId);

    if (!parcel) {
      return parcelNotFound(
        parcelId,
        res
      );
    }

    const infrastructure = [
      ...Object.values(
        repository.underground
      ),
      ...Object.values(
        repository.elevated
      ),
    ].filter(
      (item) =>
        item.parcel_id === parcel.id
    );

    return res.json(infrastructure);
  }
);

// Get structure candidates inside a parcel
router.get(
  "/:parcel_id/candidates",
  (req, res) => {
    const parcelId =
      req.params.parcel_id;

    const parcel = getParcel(parcelId);

    if (!parcel) {
      return parcelNotFound(
        parcelId,
        res
      );
    }

    const candidates =
      repository.structure_candidates.filter(
        (candidate) =>
          candidate.parcel_id === parcel.id
      );

    return res.json(candidates);
  }
);

// Get evidence attached to a parcel
router.get(
  "/:parcel_id/evidence",
  (req, res) => {
    const parcelId =
      req.params.parcel_id;

    const parcel = getParcel(parcelId);

    if (!parcel) {
      return parcelNotFound(
        parcelId,
        res
      );
    }

    const evidence =
      repository.evidences.filter(
        (item) =>
          item.object_id === parcel.id
      );

    return res.json(evidence);
  }
);

// Get single parcel
router.get(
  "/:parcel_id",
  (req, res) => {
    const parcelId =
      req.params.parcel_id;

    const parcel = getParcel(parcelId);

    if (!parcel) {
      return parcelNotFound(
        parcelId,
        res
      );
    }

    return res.json(parcel);
  }
);

export default router;
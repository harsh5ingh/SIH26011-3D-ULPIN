import { uuid, now, round } from "../utils.js";

export const aiEngine = {
  extractBuilding(parcel_id, footprint_2d) {
    return {
      id: uuid(),
      target_id: parcel_id,
      target_type: "Parcel",
      module: "AUTOMATED_BUILDING_EXTRACTION",
      confidence_score: 92.4,

      extracted_features: {
        detected_footprint_2d: footprint_2d,
        estimated_building_height_m: 18.5,
        roof_type: "FLAT_CONCRETE",
        structure_candidate_type: "MULTI_STOREY_RESIDENTIAL",
        extracted_floors_count: 5,
      },

      timestamp: now(),
    };
  },

  segmentFloors(building_id, total_height_m, total_floors) {
    const height = Number(total_height_m) || 0;
    const floors = Math.max(1, Number(total_floors) || 1);

    const averageFloorHeight = height / floors;

    const slices = Array.from({ length: floors }, (_, floor) => ({
      floor_number: floor,
      z_min_m: round(floor * averageFloorHeight, 2),
      z_max_m: round((floor + 1) * averageFloorHeight, 2),
      confidence: 91 + (floor % 3),
    }));

    return {
      id: uuid(),
      target_id: building_id,
      target_type: "Building",
      module: "FLOOR_SEGMENTATION",
      confidence_score: 93.1,

      extracted_features: {
        floor_slices: slices,
        total_height_m: height,
        detected_floor_count: floors,
      },

      timestamp: now(),
    };
  },

  delineateVerticalParcels(building_id, floor_id, floor_number) {
    const floor = Number(floor_number) || 0;

    return {
      id: uuid(),
      target_id: floor_id,
      target_type: "Floor",
      module: "VERTICAL_PARCEL_DELINEATION",
      confidence_score: 89.6,

      extracted_features: {
        building_id,
        floor_number: floor,
        proposed_units_count: 2,

        delineated_units: [
          {
            unit_number: `${floor}01`,
            type: "RESIDENTIAL",
            share_pct: 50,
          },
          {
            unit_number: `${floor}02`,
            type: "RESIDENTIAL",
            share_pct: 50,
          },
        ],
      },

      timestamp: now(),
    };
  },
};
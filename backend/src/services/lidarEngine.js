import { uuid, now } from "../utils.js";

export const lidarEngine = {
  analyzePointCloud(property_id, point_count = 150000) {
    const safePointCount = Math.max(
      1,
      Number(point_count) || 150000
    );

    return {
      id: uuid(),
      property_id,

      acquisition_date: now().slice(0, 10),

      point_count: safePointCount,

      estimated_height_m: 18.5,

      floor_heights: [
        0,
        3.2,
        6.4,
        9.6,
        12.8,
        16,
        18.5,
      ],

      noise_level: 0.03,

      confidence: 94.5,

      source_type: "SIMULATED_LIDAR_POINT_CLOUD",
    };
  },
};
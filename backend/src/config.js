import "dotenv/config";

const csv = (value, fallback) =>
  value
    ? value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : fallback;

export const settings = {
  PROJECT_NAME:
    "GeoVISTA — Geospatial Volumetric Intelligence & Spatial Topology Architecture",

  PROBLEM_STATEMENT_ID:
    "PS26011",

  PROBLEM_STATEMENT_TITLE:
    "3D ULPIN Generation and Vertical Property Mapping System",

  ORGANIZATION:
    "Ministry of Rural Development",

  DEPARTMENT:
    "Department of Land Resources (DoLR)",

  APP_ENV:
    process.env.APP_ENV || "development",

  PORT:
    Number(process.env.PORT || 8000),

  HOST:
    process.env.HOST || "0.0.0.0",

  CORS_ORIGINS:
    csv(
      process.env.CORS_ORIGINS,
      [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
      ]
    ),

  // =========================
  // Authentication
  // =========================

  JWT_SECRET:
    process.env.JWT_SECRET ||
    "geovista-development-secret-change-this",

  JWT_EXPIRES_IN:
    process.env.JWT_EXPIRES_IN || "8h",

  // Used for Officer account registration.
  // Change this in .env before deployment.
  OFFICER_SIGNUP_CODE:
    process.env.OFFICER_SIGNUP_CODE ||
    "GEOVISTA-OFFICER-2026",
};
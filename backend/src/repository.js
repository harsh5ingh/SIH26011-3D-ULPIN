import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { clone } from "./utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const seedPath = path.join(__dirname, "data", "seed.json");

const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));

class DataRepository {
  constructor() {
    this.resetData();
  }

  resetData() {
    const data = clone(seed);

    this.parcels = Object.fromEntries(
      data.parcels.map((item) => [item.id, item])
    );

    this.buildings = Object.fromEntries(
      data.buildings.map((item) => [item.id, item])
    );

    this.floors = Object.fromEntries(
      data.floors.map((item) => [item.id, item])
    );

    this.units = Object.fromEntries(
      data.units.map((item) => [item.id, item])
    );

    this.underground = Object.fromEntries(
      data.underground.map((item) => [item.id, item])
    );

    this.elevated = Object.fromEntries(
      data.elevated.map((item) => [item.id, item])
    );

    this.evidences = data.evidences || [];

    this.review_cases = Object.fromEntries(
      (data.review_cases || []).map((item) => [item.id, item])
    );

    this.structure_candidates = data.structure_candidates || [];

    // Runtime-generated data
    this.issue_reports = [];
    this.audit_log = [];
    this.revisions = [];
    this.ai_analyses = [];
  }
}

export const repository = new DataRepository();
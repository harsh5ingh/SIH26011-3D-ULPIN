# GeoVISTA — Judge Demonstration Guide (2-4 Minutes)

This guide walks through the 8 mandatory demonstration scenarios designed for SIH PS26011 evaluation.

---

## Scenario Sequence

### Step 1: Public Portal — Urban Property Search & 3D Visualization
1. Open the Public Portal at `http://localhost:5173`.
2. Search for parcel `P001` or property `IN-MP-BPL-P001-B01-F01-U01`.
3. Highlight that the parcel boundary (2D) expands into a multi-storey 3D building.
4. Select Floor 1 $\rightarrow$ Unit 101.
5. Point out the **Proposed 3D Spatial Identifier** and explicit prototype disclaimer.
6. Review the multi-sensor evidence list (GIS, Drone, LiDAR, Floor Plan, GNSS/CORS, DEM/DSM).

---

### Step 2: Officer Portal — Topology Collision Detection (Scenario 4)
1. Navigate to the **Officer Workbench**.
2. Select Review Case `RC-2026-0042` (Unit 302).
3. Click **"Run Validation"**.
4. Observe **RULE_05 Vertical Overlap FAIL** — Unit 302 overlaps with Unit 301.
5. In the Geometry Adjustment tool, correct Unit 302 bounds:
   - $Z_{\text{min}}$: `514.0 m`
   - $Z_{\text{max}}$: `517.0 m`
   - Footprint: Restored to standard right-wing unit footprint.
6. Click **"Apply Correction"**.
7. Observe real backend state mutation:
   - Status updates to `APPROVED`
   - Revision counter increments from `1` to `2`
   - Real-time re-validation re-runs and returns `PASS` across all 9 rules.

---

### Step 3: Multi-Source Sensor Conflict (Scenario 3)
1. In the Officer Portal, trigger Scenario 3: Architectural Floor Plan height (30m) vs LiDAR Point Cloud height (27m).
2. Run validation $\rightarrow$ Observe **RULE_09 FAIL** ("Cross-Source Conflict").
3. Emphasize provenance: The system does not guess or overwrite conflicting sensor data; it preserves both and flags for surveyor reinspection.

---

### Step 4: Volumetric Underground & Elevated Infrastructure (Scenario 5)
1. Switch layer toggles to inspect Subsurface Utilities.
2. View **Underground Basement Parking** ($Z: -5\text{m}$ to $0\text{m}$ relative to ground).
3. Switch to elevated layer $\rightarrow$ View **Bhopal Metro Elevated Corridor** ($Z: +12\text{m}$ to $+18\text{m}$).
4. Shows true volumetric cadastre beyond flat surface parcels.

---

### Step 5: Rural Sensor Extension & False-Positive Handling (Scenarios 6 & 7)
1. Switch to Rural Parcel `R002` $\rightarrow$ Run LiDAR scan simulation $\rightarrow$ Detects **Permanent Residence Candidate** (`LIKELY_PERMANENT`).
2. Switch to Rural Parcel `R003` $\rightarrow$ Run LiDAR scan simulation $\rightarrow$ Detects **Temporary Brick Stack** (`LIKELY_TEMPORARY`).
3. Point out critical principle: The system flags "Potential unrecorded structure — official verification required" rather than prematurely declaring "Illegal construction".

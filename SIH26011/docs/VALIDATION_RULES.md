# GeoVISTA — Deterministic 9-Rule Topology Validation Engine

The GeoVISTA validation engine executes real deterministic spatial, vertical, and evidence rules on volumetric property candidates. It does not rely on opaque AI judgments for legal certification; instead, it enforces mathematical topology rules before routing to human officer review.

---

## The 9 Validation Rules

### RULE_01: Parcel Containment (2D Topology)
- **Objective:** Verify that the 2D footprint of the building and individual property units are completely contained within the parent land parcel boundary.
- **Engine Logic:** Evaluates Shapely polygon intersection ratio:
  $$\text{Containment \%} = \frac{\text{Area}(\text{Parcel} \cap \text{Unit})}{\text{Area}(\text{Unit})} \times 100$$
- **Threshold:** $\ge 99.9\%$ yields `PASS`. Lower yields `FAIL` with severity `CRITICAL`.

---

### RULE_02: Building Association (Cadastral Hierarchy)
- **Objective:** Ensure the property unit maintains a valid hierarchical link to an existing building and parcel.
- **Engine Logic:** Matches `unit.building_id == building.id` and verifies parent building status is `ACTIVE`.

---

### RULE_03: Height Bounds Validity (3D Geometry)
- **Objective:** Validate that vertical elevation limits are strictly positive ($Z_{\text{min}} < Z_{\text{max}}$).
- **Engine Logic:** Rejects inverted or zero-height extrusions. Severity `CRITICAL`.

---

### RULE_04: Horizontal Unit Overlap (2D Floor Topology)
- **Objective:** Prevent duplicate or overlapping property claims on the same floor level.
- **Engine Logic:** For all units on the same floor of a building:
  $$\text{Area}(\text{Unit}_A \cap \text{Unit}_B) \le 0.1\,\text{m}^2$$
- **Status:** Any intersection $> 0.1\,\text{m}^2$ generates `FAIL` with list of conflicting units.

---

### RULE_05: Vertical Elevation Overlap (3D Topology)
- **Objective:** Detect vertical 3D collision between floors or adjacent property units sharing common horizontal footprints.
- **Engine Logic:** Checks 3D volumetric overlap:
  $$\text{Overlap Volume} = \text{Area}(\text{Unit}_A \cap \text{Unit}_B) \times \max\left(0, \min(Z_{\text{max}}^A, Z_{\text{max}}^B) - \max(Z_{\text{min}}^A, Z_{\text{min}}^B)\right)$$
- **Trigger Scenario:** Demo Scenario 4 deliberately presents Unit 302 colliding with Unit 301.

---

### RULE_06: Floor Height Monotonicity (3D Ordering)
- **Objective:** Verify that units assigned to Floor $N$ lie within the certified vertical bounding envelope of Floor $N$, and that Floor $N+1$ is strictly above Floor $N$.
- **Tolerance:** $\pm 0.1\,\text{m}$ for structural slabs.

---

### RULE_07: Spatial Evidence Completeness (Provenance)
- **Objective:** Ensure minimal required spatial evidence sources are attached to the candidate model:
  1. `GIS_PARCEL` (Cadastral boundary layer)
  2. `DRONE_IMAGERY` (Orthomosaic visual confirmation)
  3. `LIDAR` / `POINT_CLOUD` (Height profile)
  4. `FLOOR_PLAN` (Architectural division)
- **Status:** Generates `WARNING` with missing source list if any are absent.

---

### RULE_08: Footprint Geometry Validity (2D Geometry)
- **Objective:** Check that the footprint polygon is valid according to OGC standards (non-self-intersecting, closed, non-zero area).

---

### RULE_09: Cross-Source Evidence Conflict (Sensor Agreement)
- **Objective:** Detect discrepancies between independent spatial capture sensors.
- **Engine Logic:** Compares Building Height from Architectural CAD drawings against aerial LiDAR point cloud elevation.
- **Discrepancy Threshold:** $|H_{\text{CAD}} - H_{\text{LiDAR}}| > 1.5\,\text{m}$ triggers `FAIL` with `OFFICER_REVIEW_REQUIRED`.

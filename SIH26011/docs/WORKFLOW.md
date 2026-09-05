# GeoVISTA — Core Workflows & Control Flow

## The Master Workflow
`MAP → BUILD → IDENTIFY → VERIFY → VISUALIZE`

```
┌─────────┐     ┌───────────┐     ┌──────────────┐     ┌────────────┐     ┌───────────────┐
│   MAP   │ ──> │   BUILD   │ ──> │   IDENTIFY   │ ──> │   VERIFY   │ ──> │   VISUALIZE   │
│ Parent  │     │ Spatial   │     │ Proposed 3D  │     │ Topology   │     │ 2D Cadastre   │
│ Parcel  │     │ Evidence  │     │ Identifier   │     │ & Officer  │     │ + 3D Volume   │
└─────────┘     └───────────┘     └──────────────┘     └────────────┘     └───────────────┘
```

## Mandatory Control Flow Order
`AI Spatial Detection → Deterministic Topology Validation → Authorized Human Review`

1. **AI Processing:**
   - Detects building candidates from drone/orthophoto rasters.
   - Extracts vertical floor slices from LiDAR point cloud height distributions.
   - Delineates 3D property boundary proposals.
2. **Deterministic Topology Validation:**
   - Runs 9 strict spatial containment, bounds, and collision rules using mathematical polygon operations.
   - Flags anomalies without declaring legal conclusions.
3. **Human Review & State Mutation:**
   - Qualified inspection officers review flagged conflicts.
   - Geometry adjustments mutate backend state with full revision tracking and audit logging.
   - Decisions: `APPROVED`, `CORRECTION_REQUIRED`, or `REJECTED`.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";

import {
  Parcel,
  Building,
  Floor,
  PropertyUnit,
  Infrastructure,
  StructureCandidate,
  Evidence,
  ConfidenceScore,
  ValidationSummary,
  ReviewCase,
  AuditEvent,
} from "../types";

import { api } from "../services/api";

/* ================================================================
   TYPES
================================================================ */

export interface CameraState {
  radius: number;
  theta: number;
  phi: number;
  target: [number, number, number];
  propertyId: string;
}

export interface ActiveLayers {
  showUnderground: boolean;
  showElevated: boolean;
  showCandidates: boolean;
  showBuildingEnvelope: boolean;
  showParcelBoundary: boolean;
}

interface GeoVistaContextType {
  /* Navigation */
  currentTab: "public" | "officer" | "scenarios";
  setCurrentTab: (
    tab: "public" | "officer" | "scenarios",
  ) => void;

  /* Data */
  parcels: Parcel[];
  selectedParcel: Parcel | undefined;

  buildings: Building[];
  selectedBuilding: Building | undefined;

  floors: Floor[];

  properties: PropertyUnit[];
  selectedProperty: PropertyUnit | undefined;

  selectedFloorFilter: number | "ALL";
  setSelectedFloorFilter: (
    floor: number | "ALL",
  ) => void;

  underground: Infrastructure[];
  elevated: Infrastructure[];
  candidates: StructureCandidate[];

  evidence: Evidence[];
  confidence: ConfidenceScore | undefined;
  validation: ValidationSummary | undefined;

  reviewCases: ReviewCase[];
  selectedCase: ReviewCase | undefined;
  auditLog: AuditEvent[];

  loading: boolean;
  error: string | null;

  /* 3D Viewer */
  cameraState: CameraState | null;
  setCameraState: (cam: CameraState) => void;

  activeLayers: ActiveLayers;
  toggleLayer: (layer: keyof ActiveLayers) => void;

  viewerRevision: number;

  /* Selection */
  selectParcelById: (
    parcelId: string,
  ) => Promise<void>;

  selectBuildingById: (
    buildingId: string,
  ) => Promise<void>;

  selectPropertyById: (
    propertyId: string,
  ) => Promise<void>;

  selectReviewCaseById: (
    caseId: string,
  ) => Promise<void>;

  /* Officer Actions */
  correctProperty: (
    caseId: string,
    data: {
      z_min_m?: number;
      z_max_m?: number;
      footprint_2d?: number[][];
      reason: string;
    },
  ) => Promise<void>;

  approveReview: (
    caseId: string,
    reason: string,
  ) => Promise<void>;

  rejectReview: (
    caseId: string,
    reason: string,
  ) => Promise<void>;

  runValidationForCurrentProperty: () => Promise<void>;

  /* Simulation */
  resetSimulation: () => Promise<string>;

  triggerSpatialError: () => Promise<void>;

  triggerMissingEvidence: () => Promise<void>;

  triggerMultiSourceConflict: () => Promise<void>;

  /* Search */
  searchCadastre: (
    query: string,
  ) => Promise<void>;
}

/* ================================================================
   CONTEXT
================================================================ */

const GeoVistaContext =
  createContext<GeoVistaContextType | undefined>(
    undefined,
  );

/* ================================================================
   PROVIDER
================================================================ */

export const GeoVistaProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  /* ==============================================================
     NAVIGATION
  ============================================================== */

  const [currentTab, setCurrentTab] = useState<
    "public" | "officer" | "scenarios"
  >("public");

  /* ==============================================================
     CORE CADASTRAL DATA
  ============================================================== */

  const [parcels, setParcels] =
    useState<Parcel[]>([]);

  const [selectedParcel, setSelectedParcel] =
    useState<Parcel | undefined>();

  const [buildings, setBuildings] =
    useState<Building[]>([]);

  const [selectedBuilding, setSelectedBuilding] =
    useState<Building | undefined>();

  const [floors, setFloors] =
    useState<Floor[]>([]);

  const [properties, setProperties] =
    useState<PropertyUnit[]>([]);

  const [selectedProperty, setSelectedProperty] =
    useState<PropertyUnit | undefined>();

  const [selectedFloorFilter, setSelectedFloorFilter] =
    useState<number | "ALL">("ALL");

  /* ==============================================================
     INFRASTRUCTURE / CANDIDATES
  ============================================================== */

  const [underground, setUnderground] =
    useState<Infrastructure[]>([]);

  const [elevated, setElevated] =
    useState<Infrastructure[]>([]);

  const [candidates, setCandidates] =
    useState<StructureCandidate[]>([]);

  /* ==============================================================
     EVIDENCE / VALIDATION
  ============================================================== */

  const [evidence, setEvidence] =
    useState<Evidence[]>([]);

  const [confidence, setConfidence] =
    useState<ConfidenceScore | undefined>();

  const [validation, setValidation] =
    useState<ValidationSummary | undefined>();

  /* ==============================================================
     REVIEWS / AUDIT
  ============================================================== */

  const [reviewCases, setReviewCases] =
    useState<ReviewCase[]>([]);

  /*
   * IMPORTANT:
   * Keep latest review cases in a ref.
   *
   * This prevents selectPropertyById from depending on
   * reviewCases state and therefore prevents the callback
   * from being recreated every time reviewCases changes.
   */
  const reviewCasesRef =
    useRef<ReviewCase[]>([]);

  const [selectedCase, setSelectedCase] =
    useState<ReviewCase | undefined>();

  const [auditLog, setAuditLog] =
    useState<AuditEvent[]>([]);

  /* Keep ref synchronized with state */
  useEffect(() => {
    reviewCasesRef.current = reviewCases;
  }, [reviewCases]);

  /* ==============================================================
     UI STATE
  ============================================================== */

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /* ==============================================================
     3D VIEWER STATE
  ============================================================== */

  const [cameraState, setCameraState] =
    useState<CameraState | null>(null);

  const [viewerRevision, setViewerRevision] =
    useState(0);

  const [activeLayers, setActiveLayers] =
    useState<ActiveLayers>({
      showUnderground: true,
      showElevated: true,
      showCandidates: true,
      showBuildingEnvelope: true,
      showParcelBoundary: true,
    });


  /* ==============================================================
     LAYER TOGGLE
  ============================================================== */

  const toggleLayer = useCallback(
    (layer: keyof ActiveLayers) => {
      setActiveLayers((previous) => ({
        ...previous,
        [layer]: !previous[layer],
      }));
    },
    [],
  );

  /* ==============================================================
     CLEAR PROPERTY DETAILS
  ============================================================== */

  const clearPropertyDetails =
    useCallback(() => {
      setSelectedProperty(undefined);
      setEvidence([]);
      setConfidence(undefined);
      setValidation(undefined);
      setSelectedCase(undefined);
    }, []);

  /* ==============================================================
     REFRESH REVIEWS + AUDIT
  ============================================================== */

  const refreshReviewsAndAudit =
    useCallback(async () => {
      try {
        const [cases, logs] =
          await Promise.all([
            api.getReviews(),
            api.getAuditLog(),
          ]);

        setReviewCases(cases);
        setAuditLog(logs);

        return {
          cases,
          logs,
        };
      } catch (err) {
        console.error(
          "Failed to load reviews and audit logs",
          err,
        );

        return {
          cases: [],
          logs: [],
        };
      }
    }, []);

  /* ==============================================================
     SELECT PROPERTY
  ============================================================== */

  const selectPropertyById =
    useCallback(
      async (propertyId: string) => {
        try {
          setLoading(true);
          setError(null);

          const property =
            await api.getProperty(propertyId);

          setSelectedProperty(property);

          const [
            propertyEvidence,
            propertyConfidence,
            propertyValidation,
          ] = await Promise.all([
            api
              .getPropertyEvidence(property.id)
              .catch(() => []),

            api
              .getPropertyConfidence(property.id)
              .catch(() => undefined),

            api
              .getPropertyValidation(property.id)
              .catch(() => undefined),
          ]);

          setEvidence(propertyEvidence);
          setConfidence(propertyConfidence);
          setValidation(propertyValidation);

          /*
           * IMPORTANT:
           * Do NOT depend on reviewCases state here.
           *
           * reviewCasesRef always contains the latest data,
           * while selectPropertyById remains stable.
           */
          const matchingCase =
            reviewCasesRef.current.find(
              (reviewCase) =>
                reviewCase.property_id ===
                property.id,
            );

          setSelectedCase(matchingCase);
        } catch (err: any) {
          console.error(
            `Failed to select property ${propertyId}`,
            err,
          );

          setError(
            err?.message ||
              "Failed to load property.",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  /* ==============================================================
     SELECT BUILDING
  ============================================================== */

  const selectBuildingById =
    useCallback(
      async (buildingId: string) => {
        try {
          setLoading(true);
          setError(null);

          const building =
            await api.getBuilding(buildingId);

          setSelectedBuilding(building);

          const [
            buildingFloors,
            buildingProperties,
          ] = await Promise.all([
            api.getBuildingFloors(
              building.id,
            ),

            api.getBuildingProperties(
              building.id,
            ),
          ]);

          setFloors(buildingFloors);
          setProperties(buildingProperties);

          setSelectedFloorFilter("ALL");

          if (buildingProperties.length > 0) {
            await selectPropertyById(
              buildingProperties[0].id,
            );
          } else {
            clearPropertyDetails();
          }
        } catch (err: any) {
          console.error(
            `Failed to select building ${buildingId}`,
            err,
          );

          setError(
            err?.message ||
              "Failed to load building.",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        selectPropertyById,
        clearPropertyDetails,
      ],
    );

  /* ==============================================================
     SELECT PARCEL
  ============================================================== */

  const selectParcelById =
    useCallback(
      async (parcelId: string) => {
        try {
          setLoading(true);
          setError(null);

          const parcel =
            await api.getParcel(parcelId);

          setSelectedParcel(parcel);

          const [
            parcelBuildings,
            parcelInfrastructure,
            parcelCandidates,
            parcelEvidence,
          ] = await Promise.all([
            api
              .getParcelBuildings(parcel.id)
              .catch(() => []),

            api
              .getParcelInfrastructures(
                parcel.id,
              )
              .catch(() => []),

            api
              .getParcelCandidates(
                parcel.id,
              )
              .catch(() => []),

            api
              .getParcelEvidence(
                parcel.id,
              )
              .catch(() => []),
          ]);

          setBuildings(parcelBuildings);

          setUnderground(
            parcelInfrastructure.filter(
              (item) =>
                Number(item.z_min_m) < 500,
            ),
          );

          setElevated(
            parcelInfrastructure.filter(
              (item) =>
                Number(item.z_min_m) >= 500,
            ),
          );

          setCandidates(parcelCandidates);

          /* --------------------------------------------------------
             PARCEL HAS BUILDING
          -------------------------------------------------------- */

          if (parcelBuildings.length > 0) {
            await selectBuildingById(
              parcelBuildings[0].id,
            );

            return;
          }

          /* --------------------------------------------------------
             PARCEL WITHOUT BUILDING
          -------------------------------------------------------- */

          setSelectedBuilding(undefined);
          setFloors([]);
          setProperties([]);
          setSelectedFloorFilter("ALL");
          setSelectedProperty(undefined);
          setEvidence(parcelEvidence);
          setSelectedCase(undefined);

          /* --------------------------------------------------------
             RURAL / CANDIDATE CONFIDENCE
          -------------------------------------------------------- */

          if (parcelCandidates.length > 0) {
            const candidate =
              parcelCandidates[0];

            setConfidence({
              object_id: candidate.id,

              overall_score: 91.5,

              evidence_completeness: 94.0,

              geometry_quality: 90.0,

              positional_quality: 92.0,

              cross_source_agreement: 90.0,

              validation_score: 95.0,

              label:
                "Prototype Rural Technical Confidence",

              disclaimer:
                "Spatial sensor detection indicates candidate structure. Official land survey required.",

              calculation_timestamp:
                new Date().toISOString(),
            });

            setValidation({
              property_id: parcel.id,

              overall_status: "WARNING",

              total_rules_checked: 9,

              passed_rules: 8,

              warning_rules: 1,

              failed_rules: 0,

              results: [
                {
                  id: "rur-val-01",

                  target_object_id:
                    parcel.id,

                  rule_id: "RULE_RURAL_01",

                  rule_name:
                    "Rural Structure Candidate Inspection",

                  category: "RURAL_SENSOR",

                  status: "WARNING",

                  severity: "MEDIUM",

                  message:
                    `Detected structure candidate (${candidate.permanence_classification}, H: ${candidate.estimated_height_m}m). Ground survey verification recommended.`,

                  timestamp:
                    new Date().toISOString(),
                },
              ],
            });
          } else {
            setConfidence(undefined);
            setValidation(undefined);
          }
        } catch (err: any) {
          console.error(
            `Failed to select parcel ${parcelId}`,
            err,
          );

          setError(
            err?.message ||
              "Failed to load parcel.",
          );
        } finally {
          setLoading(false);
        }
      },
      [selectBuildingById],
    );

  /* ==============================================================
     INITIAL APPLICATION LOAD
  ============================================================== */

  useEffect(() => {
    /*
     * StrictMode-safe bootstrap:
     *
     * Do NOT use a "started" ref here. In React development mode,
     * StrictMode mounts -> runs the effect -> immediately cleans it up
     * -> mounts again. A started-ref would cause the second (real)
     * effect to return while the first request is cancelled by its
     * mounted flag, leaving the context empty forever.
     */
    let mounted = true;

    const initializeApplication =
      async () => {
        try {
          setLoading(true);
          setError(null);

          const allParcels =
            await api.getParcels();

          void refreshReviewsAndAudit();

          if (!mounted) return;

          setParcels(allParcels);

          if (allParcels.length === 0) {
            clearPropertyDetails();
            setSelectedParcel(undefined);
            return;
          }

          const initialParcel =
            allParcels.find(
              (parcel) =>
                parcel.parcel_code === "P001",
            ) || allParcels[0];

          await selectParcelById(
            initialParcel.id,
          );
        } catch (err: any) {
          console.error(
            "Initial GeoVista load failed",
            err,
          );

          if (mounted) {
            setError(
              err?.message ||
                "Failed to initialize GeoVista.",
            );
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    void initializeApplication();

    return () => {
      mounted = false;
    };
  }, [
    selectParcelById,
    refreshReviewsAndAudit,
    clearPropertyDetails,
  ]);

  /* ==============================================================
     SELECT REVIEW CASE
  ============================================================== */

  const selectReviewCaseById =
    useCallback(
      async (caseId: string) => {
        try {
          setLoading(true);
          setError(null);

          const reviewCase =
            await api.getReview(caseId);

          setSelectedCase(reviewCase);

          const property =
            await api.getProperty(
              reviewCase.property_id,
            );

          const parcel =
            parcels.find(
              (item) =>
                item.id ===
                property.parcel_id,
            );

          if (
            parcel &&
            selectedParcel?.id !== parcel.id
          ) {
            setSelectedParcel(parcel);

            const parcelBuildings =
              await api.getParcelBuildings(
                parcel.id,
              );

            setBuildings(
              parcelBuildings,
            );
          }

          const building =
            buildings.find(
              (item) =>
                item.id ===
                property.building_id,
            );

          if (
            building &&
            selectedBuilding?.id !==
              building.id
          ) {
            setSelectedBuilding(
              building,
            );

            const [
              buildingFloors,
              buildingProperties,
            ] = await Promise.all([
              api.getBuildingFloors(
                building.id,
              ),

              api.getBuildingProperties(
                building.id,
              ),
            ]);

            setFloors(
              buildingFloors,
            );

            setProperties(
              buildingProperties,
            );
          }

          await selectPropertyById(
            property.id,
          );
        } catch (err: any) {
          console.error(
            `Failed to select review case ${caseId}`,
            err,
          );

          setError(
            err?.message ||
              "Failed to load review case.",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        parcels,
        buildings,
        selectedParcel,
        selectedBuilding,
        selectPropertyById,
      ],
    );

  /* ==============================================================
     OFFICER: CORRECT PROPERTY
  ============================================================== */

  const correctProperty =
    useCallback(
      async (
        caseId: string,
        data: {
          z_min_m?: number;
          z_max_m?: number;
          footprint_2d?: number[][];
          reason: string;
        },
      ) => {
        try {
          setLoading(true);
          setError(null);

          const updatedUnit =
            await api.correctProperty(
              caseId,
              data,
            );

          setProperties((previous) =>
            previous.map((unit) =>
              unit.id === updatedUnit.id
                ? updatedUnit
                : unit,
            ),
          );

          setSelectedProperty(
            updatedUnit,
          );

          const [
            updatedValidation,
            updatedConfidence,
            updatedCase,
          ] = await Promise.all([
            api.getPropertyValidation(
              updatedUnit.id,
            ),

            api.getPropertyConfidence(
              updatedUnit.id,
            ),

            api.getReview(caseId),
          ]);

          setValidation(
            updatedValidation,
          );

          setConfidence(
            updatedConfidence,
          );

          setSelectedCase(
            updatedCase,
          );

          await refreshReviewsAndAudit();

          setViewerRevision(
            (revision) =>
              revision + 1,
          );
        } catch (err: any) {
          console.error(
            "Failed to correct property geometry",
            err,
          );

          setError(
            err?.message ||
              "Failed to correct property.",
          );

          throw err;
        } finally {
          setLoading(false);
        }
      },
      [refreshReviewsAndAudit],
    );

  /* ==============================================================
     OFFICER: APPROVE
  ============================================================== */

  const approveReview =
    useCallback(
      async (
        caseId: string,
        reason: string,
      ) => {
        try {
          setLoading(true);
          setError(null);

          const updatedCase =
            await api.approveReview(
              caseId,
              reason,
            );

          setSelectedCase(
            updatedCase,
          );

          if (selectedProperty) {
            const updatedProperty =
              await api.getProperty(
                selectedProperty.id,
              );

            setSelectedProperty(
              updatedProperty,
            );

            setProperties(
              (previous) =>
                previous.map((unit) =>
                  unit.id ===
                  updatedProperty.id
                    ? updatedProperty
                    : unit,
                ),
            );
          }

          await refreshReviewsAndAudit();

          setViewerRevision(
            (revision) =>
              revision + 1,
          );
        } catch (err: any) {
          console.error(
            "Failed to approve review",
            err,
          );

          setError(
            err?.message ||
              "Failed to approve review.",
          );

          throw err;
        } finally {
          setLoading(false);
        }
      },
      [
        selectedProperty,
        refreshReviewsAndAudit,
      ],
    );

  /* ==============================================================
     OFFICER: REJECT
  ============================================================== */

  const rejectReview =
    useCallback(
      async (
        caseId: string,
        reason: string,
      ) => {
        try {
          setLoading(true);
          setError(null);

          const updatedCase =
            await api.rejectReview(
              caseId,
              reason,
            );

          setSelectedCase(
            updatedCase,
          );

          if (selectedProperty) {
            const updatedProperty =
              await api.getProperty(
                selectedProperty.id,
              );

            setSelectedProperty(
              updatedProperty,
            );

            setProperties(
              (previous) =>
                previous.map((unit) =>
                  unit.id ===
                  updatedProperty.id
                    ? updatedProperty
                    : unit,
                ),
            );
          }

          await refreshReviewsAndAudit();

          setViewerRevision(
            (revision) =>
              revision + 1,
          );
        } catch (err: any) {
          console.error(
            "Failed to reject review",
            err,
          );

          setError(
            err?.message ||
              "Failed to reject review.",
          );

          throw err;
        } finally {
          setLoading(false);
        }
      },
      [
        selectedProperty,
        refreshReviewsAndAudit,
      ],
    );

  /* ==============================================================
     VALIDATE CURRENT PROPERTY
  ============================================================== */

  const runValidationForCurrentProperty =
    useCallback(async () => {
      if (!selectedProperty) return;

      try {
        setLoading(true);
        setError(null);

        const updatedValidation =
          await api.validateProperty(
            selectedProperty.id,
          );

        setValidation(
          updatedValidation,
        );

        const updatedConfidence =
          await api.getPropertyConfidence(
            selectedProperty.id,
          );

        setConfidence(
          updatedConfidence,
        );
      } catch (err: any) {
        console.error(
          "Validation execution error",
          err,
        );

        setError(
          err?.message ||
            "Validation failed.",
        );
      } finally {
        setLoading(false);
      }
    }, [selectedProperty]);

  /* ==============================================================
     SIMULATION: RESET
  ============================================================== */

  const resetSimulation =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const result =
          await api.resetSimulation();

        setCameraState(null);

        const [
          allParcels,
        ] = await Promise.all([
          api.getParcels(),
          refreshReviewsAndAudit(),
        ]);

        setParcels(allParcels);

        if (allParcels.length > 0) {
          const initialParcel =
            allParcels.find(
              (parcel) =>
                parcel.parcel_code === "P001",
            ) || allParcels[0];

          await selectParcelById(
            initialParcel.id,
          );
        }

        setViewerRevision(
          (revision) =>
            revision + 1,
        );

        return result.message;
      } catch (err: any) {
        console.error(
          "Failed to reset simulation",
          err,
        );

        setError(
          err?.message ||
            "Failed to reset simulation.",
        );

        throw err;
      } finally {
        setLoading(false);
      }
    }, [
      refreshReviewsAndAudit,
      selectParcelById,
    ]);

  /* ==============================================================
     SIMULATION: SPATIAL ERROR
  ============================================================== */

  const triggerSpatialError =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        await api.triggerSpatialError();

        await selectPropertyById(
          "prop-b1-u302",
        );

        await refreshReviewsAndAudit();

        setViewerRevision(
          (revision) =>
            revision + 1,
        );
      } catch (err: any) {
        console.error(
          "Failed to trigger spatial error",
          err,
        );

        setError(
          err?.message ||
            "Failed to trigger spatial error.",
        );

        throw err;
      } finally {
        setLoading(false);
      }
    }, [
      selectPropertyById,
      refreshReviewsAndAudit,
    ]);

  /* ==============================================================
     SIMULATION: MISSING EVIDENCE
  ============================================================== */

  const triggerMissingEvidence =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        await api.triggerMissingEvidence();

        await selectPropertyById(
          "prop-b1-u401",
        );

        setViewerRevision(
          (revision) =>
            revision + 1,
        );
      } catch (err: any) {
        console.error(
          "Failed to trigger missing evidence",
          err,
        );

        setError(
          err?.message ||
            "Failed to trigger missing evidence.",
        );

        throw err;
      } finally {
        setLoading(false);
      }
    }, [selectPropertyById]);

  /* ==============================================================
     SIMULATION: MULTI SOURCE CONFLICT
  ============================================================== */

  const triggerMultiSourceConflict =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        await api.triggerMultiSourceConflict();

        if (selectedProperty) {
          await selectPropertyById(
            selectedProperty.id,
          );
        }

        setViewerRevision(
          (revision) =>
            revision + 1,
        );
      } catch (err: any) {
        console.error(
          "Failed to trigger multi-source conflict",
          err,
        );

        setError(
          err?.message ||
            "Failed to trigger conflict.",
        );

        throw err;
      } finally {
        setLoading(false);
      }
    }, [
      selectedProperty,
      selectPropertyById,
    ]);

  /* ==============================================================
     SEARCH CADASTRE
  ============================================================== */

  const searchCadastre =
    useCallback(
      async (query: string) => {
        const normalizedQuery =
          query.trim();

        if (!normalizedQuery) return;

        try {
          setLoading(true);
          setError(null);

          const result =
            await api.search(
              normalizedQuery,
            );

          if (
            !result.results ||
            result.results.length === 0
          ) {
            setError(
              `No cadastral result found for "${normalizedQuery}".`,
            );

            return;
          }

          const firstResult =
            result.results[0];

          /* --------------------------------------------------------
             PARCEL
          -------------------------------------------------------- */

          if (
            firstResult.type ===
            "PARCEL"
          ) {
            await selectParcelById(
              firstResult.id,
            );

            return;
          }

          /* --------------------------------------------------------
             PROPERTY UNIT
          -------------------------------------------------------- */

          if (
            firstResult.type ===
            "PROPERTY_UNIT"
          ) {
            const property =
              await api.getProperty(
                firstResult.id,
              );

            const parcel =
              parcels.find(
                (item) =>
                  item.id ===
                  property.parcel_id,
              );

            if (parcel) {
              await selectParcelById(
                parcel.id,
              );
            }

            await selectPropertyById(
              property.id,
            );

            return;
          }

          /* --------------------------------------------------------
             BUILDING
          -------------------------------------------------------- */

          if (
            firstResult.type ===
            "BUILDING"
          ) {
            const building =
              await api.getBuilding(
                firstResult.id,
              );

            const parcel =
              parcels.find(
                (item) =>
                  item.id ===
                  building.parcel_id,
              );

            if (parcel) {
              await selectParcelById(
                parcel.id,
              );
            }

            await selectBuildingById(
              building.id,
            );
          }
        } catch (err: any) {
          console.error(
            "Cadastre search failed",
            err,
          );

          setError(
            err?.message ||
              "Cadastre search failed.",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        parcels,
        selectParcelById,
        selectPropertyById,
        selectBuildingById,
      ],
    );

  /* ==============================================================
     CONTEXT VALUE
  ============================================================== */

  const contextValue: GeoVistaContextType = {
    /* Navigation */
    currentTab,
    setCurrentTab,

    /* Data */
    parcels,
    selectedParcel,

    buildings,
    selectedBuilding,

    floors,

    properties,
    selectedProperty,

    selectedFloorFilter,
    setSelectedFloorFilter,

    underground,
    elevated,
    candidates,

    evidence,
    confidence,
    validation,

    reviewCases,
    selectedCase,
    auditLog,

    loading,
    error,

    /* Viewer */
    cameraState,
    setCameraState,

    activeLayers,
    toggleLayer,

    viewerRevision,

    /* Selection */
    selectParcelById,
    selectBuildingById,
    selectPropertyById,
    selectReviewCaseById,

    /* Officer */
    correctProperty,
    approveReview,
    rejectReview,
    runValidationForCurrentProperty,

    /* Simulation */
    resetSimulation,
    triggerSpatialError,
    triggerMissingEvidence,
    triggerMultiSourceConflict,

    /* Search */
    searchCadastre,
  };

  return (
    <GeoVistaContext.Provider
      value={contextValue}
    >
      {children}
    </GeoVistaContext.Provider>
  );
};

/* ================================================================
   HOOK
================================================================ */

export const useGeoVista =
  (): GeoVistaContextType => {
    const context =
      useContext(GeoVistaContext);

    if (!context) {
      throw new Error(
        "useGeoVista must be used within a GeoVistaProvider",
      );
    }

    return context;
  };
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
  AuditEvent
} from '../types';
import { api } from '../services/api';

export interface CameraState {
  radius: number;
  theta: number;
  phi: number;
  target: [number, number, number];
  propertyId: string; // tracks which property this camera state was set for
}

export interface ActiveLayers {
  showUnderground: boolean;
  showElevated: boolean;
  showCandidates: boolean;
  showBuildingEnvelope: boolean;
  showParcelBoundary: boolean;
}

interface GeoVistaContextType {
  // Navigation
  currentTab: 'public' | 'officer' | 'scenarios';
  setCurrentTab: (tab: 'public' | 'officer' | 'scenarios') => void;

  // Data
  parcels: Parcel[];
  selectedParcel: Parcel | undefined;
  buildings: Building[];
  selectedBuilding: Building | undefined;
  floors: Floor[];
  properties: PropertyUnit[];
  selectedProperty: PropertyUnit | undefined;
  selectedFloorFilter: number | 'ALL';
  setSelectedFloorFilter: (floor: number | 'ALL') => void;

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

  // 3D Viewer State
  cameraState: CameraState | null;
  setCameraState: (cam: CameraState) => void;
  activeLayers: ActiveLayers;
  toggleLayer: (layer: keyof ActiveLayers) => void;
  viewerRevision: number;

  // Actions
  selectParcelById: (parcelId: string) => Promise<void>;
  selectBuildingById: (buildingId: string) => Promise<void>;
  selectPropertyById: (propertyId: string) => Promise<void>;
  selectReviewCaseById: (caseId: string) => Promise<void>;

  correctProperty: (
    caseId: string,
    data: { z_min_m?: number; z_max_m?: number; footprint_2d?: number[][]; reason: string }
  ) => Promise<void>;
  approveReview: (caseId: string, reason: string) => Promise<void>;
  rejectReview: (caseId: string, reason: string) => Promise<void>;
  runValidationForCurrentProperty: () => Promise<void>;

  resetSimulation: () => Promise<string>;
  triggerSpatialError: () => Promise<void>;
  triggerMissingEvidence: () => Promise<void>;
  triggerMultiSourceConflict: () => Promise<void>;
  searchCadastre: (query: string) => Promise<void>;
}

const GeoVistaContext = createContext<GeoVistaContextType | undefined>(undefined);

export const GeoVistaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<'public' | 'officer' | 'scenarios'>('public');

  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | undefined>();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | undefined>();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [properties, setProperties] = useState<PropertyUnit[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertyUnit | undefined>();
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<number | 'ALL'>('ALL');

  const [underground, setUnderground] = useState<Infrastructure[]>([]);
  const [elevated, setElevated] = useState<Infrastructure[]>([]);
  const [candidates, setCandidates] = useState<StructureCandidate[]>([]);

  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [confidence, setConfidence] = useState<ConfidenceScore | undefined>();
  const [validation, setValidation] = useState<ValidationSummary | undefined>();

  const [reviewCases, setReviewCases] = useState<ReviewCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<ReviewCase | undefined>();
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [cameraState, setCameraState] = useState<CameraState | null>(null);
  const [viewerRevision, setViewerRevision] = useState<number>(0);
  const [activeLayers, setActiveLayers] = useState<ActiveLayers>({
    showUnderground: true,
    showElevated: true,
    showCandidates: true,
    showBuildingEnvelope: true,
    showParcelBoundary: true
  });

  const toggleLayer = (layer: keyof ActiveLayers) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Helper to load review cases & audit log
  const refreshReviewsAndAudit = useCallback(async () => {
    try {
      const [cases, logs] = await Promise.all([api.getReviews(), api.getAuditLog()]);
      setReviewCases(cases);
      setAuditLog(logs);
      return { cases, logs };
    } catch (err) {
      console.error('Failed to load reviews and audit logs', err);
      return { cases: [], logs: [] };
    }
  }, []);

  // Generic Property Selection
  const selectPropertyById = useCallback(async (propertyId: string) => {
    try {
      setLoading(true);
      const prop = await api.getProperty(propertyId);
      setSelectedProperty(prop);

      // Fetch evidence, confidence, and validation in parallel
      const [evs, conf, val] = await Promise.all([
        api.getPropertyEvidence(prop.id).catch(() => []),
        api.getPropertyConfidence(prop.id).catch(() => undefined),
        api.getPropertyValidation(prop.id).catch(() => undefined)
      ]);
      setEvidence(evs);
      setConfidence(conf);
      setValidation(val);

      // Check if there is an active review case for this property
      setReviewCases((currentCases) => {
        const matchingCase = currentCases.find((c) => c.property_id === prop.id);
        setSelectedCase(matchingCase);
        return currentCases;
      });
    } catch (err: any) {
      console.error(`Failed to select property ${propertyId}`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Generic Building Selection
  const selectBuildingById = useCallback(
    async (buildingId: string) => {
      try {
        setLoading(true);
        const bld = await api.getBuilding(buildingId);
        setSelectedBuilding(bld);

        const [flrs, units] = await Promise.all([
          api.getBuildingFloors(bld.id),
          api.getBuildingProperties(bld.id)
        ]);
        setFloors(flrs);
        setProperties(units);

        if (units.length > 0) {
          await selectPropertyById(units[0].id);
        } else {
          setSelectedProperty(undefined);
          setEvidence([]);
          setConfidence(undefined);
          setValidation(undefined);
        }
      } catch (err: any) {
        console.error(`Failed to select building ${buildingId}`, err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [selectPropertyById]
  );

  // Generic Parcel Selection Pipeline (Goal 4)
  const selectParcelById = useCallback(
    async (parcelId: string) => {
      try {
        setLoading(true);
        setError(null);

        const parcel = await api.getParcel(parcelId);
        setSelectedParcel(parcel);

        // Fetch buildings, infrastructures, candidates, and parcel-level evidence in parallel
        const [blds, infras, cands, parcelEvs] = await Promise.all([
          api.getParcelBuildings(parcel.id).catch(() => []),
          api.getParcelInfrastructures(parcel.id).catch(() => []),
          api.getParcelCandidates(parcel.id).catch(() => []),
          api.getParcelEvidence(parcel.id).catch(() => [])
        ]);

        setBuildings(blds);
        setUnderground(infras.filter((i) => i.z_min_m < 500.0));
        setElevated(infras.filter((i) => i.z_min_m >= 500.0));
        setCandidates(cands);

        if (blds.length > 0) {
          // Parcel has buildings -> select first building
          await selectBuildingById(blds[0].id);
        } else {
          // Parcel has NO buildings (e.g. P003 transport corridor, or R001/R002/R003 rural parcel)
          setSelectedBuilding(undefined);
          setFloors([]);
          setProperties([]);
          setSelectedProperty(undefined);
          setEvidence(parcelEvs);

          // If parcel has candidates or infrastructure, create contextual confidence & validation summary
          if (cands.length > 0) {
            setConfidence({
              object_id: cands[0].id,
              overall_score: 91.5,
              evidence_completeness: 94.0,
              geometry_quality: 90.0,
              positional_quality: 92.0,
              cross_source_agreement: 90.0,
              validation_score: 95.0,
              label: 'Prototype Rural Technical Confidence',
              disclaimer: 'Spatial sensor detection indicates candidate structure. Official land survey required.',
              calculation_timestamp: new Date().toISOString()
            });
            setValidation({
              property_id: parcel.id,
              overall_status: 'WARNING',
              total_rules_checked: 9,
              passed_rules: 8,
              warning_rules: 1,
              failed_rules: 0,
              results: [
                {
                  id: 'rur-val-01',
                  target_object_id: parcel.id,
                  rule_id: 'RULE_RURAL_01',
                  rule_name: 'Rural Structure Candidate Inspection',
                  category: 'RURAL_SENSOR',
                  status: 'WARNING',
                  severity: 'MEDIUM',
                  message: `Detected structure candidate (${cands[0].permanence_classification}, H: ${cands[0].estimated_height_m}m). Ground survey verification recommended.`,
                  timestamp: new Date().toISOString()
                }
              ]
            });
          } else {
            setConfidence(undefined);
            setValidation(undefined);
          }
        }
      } catch (err: any) {
        console.error(`Failed to select parcel ${parcelId}`, err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [selectBuildingById]
  );

  // Initial Load on mount
  useEffect(() => {
    let isMounted = true;
    const initApp = async () => {
      try {
        setLoading(true);
        const [allParcels] = await Promise.all([api.getParcels(), refreshReviewsAndAudit()]);

        if (!isMounted) return;
        setParcels(allParcels);

        if (allParcels.length > 0) {
          // Default load P001 cleanly
          const initialParcel = allParcels.find((p) => p.parcel_code === 'P001') || allParcels[0];
          await selectParcelById(initialParcel.id);
        }
      } catch (err: any) {
        console.error('Initial load error', err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initApp();
    return () => {
      isMounted = false;
    };
  }, [selectParcelById, refreshReviewsAndAudit]);

  // Generic Review Case Selection
  const selectReviewCaseById = useCallback(
    async (caseId: string) => {
      try {
        setLoading(true);
        const c = await api.getReview(caseId);
        setSelectedCase(c);

        // Resolve the property associated with this case
        const prop = await api.getProperty(c.property_id);
        // Find parcel
        const p = parcels.find((item) => item.id === prop.parcel_id);
        if (p && selectedParcel?.id !== p.id) {
          setSelectedParcel(p);
          const blds = await api.getParcelBuildings(p.id);
          setBuildings(blds);
        }
        const b = buildings.find((item) => item.id === prop.building_id);
        if (b && selectedBuilding?.id !== b.id) {
          setSelectedBuilding(b);
          const [flrs, units] = await Promise.all([
            api.getBuildingFloors(b.id),
            api.getBuildingProperties(b.id)
          ]);
          setFloors(flrs);
          setProperties(units);
        }

        await selectPropertyById(prop.id);
      } catch (err: any) {
        console.error(`Failed to select review case ${caseId}`, err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [parcels, selectedParcel, buildings, selectedBuilding, selectPropertyById]
  );

  // Officer Mutation: Geometry Correction (Goal 3)
  const correctProperty = useCallback(
    async (
      caseId: string,
      data: { z_min_m?: number; z_max_m?: number; footprint_2d?: number[][]; reason: string }
    ) => {
      try {
        setLoading(true);
        const updatedUnit = await api.correctProperty(caseId, data);

        // 1. Update authoritative property in list and selected
        setProperties((prev) => prev.map((u) => (u.id === updatedUnit.id ? updatedUnit : u)));
        setSelectedProperty(updatedUnit);

        // 2. Re-fetch validation, confidence, and review case
        const [val, conf, c] = await Promise.all([
          api.getPropertyValidation(updatedUnit.id),
          api.getPropertyConfidence(updatedUnit.id),
          api.getReview(caseId)
        ]);

        setValidation(val);
        setConfidence(conf);
        setSelectedCase(c);

        // 3. Refresh review cases list & audit log
        await refreshReviewsAndAudit();

        // 4. Invalidate 3D viewer cache so mesh regenerates immediately
        setViewerRevision((rev) => rev + 1);
      } catch (err: any) {
        console.error('Failed to correct property geometry', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshReviewsAndAudit]
  );

  // Officer Mutation: Approve
  const approveReview = useCallback(
    async (caseId: string, reason: string) => {
      try {
        setLoading(true);
        const updatedCase = await api.approveReview(caseId, reason);
        setSelectedCase(updatedCase);

        if (selectedProperty) {
          const updatedProp = await api.getProperty(selectedProperty.id);
          setSelectedProperty(updatedProp);
          setProperties((prev) => prev.map((u) => (u.id === updatedProp.id ? updatedProp : u)));
        }

        await refreshReviewsAndAudit();
        setViewerRevision((rev) => rev + 1);
      } catch (err: any) {
        console.error('Failed to approve review', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [selectedProperty, refreshReviewsAndAudit]
  );

  // Officer Mutation: Reject
  const rejectReview = useCallback(
    async (caseId: string, reason: string) => {
      try {
        setLoading(true);
        const updatedCase = await api.rejectReview(caseId, reason);
        setSelectedCase(updatedCase);

        if (selectedProperty) {
          const updatedProp = await api.getProperty(selectedProperty.id);
          setSelectedProperty(updatedProp);
          setProperties((prev) => prev.map((u) => (u.id === updatedProp.id ? updatedProp : u)));
        }

        await refreshReviewsAndAudit();
        setViewerRevision((rev) => rev + 1);
      } catch (err: any) {
        console.error('Failed to reject review', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [selectedProperty, refreshReviewsAndAudit]
  );

  // Run validation on demand
  const runValidationForCurrentProperty = useCallback(async () => {
    if (!selectedProperty) return;
    try {
      setLoading(true);
      const val = await api.validateProperty(selectedProperty.id);
      setValidation(val);
      const conf = await api.getPropertyConfidence(selectedProperty.id);
      setConfidence(conf);
    } catch (err: any) {
      console.error('Validation execution error', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedProperty]);

  // Simulation: Reset All
  const resetSimulation = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.resetSimulation();
      setCameraState(null);

      // Re-initialize entire application state
      const [allParcels] = await Promise.all([api.getParcels(), refreshReviewsAndAudit()]);
      setParcels(allParcels);

      if (allParcels.length > 0) {
        const p1 = allParcels.find((p) => p.parcel_code === 'P001') || allParcels[0];
        await selectParcelById(p1.id);
      }

      setViewerRevision((rev) => rev + 1);
      return res.message;
    } catch (err: any) {
      console.error('Failed to reset simulation', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshReviewsAndAudit, selectParcelById]);

  // Simulation: Spatial Error (Scenario 4)
  const triggerSpatialError = useCallback(async () => {
    try {
      setLoading(true);
      await api.triggerSpatialError();
      // Unit 302 now has vertical overlap with Unit 301
      // Re-fetch unit 302
      await selectPropertyById('prop-b1-u302');
      await refreshReviewsAndAudit();
      setViewerRevision((rev) => rev + 1);
    } catch (err: any) {
      console.error('Failed to trigger spatial error', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectPropertyById, refreshReviewsAndAudit]);

  // Simulation: Missing Evidence (Scenario 8)
  const triggerMissingEvidence = useCallback(async () => {
    try {
      setLoading(true);
      await api.triggerMissingEvidence();
      // Re-fetch unit 401
      await selectPropertyById('prop-b1-u401');
      setViewerRevision((rev) => rev + 1);
    } catch (err: any) {
      console.error('Failed to trigger missing evidence', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectPropertyById]);

  // Simulation: Multi-source conflict (Scenario 3)
  const triggerMultiSourceConflict = useCallback(async () => {
    try {
      setLoading(true);
      await api.triggerMultiSourceConflict();
      if (selectedProperty) {
        await selectPropertyById(selectedProperty.id);
      }
      setViewerRevision((rev) => rev + 1);
    } catch (err: any) {
      console.error('Failed to trigger conflict', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedProperty, selectPropertyById]);

  // Search Cadastre
  const searchCadastre = useCallback(
    async (query: string) => {
      if (!query.trim()) return;
      try {
        setLoading(true);
        const res = await api.search(query.trim());
        if (res.results.length > 0) {
          const first = res.results[0];
          if (first.type === 'PARCEL') {
            await selectParcelById(first.id);
          } else if (first.type === 'PROPERTY_UNIT') {
            const prop = await api.getProperty(first.id);
            const p = parcels.find((item) => item.id === prop.parcel_id);
            if (p) await selectParcelById(p.id);
            await selectPropertyById(prop.id);
          } else if (first.type === 'BUILDING') {
            const b = await api.getBuilding(first.id);
            const p = parcels.find((item) => item.id === b.parcel_id);
            if (p) await selectParcelById(p.id);
            await selectBuildingById(b.id);
          }
        }
      } catch (err: any) {
        console.error('Search error', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [parcels, selectParcelById, selectPropertyById, selectBuildingById]
  );

  return (
    <GeoVistaContext.Provider
      value={{
        currentTab,
        setCurrentTab,
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
        cameraState,
        setCameraState,
        activeLayers,
        toggleLayer,
        viewerRevision,
        selectParcelById,
        selectBuildingById,
        selectPropertyById,
        selectReviewCaseById,
        correctProperty,
        approveReview,
        rejectReview,
        runValidationForCurrentProperty,
        resetSimulation,
        triggerSpatialError,
        triggerMissingEvidence,
        triggerMultiSourceConflict,
        searchCadastre
      }}
    >
      {children}
    </GeoVistaContext.Provider>
  );
};

export const useGeoVista = (): GeoVistaContextType => {
  const context = useContext(GeoVistaContext);
  if (!context) {
    throw new Error('useGeoVista must be used within a GeoVistaProvider');
  }
  return context;
};

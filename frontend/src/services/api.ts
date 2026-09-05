import {
  Parcel,
  Building,
  Floor,
  PropertyUnit,
  PropertyGeometry,
  Evidence,
  ValidationSummary,
  ConfidenceScore,
  ReviewCase,
  IssueReport,
  Infrastructure,
  StructureCandidate,
  SearchResponse,
  AuditEvent
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text();
    let detail = errorText;
    try {
      const json = JSON.parse(errorText);
      detail = json.detail || errorText;
    } catch (_) {}
    throw new Error(detail || `HTTP error ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Health
  getHealth: () => fetch(`${API_BASE}/health`).then(handleResponse<{ status: string; project: string }>),

  // Search
  search: (query: string): Promise<SearchResponse> =>
    fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`).then(handleResponse<SearchResponse>),

  // Parcels
  getParcels: (areaType?: 'URBAN' | 'RURAL'): Promise<Parcel[]> => {
    const url = areaType ? `${API_BASE}/api/parcels?area_type=${areaType}` : `${API_BASE}/api/parcels`;
    return fetch(url).then(handleResponse<Parcel[]>);
  },
  getParcel: (id: string): Promise<Parcel> =>
    fetch(`${API_BASE}/api/parcels/${id}`).then(handleResponse<Parcel>),
  getParcelBuildings: (parcelId: string): Promise<Building[]> =>
    fetch(`${API_BASE}/api/parcels/${parcelId}/buildings`).then(handleResponse<Building[]>),
  getParcelInfrastructures: (parcelId: string): Promise<Infrastructure[]> =>
    fetch(`${API_BASE}/api/parcels/${parcelId}/infrastructures`).then(handleResponse<Infrastructure[]>),
  getParcelCandidates: (parcelId: string): Promise<StructureCandidate[]> =>
    fetch(`${API_BASE}/api/parcels/${parcelId}/candidates`).then(handleResponse<StructureCandidate[]>),
  getParcelEvidence: (parcelId: string): Promise<Evidence[]> =>
    fetch(`${API_BASE}/api/parcels/${parcelId}/evidence`).then(handleResponse<Evidence[]>),

  // Buildings
  getBuildings: (): Promise<Building[]> =>
    fetch(`${API_BASE}/api/buildings`).then(handleResponse<Building[]>),
  getBuilding: (id: string): Promise<Building> =>
    fetch(`${API_BASE}/api/buildings/${id}`).then(handleResponse<Building>),
  getBuildingFloors: (id: string): Promise<Floor[]> =>
    fetch(`${API_BASE}/api/buildings/${id}/floors`).then(handleResponse<Floor[]>),
  getBuildingProperties: (id: string): Promise<PropertyUnit[]> =>
    fetch(`${API_BASE}/api/buildings/${id}/properties`).then(handleResponse<PropertyUnit[]>),

  // Properties
  getProperties: (): Promise<PropertyUnit[]> =>
    fetch(`${API_BASE}/api/properties`).then(handleResponse<PropertyUnit[]>),
  getProperty: (id: string): Promise<PropertyUnit> =>
    fetch(`${API_BASE}/api/properties/${id}`).then(handleResponse<PropertyUnit>),
  getPropertyGeometry: (id: string): Promise<PropertyGeometry> =>
    fetch(`${API_BASE}/api/properties/${id}/geometry`).then(handleResponse<PropertyGeometry>),
  getPropertyEvidence: (id: string): Promise<Evidence[]> =>
    fetch(`${API_BASE}/api/properties/${id}/evidence`).then(handleResponse<Evidence[]>),
  getPropertyConfidence: (id: string): Promise<ConfidenceScore> =>
    fetch(`${API_BASE}/api/properties/${id}/confidence`).then(handleResponse<ConfidenceScore>),
  getPropertyValidation: (id: string): Promise<ValidationSummary> =>
    fetch(`${API_BASE}/api/properties/${id}/validation`).then(handleResponse<ValidationSummary>),
  validateProperty: (id: string): Promise<ValidationSummary> =>
    fetch(`${API_BASE}/api/properties/${id}/validate`, { method: 'POST' }).then(handleResponse<ValidationSummary>),

  // Infrastructures
  getUnderground: (): Promise<Infrastructure[]> =>
    fetch(`${API_BASE}/api/infrastructures/underground`).then(handleResponse<Infrastructure[]>),
  getElevated: (): Promise<Infrastructure[]> =>
    fetch(`${API_BASE}/api/infrastructures/elevated`).then(handleResponse<Infrastructure[]>),

  // Reviews
  getReviews: (): Promise<ReviewCase[]> =>
    fetch(`${API_BASE}/api/reviews`).then(handleResponse<ReviewCase[]>),
  getReview: (id: string): Promise<ReviewCase> =>
    fetch(`${API_BASE}/api/reviews/${id}`).then(handleResponse<ReviewCase>),
  approveReview: (id: string, reason: string): Promise<ReviewCase> =>
    fetch(`${API_BASE}/api/reviews/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    }).then(handleResponse<ReviewCase>),
  rejectReview: (id: string, reason: string): Promise<ReviewCase> =>
    fetch(`${API_BASE}/api/reviews/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    }).then(handleResponse<ReviewCase>),
  correctProperty: (
    id: string,
    data: { z_min_m?: number; z_max_m?: number; footprint_2d?: number[][]; reason: string }
  ): Promise<PropertyUnit> =>
    fetch(`${API_BASE}/api/reviews/${id}/correct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse<PropertyUnit>),

  // Reports
  getReports: (): Promise<IssueReport[]> =>
    fetch(`${API_BASE}/api/reports`).then(handleResponse<IssueReport[]>),
  submitReport: (data: { property_id: string; title: string; description: string; contact_email: string; category?: string }): Promise<IssueReport> =>
    fetch(`${API_BASE}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse<IssueReport>),

  // LiDAR & AI
  analyzeLidar: (propertyId: string) =>
    fetch(`${API_BASE}/api/lidar/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: propertyId })
    }).then(handleResponse<any>),

  runBuildingExtraction: (parcelId: string) =>
    fetch(`${API_BASE}/api/ai/building-extraction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parcel_id: parcelId })
    }).then(handleResponse<any>),

  runFloorSegmentation: (buildingId: string) =>
    fetch(`${API_BASE}/api/ai/floor-segmentation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ building_id: buildingId })
    }).then(handleResponse<any>),

  // Simulations
  resetSimulation: () =>
    fetch(`${API_BASE}/api/simulation/reset`, { method: 'POST' }).then(handleResponse<any>),
  triggerSpatialError: () =>
    fetch(`${API_BASE}/api/simulation/spatial-error`, { method: 'POST' }).then(handleResponse<any>),
  triggerMissingEvidence: () =>
    fetch(`${API_BASE}/api/simulation/missing-evidence`, { method: 'POST' }).then(handleResponse<any>),
  triggerMultiSourceConflict: () =>
    fetch(`${API_BASE}/api/simulation/multi-source-conflict`, { method: 'POST' }).then(handleResponse<any>),
  getRuralCandidates: () =>
    fetch(`${API_BASE}/api/simulation/rural-structure`, { method: 'POST' }).then(handleResponse<any>),

  // Audit
  getAuditLog: (): Promise<AuditEvent[]> =>
    fetch(`${API_BASE}/api/audit`).then(handleResponse<AuditEvent[]>),
  getRevisions: (): Promise<any[]> =>
    fetch(`${API_BASE}/api/audit/revisions`).then(handleResponse<any[]>)
};

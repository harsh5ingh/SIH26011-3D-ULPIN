export type AreaType = 'URBAN' | 'RURAL';

export type VerificationStatus =
  | 'NOT_YET_VERIFIED'
  | 'PENDING_VERIFICATION'
  | 'UNDER_REVIEW'
  | 'CORRECTION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUPERSEDED';

export type EvidenceSourceType =
  | 'GIS_PARCEL'
  | 'DRONE_IMAGERY'
  | 'LIDAR'
  | 'POINT_CLOUD'
  | 'FLOOR_PLAN'
  | 'GNSS_CORS'
  | 'DEM'
  | 'DSM'
  | 'AI_DERIVED'
  | 'SYSTEM_DERIVED'
  | 'SYNTHETIC_DEMO';

export interface Parcel {
  id: string;
  parcel_code: string;
  state: string;
  district: string;
  locality: string;
  village?: string;
  area_sqm: number;
  geometry_2d: number[][];
  land_use: string;
  area_type: AreaType;
  status: string;
  metadata?: Record<string, any>;
  is_synthetic: boolean;
}

export interface Building {
  id: string;
  building_code: string;
  parcel_id: string;
  name: string;
  total_floors: number;
  basement_floors: number;
  footprint_2d: number[][];
  ground_elevation_m: number;
  total_height_m: number;
  structure_type: string;
  status: string;
}

export interface Floor {
  id: string;
  building_id: string;
  floor_number: number;
  floor_name: string;
  z_min_m: number;
  z_max_m: number;
  height_m: number;
  unit_count: number;
}

export interface PropertyUnit {
  id: string;
  property_code: string;
  parcel_id: string;
  building_id: string;
  floor_id: string;
  floor_number: number;
  unit_number: string;
  unit_type: string;
  z_min_m: number;
  z_max_m: number;
  footprint_2d: number[][];
  area_sqm: number;
  proposed_3d_id: string;
  verification_status: VerificationStatus;
  technical_confidence: number;
  primary_use: string;
  revision_number: number;
  under_review_note?: string;
  is_synthetic: boolean;
}

export interface PropertyGeometry {
  id: string;
  proposed_3d_id: string;
  footprint_2d: number[][];
  z_min_m: number;
  z_max_m: number;
  bounding_box_3d: {
    min_lng: number;
    max_lng: number;
    min_lat: number;
    max_lat: number;
    min_z_m: number;
    max_z_m: number;
  };
  area_sqm: number;
  volume_cum: number;
}

export interface Evidence {
  id: string;
  object_id: string;
  object_type: string;
  source_type: EvidenceSourceType;
  source_reference: string;
  acquisition_date: string;
  processing_method: string;
  quality_score: number;
  status: string;
  metadata?: Record<string, any>;
  is_synthetic: boolean;
}

export interface ValidationResult {
  id: string;
  target_object_id: string;
  rule_id: string;
  rule_name: string;
  category: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface ValidationSummary {
  property_id: string;
  overall_status: 'PASS' | 'WARNING' | 'FAIL';
  total_rules_checked: number;
  passed_rules: number;
  warning_rules: number;
  failed_rules: number;
  results: ValidationResult[];
}

export interface ConfidenceScore {
  object_id: string;
  overall_score: number;
  evidence_completeness: number;
  geometry_quality: number;
  positional_quality: number;
  cross_source_agreement: number;
  validation_score: number;
  label: string;
  disclaimer: string;
  calculation_timestamp: string;
}

export interface ReviewCase {
  id: string;
  property_id: string;
  case_number: string;
  status: VerificationStatus;
  priority: string;
  assigned_officer: string;
  created_at: string;
  updated_at: string;
  review_notes: string;
  history: Array<{
    timestamp: string;
    from_status: string;
    to_status: string;
    officer: string;
    notes: string;
  }>;
}

export interface IssueReport {
  id: string;
  property_id: string;
  report_code: string;
  reporter_type: string;
  category: string;
  title: string;
  description: string;
  contact_email: string;
  status: string;
  submitted_at: string;
}

export interface Infrastructure {
  id: string;
  parcel_id: string;
  infrastructure_code: string;
  name: string;
  type: string;
  z_min_m: number;
  z_max_m: number;
  geometry_2d: number[][];
  verification_status: string;
  proposed_3d_id: string;
  metadata?: Record<string, any>;
}

export interface StructureCandidate {
  id: string;
  parcel_id: string;
  detection_source: string;
  location_2d: number[];
  estimated_height_m: number;
  permanence_classification: 'LIKELY_PERMANENT' | 'LIKELY_TEMPORARY' | 'UNCERTAIN';
  false_positive_reason?: string;
  status: string;
}

export interface SearchResultItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  proposed_3d_id?: string;
  status: string;
}


export interface SearchResponse {
  query: string;
  total_results: number;
  results: SearchResultItem[];
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor_role: string;
  object_id: string;
  object_type: string;
  action: string;
  previous_state?: Record<string, any>;
  new_state?: Record<string, any>;
  notes?: string;
}

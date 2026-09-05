from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class ParcelResponse(BaseModel):
    id: str
    parcel_code: str
    state: str
    district: str
    locality: str
    village: Optional[str] = None
    area_sqm: float
    geometry_2d: List[List[float]]
    land_use: str
    area_type: str
    status: str
    metadata: Dict[str, Any] = {}
    is_synthetic: bool = True

class BuildingResponse(BaseModel):
    id: str
    building_code: str
    parcel_id: str
    name: str
    total_floors: int
    basement_floors: int
    footprint_2d: List[List[float]]
    ground_elevation_m: float
    total_height_m: float
    structure_type: str
    status: str
    metadata: Dict[str, Any] = {}

class FloorResponse(BaseModel):
    id: str
    building_id: str
    floor_number: int
    floor_name: str
    z_min_m: float
    z_max_m: float
    height_m: float
    unit_count: int

class PropertyUnitResponse(BaseModel):
    id: str
    property_code: str
    parcel_id: str
    building_id: str
    floor_id: str
    floor_number: int
    unit_number: str
    unit_type: str
    z_min_m: float
    z_max_m: float
    footprint_2d: List[List[float]]
    area_sqm: float
    proposed_3d_id: str
    verification_status: str
    technical_confidence: float
    primary_use: str
    revision_number: int = 1
    under_review_note: Optional[str] = None
    is_synthetic: bool = True

class PropertyGeometryResponse(BaseModel):
    id: str
    proposed_3d_id: str
    footprint_2d: List[List[float]]
    z_min_m: float
    z_max_m: float
    bounding_box_3d: Dict[str, float]
    area_sqm: float
    volume_cum: float

class InfrastructureResponse(BaseModel):
    id: str
    parcel_id: str
    infrastructure_code: str
    name: str
    type: str
    z_min_m: float
    z_max_m: float
    geometry_2d: List[List[float]]
    verification_status: str
    proposed_3d_id: str
    metadata: Dict[str, Any] = {}

class EvidenceResponse(BaseModel):
    id: str
    object_id: str
    object_type: str
    source_type: str
    source_reference: str
    acquisition_date: str
    processing_method: str
    quality_score: float
    status: str
    metadata: Dict[str, Any] = {}
    is_synthetic: bool = True

class ValidationResultResponse(BaseModel):
    id: str
    target_object_id: str
    rule_id: str
    rule_name: str
    category: str
    status: str
    severity: str
    message: str
    details: Dict[str, Any] = {}
    timestamp: str

class ValidationSummaryResponse(BaseModel):
    property_id: str
    overall_status: str
    total_rules_checked: int
    passed_rules: int
    warning_rules: int
    failed_rules: int
    results: List[ValidationResultResponse]

class ConfidenceScoreResponse(BaseModel):
    object_id: str
    overall_score: float
    evidence_completeness: float
    geometry_quality: float
    positional_quality: float
    cross_source_agreement: float
    validation_score: float
    label: str = "Prototype Technical Confidence"
    disclaimer: str = "This score indicates spatial data consistency and evidence completeness. It does not constitute legal title certainty."
    calculation_timestamp: str

class ReviewCaseResponse(BaseModel):
    id: str
    property_id: str
    case_number: str
    status: str
    priority: str
    assigned_officer: str
    created_at: str
    updated_at: str
    review_notes: str
    history: List[Dict[str, Any]] = []

class CreateIssueReportRequest(BaseModel):
    property_id: str
    title: str = Field(..., example="Incorrect unit height boundary")
    description: str = Field(..., example="The height for Unit 302 appears to overlap with Unit 301 on the 3rd floor.")
    contact_email: str = Field(..., example="citizen@example.in")
    category: str = "DATA_DISCREPANCY"

class IssueReportResponse(BaseModel):
    id: str
    property_id: str
    report_code: str
    reporter_type: str
    category: str
    title: str
    description: str
    contact_email: str
    status: str
    submitted_at: str

class CorrectPropertyRequest(BaseModel):
    z_min_m: Optional[float] = None
    z_max_m: Optional[float] = None
    footprint_2d: Optional[List[List[float]]] = None
    reason: str = Field(..., example="Officer geometry adjustment to eliminate vertical overlap with Unit 301")

class ReviewDecisionRequest(BaseModel):
    reason: str = Field(..., example="Officer review completed after verifying LiDAR spatial cross-section")

class LiDARAnalysisResponse(BaseModel):
    id: str
    property_id: str
    acquisition_date: str
    point_count: int
    estimated_height_m: float
    floor_heights: List[float]
    noise_level: float
    confidence: float
    source_type: str

class AIAnalysisResponse(BaseModel):
    id: str
    target_id: str
    target_type: str
    module: str
    confidence_score: float
    extracted_features: Dict[str, Any]
    timestamp: str

class StructureCandidateResponse(BaseModel):
    id: str
    parcel_id: str
    detection_source: str
    location_2d: List[float]
    estimated_height_m: float
    permanence_classification: str
    false_positive_reason: Optional[str] = None
    status: str

class AuditEventResponse(BaseModel):
    id: str
    timestamp: str
    actor_role: str
    object_id: str
    object_type: str
    action: str
    previous_state: Optional[Dict[str, Any]] = None
    new_state: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

class RevisionResponse(BaseModel):
    id: str
    property_id: str
    revision_number: int
    timestamp: str
    actor_role: str
    changed_fields: List[str]
    previous_values: Dict[str, Any]
    new_values: Dict[str, Any]
    reason: str

class SearchResultItem(BaseModel):
    id: str
    type: str  # PARCEL, BUILDING, PROPERTY_UNIT, INFRASTRUCTURE
    title: str
    subtitle: str
    proposed_3d_id: Optional[str] = None
    status: str

class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[SearchResultItem]

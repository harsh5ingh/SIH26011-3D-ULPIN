from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum
from datetime import datetime

class AreaType(str, Enum):
    URBAN = "URBAN"
    RURAL = "RURAL"

class VerificationStatus(str, Enum):
    NOT_YET_VERIFIED = "NOT_YET_VERIFIED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    UNDER_REVIEW = "UNDER_REVIEW"
    CORRECTION_REQUIRED = "CORRECTION_REQUIRED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUPERSEDED = "SUPERSEDED"

class EvidenceSourceType(str, Enum):
    GIS_PARCEL = "GIS_PARCEL"
    DRONE_IMAGERY = "DRONE_IMAGERY"
    LIDAR = "LIDAR"
    POINT_CLOUD = "POINT_CLOUD"
    FLOOR_PLAN = "FLOOR_PLAN"
    GNSS_CORS = "GNSS_CORS"
    DEM = "DEM"
    DSM = "DSM"
    AI_DERIVED = "AI_DERIVED"
    SYSTEM_DERIVED = "SYSTEM_DERIVED"
    SYNTHETIC_DEMO = "SYNTHETIC_DEMO"

class ValidationStatus(str, Enum):
    PASS = "PASS"
    WARNING = "WARNING"
    FAIL = "FAIL"

class ValidationSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class PermanenceClassification(str, Enum):
    LIKELY_PERMANENT = "LIKELY_PERMANENT"
    LIKELY_TEMPORARY = "LIKELY_TEMPORARY"
    UNCERTAIN = "UNCERTAIN"

class RoleEnum(str, Enum):
    PUBLIC_USER = "PUBLIC_USER"
    INSPECTION_OFFICER = "INSPECTION_OFFICER"
    REVIEWER = "REVIEWER"
    ADMIN = "ADMIN"

@dataclass
class Parcel:
    id: str
    parcel_code: str
    state: str
    district: str
    locality: str
    village: Optional[str]
    area_sqm: float
    geometry_2d: List[List[float]]  # [[lng, lat], ...]
    land_use: str
    area_type: AreaType
    status: str = "ACTIVE"
    metadata: Dict[str, Any] = field(default_factory=dict)
    is_synthetic: bool = True

@dataclass
class Building:
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
    status: str = "ACTIVE"
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Floor:
    id: str
    building_id: str
    floor_number: int  # -1 for basement, 0 for ground, 1 for floor 1...
    floor_name: str
    z_min_m: float
    z_max_m: float
    height_m: float
    unit_count: int

@dataclass
class PropertyUnit:
    id: str
    property_code: str
    parcel_id: str
    building_id: str
    floor_id: str
    floor_number: int
    unit_number: str
    unit_type: str  # RESIDENTIAL, COMMERCIAL, PARKING, UTILITY
    z_min_m: float
    z_max_m: float
    footprint_2d: List[List[float]]
    area_sqm: float
    proposed_3d_id: str
    verification_status: VerificationStatus
    technical_confidence: float  # 0 to 100
    primary_use: str
    revision_number: int = 1
    under_review_note: Optional[str] = None
    is_synthetic: bool = True

@dataclass
class UndergroundInfrastructure:
    id: str
    parcel_id: str
    infrastructure_code: str
    name: str
    type: str  # BASEMENT_PARKING, PIPELINE, CABLE_TUNNEL, UTILITY_CORRIDOR, DRAINAGE
    z_min_m: float
    z_max_m: float
    geometry_2d: List[List[float]]
    verification_status: VerificationStatus
    proposed_3d_id: str
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ElevatedInfrastructure:
    id: str
    parcel_id: str
    infrastructure_code: str
    name: str
    type: str  # ELEVATED_METRO, FLYOVER, SKYWALK, AIR_RIGHTS
    z_min_m: float
    z_max_m: float
    geometry_2d: List[List[float]]
    verification_status: VerificationStatus
    proposed_3d_id: str
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Evidence:
    id: str
    object_id: str
    object_type: str  # Parcel, Building, Floor, PropertyUnit, Infrastructure
    source_type: EvidenceSourceType
    source_reference: str
    acquisition_date: str
    processing_method: str
    quality_score: float  # 0 to 100
    status: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    is_synthetic: bool = True

@dataclass
class ValidationResult:
    id: str
    target_object_id: str
    rule_id: str
    rule_name: str
    category: str
    status: ValidationStatus
    severity: ValidationSeverity
    message: str
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

@dataclass
class ConfidenceScore:
    object_id: str
    overall_score: float  # 0 - 100
    evidence_completeness: float
    geometry_quality: float
    positional_quality: float
    cross_source_agreement: float
    validation_score: float
    calculation_timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

@dataclass
class ReviewCase:
    id: str
    property_id: str
    case_number: str
    status: VerificationStatus
    priority: str  # LOW, MEDIUM, HIGH, CRITICAL
    assigned_officer: str
    created_at: str
    updated_at: str
    review_notes: str
    history: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class IssueReport:
    id: str
    property_id: str
    report_code: str
    reporter_type: str = "PUBLIC_USER"
    category: str = "DATA_DISCREPANCY"
    title: str = ""
    description: str = ""
    contact_email: str = ""
    status: str = "OPEN"
    submitted_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

@dataclass
class AuditEvent:
    id: str
    timestamp: str
    actor_role: RoleEnum
    object_id: str
    object_type: str
    action: str
    previous_state: Optional[Dict[str, Any]] = None
    new_state: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

@dataclass
class Revision:
    id: str
    property_id: str
    revision_number: int
    timestamp: str
    actor_role: RoleEnum
    changed_fields: List[str]
    previous_values: Dict[str, Any]
    new_values: Dict[str, Any]
    reason: str

@dataclass
class LiDARAnalysis:
    id: str
    property_id: str
    acquisition_date: str
    point_count: int
    estimated_height_m: float
    floor_heights: List[float]
    noise_level: float
    confidence: float
    source_type: str = "SYNTHETIC_LIDAR"

@dataclass
class StructureCandidate:
    id: str
    parcel_id: str
    detection_source: str
    location_2d: List[float]
    estimated_height_m: float
    permanence_classification: PermanenceClassification
    false_positive_reason: Optional[str] = None
    status: str = "PENDING_OFFICER_REVIEW"

@dataclass
class AIAnalysis:
    id: str
    target_id: str
    target_type: str
    module: str
    confidence_score: float
    extracted_features: Dict[str, Any]
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

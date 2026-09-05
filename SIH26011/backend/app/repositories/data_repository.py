from typing import List, Dict, Any, Optional
from app.models.entities import (
    Parcel, Building, Floor, PropertyUnit, UndergroundInfrastructure,
    ElevatedInfrastructure, Evidence, ValidationResult, ReviewCase,
    IssueReport, AuditEvent, Revision, LiDARAnalysis, StructureCandidate, AIAnalysis
)
from app.services.synthetic_data import SyntheticDataGenerator

class DataRepository:
    """
    In-memory / JSON Repository abstraction for GeoVISTA.
    Architecturally ready to swap with PostGIS.
    Owns the audit_log and revisions so reset_data() clears them atomically.
    """

    def __init__(self):
        self.parcels: Dict[str, Parcel] = {}
        self.buildings: Dict[str, Building] = {}
        self.floors: Dict[str, Floor] = {}
        self.units: Dict[str, PropertyUnit] = {}
        self.underground: Dict[str, UndergroundInfrastructure] = {}
        self.elevated: Dict[str, ElevatedInfrastructure] = {}
        self.evidences: List[Evidence] = []
        self.review_cases: Dict[str, ReviewCase] = {}
        self.issue_reports: List[IssueReport] = []
        self.audit_log: List[AuditEvent] = []
        self.revisions: List[Revision] = []
        self.structure_candidates: List[StructureCandidate] = []
        self.ai_analyses: List[AIAnalysis] = []
        
        # Load seeded synthetic data
        self.reset_data()

    def reset_data(self):
        """Reset repository state to clean synthetic baseline."""
        data = SyntheticDataGenerator.generate_all()
        
        self.parcels = {p.id: p for p in data["parcels"]}
        self.buildings = {b.id: b for b in data["buildings"]}
        self.floors = {f.id: f for f in data["floors"]}
        self.units = {u.id: u for u in data["units"]}
        self.underground = {u.id: u for u in data["underground"]}
        self.elevated = {e.id: e for e in data["elevated"]}
        self.evidences = data["evidences"]
        self.review_cases = {c.id: c for c in data["review_cases"]}
        self.structure_candidates = data["structure_candidates"]
        self.issue_reports = []
        self.audit_log = []
        self.revisions = []
        self.ai_analyses = []

repository = DataRepository()


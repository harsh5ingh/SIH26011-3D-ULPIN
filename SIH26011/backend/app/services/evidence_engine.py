from typing import List
from app.models.entities import Evidence, EvidenceSourceType
import uuid
from datetime import datetime

class EvidenceEngine:
    """
    Common Multi-Sensor Spatial Evidence Manager.
    Handles 11 evidence types (GIS, Drone, LiDAR, Point Cloud, Floor Plan, GNSS, DEM, DSM, AI, System, Synthetic).
    """

    @staticmethod
    def create_evidence(
        object_id: str,
        object_type: str,
        source_type: EvidenceSourceType,
        source_reference: str,
        acquisition_date: str,
        processing_method: str,
        quality_score: float = 90.0,
        status: str = "ACTIVE",
        metadata: dict = None,
        is_synthetic: bool = True
    ) -> Evidence:
        return Evidence(
            id=str(uuid.uuid4()),
            object_id=object_id,
            object_type=object_type,
            source_type=source_type,
            source_reference=source_reference,
            acquisition_date=acquisition_date,
            processing_method=processing_method,
            quality_score=quality_score,
            status=status,
            metadata=metadata or {},
            is_synthetic=is_synthetic
        )

evidence_engine = EvidenceEngine()

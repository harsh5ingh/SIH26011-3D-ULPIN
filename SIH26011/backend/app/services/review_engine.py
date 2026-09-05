from typing import List, Dict, Any, Optional
from app.models.entities import ReviewCase, PropertyUnit, VerificationStatus, Revision, AuditEvent, RoleEnum
import uuid
from datetime import datetime, timezone


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ReviewEngine:
    """
    Human-in-the-Loop Review State Machine & Revision Manager.
    Supports state transitions: NOT_YET_VERIFIED -> PENDING_VERIFICATION -> UNDER_REVIEW -> APPROVED / CORRECTION_REQUIRED / REJECTED.
    Records revisions and immutable audit trail in the shared DataRepository.
    """

    def _get_repo(self):
        # Lazy import to avoid circular dependency; returns the shared singleton
        from app.repositories.data_repository import repository
        return repository

    def log_audit(
        self,
        actor_role: RoleEnum,
        object_id: str,
        object_type: str,
        action: str,
        previous_state: Optional[Dict[str, Any]] = None,
        new_state: Optional[Dict[str, Any]] = None,
        notes: Optional[str] = None
    ) -> AuditEvent:
        event = AuditEvent(
            id=str(uuid.uuid4()),
            timestamp=_now(),
            actor_role=actor_role,
            object_id=object_id,
            object_type=object_type,
            action=action,
            previous_state=previous_state,
            new_state=new_state,
            notes=notes
        )
        self._get_repo().audit_log.append(event)
        return event

    def create_revision(
        self,
        property_id: str,
        revision_number: int,
        actor_role: RoleEnum,
        changed_fields: List[str],
        previous_values: Dict[str, Any],
        new_values: Dict[str, Any],
        reason: str
    ) -> Revision:
        rev = Revision(
            id=str(uuid.uuid4()),
            property_id=property_id,
            revision_number=revision_number,
            timestamp=_now(),
            actor_role=actor_role,
            changed_fields=changed_fields,
            previous_values=previous_values,
            new_values=new_values,
            reason=reason
        )
        self._get_repo().revisions.append(rev)
        return rev

    def update_review_status(
        self,
        case: ReviewCase,
        new_status: VerificationStatus,
        officer_name: str,
        notes: str
    ) -> ReviewCase:
        old_status = case.status
        case.status = new_status
        case.updated_at = _now()
        case.review_notes = notes
        case.history.append({
            "timestamp": _now(),
            "from_status": old_status,
            "to_status": new_status,
            "officer": officer_name,
            "notes": notes
        })
        self.log_audit(
            actor_role=RoleEnum.INSPECTION_OFFICER,
            object_id=case.property_id,
            object_type="PropertyUnit",
            action=f"REVIEW_STATUS_CHANGED_{new_status}",
            previous_state={"status": old_status},
            new_state={"status": new_status},
            notes=f"Officer {officer_name}: {notes}"
        )
        return case


review_engine = ReviewEngine()

from fastapi import APIRouter
from typing import List
from app.repositories.data_repository import repository
from app.schemas.pydantic_schemas import AuditEventResponse, RevisionResponse

router = APIRouter(prefix="/api/audit", tags=["Audit & Revisions"])

@router.get("", response_model=List[AuditEventResponse])
def get_audit_log():
    return [AuditEventResponse(**e.__dict__) for e in repository.audit_log]

@router.get("/revisions", response_model=List[RevisionResponse])
def get_revisions():
    return [RevisionResponse(**r.__dict__) for r in repository.revisions]

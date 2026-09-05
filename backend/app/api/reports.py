from fastapi import APIRouter, HTTPException
from typing import List
from app.repositories.data_repository import repository
from app.schemas.pydantic_schemas import CreateIssueReportRequest, IssueReportResponse
from app.models.entities import IssueReport
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/reports", tags=["Public Issue Reports"])

@router.get("", response_model=List[IssueReportResponse])
def get_reports():
    return [IssueReportResponse(**r.__dict__) for r in repository.issue_reports]

@router.get("/{report_id}", response_model=IssueReportResponse)
def get_report_by_id(report_id: str):
    r = next((item for item in repository.issue_reports if item.id == report_id), None)
    if not r:
        raise HTTPException(status_code=404, detail=f"Issue report '{report_id}' not found.")
    return IssueReportResponse(**r.__dict__)

@router.post("", response_model=IssueReportResponse)
def create_issue_report(req: CreateIssueReportRequest):
    unit = repository.units.get(req.property_id)
    if not unit:
        unit = next((u for u in repository.units.values() if u.proposed_3d_id == req.property_id), None)
    if not unit:
        raise HTTPException(status_code=404, detail=f"Target property '{req.property_id}' not found.")

    report = IssueReport(
        id=str(uuid.uuid4()),
        property_id=unit.id,
        report_code=f"REP-{uuid.uuid4().hex[:6].upper()}",
        reporter_type="PUBLIC_USER",
        category=req.category,
        title=req.title,
        description=req.description,
        contact_email=req.contact_email,
        status="OPEN",
        submitted_at=datetime.utcnow().isoformat()
    )
    repository.issue_reports.append(report)
    return IssueReportResponse(**report.__dict__)

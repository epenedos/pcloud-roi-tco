from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_session
from app.engine import ENGINE_VERSION
from app.engine.calc import calculate
from app.engine.defaults import default_inputs_dict
from app.engine.models import CalcInputs
from app.models_db import Analysis, AnalysisVersion

router = APIRouter(prefix="/api/analyses", tags=["analyses"])


class CreateAnalysis(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    customer_name: str = ""
    description: str = ""
    num_passwords: int = Field(default=5000, ge=1)


class PatchAnalysis(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    customer_name: str | None = None
    description: str | None = None


class DuplicateAnalysis(BaseModel):
    name: str = Field(min_length=1, max_length=200)


def _get_or_404(session: Session, analysis_id: str, include_deleted=False) -> Analysis:
    analysis = session.get(Analysis, analysis_id)
    if analysis is None or (analysis.deleted_at is not None and not include_deleted):
        raise HTTPException(404, "Analysis not found")
    return analysis


def _ensure_name_free(session: Session, name: str, exclude_id: str | None = None):
    q = select(Analysis).where(Analysis.name == name)
    existing = session.scalars(q).first()
    if existing is not None and existing.id != exclude_id:
        raise HTTPException(409, f"An analysis named '{name}' already exists")


def _latest(analysis: Analysis) -> AnalysisVersion:
    return analysis.versions[-1]


def _append_version(session: Session, analysis: Analysis, inputs: dict) -> AnalysisVersion:
    calc_inputs = CalcInputs(**inputs)
    results = calculate(calc_inputs).model_dump(mode="json")
    seq = (analysis.versions[-1].seq + 1) if analysis.versions else 1
    version = AnalysisVersion(
        analysis_id=analysis.id,
        seq=seq,
        inputs=calc_inputs.model_dump(mode="json"),
        results=results,
        engine_version=ENGINE_VERSION,
    )
    session.add(version)
    analysis.versions.append(version)
    analysis.updated_at = datetime.now(timezone.utc)
    return version


def _headline(version: AnalysisVersion) -> dict:
    s = version.results["summary"]
    b = version.results["benefits"]
    return {
        "net_savings": s["net_savings"],
        "roi_pct": s["roi_pct"],
        "payback_months": s["payback_months"],
        "total_value": b["total_value"],
        "tshirt_size": version.results["tshirt_size"],
        "num_passwords": version.inputs["num_passwords"],
    }


def _meta(analysis: Analysis) -> dict:
    return {
        "id": analysis.id,
        "name": analysis.name,
        "customer_name": analysis.customer_name,
        "description": analysis.description,
        "created_at": analysis.created_at.isoformat(),
        "updated_at": analysis.updated_at.isoformat(),
        "deleted": analysis.deleted_at is not None,
    }


def _full(analysis: Analysis, version: AnalysisVersion) -> dict:
    return {
        **_meta(analysis),
        "version_seq": version.seq,
        "version_id": version.id,
        "engine_version": version.engine_version,
        "inputs": version.inputs,
        "results": version.results,
    }


@router.post("", status_code=201)
def create_analysis(body: CreateAnalysis, session: Session = Depends(get_session)):
    _ensure_name_free(session, body.name)
    analysis = Analysis(
        name=body.name,
        customer_name=body.customer_name,
        description=body.description,
    )
    session.add(analysis)
    session.flush()
    inputs = default_inputs_dict(num_passwords=body.num_passwords)
    version = _append_version(session, analysis, inputs)
    session.commit()
    return _full(analysis, version)


@router.get("")
def list_analyses(
    include_deleted: bool = False, session: Session = Depends(get_session)
):
    q = select(Analysis).order_by(Analysis.updated_at.desc())
    if not include_deleted:
        q = q.where(Analysis.deleted_at.is_(None))
    out = []
    for analysis in session.scalars(q).all():
        item = _meta(analysis)
        item["headline"] = _headline(_latest(analysis))
        out.append(item)
    return out


@router.get("/{analysis_id}")
def get_analysis(analysis_id: str, session: Session = Depends(get_session)):
    analysis = _get_or_404(session, analysis_id)
    return _full(analysis, _latest(analysis))


@router.put("/{analysis_id}/inputs")
def update_inputs(
    analysis_id: str, inputs: CalcInputs, session: Session = Depends(get_session)
):
    analysis = _get_or_404(session, analysis_id)
    version = _append_version(session, analysis, inputs.model_dump(mode="json"))
    session.commit()
    return _full(analysis, version)


@router.patch("/{analysis_id}")
def patch_analysis(
    analysis_id: str, body: PatchAnalysis, session: Session = Depends(get_session)
):
    analysis = _get_or_404(session, analysis_id)
    if body.name is not None and body.name != analysis.name:
        _ensure_name_free(session, body.name, exclude_id=analysis.id)
        analysis.name = body.name
    if body.customer_name is not None:
        analysis.customer_name = body.customer_name
    if body.description is not None:
        analysis.description = body.description
    analysis.updated_at = datetime.now(timezone.utc)
    session.commit()
    return _full(analysis, _latest(analysis))


@router.post("/{analysis_id}/duplicate", status_code=201)
def duplicate_analysis(
    analysis_id: str, body: DuplicateAnalysis, session: Session = Depends(get_session)
):
    source = _get_or_404(session, analysis_id)
    _ensure_name_free(session, body.name)
    copy = Analysis(
        name=body.name,
        customer_name=source.customer_name,
        description=source.description,
    )
    session.add(copy)
    session.flush()
    version = _append_version(session, copy, _latest(source).inputs)
    session.commit()
    return _full(copy, version)


@router.delete("/{analysis_id}")
def soft_delete_analysis(analysis_id: str, session: Session = Depends(get_session)):
    analysis = _get_or_404(session, analysis_id)
    analysis.deleted_at = datetime.now(timezone.utc)
    session.commit()
    return {"deleted": True, "id": analysis.id}


@router.post("/{analysis_id}/restore")
def restore_analysis(analysis_id: str, session: Session = Depends(get_session)):
    analysis = _get_or_404(session, analysis_id, include_deleted=True)
    analysis.deleted_at = None
    analysis.updated_at = datetime.now(timezone.utc)
    session.commit()
    return _full(analysis, _latest(analysis))


@router.get("/{analysis_id}/versions")
def list_versions(analysis_id: str, session: Session = Depends(get_session)):
    analysis = _get_or_404(session, analysis_id)
    return [
        {
            "version_id": v.id,
            "seq": v.seq,
            "engine_version": v.engine_version,
            "created_at": v.created_at.isoformat(),
            "headline": _headline(v),
        }
        for v in analysis.versions
    ]


@router.get("/{analysis_id}/versions/{version_id}")
def get_version(
    analysis_id: str, version_id: str, session: Session = Depends(get_session)
):
    analysis = _get_or_404(session, analysis_id)
    for v in analysis.versions:
        if v.id == version_id:
            return _full(analysis, v)
    raise HTTPException(404, "Version not found")


@router.get("/stats/count")
def count_analyses(session: Session = Depends(get_session)):
    total = session.scalar(
        select(func.count()).select_from(Analysis).where(Analysis.deleted_at.is_(None))
    )
    return {"count": total}

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.data.data_sources import all_sources, source_by_id
from app.schemas.provenance import DataFreshnessInfo, DataQualityInfo, DataSourceInfo

router = APIRouter()


@router.get("/data-sources", response_model=list[DataSourceInfo])
def list_data_sources() -> list[DataSourceInfo]:
    return [DataSourceInfo(**s) for s in all_sources()]


@router.get("/data-freshness", response_model=list[DataFreshnessInfo])
def list_data_freshness() -> list[DataFreshnessInfo]:
    # Every metric is mock-sourced in this pass — there is no ingestion
    # timestamp to report, so `as_of` is None rather than a fabricated date.
    return [
        DataFreshnessInfo(
            source_id=s["id"],
            is_demo=True,
            as_of=None,
            staleness="unknown_mock_source",
        )
        for s in all_sources()
    ]


@router.get("/data-quality", response_model=list[DataQualityInfo])
def list_data_quality() -> list[DataQualityInfo]:
    return [
        DataQualityInfo(
            source_id=s["id"],
            completeness_score=None,
            coverage_score=None,
            note="mock 데이터 소스 — 실측 완전성/커버리지 점수 없음",
        )
        for s in all_sources()
    ]


@router.get("/data-sources/{source_id}", response_model=DataSourceInfo)
def get_data_source(source_id: str) -> DataSourceInfo:
    source = source_by_id(source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="data source not found")
    return DataSourceInfo(**source)

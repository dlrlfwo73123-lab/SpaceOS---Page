"""DataProvenance / freshness / quality response shapes.

These describe, per metric, where the value is *supposed* to come from and
whether that connection is actually live yet. Every metric in this pass is
"mock" — there is no live adapter wired up — so `is_demo` is always true and
`as_of` always reflects the mock generator's static authoring date rather
than a real ingestion timestamp.
"""

from __future__ import annotations

from pydantic import BaseModel


class DataSourceInfo(BaseModel):
    id: str
    label: str
    intended_source: str
    refresh_cadence: str
    status: str
    live_adapter_implemented: bool


class DataFreshnessInfo(BaseModel):
    source_id: str
    is_demo: bool
    as_of: str | None
    staleness: str


class DataQualityInfo(BaseModel):
    source_id: str
    completeness_score: float | None
    coverage_score: float | None
    note: str

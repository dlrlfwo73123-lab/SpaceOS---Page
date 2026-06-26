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


class DataProvenance(BaseModel):
    """Full per-metric provenance record — where a value came from, how
    fresh it is, and how confident the system is in it. Mirrors
    `app/services/confidence.py`'s CONFIDENCE_WEIGHTS sub-scores so the two
    never drift apart. For mock-sourced metrics every numeric sub-score is
    0/None and `is_demo` is always true — see `mock_confidence()`.
    """

    metric_key: str
    source_id: str
    is_demo: bool
    as_of: str | None
    confidence: float
    confidence_label: str
    source_reliability: float | None
    freshness_score: float | None
    completeness_score: float | None
    coverage_score: float | None
    spatial_accuracy_score: float | None
    consistency_score: float | None
    data_limitations: list[str]

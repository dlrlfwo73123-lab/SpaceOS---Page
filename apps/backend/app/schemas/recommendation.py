"""Pydantic request/response schemas for the recommendation API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class BusinessCondition(BaseModel):
    budget_min: int = Field(ge=0)
    budget_max: int = Field(ge=0)
    area_sqm: float = Field(ge=0)
    prior_experience: bool = False


class RegionRecommendationRequest(BaseModel):
    gu_code: str
    dong_code: str
    condition: BusinessCondition


class IndustryRecommendationRequest(BaseModel):
    industry_code: str
    condition: BusinessCondition


class ScoreBreakdownItem(BaseModel):
    key: str
    label: str
    score: float
    weight: float


class ConfidenceInfo(BaseModel):
    is_demo: bool
    confidence: float
    sub_scores: dict[str, float]
    label: str


class Explanation(BaseModel):
    summary: str
    reasons: list[str]
    risks: list[str]
    recommended_checks: list[str]
    data_limitations: list[str]
    generated_by: str


class RecommendationItem(BaseModel):
    id: str
    rank: int
    gu_code: str
    gu_name: str
    dong_code: str
    dong_name: str
    industry_code: str
    industry_name: str
    total_score: int
    breakdown: list[ScoreBreakdownItem]
    confidence: ConfidenceInfo
    explanation: Explanation
    expected_monthly_revenue: float
    rent_per_33: float
    survival_rate_3y: float


class RecommendationQuery(BaseModel):
    gu_code: str | None = None
    gu_name: str | None = None
    dong_code: str | None = None
    dong_name: str | None = None
    industry_code: str | None = None
    industry_name: str | None = None


class RecommendationResult(BaseModel):
    mode: str
    is_demo: bool
    query: RecommendationQuery
    items: list[RecommendationItem]

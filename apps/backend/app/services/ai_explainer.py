"""AI explanation-only service.

Per project rule: AI never ranks or decides scores — `scoring.py` already
produced `total_score`/breakdown before this module runs. This module only
narrates those numbers in natural language, validated against a fixed
output shape (`summary`, `reasons`, `risks`, `recommended_checks`,
`data_limitations`).

No AI provider key is wired in this pass (`AI_API_KEY` env var, checked via
`is_ai_configured()`) — until one is, `explain()` always returns the
deterministic template fallback below, built only from data already present
in `stats`/`breakdown`/`confidence`, never invented content. AI keys, when
added, must stay server-side only (never sent to the frontend).
"""

from __future__ import annotations

from app.core.config import settings


def is_ai_configured() -> bool:
    return settings.ai_configured


def _top_components(breakdown: list[dict], n: int = 2) -> list[dict]:
    return sorted(breakdown, key=lambda b: b["score"] * b["weight"], reverse=True)[:n]


def _weak_components(breakdown: list[dict], n: int = 2) -> list[dict]:
    return sorted(breakdown, key=lambda b: b["score"])[:n]


def _fallback_explanation(
    area_label: str,
    industry_name: str,
    stats: dict[str, float],
    breakdown: list[dict],
    total_score: int,
    is_demo: bool,
) -> dict:
    strengths = _top_components(breakdown)
    weaknesses = _weak_components(breakdown)

    summary = (
        f"{area_label} · {industry_name} 조합의 종합 점수는 {total_score}점입니다. "
        f"{strengths[0]['label']} 항목이 가장 우세하며, {weaknesses[0]['label']} 항목이 가장 취약합니다."
    )

    reasons = [
        f"{item['label']} 점수 {item['score']}점 (가중치 {int(item['weight'] * 100)}%)"
        for item in strengths
    ]

    risks = [
        f"{item['label']} 점수 {item['score']}점으로 상대적으로 낮음"
        for item in weaknesses
    ]
    risks.append(f"폐업률 {stats['close_rate']:.1f}%, 공실률 {stats['vacancy_rate']:.1f}% 수준의 시장 변동성 존재")

    recommended_checks = [
        "현장 상권 방문 및 실제 공실/임대 시세 재확인",
        "동일 업종 기존 점포의 실제 매출·운영기간 직접 확인",
    ]

    data_limitations = []
    if is_demo:
        data_limitations.append(
            "이 결과는 데모(모의) 데이터로 산출되었으며 실제 측정값이 아닙니다 — 신뢰도(confidence)=0."
        )
    data_limitations.append("건물 단위 데이터(공실 확정 여부, 허가 정보 등)는 포함되지 않았습니다.")

    return {
        "summary": summary,
        "reasons": reasons,
        "risks": risks,
        "recommended_checks": recommended_checks,
        "data_limitations": data_limitations,
        "generated_by": "deterministic_fallback",
    }


def explain(
    area_label: str,
    industry_name: str,
    stats: dict[str, float],
    breakdown: list[dict],
    total_score: int,
    is_demo: bool,
) -> dict:
    """Returns a schema-shaped explanation object.

    Always uses the deterministic fallback in this pass since no AI provider
    is wired (`is_ai_configured()` is False without `AI_API_KEY`). When a
    provider is added, its output must be validated against this same shape
    before being returned, with the fallback as a safety net on validation
    failure — that integration is not implemented yet.
    """
    return _fallback_explanation(area_label, industry_name, stats, breakdown, total_score, is_demo)

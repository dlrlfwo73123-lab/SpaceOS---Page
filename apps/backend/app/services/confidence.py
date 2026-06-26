"""Confidence scoring for recommendation results.

Formula: source_reliability*0.20 + freshness_score*0.20 + completeness_score*0.20
+ coverage_score*0.15 + spatial_accuracy_score*0.15 + consistency_score*0.10

For the mock data source (`app/data/mock_market.py`), every sub-score is
forced to 0 and `is_demo=True` is forced — this is demo data, not measured
data, and must never be presented as if it carries real confidence. A future
live adapter computes these sub-scores from actual source metadata instead
of hardcoding zero.
"""

from __future__ import annotations

CONFIDENCE_WEIGHTS: dict[str, float] = {
    "source_reliability": 0.20,
    "freshness_score": 0.20,
    "completeness_score": 0.20,
    "coverage_score": 0.15,
    "spatial_accuracy_score": 0.15,
    "consistency_score": 0.10,
}

assert abs(sum(CONFIDENCE_WEIGHTS.values()) - 1.0) < 1e-9


def mock_confidence() -> dict:
    """Confidence object for demo/mock-sourced data — always zero, always flagged."""
    sub_scores = {key: 0.0 for key in CONFIDENCE_WEIGHTS}
    return {
        "is_demo": True,
        "confidence": 0.0,
        "sub_scores": sub_scores,
        "label": "low",
    }


def confidence_label(confidence: float) -> str:
    if confidence >= 0.66:
        return "high"
    if confidence >= 0.33:
        return "medium"
    return "low"


def live_confidence(sub_scores: dict[str, float]) -> dict:
    """Confidence object for a real (non-mock) data source.

    `sub_scores` must supply all keys in CONFIDENCE_WEIGHTS, each in [0, 1].
    Not used yet — no live adapter is wired in this pass — but kept here so
    the live-data path (see app/data/seoul_open_data.py) has a ready target.
    """
    missing = set(CONFIDENCE_WEIGHTS) - set(sub_scores)
    if missing:
        raise ValueError(f"live_confidence missing sub_scores: {sorted(missing)}")
    confidence = sum(sub_scores[key] * weight for key, weight in CONFIDENCE_WEIGHTS.items())
    return {
        "is_demo": False,
        "confidence": round(confidence, 3),
        "sub_scores": sub_scores,
        "label": confidence_label(confidence),
    }

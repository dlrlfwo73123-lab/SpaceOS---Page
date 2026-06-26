from fastapi.testclient import TestClient

from app.main import app
from app.services.scoring import WEIGHTS

client = TestClient(app)

_CONDITION = {"budget_min": 3000, "budget_max": 8000, "area_sqm": 33, "prior_experience": False}


def test_scoring_weights_sum_to_one():
    assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9


def test_by_region_returns_ranked_items_marked_as_demo():
    response = client.post(
        "/api/v1/recommendations/by-region",
        json={"gu_code": "11680", "dong_code": "11680108", "condition": _CONDITION},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "region"
    assert body["is_demo"] is True
    assert len(body["items"]) > 0
    ranks = [item["rank"] for item in body["items"]]
    assert ranks == sorted(ranks)
    scores = [item["total_score"] for item in body["items"]]
    assert scores == sorted(scores, reverse=True)
    for item in body["items"]:
        assert item["confidence"]["is_demo"] is True
        assert item["confidence"]["confidence"] == 0.0


def test_by_industry_returns_ranked_items_marked_as_demo():
    response = client.post(
        "/api/v1/recommendations/by-industry",
        json={"industry_code": "F45", "condition": _CONDITION},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "industry"
    assert body["is_demo"] is True
    assert len(body["items"]) > 0


def test_by_region_is_deterministic():
    # analysis_id is a fresh UUID per run by design (each call is a new
    # analysis run) — everything else must be byte-for-byte identical for
    # the same input and data version.
    payload = {"gu_code": "11440", "dong_code": "11440101", "condition": _CONDITION}
    first = client.post("/api/v1/recommendations/by-region", json=payload).json()
    second = client.post("/api/v1/recommendations/by-region", json=payload).json()
    first.pop("analysis_id")
    second.pop("analysis_id")
    assert first == second


def test_response_has_analysis_id_status_and_warnings():
    response = client.post(
        "/api/v1/recommendations/by-region",
        json={"gu_code": "11680", "dong_code": "11680108", "condition": _CONDITION},
    )
    body = response.json()
    assert len(body["analysis_id"]) > 0
    assert body["status"] == "success"
    assert body["missing_metrics"] == []
    assert len(body["warnings"]) > 0


def test_explanation_never_claims_real_data_when_demo():
    response = client.post(
        "/api/v1/recommendations/by-region",
        json={"gu_code": "11680", "dong_code": "11680108", "condition": _CONDITION},
    )
    body = response.json()
    for item in body["items"]:
        assert any("데모" in limitation for limitation in item["explanation"]["data_limitations"])

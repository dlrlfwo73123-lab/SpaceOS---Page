from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_plans_returns_demo_priced_catalog():
    res = client.get("/api/v1/plans")
    assert res.status_code == 200
    plans = res.json()
    assert len(plans) > 0
    for plan in plans:
        assert plan["is_demo_pricing"] is True
        assert len(plan["features"]) > 0


def test_get_plan_by_id():
    res = client.get("/api/v1/plans/pro")
    assert res.status_code == 200
    assert res.json()["id"] == "pro"


def test_get_plan_unknown_id_404():
    res = client.get("/api/v1/plans/nonexistent")
    assert res.status_code == 404


def test_entitlements_reports_payment_disabled_and_demo():
    res = client.get("/api/v1/entitlements")
    assert res.status_code == 200
    body = res.json()
    assert body["payment_enabled"] is False
    assert body["is_demo"] is True

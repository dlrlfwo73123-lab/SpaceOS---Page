from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_regions_returns_all_gu_with_dongs():
    res = client.get("/api/v1/regions")
    assert res.status_code == 200
    regions = res.json()
    assert len(regions) == 25
    assert all(len(r["dongs"]) > 0 for r in regions)


def test_get_region_by_code():
    res = client.get("/api/v1/regions/11680")
    assert res.status_code == 200
    assert res.json()["name"] == "강남구"


def test_get_region_404_for_unknown_code():
    res = client.get("/api/v1/regions/00000")
    assert res.status_code == 404


def test_list_industries_includes_all_option():
    res = client.get("/api/v1/industries")
    assert res.status_code == 200
    codes = [i["code"] for i in res.json()]
    assert "ALL" in codes
    assert "F45" in codes

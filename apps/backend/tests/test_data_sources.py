from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_data_sources_all_mock():
    res = client.get("/api/v1/data-sources")
    assert res.status_code == 200
    sources = res.json()
    assert len(sources) > 0
    assert all(s["status"] == "mock" for s in sources)
    assert all(s["live_adapter_implemented"] is False for s in sources)


def test_data_freshness_marks_demo_with_no_fabricated_timestamp():
    res = client.get("/api/v1/data-freshness")
    assert res.status_code == 200
    items = res.json()
    assert len(items) > 0
    assert all(item["is_demo"] is True for item in items)
    assert all(item["as_of"] is None for item in items)


def test_get_single_data_source_404_for_unknown_id():
    res = client.get("/api/v1/data-sources/does-not-exist")
    assert res.status_code == 404


def test_data_provenance_forces_zero_confidence_for_mock_sources():
    res = client.get("/api/v1/data-provenance")
    assert res.status_code == 200
    items = res.json()
    assert len(items) > 0
    assert all(item["is_demo"] is True for item in items)
    assert all(item["confidence"] == 0.0 for item in items)
    assert all(item["confidence_label"] == "low" for item in items)
    assert all(item["as_of"] is None for item in items)

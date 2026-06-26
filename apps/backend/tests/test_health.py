from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_reports_status_data_mode_and_version():
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["data_mode"] == "mock"
    assert len(body["version"]) > 0

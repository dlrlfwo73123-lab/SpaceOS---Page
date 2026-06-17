from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_floors_returns_nonempty_list():
    response = client.get("/api/v1/buildings/demo-building/floors")
    assert response.status_code == 200
    floors = response.json()
    assert len(floors) > 0
    for floor in floors:
        assert isinstance(floor["level"], int)
        assert isinstance(floor["industry"], str)
        assert isinstance(floor["vacant"], bool)


def test_floors_deterministic_for_same_building_id():
    first = client.get("/api/v1/buildings/gangnam-1/floors").json()
    second = client.get("/api/v1/buildings/gangnam-1/floors").json()
    assert first == second


def test_floors_differ_across_buildings():
    a = client.get("/api/v1/buildings/building-a/floors").json()
    b = client.get("/api/v1/buildings/building-b/floors").json()
    assert a != b


def test_model_returns_url_for_known_building():
    response = client.get("/api/v1/buildings/demo-building/model")
    assert response.status_code == 200
    body = response.json()
    assert body["building_id"] == "demo-building"
    assert body["model_url"] == "/models/demo-building.glb"


def test_model_404_for_building_without_model():
    response = client.get("/api/v1/buildings/no-such-building/model")
    assert response.status_code == 404


def test_history_returns_nonempty_list():
    response = client.get("/api/v1/buildings/demo-building/history")
    assert response.status_code == 200
    history = response.json()
    assert len(history) > 0
    for event in history:
        assert event["event"] in {"신규입점", "폐업", "업종변경"}
        if event["event"] == "폐업":
            assert event["close_reason_summary"]
            assert event["close_date"] is not None
        else:
            assert event["close_reason_summary"] is None


def test_history_deterministic_for_same_building_id():
    first = client.get("/api/v1/buildings/gangnam-1/history").json()
    second = client.get("/api/v1/buildings/gangnam-1/history").json()
    assert first == second

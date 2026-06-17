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

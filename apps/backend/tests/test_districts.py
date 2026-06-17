from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_heatmap_returns_feature_collection():
    response = client.get("/api/v1/heatmap")
    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "FeatureCollection"
    assert len(body["features"]) > 0


def test_heatmap_feature_has_vacancy_and_predicted_rate():
    response = client.get("/api/v1/heatmap", params={"district": "gangnam"})
    body = response.json()
    for feature in body["features"]:
        assert feature["type"] == "Feature"
        assert feature["geometry"]["type"] == "Point"
        properties = feature["properties"]
        assert 0 <= properties["vacancy_rate"] <= 1
        assert 0 <= properties["predicted_rate"] <= 1


def test_heatmap_defaults_to_lapesta_district():
    default_response = client.get("/api/v1/heatmap")
    explicit_response = client.get("/api/v1/heatmap", params={"district": "lapesta"})
    assert default_response.json() == explicit_response.json()

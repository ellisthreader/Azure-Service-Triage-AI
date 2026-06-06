from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_predict_high_priority_case() -> None:
    response = client.post(
        "/predict",
        json={
            "service_type": "housing",
            "days_open": 8,
            "previous_contacts": 4,
            "vulnerability_flag": True,
            "deprivation_band": "high",
            "channel": "phone",
            "urgency_text": "No heating and vulnerable resident affected",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["priority"] in {"low", "medium", "high"}
    assert body["confidence"] > 0
    assert body["main_reasons"]


def test_metrics_summary_after_prediction() -> None:
    client.post(
        "/predict",
        json={
            "service_type": "housing",
            "days_open": 8,
            "previous_contacts": 4,
            "vulnerability_flag": True,
            "deprivation_band": "high",
            "channel": "phone",
            "urgency_text": "No heating and vulnerable resident affected",
        },
    )

    response = client.get("/metrics/summary")

    assert response.status_code == 200
    body = response.json()
    assert body["total_predictions"] >= 1
    assert "fairness_watch" in body


def test_dashboard_summary() -> None:
    response = client.get("/dashboard/summary")

    assert response.status_code == 200
    body = response.json()
    assert body["pipeline"]
    assert body["registry"]
    assert "shap_top_features" in body

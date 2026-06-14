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
            "service_subtype": "fire_risk",
            "days_open": 5,
            "previous_contacts": 1,
            "vulnerability_flag": True,
            "deprivation_band": "high",
            "channel": "phone",
            "urgency_text": "Fire risk and also children in house",
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
            "service_subtype": "fire_risk",
            "days_open": 5,
            "previous_contacts": 1,
            "vulnerability_flag": True,
            "deprivation_band": "high",
            "channel": "phone",
            "urgency_text": "Fire risk and also children in house",
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


def test_case_queue_and_decision_receipt() -> None:
    queue_response = client.get("/cases/queue")
    assert queue_response.status_code == 200
    case_record = queue_response.json()[0]

    predict_response = client.post("/predict", json=case_record["case_request"])
    assert predict_response.status_code == 200

    decision_response = client.post(
        f"/cases/{case_record['case_id']}/decision",
        json={
            "final_priority": predict_response.json()["priority"],
            "override_reason": "",
            "officer_id": "demo.officer",
            "case_request": case_record["case_request"],
            "prediction": predict_response.json(),
        },
    )

    assert decision_response.status_code == 200
    receipt = decision_response.json()
    assert receipt["status"] == "recorded"
    assert receipt["case_id"] == case_record["case_id"]
    assert receipt["audit_id"].startswith("AUD-")
    assert receipt["action_taken"] == ""


def test_audit_summary_and_reports() -> None:
    queue_response = client.get("/cases/queue")
    assert queue_response.status_code == 200
    case_record = queue_response.json()[0]
    prediction = case_record["prediction"]

    decision_response = client.post(
        f"/cases/{case_record['case_id']}/decision",
        json={
            "final_priority": "medium" if prediction["priority"] != "medium" else "high",
            "override_reason": "Synthetic test override for feedback loop.",
            "action_taken": "Escalate internally",
            "officer_id": "demo.officer",
            "case_request": case_record["case_request"],
            "prediction": prediction,
        },
    )
    assert decision_response.status_code == 200

    summary_response = client.get("/audit/summary")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["decision_records"] >= 1
    assert "store_mode" in summary

    decisions_response = client.get("/audit/decisions")
    assert decisions_response.status_code == 200
    assert decisions_response.json()[0]["action_taken"] == "Escalate internally"

    feedback_response = client.get("/monitoring/feedback-report")
    assert feedback_response.status_code == 200
    assert feedback_response.json()["override_records"] >= 1

    drift_response = client.get("/monitoring/drift-report")
    assert drift_response.status_code == 200
    assert "service_mix_drift_score" in drift_response.json()

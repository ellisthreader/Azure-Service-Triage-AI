from fastapi.testclient import TestClient

from backend.app.main import CASE_QUEUE, app, case_with_m365_links, enrich_case_account_context


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


def test_case_source_detail_falls_back_without_m365_config() -> None:
    queue_response = client.get("/cases/queue")
    assert queue_response.status_code == 200
    case_record = queue_response.json()[0]
    source = case_record["case_notes"][0]

    response = client.get(f"/cases/{case_record['case_id']}/sources/{source['id']}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == source["id"]
    assert body["status"] in {"not_configured", "fallback"}
    assert body["body"]


def test_case_queue_infers_m365_source_types_and_stable_evidence_ids() -> None:
    queue_response = client.get("/cases/queue")
    assert queue_response.status_code == 200
    case_record = queue_response.json()[0]

    teams_note = next(item for item in case_record["case_notes"] if item["app"] == "Teams")
    outlook_contact = next(item for item in case_record["previous_contacts"] if item["app"] == "Outlook")
    sharepoint_evidence = next(item for item in case_record["evidence_items"] if item["source"] == "SharePoint")

    assert teams_note["graph_source"] == "teams"
    assert outlook_contact["graph_source"] == "outlook"
    assert sharepoint_evidence["graph_source"] == "sharepoint"
    assert sharepoint_evidence["id"]


def test_case_evidence_detail_falls_back_without_m365_config() -> None:
    queue_response = client.get("/cases/queue")
    assert queue_response.status_code == 200
    case_record = queue_response.json()[0]
    evidence = case_record["evidence_items"][0]

    response = client.get(f"/cases/{case_record['case_id']}/evidence/{evidence['id']}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == evidence["id"]
    assert body["status"] in {"not_configured", "fallback"}
    assert body["image_url"] or body["body"]


def test_all_case_cards_have_previewable_evidence_context() -> None:
    for fixture in CASE_QUEUE:
        case_record = case_with_m365_links(enrich_case_account_context(fixture))

        assert case_record.evidence_items, case_record.case_id
        assert case_record.case_notes, case_record.case_id
        assert case_record.previous_contacts, case_record.case_id

        for evidence in case_record.evidence_items:
            assert evidence.id, f"{case_record.case_id} evidence id"
            assert evidence.title.strip(), f"{case_record.case_id} evidence title"
            assert evidence.detail.strip(), f"{case_record.case_id} evidence detail"
            assert evidence.source.strip(), f"{case_record.case_id} evidence source"
            if evidence.type == "photo":
                assert evidence.image_url, f"{case_record.case_id} photo evidence image"

        for source in [*case_record.case_notes, *case_record.previous_contacts]:
            assert source.id, f"{case_record.case_id} source id"
            assert source.title.strip(), f"{case_record.case_id} source title"
            assert source.summary.strip(), f"{case_record.case_id} source summary"
            assert source.body.strip(), f"{case_record.case_id} source body"
            assert source.owner.strip(), f"{case_record.case_id} source owner"


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

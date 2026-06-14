from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_chat_greeting() -> None:
    response = client.post("/chat", json={"message": "hello, what can you do?"})
    assert response.status_code == 200
    body = response.json()
    assert body["reply"]
    assert body["suggestions"]
    assert body["prediction"] is None


def test_chat_model_explanation_has_citation() -> None:
    response = client.post("/chat", json={"message": "how does the model work?"})
    assert response.status_code == 200
    body = response.json()
    assert len(body["reply"]) > 0
    sources = {citation["source"] for citation in body["citations"]}
    assert "ml/artifacts/evaluation.json" in sources


def test_chat_triage_returns_prediction() -> None:
    response = client.post(
        "/chat",
        json={
            "message": "triage this case for me",
            "case_context": {
                "service_type": "housing",
                "service_subtype": "fire_risk",
                "days_open": 5,
                "previous_contacts": 1,
                "vulnerability_flag": True,
                "deprivation_band": "high",
                "channel": "phone",
                "urgency_text": "Fire risk and also children in house",
            },
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["prediction"] is not None
    assert body["prediction"]["priority"] in {"low", "medium", "high"}


def test_chat_triage_without_case_asks_for_details() -> None:
    response = client.post("/chat", json={"message": "score my case"})
    assert response.status_code == 200
    body = response.json()
    assert body["prediction"] is None
    assert body["reply"]


def test_chat_fairness_intent() -> None:
    response = client.post("/chat", json={"message": "is the model fair and unbiased?"})
    assert response.status_code == 200
    assert "fair" in response.json()["reply"].lower()

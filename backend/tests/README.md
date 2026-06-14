# Backend Tests

This folder contains FastAPI tests for the local Azure Council case-prioritisation API.

## Current Coverage

`test_api.py` currently verifies:

- `GET /health` returns HTTP 200 with `status: "ok"`.
- `POST /predict` accepts a high-risk fictional case.
- The prediction priority is one of `low`, `medium`, or `high`.
- The prediction confidence is positive.
- The response includes at least one explanation reason.

The tests exercise the app through `fastapi.testclient.TestClient`, so they do not require a running Uvicorn process.

## Running Tests

From the project root:

```bash
source .venv/bin/activate
pytest backend/tests
```

If dependencies are not installed:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest backend/tests
```

## Artifact State

The backend can serve predictions in two states:

- Trained model state: `ml/artifacts/case_priority_model.joblib` exists and is loaded by `ModelService`.
- Rules fallback state: no trained model is loaded, so the deterministic fallback scorer returns demo predictions.

API tests should pass in both states unless a specific test is explicitly checking artifact loading. Tests that require the trained artifact should first run:

```bash
python ml/generate_data.py
python ml/train_model.py
```

## Test Data Contract

Use the implemented backend schema when writing tests:

```json
{
  "service_type": "housing",
  "service_subtype": "fire_risk",
  "days_open": 5,
  "previous_contacts": 1,
  "vulnerability_flag": true,
  "deprivation_band": "high",
  "channel": "phone",
  "urgency_text": "Fire risk and also children in house"
}
```

Supported values:

- `service_type`: `housing`, `adult_social_care`, `highways`, `waste`, `benefits`, `council_tax`, `children_services`
- `deprivation_band`: `low`, `medium`, `high`
- `channel`: `web`, `phone`, `email`, `in_person`
- `days_open`: `0` to `365`
- `previous_contacts`: `0` to `50`
- `urgency_text`: `3` to `800` characters

## Recommended Next Tests

- Validation rejects invalid enum values.
- Validation rejects missing required fields where defaults are removed or schema policy changes.
- Validation rejects out-of-range numeric values.
- Validation rejects too-short and too-long urgency text.
- `/metrics/summary` returns zero-count demo metrics before predictions.
- `/metrics/summary` changes after predictions are recorded.
- `/model/metadata` reports trained metadata after artifact generation.
- `/explainability/sample` returns a sample case and prediction.
- A high-risk case sets `human_review_required` to true.
- Confidence and each class probability remain in the `0.0` to `1.0` range.

## Known Test Gaps

- The tests do not currently assert the full response schema.
- The tests do not cover validation failures.
- The tests do not verify model artifact loading.
- The tests do not cover monitoring state changes.
- The tests do not cover the future API contract described in `backend/API_CONTRACT.md`.
- The tests do not include performance, concurrency, security, or privacy guardrail checks.

# Testing Strategy

This project is a portfolio-ready local demo for fictional council case prioritisation. Testing should prove that the demo runs end to end, that the FastAPI surface matches the implemented feature contract, that ML artifacts are reproducible enough for interview review, and that the dashboard presents predictions as advisory outputs requiring human oversight.

## Scope

The current repository shape includes:

- FastAPI backend under `backend/app/`
- backend tests under `backend/tests/`
- React/Vite frontend under `frontend/`
- synthetic data and training scripts under `ml/`
- governance, architecture, and Responsible AI documentation under `docs/`

The implemented prediction schema currently uses `service_type`, `days_open`, `previous_contacts`, `vulnerability_flag`, `deprivation_band`, `channel`, and `urgency_text`. Some API design documents describe a future contract using fields such as `case_age_days`, `postcode_deprivation_band`, and `urgency_notes`; those are treated as planned contract deltas until the code is updated.

## Smoke Tests

Run these before demoing the project:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python ml/generate_data.py
python ml/train_model.py
pytest backend/tests
uvicorn backend.app.main:app --reload --port 8000
```

In a second terminal:

```bash
cd frontend
npm install
npm run build
npm run dev
```

Manual smoke checks:

- `GET http://localhost:8000/health` returns `status: "ok"`.
- `POST http://localhost:8000/predict` accepts a valid fictional case and returns `priority`, `confidence`, `class_probabilities`, `main_reasons`, `model_version`, and `human_review_required`.
- `GET http://localhost:8000/metrics/summary` returns monitoring fields before and after a prediction.
- `GET http://localhost:8000/model/metadata` returns trained metadata when artifacts exist, or the rules fallback note when they do not.
- `GET http://localhost:8000/explainability/sample` returns a sample case, prediction, and explanation note.
- The frontend opens at the Vite URL, usually `http://localhost:5173`, submits a default case, renders a priority result, updates monitoring totals, and shows human review messaging when required.

## API Tests

Backend API tests should cover the implemented FastAPI app first, then add target-contract tests as the API matures.

Current minimum automated coverage:

- `/health` returns HTTP 200 and `status: "ok"`.
- `/predict` returns HTTP 200 for a valid high-risk fictional case.
- Prediction output contains one of `low`, `medium`, or `high`.
- Prediction confidence is positive.
- Prediction includes at least one plain-English reason.

Recommended next API tests:

- Invalid `service_type` returns HTTP 422.
- Negative `days_open` and `previous_contacts` return HTTP 422.
- `days_open > 365` and `previous_contacts > 50` return HTTP 422.
- `urgency_text` shorter than 3 characters or longer than 800 characters returns HTTP 422.
- Unknown `channel` or `deprivation_band` returns HTTP 422.
- `/metrics/summary` starts with zero counts, then changes after one or more predictions.
- `/model/metadata` includes `model_name`, `model_version`, `features`, and `intended_use` after training.
- `/explainability/sample` includes `sample_case`, `prediction`, and a Responsible AI note.
- CORS allows the local Vite origin `http://localhost:5173`.

Contract guardrail:

- Add tests for future API fields only when the backend schemas are changed. Do not make tests pass by silently accepting both field sets unless the project deliberately supports a versioned compatibility layer.

## ML Artifact Checks

The ML layer should be checked after running:

```bash
python ml/generate_data.py
python ml/train_model.py
```

Expected artifact checks:

- `ml/artifacts/case_priority_model.joblib` exists.
- `ml/artifacts/model_metadata.json` exists and is valid JSON.
- `ml/artifacts/evaluation.json` exists and is valid JSON.
- Metadata includes the expected feature list from `ml/feature_contract.md`.
- Metadata classes are exactly `low`, `medium`, and `high`.
- Evaluation includes accuracy, classification report, confusion matrix, labels, and validation row count.
- The trained artifact can be loaded through `ModelService` without falling back to `rules-fallback`.
- A known high-risk sample scores successfully and returns explanation factors.
- No generated artifact or evaluation output contains real resident data, names, addresses, or free-text copied from live cases.

Model quality review checks:

- Macro metrics are inspected, not only accuracy.
- High-priority recall is reviewed because missed high-risk cases are operationally important.
- Confusion matrix is checked for systematic downgrading of high-priority cases.
- Fairness slices are reviewed for `vulnerability_flag`, `deprivation_band`, `channel`, and `service_type` when those reports are added.
- Any promoted artifact preserves the same feature contract used by the API.

## Frontend Checks

Automated frontend checks available now:

```bash
cd frontend
npm install
npm run build
```

Manual dashboard checks:

- The dashboard renders without console-breaking errors.
- The case intake form exposes service type, days open, previous contacts, deprivation band, channel, vulnerability flag, and urgency notes.
- Numeric fields enforce the same visible ranges as the backend.
- Submit sends JSON to `POST /predict` using the implemented schema.
- Loading and API failure states are visible in the status pill.
- The prediction panel displays priority, confidence, class probabilities, reason factors, model version, and human review banner where applicable.
- Monitoring cards show prediction count, high-priority rate, average confidence, and fairness watch rates.
- Governance copy states that the demo uses synthetic data and advisory human review.
- Layout remains readable on desktop and mobile widths.

Recommended next frontend tests:

- Add component or end-to-end tests for successful prediction submission.
- Mock API errors and verify the status message is useful.
- Verify the reset button restores the default case.
- Verify monitoring refreshes after a prediction.
- Add accessibility checks for labels, focus order, colour contrast, and keyboard submission.

## Demo Readiness Checklist

Before presenting the project:

- Backend tests pass locally.
- Frontend build passes locally.
- A freshly trained model artifact loads, or the presenter can explain the rules fallback.
- The dashboard can submit a case to a running API.
- Monitoring changes after predictions.
- Model card, DPIA-lite, responsible AI assessment, architecture, integration boundaries, and API documentation are present.
- The presenter can explain that the system is synthetic, advisory, and not suitable for live resident decisions without governance, user research, security review, and production monitoring.

## Known Risks

- API contract drift: `backend/API_CONTRACT.md` and the implemented Pydantic schemas currently use different field names and service values.
- `human_review_required` is not always true in the current response, while the Responsible AI position expects advisory human review for every recommendation.
- Monitoring is in-memory and resets when the API process restarts.
- Latency and error-rate values are demo placeholders rather than measured production telemetry.
- Fairness checks are limited to simple aggregate prediction rates until labelled outcomes and slice metrics are added.
- The model is trained on synthetic data and should not be interpreted as evidence of live service performance.
- Free-text guardrails for accidental real personal data are documented as future work, not implemented validation.
- No automated browser or accessibility test suite is present yet.

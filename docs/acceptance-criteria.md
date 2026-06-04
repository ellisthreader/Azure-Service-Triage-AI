# Acceptance Criteria

These criteria define when the Azure Council demo is ready for a portfolio walkthrough. They are written for the current local implementation and the planned Responsible AI/MLOps narrative in `PLAN.md`.

## Demo Acceptance

The demo is acceptable when a reviewer can complete this path without code changes:

1. Read `README.md` and understand the fictional public-sector use case.
2. Install Python dependencies from `requirements.txt`.
3. Generate synthetic data with `python ml/generate_data.py`.
4. Train the baseline model with `python ml/train_model.py`.
5. Run backend tests with `pytest backend/tests`.
6. Start the API with `uvicorn backend.app.main:app --reload --port 8000`.
7. Install frontend dependencies and run `npm run build`.
8. Start the dashboard with `npm run dev`.
9. Submit a fictional case through the dashboard.
10. See a priority recommendation, confidence, explanation factors, model version, monitoring summary, and human-review messaging.

## Backend Acceptance

- `GET /health` returns HTTP 200 and confirms the API is available.
- `POST /predict` validates the implemented request schema and rejects invalid values with FastAPI validation errors.
- A valid prediction response includes `priority`, `confidence`, `class_probabilities`, `main_reasons`, `model_version`, and `human_review_required`.
- Priority labels are limited to `low`, `medium`, and `high`.
- Confidence values are numeric and between `0.0` and `1.0`.
- The backend loads `ml/artifacts/case_priority_model.joblib` when present.
- The backend provides a clear fallback state when no trained model is available.
- `/metrics/summary` returns operational, fairness, and drift-watch fields suitable for dashboard display.
- `/model/metadata` exposes model metadata or a clear note explaining how to train the model.
- `/explainability/sample` returns a sample explanation suitable for Responsible AI discussion.

## ML Acceptance

- Synthetic data generation is reproducible enough for local development.
- Training outputs `case_priority_model.joblib`, `model_metadata.json`, and `evaluation.json` under `ml/artifacts/`.
- The artifact feature list matches `ml/feature_contract.md`.
- The model predicts exactly the supported labels: `low`, `medium`, `high`.
- Evaluation output includes accuracy, classification report, confusion matrix, labels, and validation row count.
- Macro metrics and high-priority behaviour are reviewed before describing the model as successful.
- Metadata states intended use, non-use cases, training row counts, validation row counts, model type, and version.
- The model card and Responsible AI documentation remain consistent with the generated artifact.

## Frontend Acceptance

- `npm run build` completes successfully.
- The dashboard can be opened at the Vite dev URL.
- The case intake form maps to the implemented backend schema: `service_type`, `days_open`, `previous_contacts`, `vulnerability_flag`, `deprivation_band`, `channel`, and `urgency_text`.
- The dashboard displays API unavailable, scoring, and prediction complete states.
- Prediction output is readable to a non-technical stakeholder.
- Explanation factors are shown in plain English and avoid claims of automated final decision-making.
- Monitoring cards display prediction volume, high-priority rate, average confidence, fairness watch rates, and governance notes.
- The layout remains usable on mobile-width and desktop-width screens.

## Responsible AI Acceptance

- Documentation states that all data is synthetic.
- Documentation states that predictions are advisory and require human officer review.
- The project explains fairness, drift, model quality, operational monitoring, explainability, auditability, and GDPR/DPIA considerations.
- The system does not claim suitability for live resident services.
- The model is not positioned as an eligibility, denial, or enforcement decision-maker.
- Known limitations and required production controls are explicit.

## Azure/MLOps Acceptance

- The repository explains how a local artifact could map to Azure ML model registry and managed endpoint deployment.
- Training, artifact, metadata, and evaluation outputs are separated from API serving code.
- The feature contract is documented so training and inference schemas can be governed.
- Monitoring expectations include model quality, drift, fairness, and operational health.
- CI/CD readiness is described even if cloud credentials are not required for the local demo.

## Known Risks And Gaps

- The implemented backend schema does not yet match every field in `backend/API_CONTRACT.md`; demos should use the implemented schema until versioning is resolved.
- `human_review_required` can be false for some current predictions, which weakens the documented advisory stance.
- The monitoring store is process-local memory and not durable.
- Drift and operational latency values are not production measurements.
- Fairness monitoring currently lacks labelled outcome comparisons and formal thresholds.
- No frontend automated test suite is present.
- No browser-based end-to-end smoke test is present.
- No CI workflow file is present in the current project shape.
- Personal-data detection for free-text input is not implemented.
- The synthetic model cannot validate real-world performance, bias, or service impact.

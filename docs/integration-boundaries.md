# Integration Boundaries

## Purpose

This document defines the contracts between the main workstreams in Azure Council. The goal is to let frontend, API, ML, monitoring, responsible AI, and Azure MLOps work progress independently without creating hidden coupling.

## Ownership Boundaries

| Area | Owns | Must not own |
| --- | --- | --- |
| Frontend | user interaction, form state, display copy, dashboard layout, client-side convenience validation | model rules, feature engineering, priority calculation, monitoring aggregation |
| API | request validation, feature transformation, model invocation, response contract, prediction logging, endpoint errors | training data generation, frontend presentation, Azure resource provisioning |
| ML | synthetic data, training pipeline, evaluation, model artifact, feature metadata, model card inputs | HTTP request handling, dashboard state, production secrets |
| Monitoring | metric definitions, aggregation jobs, drift and fairness summaries, operational health summaries | changing prediction outcomes, storing unnecessary personal data |
| Azure MLOps | cloud deployment examples, environments, registry flow, CI/CD gates, endpoint guidance | making local development require Azure credentials |
| Responsible AI docs | human oversight policy, limitations, fairness risks, DPIA-style notes, governance expectations | executable model logic or API routing |

## Frontend to API Contract

The dashboard communicates with the backend over JSON. The frontend should treat the API as the source of truth for prediction results.

Expected prediction request shape:

```json
{
  "service_type": "housing_repair",
  "case_age_days": 5,
  "previous_contacts": 2,
  "vulnerability_flag": true,
  "postcode_deprivation_band": "high",
  "urgency_notes": "Tenant reports no heating and young children in the property."
}
```

Expected prediction response shape:

```json
{
  "prediction_id": "local-20260604-000001",
  "priority": "high",
  "confidence": 0.82,
  "class_probabilities": {
    "low": 0.04,
    "medium": 0.14,
    "high": 0.82
  },
  "explanation_factors": [
    {
      "feature": "vulnerability_flag",
      "label": "Vulnerability noted",
      "direction": "increased_priority",
      "strength": 0.31
    }
  ],
  "human_review_required": true,
  "model_version": "local-baseline-1"
}
```

Frontend assumptions:

- `priority` is always one of `low`, `medium`, or `high`.
- `confidence` is a number from `0` to `1`.
- `human_review_required` should be displayed as a product principle, not as an exceptional warning.
- explanation labels should be suitable for non-technical users, but the API remains responsible for generating them.
- API failures should produce recoverable UI states, not silent fallbacks or client-side predictions.

## API to ML Contract

The API loads a model artifact through a small model service abstraction. The model artifact should expose or be wrapped by a function equivalent to:

```python
predict_case(case_features: dict) -> PredictionResult
```

The artifact contract should include:

- accepted input feature names and types
- preprocessing pipeline or feature transformer
- class labels in stable order
- model version or artifact identifier
- training timestamp or build timestamp
- evaluation metrics path or embedded metadata

The API may reshape validated request data into model features, but it should not duplicate training-time preprocessing logic. Any transformation needed for both training and inference should live in shared ML code or inside the saved pipeline.

## Training to Artifact Boundary

Training produces versioned outputs that can be consumed by local API code or registered in Azure ML:

- model artifact, such as `model.pkl` or `model.joblib`
- model metadata, including feature schema and class labels
- evaluation report, including accuracy, macro F1, per-class metrics, and confusion matrix
- fairness summary for selected synthetic groups
- model card source data

Training scripts may change model internals, but they must preserve the artifact metadata needed by the API and documentation.

## API to Monitoring Contract

The API should emit a prediction log event after each successful prediction. The event should be useful for monitoring but avoid unnecessary sensitive data.

Recommended event fields:

```json
{
  "prediction_id": "local-20260604-000001",
  "timestamp_utc": "2026-06-04T10:30:00Z",
  "model_version": "local-baseline-1",
  "service_type": "housing_repair",
  "case_age_days": 5,
  "previous_contacts": 2,
  "vulnerability_flag": true,
  "postcode_deprivation_band": "high",
  "priority": "high",
  "confidence": 0.82,
  "latency_ms": 42,
  "error": false
}
```

Free-text urgency notes should not be stored in raw form by default. If text monitoring is needed, store derived, non-reversible summaries such as text length, missingness, or controlled keyword category counts.

## Monitoring to Dashboard Contract

The dashboard reads monitoring summaries from the API rather than calculating them client side.

Expected `/metrics/summary` categories:

- operational health: request count, error rate, latency summary, model version
- prediction distribution: counts by priority and confidence band
- drift summary: changed features, severity, baseline window, comparison window
- fairness summary: selected groups, outcome distribution, performance gaps where labels exist
- performance summary: validation accuracy, macro F1, per-class recall, latest evaluation timestamp

Monitoring values should include timestamps and sample sizes so dashboard users can judge whether a signal is meaningful.

## Local to Azure Boundary

Local development should run with generated data, local artifacts, and local configuration. Azure deployment should replace infrastructure dependencies without changing application contracts.

Stable across both environments:

- API routes and JSON schemas
- model artifact metadata
- monitoring metric names
- test commands and smoke checks
- responsible AI statements and model limitations

Environment-specific:

- artifact location
- telemetry sink
- secrets provider
- endpoint hostnames
- CI/CD deployment credentials
- storage account or registry identifiers

Configuration should be passed through environment variables or deployment settings. Code should avoid hardcoded Azure resource names except in documentation examples.

## Responsible AI Boundary

Responsible AI controls are shared across workstreams, but the executable boundaries remain clear:

- the model can rank cases, but it must not make final service decisions
- the API must always return `human_review_required: true`
- the dashboard must present confidence and explanation alongside the priority
- monitoring must check fairness, drift, and operational behaviour
- documentation must state that all data is synthetic and that production use would require data protection review, equality impact assessment, security review, and service-owner approval

Protected characteristics should not be used to deny or reduce service access. Synthetic grouping fields used for fairness demonstrations must be documented as monitoring examples, not as approval for production use.

## Failure Boundaries

Each layer should fail in a way that preserves trust:

- frontend failures show a clear retry state and do not invent predictions
- API validation failures return structured 4xx responses
- model-load failures make `/health` unhealthy and block `/predict`
- monitoring failures should not block prediction unless logging is legally or operationally required
- Azure deployment failures should be caught by CI/CD gates before traffic is shifted

## Extension Points

The architecture leaves room for future improvements without changing the core contracts:

- replace the baseline classifier with a stronger model while preserving response shape
- move local prediction logs to Application Insights or Azure Monitor
- register model artifacts in Azure ML and deploy by version
- add batch scoring for historical synthetic cases
- add richer explainability methods if they remain understandable to non-technical reviewers
- introduce authentication and role-based views for production-style demonstrations

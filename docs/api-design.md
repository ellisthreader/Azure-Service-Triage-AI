# API Design

The FastAPI backend exposes a small, dashboard-oriented contract for the Azure Council case-prioritisation demo. It should be implemented with Pydantic schemas, predictable JSON responses, and explicit Responsible AI messaging.

## Design Goals

- Keep frontend integration simple and stable.
- Return plain-English explanation content with every prediction.
- Make human review requirements visible in API output.
- Support monitoring views for quality, drift, fairness, and operational health.
- Separate model metadata from prediction responses so dashboards and documentation can inspect the deployed artifact independently.

## Endpoint Summary

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/health` | `GET` | API, model, and dependency health. |
| `/predict` | `POST` | Score a fictional case and return priority, confidence, probabilities, and explanation factors. |
| `/metrics/summary` | `GET` | Return monitoring summaries for dashboard views. |
| `/model/metadata` | `GET` | Return model version, features, labels, training data notes, and intended-use limits. |
| `/explainability/sample` | `GET` | Return a representative synthetic explanation for UI and Responsible AI pages. |

The full field-level contract and JSON examples are defined in `backend/API_CONTRACT.md`.

## Core Schemas

### Prediction Request

```json
{
  "case_id": "CASE-2026-00042",
  "service_type": "housing_repair",
  "case_age_days": 9,
  "previous_contacts": 3,
  "vulnerability_flag": true,
  "postcode_deprivation_band": 2,
  "urgency_notes": "Tenant reports damp near electrics and a child with asthma in the property."
}
```

Validation expectations:

- `service_type` must be one of `housing_repair`, `highways`, `waste`, `benefits`, `council_tax`, or `adult_social_care`.
- `case_age_days` must be between `0` and `365`.
- `previous_contacts` must be between `0` and `50`.
- `postcode_deprivation_band` must be between `1` and `10`.
- `urgency_notes` must be fictional text and no longer than `1000` characters.

### Prediction Response

```json
{
  "request_id": "req_01JZ7M2ABCD1234",
  "case_id": "CASE-2026-00042",
  "prediction": {
    "priority": "high",
    "confidence": 0.86,
    "probabilities": {
      "low": 0.03,
      "medium": 0.11,
      "high": 0.86
    }
  },
  "explanation": {
    "summary": "High priority is mainly driven by vulnerability, repeated contact, and urgent repair language.",
    "top_factors": [
      {
        "feature": "vulnerability_flag",
        "label": "Vulnerability marker present",
        "direction": "increases_priority",
        "weight": 0.31
      }
    ]
  },
  "human_review": {
    "required": true,
    "message": "This is a decision-support recommendation. A council officer must review the case before action."
  },
  "model_version": "case-priority-baseline-0.1.0",
  "created_at": "2026-06-04T08:30:00Z"
}
```

## Error Strategy

Use FastAPI's default `422` validation shape for schema errors. Use a consistent application error object for runtime failures:

```json
{
  "error": {
    "code": "METRICS_UNAVAILABLE",
    "message": "Monitoring summary could not be generated because the metrics source is unavailable.",
    "request_id": "req_01JZ7M2QWER5678",
    "details": {
      "source": "monitoring/metrics_summary.json"
    }
  }
}
```

Status code guidance:

- `400 Bad Request`: valid JSON but fails a domain rule.
- `422 Unprocessable Entity`: Pydantic validation failure.
- `500 Internal Server Error`: unexpected application failure.
- `503 Service Unavailable`: required model, metadata, metrics, or explanation fixture is unavailable.

## Responsible AI Requirements

- `/predict` must always return a `human_review` block.
- `/model/metadata` must state that the training data is synthetic and contains no real personal data.
- `/metrics/summary` must include fairness and drift status fields even when early implementations use fixture data.
- `/explainability/sample` must clearly label sample explanations as synthetic.
- Free-text examples must be fictional and should avoid real names, addresses, phone numbers, or identifiers.

## Implementation Notes

- Define request and response models in Pydantic before implementing endpoint handlers.
- Keep enum values stable because the frontend form will depend on them.
- Log successful predictions with `request_id`, `case_id`, model version, priority, confidence, and timestamp.
- Do not log raw `urgency_notes` unless a future privacy review explicitly approves it.
- Keep model-loading failures visible through `/health` and return `503` from prediction-dependent endpoints.

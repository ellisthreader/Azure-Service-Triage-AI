# Backend API Contract

This contract defines the local FastAPI surface for the Azure Council demo. The API supports a fictional council case-prioritisation workflow and must make clear that predictions are decision-support outputs for human review, not automated decisions.

Base URL for local development:

```text
http://localhost:8000
```

Default response content type:

```text
application/json
```

## Common Conventions

- Dates and times use ISO 8601 UTC strings, for example `2026-06-04T08:30:00Z`.
- Priority labels are `low`, `medium`, or `high`.
- Confidence scores are decimal numbers from `0.0` to `1.0`.
- Request IDs are returned where useful so prediction logs, frontend activity, and monitoring summaries can be correlated.
- Synthetic demo data must not include real resident names, addresses, case notes, or other personal data.

## Common Error Response

FastAPI validation errors may use the default `detail` list. Application-level errors should use the following shape:

```json
{
  "error": {
    "code": "MODEL_UNAVAILABLE",
    "message": "Model artifact is not loaded.",
    "request_id": "req_01JZ7M2ABCD1234",
    "details": {
      "artifact_path": "models/case_priority_pipeline.joblib"
    }
  }
}
```

Expected common status codes:

- `400 Bad Request`: request body is syntactically valid JSON but violates a business rule.
- `422 Unprocessable Entity`: Pydantic validation failed, such as missing required fields or invalid enum values.
- `500 Internal Server Error`: unexpected server failure.
- `503 Service Unavailable`: model artifact, metrics store, or dependency required for the endpoint is unavailable.

## GET /health

Returns operational health for the API and model-loading service. This endpoint is intended for local smoke checks, deployment probes, and dashboard status banners.

### Request

No request body.

### Response: 200 OK

```json
{
  "status": "ok",
  "service": "azure-council-priority-api",
  "version": "0.1.0",
  "timestamp": "2026-06-04T08:30:00Z",
  "model_loaded": true,
  "model_version": "case-priority-baseline-0.1.0",
  "dependencies": {
    "metrics_store": "ok",
    "prediction_log": "ok"
  }
}
```

### Error Behavior

- Return `200 OK` with `status: "degraded"` when the API is running but a non-critical dependency, such as the prediction log, is unavailable.
- Return `503 Service Unavailable` when the API cannot serve predictions because the model artifact failed to load.

Example `503`:

```json
{
  "error": {
    "code": "MODEL_UNAVAILABLE",
    "message": "Model artifact is not loaded.",
    "request_id": "req_01JZ7M2ABCD1234",
    "details": {
      "model_loaded": false
    }
  }
}
```

## POST /predict

Scores one fictional council case and returns a priority recommendation, confidence, class probabilities, and explanation factors for human review.

### Request

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

### Request Schema

| Field | Type | Required | Validation | Description |
| --- | --- | --- | --- | --- |
| `case_id` | string | no | 1-80 characters if supplied | Frontend or source-system reference for audit correlation. |
| `service_type` | string enum | yes | `housing_repair`, `highways`, `waste`, `benefits`, `council_tax`, `adult_social_care` | Fictional service area. |
| `case_age_days` | integer | yes | `0` to `365` | Number of days since the case was raised. |
| `previous_contacts` | integer | yes | `0` to `50` | Number of previous contacts about this case. |
| `vulnerability_flag` | boolean | yes | `true` or `false` | Indicates a synthetic vulnerability marker requiring careful governance. |
| `postcode_deprivation_band` | integer | yes | `1` to `10` | Synthetic deprivation decile, where `1` is most deprived. |
| `urgency_notes` | string | yes | 0-1000 characters | Fictional free text used by the TF-IDF feature pipeline. |

### Response: 200 OK

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
      },
      {
        "feature": "previous_contacts",
        "label": "3 previous contacts",
        "direction": "increases_priority",
        "weight": 0.18
      },
      {
        "feature": "urgency_notes",
        "label": "Urgent terms: damp, electrics, asthma",
        "direction": "increases_priority",
        "weight": 0.15
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

### Error Behavior

- `400 Bad Request`: body passes Pydantic validation but violates a domain rule, such as notes containing prohibited real personal data markers in a future guardrail.
- `422 Unprocessable Entity`: invalid enum, missing field, out-of-range integer, or wrong type.
- `503 Service Unavailable`: model is not loaded or the prediction service cannot score the case.
- `500 Internal Server Error`: scoring failed unexpectedly.

Example `422`:

```json
{
  "detail": [
    {
      "type": "enum",
      "loc": ["body", "service_type"],
      "msg": "Input should be one of the supported service types",
      "input": "parking"
    }
  ]
}
```

Example `503`:

```json
{
  "error": {
    "code": "PREDICTION_UNAVAILABLE",
    "message": "Prediction service cannot score requests because the model is unavailable.",
    "request_id": "req_01JZ7M2ABCD1234",
    "details": {
      "retryable": true
    }
  }
}
```

## GET /cases/queue

Returns the employee-facing priority queue. Cases are already scored by the model so the worker opens the dashboard, reviews the highest-priority case, and decides what to do next.

### Response: 200 OK

```json
[
  {
    "case_id": "ECC-365-1042",
    "service_label": "Housing repair",
    "team": "Contact centre",
    "source": "Outlook shared mailbox",
    "evidence": "SharePoint repair photos",
    "handover": "Teams duty note",
    "due": "Within 2 hours",
    "risk": "high",
    "action": "Review and confirm priority",
    "summary": "Possible fire risk in a housing repair case with children in the household.",
    "prediction": {
      "priority": "high",
      "confidence": 0.86,
      "human_review_required": true
    }
  }
]
```

## POST /cases/{case_id}/decision

Records the officer's final priority. The model recommendation remains advisory; the saved record represents the human decision. `action_taken` is optional and reserved for a future workflow step.

### Request

```json
{
  "final_priority": "high",
  "override_reason": "",
  "action_taken": "",
  "officer_id": "demo.officer",
  "case_request": {},
  "prediction": {}
}
```

### Response: 200 OK

```json
{
  "case_id": "ECC-365-1042",
  "status": "recorded",
  "audit_id": "AUD-20260604103000-001",
  "recorded_at": "2026-06-04T10:30:00Z",
  "final_priority": "high",
  "model_priority": "high",
  "override_recorded": false,
  "action_taken": ""
}
```

## GET /metrics/summary

Returns dashboard-ready monitoring summaries for model quality, drift, fairness, and operational health. Metrics may be calculated from validation data, recent prediction logs, or synthetic monitoring fixtures depending on the project phase.

### Request

No request body.

Optional query parameters:

| Field | Type | Required | Validation | Description |
| --- | --- | --- | --- | --- |
| `window_days` | integer | no | `1` to `90`, default `30` | Monitoring window for recent operational and drift metrics. |

Example:

```text
GET /metrics/summary?window_days=30
```

### Response: 200 OK

```json
{
  "generated_at": "2026-06-04T08:30:00Z",
  "window_days": 30,
  "model_version": "case-priority-baseline-0.1.0",
  "operational": {
    "request_count": 1284,
    "prediction_count": 1278,
    "error_rate": 0.0047,
    "p95_latency_ms": 142.6
  },
  "model_quality": {
    "accuracy": 0.82,
    "macro_f1": 0.79,
    "high_priority_recall": 0.87,
    "last_evaluated_at": "2026-06-03T18:00:00Z"
  },
  "drift": {
    "status": "watch",
    "overall_score": 0.18,
    "feature_alerts": [
      {
        "feature": "service_type",
        "score": 0.21,
        "severity": "medium",
        "message": "Waste service cases are higher than the training baseline."
      }
    ]
  },
  "fairness": {
    "status": "pass",
    "groups": [
      {
        "group": "postcode_deprivation_band_1_to_3",
        "prediction_count": 392,
        "high_priority_rate": 0.34,
        "recall": 0.85
      },
      {
        "group": "postcode_deprivation_band_4_to_10",
        "prediction_count": 886,
        "high_priority_rate": 0.29,
        "recall": 0.88
      }
    ],
    "notes": "Synthetic monitoring only. Fairness checks must be reviewed before any real deployment."
  }
}
```

### Error Behavior

- `422 Unprocessable Entity`: invalid `window_days`.
- `503 Service Unavailable`: metrics source, evaluation report, or prediction log cannot be read.

Example `503`:

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

## GET /audit/summary

Returns the active audit-store status and recent record counts. In Azure Functions this should report Azure Table Storage when the Function App storage account is available; locally it can report the in-memory fallback.

### Response: 200 OK

```json
{
  "store_mode": "azure_table",
  "durable": true,
  "table_name": "ServicePriorityAudit",
  "prediction_records": 14,
  "decision_records": 3,
  "override_rate": 0.3333,
  "low_confidence_rate": 0.0714,
  "high_priority_rate": 0.4286,
  "latest_decision_at": "2026-06-14T15:55:10.100000+00:00"
}
```

## GET /audit/decisions

Returns recent officer decision receipts recorded through `POST /cases/{case_id}/decision`.

### Response: 200 OK

```json
[
  {
    "case_id": "ECC-365-1042",
    "status": "recorded",
    "audit_id": "AUD-20260614155510-AB12CD34",
    "recorded_at": "2026-06-14T15:55:10.100000+00:00",
    "final_priority": "high",
    "model_priority": "high",
    "override_recorded": false,
    "action_taken": ""
  }
]
```

## GET /monitoring/feedback-report

Returns a synthetic feedback-loop report from recorded officer decisions.

### Response: 200 OK

```json
{
  "label_source": "officer_final_priority",
  "decision_records": 3,
  "override_records": 1,
  "override_rate": 0.3333,
  "review_note": "Synthetic officer decisions demonstrate the feedback loop needed before retraining or promotion.",
  "recent_overrides": []
}
```

## GET /monitoring/drift-report

Returns a lightweight drift report comparing recent audited prediction traffic against the synthetic case queue baseline.

### Response: 200 OK

```json
{
  "baseline": "synthetic_case_queue",
  "live_window_records": 14,
  "status": "stable",
  "service_mix_drift_score": 0.2143,
  "service_type_baseline": {"adult_social_care": 0.25, "council_tax": 0.25, "highways": 0.25, "housing": 0.25},
  "service_type_live": {"housing": 0.5, "highways": 0.25, "council_tax": 0.25},
  "deprivation_live": {"high": 0.5, "medium": 0.25, "low": 0.25},
  "review_note": "Synthetic drift report compares live scoring traffic against the demo queue baseline."
}
```

## GET /model/metadata

Returns model and dataset metadata for the dashboard, model card, and deployment checks.

### Request

No request body.

### Response: 200 OK

```json
{
  "model_name": "Azure Council Case Priority Classifier",
  "model_version": "case-priority-baseline-0.1.0",
  "artifact_path": "models/case_priority_pipeline.joblib",
  "trained_at": "2026-06-03T18:00:00Z",
  "framework": {
    "language": "python",
    "libraries": {
      "scikit-learn": "1.5.0",
      "fastapi": "0.115.0"
    }
  },
  "labels": ["low", "medium", "high"],
  "features": [
    "service_type",
    "case_age_days",
    "previous_contacts",
    "vulnerability_flag",
    "postcode_deprivation_band",
    "urgency_notes"
  ],
  "training_data": {
    "source": "synthetic",
    "record_count": 10000,
    "contains_real_personal_data": false
  },
  "intended_use": "Decision-support priority recommendation for fictional council service cases.",
  "limitations": [
    "Synthetic demonstration model only.",
    "Must not be used to deny or reduce services.",
    "Human review is required for every recommendation."
  ]
}
```

### Error Behavior

- `503 Service Unavailable`: model metadata file or model registry entry cannot be read.

Example `503`:

```json
{
  "error": {
    "code": "MODEL_METADATA_UNAVAILABLE",
    "message": "Model metadata could not be loaded.",
    "request_id": "req_01JZ7M2ZXCV9012",
    "details": {
      "source": "models/metadata.json"
    }
  }
}
```

## GET /explainability/sample

Returns a representative explanation for a synthetic sample case. This supports frontend development and Responsible AI documentation before live prediction logs exist.

### Request

No request body.

Optional query parameters:

| Field | Type | Required | Validation | Description |
| --- | --- | --- | --- | --- |
| `priority` | string enum | no | `low`, `medium`, `high` | Preferred sample priority. If omitted, the API returns any representative sample. |

Example:

```text
GET /explainability/sample?priority=high
```

### Response: 200 OK

```json
{
  "sample_id": "sample_high_001",
  "case": {
    "service_type": "adult_social_care",
    "case_age_days": 2,
    "previous_contacts": 4,
    "vulnerability_flag": true,
    "postcode_deprivation_band": 3,
    "urgency_notes": "Caller reports urgent support needs and repeated missed appointments."
  },
  "prediction": {
    "priority": "high",
    "confidence": 0.91,
    "probabilities": {
      "low": 0.02,
      "medium": 0.07,
      "high": 0.91
    }
  },
  "explanation": {
    "plain_english": "The sample is high priority because it combines vulnerability, repeated contact, and urgent support language.",
    "top_factors": [
      {
        "feature": "vulnerability_flag",
        "label": "Vulnerability marker present",
        "direction": "increases_priority",
        "weight": 0.34
      },
      {
        "feature": "previous_contacts",
        "label": "4 previous contacts",
        "direction": "increases_priority",
        "weight": 0.2
      },
      {
        "feature": "service_type",
        "label": "Adult social care case",
        "direction": "increases_priority",
        "weight": 0.16
      }
    ]
  },
  "responsible_ai_note": "This sample is synthetic and is intended to demonstrate explanation format only."
}
```

### Error Behavior

- `422 Unprocessable Entity`: invalid `priority` query parameter.
- `503 Service Unavailable`: sample explanation fixture or explanation service cannot be loaded.

Example `422`:

```json
{
  "detail": [
    {
      "type": "enum",
      "loc": ["query", "priority"],
      "msg": "Input should be 'low', 'medium' or 'high'",
      "input": "urgent"
    }
  ]
}
```

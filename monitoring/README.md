# Monitoring

This folder defines the monitoring layer for the Azure Council case-prioritisation demo. The system recommends `low`, `medium`, or `high` priority for fictional council cases, but it does not make final service decisions. Monitoring must therefore cover technical health, model quality, drift, fairness, explanation coverage, and audit readiness.

The local API currently exposes a compact `/metrics/summary` endpoint from in-memory prediction logs. The target Azure-ready design extends this into durable metric tables that can be queried by Power BI, Azure Monitor, or a notebook-based review process.

## Monitoring Objectives

- Confirm that the API and model artifact are available.
- Track model performance against labelled validation, backtesting, or reviewed operational cases.
- Detect shifts in input features, prediction mix, and confidence distribution.
- Surface fairness indicators across approved synthetic or governed monitoring groups.
- Confirm every recommendation has a usable explanation and human-review context.
- Produce simple tabular outputs for non-technical dashboard users.
- Trigger review alerts before metric degradation becomes a service risk.

## Current Local Signals

`GET /health` returns:

| Field | Meaning |
| --- | --- |
| `status` | API health status, currently `ok` when the service responds. |
| `model_loaded` | Whether a trained model artifact has been loaded. |
| `model_version` | Active model version or `rules-fallback`. |

`GET /metrics/summary` returns:

| Field | Meaning |
| --- | --- |
| `total_predictions` | Number of predictions recorded in the current process. |
| `high_priority_rate` | Share of logged predictions with recommendation `high`. |
| `average_confidence` | Mean confidence across logged predictions. |
| `fairness_watch` | Current high-priority rates by `vulnerability_flag`. |
| `drift_watch` | Demo drift status and low-confidence rate. |
| `operational_health` | API status, error-rate placeholder, and latency placeholder. |

Because local logs are in memory, these signals reset when the API restarts. Production-like monitoring should write prediction, health, performance, drift, fairness, explanation, and alert records to durable storage.

## Metric Groups

| Group | Example metrics | Primary user |
| --- | --- | --- |
| Model performance | Accuracy, macro F1, high-priority recall, false negative rate, calibration error | Data scientist, model owner |
| Drift | Service mix shift, case age drift, previous contact drift, text term drift, prediction share drift | Data scientist, service owner |
| Fairness | Recommendation rate, high-priority false negative rate, confidence, override rate by group | Responsible AI reviewer, service owner |
| Explainability | Explanation coverage, reason count, explanation failure rate, low-confidence with explanation rate | Product owner, officer lead |
| API health | Request count, error rate, p95 latency, model-loaded status, dependency failures | Engineer, support owner |
| Governance | Model version coverage, audit completeness, override reason completeness, alert status | Service owner, governance board |

## Recommended Storage Outputs

The monitoring layer should produce append-only tabular outputs. CSV or Parquet files are sufficient for the local portfolio demo; Azure Table Storage, Blob Storage, Log Analytics, or a warehouse table would be suitable Azure extensions.

| Output | Grain | Purpose |
| --- | --- | --- |
| `prediction_events` | One row per prediction | Audit trail, prediction mix, confidence, explanation coverage. |
| `api_health_events` | One row per health probe or time bucket | Uptime, latency, errors, dependency status. |
| `model_performance_daily` | One row per model, date, class or slice | Validation/backtest quality trends. |
| `drift_daily` | One row per feature, model, date | Input, text, confidence, and prediction drift. |
| `fairness_daily` | One row per group value, model, date | Slice-level recommendation, performance, and override patterns. |
| `explainability_daily` | One row per model, date, service type | Explanation availability and reason quality. |
| `alert_events` | One row per alert transition | Review queue and governance evidence. |

## Alert Threshold Summary

Thresholds should start conservative and be recalibrated when real labelled data, service volumes, and operating risk are understood.

| Area | Warning | Critical |
| --- | --- | --- |
| API error rate | `>= 2%` over 15 minutes | `>= 5%` over 15 minutes |
| API p95 latency | `>= 750 ms` over 15 minutes | `>= 1500 ms` over 15 minutes |
| Model unavailable | Any `/health` response with `model_loaded=false` | More than 5 minutes unavailable |
| Macro F1 drop | `>= 0.05` below baseline | `>= 0.10` below baseline |
| High-priority recall drop | `>= 0.05` below baseline | `>= 0.10` below baseline or below `0.80` |
| Low-confidence rate | `>= 20%` of predictions | `>= 35%` of predictions |
| Population stability index | `>= 0.10` for a key feature | `>= 0.25` for a key feature |
| Fairness disparity | Ratio outside `0.80` to `1.25` or gap `>= 0.10` | Ratio outside `0.67` to `1.50` or gap `>= 0.20` |
| Explanation coverage | `< 98%` | `< 95%` |
| Audit completeness | `< 99%` | `< 97%` |

Fairness alerts must trigger review, not automatic correction. Differences can reflect genuine service need, biased labels, data quality issues, or operational changes.

## Power BI Dashboard Pages

Recommended Power BI pages:

| Page | Contents |
| --- | --- |
| Executive overview | Current model version, API health, prediction volume, high-priority share, active alerts. |
| Model quality | Macro F1, high-priority recall, confusion matrix, confidence calibration, quality by service type. |
| Drift | Feature drift status, service mix changes, confidence distribution, prediction-class trend. |
| Fairness review | Group-level recommendation rates, high-priority recall, override rate, missing-data rate, alert flags. |
| Explainability | Explanation coverage, top reason factors, failures by service type, low-confidence explained cases. |
| Operations | Request count, error rate, p95 latency, model-loaded status, latest health probe. |

Power BI outputs should use simple dates, numeric values, model version fields, and stable enum values. Avoid nested JSON in dashboard-facing tables.

## Review Cadence

| Review | Cadence | Evidence |
| --- | --- | --- |
| API health | Daily or automated alert | `api_health_events`, `alert_events` |
| Model quality | Weekly when labels are available | `model_performance_daily` |
| Drift | Weekly, and after service incidents | `drift_daily` |
| Fairness | Monthly, or before model promotion | `fairness_daily`, override records |
| Explainability | Monthly | `explainability_daily`, sampled prediction events |
| Governance | Before deployment and model promotion | Model card, monitoring reports, alert history |

## Local Development Notes

- Use `/metrics/summary` for the current dashboard prototype.
- Treat `rules-fallback` as a degraded model state for governance review, even when the API is technically healthy.
- Do not log real personal data in this demo.
- If prediction events are persisted later, minimise free text by storing derived explanation factors or hashed references rather than resident notes.
- Keep `model_version` on every monitoring row so Power BI can filter and compare model releases.

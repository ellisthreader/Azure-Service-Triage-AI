# Metrics Contract

This contract defines the metrics and tabular outputs for monitoring the Azure Council case-prioritisation system. It is written for a local demo that can later map to Azure Monitor, Application Insights, Log Analytics, Blob Storage, Azure ML model registry metadata, or Power BI datasets.

The prediction model recommends one of `low`, `medium`, or `high`. The recommendation remains advisory and must be reviewed by a human officer.

## Contract Version

| Field | Value |
| --- | --- |
| Contract name | `azure_council.monitoring.v1` |
| Feature contract | `council_case_priority.v1` |
| Priority labels | `low`, `medium`, `high` |
| Grouping fields | `service_type`, `vulnerability_flag`, `deprivation_band`, `channel` |
| Required model identifier | `model_version` |
| Required time field | `event_timestamp_utc` for event rows, `metric_date` for aggregate rows |

## Endpoint Contract

### `GET /health`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `status` | string | Yes | `ok`, `ready`, `degraded`, or `unavailable` in the target design. Current local API returns `ok`. |
| `model_loaded` | boolean | Yes | `true` when a trained model artifact is loaded. |
| `model_version` | string | Yes | Active version, or `rules-fallback` for local fallback mode. |

### `GET /metrics/summary`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `total_predictions` | integer | Yes | Prediction count in the current log window. |
| `high_priority_rate` | number | Yes | `high` recommendations divided by total predictions. |
| `average_confidence` | number | Yes | Mean confidence for logged predictions. |
| `fairness_watch` | object | Yes | Current demo slice rates by vulnerability flag. |
| `drift_watch` | object | Yes | Current demo drift and low-confidence indicators. |
| `operational_health` | object | Yes | API status, error rate, latency status. |

Nested objects are acceptable for API responses, but Power BI-facing exports should flatten these fields.

## Core Event Tables

### `prediction_events`

One row per prediction. This table supports audit, dashboard activity, confidence monitoring, drift, explanation coverage, and later joining with officer outcomes.

| Column | Type | Required | Example | Notes |
| --- | --- | --- | --- | --- |
| `prediction_id` | string | Yes | `pred_20260604_000001` | Stable unique identifier. |
| `event_timestamp_utc` | datetime | Yes | `2026-06-04T10:15:30Z` | Use UTC for all monitoring rows. |
| `model_version` | string | Yes | `2026-06-04-logreg-v1` | `rules-fallback` is allowed for local fallback. |
| `feature_contract_version` | string | Yes | `council_case_priority.v1` | Enables schema migration. |
| `service_type` | string | Yes | `housing` | Enum from API request. |
| `days_open` | integer | Yes | `7` | Numeric drift input. |
| `previous_contacts` | integer | Yes | `4` | Numeric drift input. |
| `vulnerability_flag` | boolean | Yes | `true` | Sensitive governance context. |
| `deprivation_band` | string | Yes | `high` | Synthetic proxy-risk monitoring field. |
| `channel` | string | Yes | `phone` | Input channel. |
| `urgency_text_length` | integer | No | `72` | Store length instead of raw text for dashboard monitoring. |
| `urgency_text_hash` | string | No | `sha256:...` | Optional audit reference if approved. Do not expose in Power BI by default. |
| `predicted_priority` | string | Yes | `high` | One of `low`, `medium`, `high`. |
| `confidence` | number | Yes | `0.82` | Highest class probability or model confidence score. |
| `probability_low` | number | No | `0.05` | Flattened class probability. |
| `probability_medium` | number | No | `0.13` | Flattened class probability. |
| `probability_high` | number | No | `0.82` | Flattened class probability. |
| `human_review_required` | boolean | Yes | `true` | Should be true for this public-sector demo. |
| `explanation_available` | boolean | Yes | `true` | At least one usable reason returned. |
| `explanation_reason_count` | integer | Yes | `4` | Number of returned reason factors. |
| `explanation_top_factor` | string | No | `vulnerability_flag` | Dashboard-friendly top reason label. |
| `request_status` | string | Yes | `success` | `success`, `validation_error`, `model_error`, `timeout`. |
| `latency_ms` | integer | No | `124` | End-to-end API latency. |

Raw free text should not be persisted in dashboard outputs unless a real data-governance process approves it. The local demo should use synthetic records only.

### `officer_review_events`

One row per human review or override. This table is a target production extension, not required for the current local API.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `review_id` | string | Yes | Stable review identifier. |
| `prediction_id` | string | Yes | Foreign key to `prediction_events`. |
| `event_timestamp_utc` | datetime | Yes | Review timestamp. |
| `officer_final_priority` | string | Yes | Final human-selected priority. |
| `model_priority` | string | Yes | Copied from prediction event for easy reporting. |
| `override_flag` | boolean | Yes | True when final priority differs from model recommendation. |
| `override_reason_code` | string | Conditional | Required when `override_flag=true`. |
| `review_completed` | boolean | Yes | Supports audit completeness. |

## Aggregate Metric Tables

### `model_performance_daily`

One row per `metric_date`, `model_version`, optional `slice_name`, optional `slice_value`, and optional `class_label`.

| Metric | Type | Definition |
| --- | --- | --- |
| `labelled_case_count` | integer | Count of records with trusted labels. |
| `accuracy` | number | Correct predictions divided by labelled cases. |
| `macro_precision` | number | Mean precision across `low`, `medium`, and `high`. |
| `macro_recall` | number | Mean recall across classes. |
| `macro_f1` | number | Mean F1 across classes. |
| `weighted_f1` | number | Class-support weighted F1. |
| `precision` | number | Per-class precision when `class_label` is set. |
| `recall` | number | Per-class recall when `class_label` is set. |
| `f1` | number | Per-class F1 when `class_label` is set. |
| `high_priority_recall` | number | Recall where true label is `high`. |
| `high_priority_false_negative_rate` | number | True `high` predicted as `low` or `medium`, divided by true `high`. |
| `confidence_calibration_error` | number | Expected calibration error or equivalent confidence calibration score. |
| `baseline_metric_value` | number | Baseline value for threshold comparison where relevant. |
| `metric_status` | string | `green`, `amber`, `red`, or `not_enough_data`. |

### `drift_daily`

One row per `metric_date`, `model_version`, and `feature_name`.

| Metric | Type | Definition |
| --- | --- | --- |
| `feature_name` | string | `service_type`, `days_open`, `previous_contacts`, `vulnerability_flag`, `deprivation_band`, `channel`, `urgency_text_terms`, `predicted_priority`, or `confidence`. |
| `feature_type` | string | `categorical`, `numeric`, `text`, `prediction`, or `confidence`. |
| `baseline_window_start` | date | First day in baseline window. |
| `baseline_window_end` | date | Last day in baseline window. |
| `current_window_start` | date | First day in current window. |
| `current_window_end` | date | Last day in current window. |
| `population_stability_index` | number | Preferred dashboard drift measure for tabular features. |
| `wasserstein_distance` | number | Optional numeric feature drift measure. |
| `js_divergence` | number | Optional categorical or text distribution measure. |
| `current_missing_rate` | number | Missing or invalid value share in current window. |
| `baseline_mean` | number | Numeric baseline mean, where applicable. |
| `current_mean` | number | Numeric current mean, where applicable. |
| `baseline_top_value` | string | Most common baseline category, where applicable. |
| `current_top_value` | string | Most common current category, where applicable. |
| `drift_status` | string | `green`, `amber`, `red`, or `not_enough_data`. |

### `fairness_daily`

One row per `metric_date`, `model_version`, `group_field`, and `group_value`.

| Metric | Type | Definition |
| --- | --- | --- |
| `group_field` | string | `vulnerability_flag`, `deprivation_band`, `service_type`, or `channel`. |
| `group_value` | string | Group value after approved aggregation. |
| `case_count` | integer | Prediction count for group. |
| `labelled_case_count` | integer | Labelled count for performance metrics. |
| `high_priority_rate` | number | Share recommended as `high`. |
| `average_confidence` | number | Mean confidence for group. |
| `low_confidence_rate` | number | Share below confidence threshold, default `< 0.65`. |
| `high_priority_recall` | number | Recall for true `high` where labels exist. |
| `high_priority_false_negative_rate` | number | Missed `high` cases divided by true `high` cases. |
| `override_rate` | number | Human overrides divided by reviewed cases. |
| `missing_data_rate` | number | Missing monitored fields divided by group cases. |
| `reference_group_value` | string | Group used for comparison, documented per metric. |
| `disparity_gap` | number | Group metric minus reference group metric. |
| `disparity_ratio` | number | Group metric divided by reference group metric. |
| `fairness_status` | string | `green`, `amber`, `red`, or `not_enough_data`. |

Fairness metrics are review indicators. They do not prove that the model is fair or unfair without operational context.

### `explainability_daily`

One row per `metric_date`, `model_version`, and optional `service_type`.

| Metric | Type | Definition |
| --- | --- | --- |
| `prediction_count` | integer | Prediction rows in scope. |
| `explanation_available_rate` | number | Predictions with at least one reason divided by total predictions. |
| `mean_reason_count` | number | Average number of returned reason factors. |
| `empty_reason_count` | integer | Predictions with no reason factors. |
| `explanation_failure_rate` | number | Explanation failures divided by predictions. |
| `low_confidence_explained_rate` | number | Low-confidence predictions that still include an explanation. |
| `top_factor_1` | string | Most frequent top reason factor. |
| `top_factor_1_share` | number | Share of predictions with that top factor. |
| `explainability_status` | string | `green`, `amber`, `red`, or `not_enough_data`. |

### `api_health_events`

One row per health check or aggregation bucket.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `event_timestamp_utc` | datetime | Yes | Probe or bucket time. |
| `api_status` | string | Yes | `ok`, `ready`, `degraded`, or `unavailable`. |
| `model_loaded` | boolean | Yes | Current model load state. |
| `model_version` | string | Yes | Active model version. |
| `request_count` | integer | Yes | Requests in bucket. |
| `success_count` | integer | Yes | Successful requests in bucket. |
| `error_count` | integer | Yes | Failed requests in bucket. |
| `validation_error_count` | integer | No | Bad request count in bucket. |
| `timeout_count` | integer | No | Timeout count in bucket. |
| `error_rate` | number | Yes | `error_count / request_count`. |
| `p50_latency_ms` | integer | No | Median latency. |
| `p95_latency_ms` | integer | No | 95th percentile latency. |
| `p99_latency_ms` | integer | No | 99th percentile latency. |
| `latest_success_timestamp_utc` | datetime | No | Last successful prediction. |

### `alert_events`

One row per alert state transition.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `alert_id` | string | Yes | Stable alert identifier. |
| `event_timestamp_utc` | datetime | Yes | Time alert changed state. |
| `alert_name` | string | Yes | Human-readable alert name. |
| `metric_group` | string | Yes | `performance`, `drift`, `fairness`, `explainability`, `api_health`, or `governance`. |
| `metric_name` | string | Yes | Metric that triggered alert. |
| `model_version` | string | No | Required for model-related alerts. |
| `severity` | string | Yes | `warning` or `critical`. |
| `status` | string | Yes | `open`, `acknowledged`, `resolved`, or `suppressed`. |
| `threshold_value` | number | No | Configured threshold. |
| `observed_value` | number | No | Observed metric value. |
| `owner` | string | No | Service owner, model owner, or support owner. |
| `review_note` | string | No | Short governance note. |

## Alert Thresholds

| Metric | Warning | Critical | Action |
| --- | --- | --- | --- |
| `api_health.error_rate` | `>= 0.02` for 15 minutes | `>= 0.05` for 15 minutes | Engineering incident review. |
| `api_health.p95_latency_ms` | `>= 750` for 15 minutes | `>= 1500` for 15 minutes | Check API, model loading, and dependencies. |
| `api_health.model_loaded` | `false` once | `false` for 5 minutes | Mark predictions as fallback/degraded. |
| `model_performance.macro_f1` | Drop `>= 0.05` vs baseline | Drop `>= 0.10` vs baseline | Review labels, drift, and retraining need. |
| `model_performance.high_priority_recall` | Drop `>= 0.05` vs baseline | Drop `>= 0.10` vs baseline or `< 0.80` | Review missed urgent cases before promotion. |
| `model_performance.high_priority_false_negative_rate` | `>= 0.12` | `>= 0.20` | Sample false negatives with service experts. |
| `prediction_events.confidence` | Low-confidence rate `>= 0.20` | Low-confidence rate `>= 0.35` | Review model confidence and data changes. |
| `drift.population_stability_index` | `>= 0.10` | `>= 0.25` | Compare current cases with baseline and incident context. |
| `fairness.disparity_gap` | Absolute gap `>= 0.10` | Absolute gap `>= 0.20` | Responsible AI review with service context. |
| `fairness.disparity_ratio` | Outside `0.80` to `1.25` | Outside `0.67` to `1.50` | Check group counts, labels, and operational justification. |
| `explainability.explanation_available_rate` | `< 0.98` | `< 0.95` | Stop promotion until explanations recover. |
| `governance.audit_completeness_rate` | `< 0.99` | `< 0.97` | Fix logging before relying on monitoring reports. |

## Power BI-Friendly Dataset Rules

- Use one row per metric grain; do not store nested JSON in dashboard tables.
- Include `metric_date`, `event_timestamp_utc`, `model_version`, and `metric_status` wherever relevant.
- Store numeric metric values as numbers, not strings with percent symbols.
- Use stable enum values such as `green`, `amber`, `red`, and `not_enough_data`.
- Keep dimension names consistent: `service_type`, `deprivation_band`, `vulnerability_flag`, `channel`, `predicted_priority`.
- Flatten class probabilities into `probability_low`, `probability_medium`, and `probability_high`.
- Use surrogate identifiers such as `prediction_id`; avoid resident identifiers in demo outputs.
- Prefer separate fact tables over wide rows with many unrelated metric columns.
- Keep a `model_version` slicer on every model-related table.
- Include `baseline_window_start`, `baseline_window_end`, `current_window_start`, and `current_window_end` for drift pages.

## Minimum Viable Dashboard Export

For the local portfolio demo, the minimum useful export can be:

1. `prediction_events.csv`
2. `model_performance_daily.csv`
3. `drift_daily.csv`
4. `fairness_daily.csv`
5. `explainability_daily.csv`
6. `api_health_events.csv`
7. `alert_events.csv`

These files are intentionally simple enough for Power BI import while preserving the monitoring concepts needed for Azure MLOps discussion.

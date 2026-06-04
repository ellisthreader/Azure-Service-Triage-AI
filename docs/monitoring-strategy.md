# Monitoring Strategy

## Purpose

This strategy explains how the Azure Council case-prioritisation project should monitor model quality, drift, fairness, explainability, API health, alert thresholds, and Power BI-ready outputs.

The project is a portfolio demonstration using synthetic data. Monitoring results show the engineering pattern and governance workflow; they do not prove real-world performance or fairness. In a real council deployment, monitoring would need approved data governance, a DPIA, equality impact assessment, service-owner sign-off, and secure operational logging.

## Monitoring Principles

- The model is advisory and supports human review.
- Metrics must be tied to `model_version` so releases can be compared.
- High-priority recall is a critical service-risk metric because missed urgent cases can cause harm.
- Accuracy alone is insufficient; macro metrics, per-class metrics, and slice metrics are required.
- Fairness metrics are prompts for review, not automated pass/fail proof.
- Explanation coverage is part of service safety because officers need reasons to challenge or override recommendations.
- Dashboard outputs should be flat tables that non-technical stakeholders can inspect in Power BI.

## Data Sources

| Source | Local demo | Azure-ready equivalent | Monitoring use |
| --- | --- | --- | --- |
| Prediction API | In-memory prediction log | Application Insights, Log Analytics, storage table, event stream | Volume, confidence, prediction mix, explanations |
| Health endpoint | `/health` | Azure Monitor availability test | API status, model-loaded state |
| Training artifacts | `ml/artifacts/evaluation.json` | Azure ML registered model artifacts | Baseline performance and validation metrics |
| Reviewed outcomes | Future extension | Case management review table | Performance, overrides, fairness by true outcome |
| Alert configuration | Documentation | Azure Monitor alerts or scheduled jobs | Governance and incident workflow |

## Model Performance Monitoring

Performance monitoring needs labelled data. In the local demo, labels come from synthetic validation data generated during training. In a production-like extension, labels should come from trusted reviewed outcomes, not raw model recommendations.

### Required Metrics

| Metric | Why it matters |
| --- | --- |
| Accuracy | Useful general health indicator, but not sufficient alone. |
| Macro precision | Treats all classes equally when measuring false positives. |
| Macro recall | Treats all classes equally when measuring missed cases. |
| Macro F1 | Headline balanced quality metric. |
| Weighted F1 | Shows overall quality adjusted for class support. |
| Per-class precision, recall, F1 | Identifies weak performance for `low`, `medium`, or `high`. |
| High-priority recall | Measures how often known urgent cases are identified. |
| High-priority false negative rate | Counts known urgent cases predicted as `low` or `medium`. |
| Confusion matrix | Shows which priority classes are confused. |
| Calibration error | Checks whether confidence values are trustworthy enough for workflow use. |

### Slice Metrics

Model quality should be reviewed by:

- `service_type`
- `vulnerability_flag`
- `deprivation_band`
- `channel`
- model version
- prediction confidence band

Minimum slice size should be enforced. Use `not_enough_data` rather than reporting unstable percentages for tiny groups.

## Drift Monitoring

Drift monitoring compares recent prediction traffic against the training or approved baseline window. Drift does not automatically mean the model is wrong, but it can show that the service has changed.

### Feature Drift

| Feature | Drift method | Notes |
| --- | --- | --- |
| `service_type` | Population stability index or Jensen-Shannon divergence | Detects changing service mix. |
| `days_open` | PSI, mean shift, percentile shift, Wasserstein distance | Detects backlog or workflow changes. |
| `previous_contacts` | PSI, mean shift, percentile shift | Detects repeat-contact changes. |
| `vulnerability_flag` | PSI or rate difference | Sensitive governance context; review carefully. |
| `deprivation_band` | PSI or rate difference | Proxy-risk field; changes may indicate access inequality or service mix changes. |
| `channel` | PSI or rate difference | Detects digital, phone, or in-person access changes. |
| `urgency_text` | Top term share, unknown term rate, embedding or TF-IDF distance | Avoid storing raw text in dashboard outputs. |

### Prediction Drift

Track:

- `low`, `medium`, and `high` recommendation share
- average confidence
- low-confidence rate, default threshold `< 0.65`
- class probability distribution
- `human_review_required` rate

Prediction drift should be reviewed alongside operational context such as storms, service outages, seasonal demand, policy changes, or backlog-clearing work.

## Fairness Monitoring

Fairness monitoring should use approved group fields only. The current synthetic demo can use:

- `vulnerability_flag`
- `deprivation_band`
- `service_type`
- `channel`

No protected characteristic should be added to the model without a clear lawful basis, governance approval, and equality analysis. Deprivation band and vulnerability flags can still act as proxy or sensitive-risk fields, so they require careful interpretation.

### Fairness Indicators

| Metric | Interpretation |
| --- | --- |
| High-priority recommendation rate | Whether groups receive high recommendations at materially different rates. |
| Average confidence | Whether the model is less certain for some groups. |
| Low-confidence rate | Whether officer review burden differs by group. |
| High-priority recall | Whether known urgent cases are missed more often for a group. |
| High-priority false negative rate | Key harm-oriented slice metric. |
| Override rate | Whether officers regularly disagree with the model for a group. |
| Missing-data rate | Whether data quality issues are concentrated in a group. |
| Disparity gap | Difference from a reference group. |
| Disparity ratio | Ratio compared with a reference group. |

Differences may be justified by genuine need or service mix, but they must be evidenced and reviewed. Equal recommendation rates are not automatically the correct goal in public services.

## Explainability Coverage

Every prediction should include explanation factors that an officer can understand. Explanations should describe model signals associated with the recommendation, not causal proof.

### Required Metrics

| Metric | Target |
| --- | --- |
| Explanation available rate | `>= 98%`, critical below `95%`. |
| Mean reason count | Track for sudden drops or inflated noisy explanations. |
| Empty reason count | Should be zero outside error cases. |
| Explanation failure rate | Warning above `2%`, critical above `5%`. |
| Low-confidence explained rate | Low-confidence predictions should still explain uncertainty. |
| Top reason factor share | Detects explanation collapse where one factor dominates. |

### Explanation Sampling

Monthly review should sample explanations by:

- priority class
- service type
- low-confidence cases
- vulnerability flag
- deprivation band
- officer overrides

The review question is whether the explanation helps a human officer apply policy and professional judgement.

## API Health Monitoring

API health metrics should separate availability from model safety. An API can respond successfully while serving a fallback model or missing explanations.

| Metric | Warning | Critical |
| --- | --- | --- |
| Error rate | `>= 2%` over 15 minutes | `>= 5%` over 15 minutes |
| p95 latency | `>= 750 ms` over 15 minutes | `>= 1500 ms` over 15 minutes |
| Model loaded | `false` once | `false` for more than 5 minutes |
| Timeout count | Any sustained increase | Repeated timeout burst |
| Validation error rate | Sudden increase | Sustained malformed traffic |
| Latest successful prediction age | Older than expected service interval | No success for agreed SLA window |

The local `rules-fallback` mode is useful for development, but should be treated as degraded for governance reporting.

## Alert Thresholds And Review Actions

| Area | Warning threshold | Critical threshold | Review action |
| --- | --- | --- | --- |
| Macro F1 | Drop `>= 0.05` from baseline | Drop `>= 0.10` from baseline | Review data, labels, drift, and model promotion. |
| High-priority recall | Drop `>= 0.05` from baseline | Drop `>= 0.10` or below `0.80` | Sample missed urgent cases with service experts. |
| High-priority false negatives | `>= 12%` | `>= 20%` | Escalate model-quality review. |
| Low-confidence rate | `>= 20%` | `>= 35%` | Review input drift and confidence calibration. |
| PSI for key feature | `>= 0.10` | `>= 0.25` | Compare with service incidents or policy changes. |
| Fairness gap | Absolute gap `>= 0.10` | Absolute gap `>= 0.20` | Responsible AI and service-owner review. |
| Fairness ratio | Outside `0.80` to `1.25` | Outside `0.67` to `1.50` | Check group count, label validity, and justification. |
| Explanation coverage | `< 98%` | `< 95%` | Pause promotion until explanations recover. |
| Audit completeness | `< 99%` | `< 97%` | Fix logging before relying on reports. |
| API error rate | `>= 2%` | `>= 5%` | Engineering incident process. |
| API p95 latency | `>= 750 ms` | `>= 1500 ms` | Performance and dependency review. |

Alerts should produce `alert_events` rows with owner, severity, observed value, threshold, and review status. Alert resolution should record the evidence for closure.

## Power BI Output Model

Power BI should import flat fact tables and small dimension tables. The core design is:

| Table | Grain | Example visuals |
| --- | --- | --- |
| `prediction_events` | One row per prediction | Activity trend, priority mix, confidence distribution, explanation availability. |
| `model_performance_daily` | Date, model, slice, class | KPI cards, line charts, confusion matrix-style tables. |
| `drift_daily` | Date, model, feature | Drift heatmap, feature trend table, current vs baseline bars. |
| `fairness_daily` | Date, model, group field, group value | Group comparison matrix, disparity alerts, override trend. |
| `explainability_daily` | Date, model, service type | Explanation coverage KPI, top reason factors. |
| `api_health_events` | Time bucket | Error rate, latency, request volume, health state. |
| `alert_events` | Alert state change | Open alerts, severity trend, resolution status. |

Recommended dimensions:

- `dim_date`
- `dim_model_version`
- `dim_service_type`
- `dim_priority`
- `dim_metric_status`
- `dim_alert_severity`

Power BI rules:

- Keep percentages as decimal numbers, such as `0.82`.
- Do not store nested objects in imported fact tables.
- Use UTC timestamps and a separate local-time display field only if needed.
- Include `model_version` in every model-related table.
- Use `not_enough_data` when group counts are below the reporting threshold.
- Exclude raw `urgency_text` and resident identifiers from dashboard datasets.

## Governance Workflow

| Activity | Cadence | Owner | Evidence |
| --- | --- | --- | --- |
| API health check | Daily or automated | Engineering owner | `api_health_events`, open alerts |
| Model quality review | Weekly when labels exist | Model owner | `model_performance_daily`, false-negative samples |
| Drift review | Weekly and after major incidents | Data scientist and service owner | `drift_daily`, operational context notes |
| Fairness review | Monthly and before promotion | Responsible AI reviewer and service owner | `fairness_daily`, equality analysis notes |
| Explanation review | Monthly | Product owner and officer lead | `explainability_daily`, sampled explanations |
| Model promotion decision | Per release | Governance board or equivalent | Model card, evaluation report, alert history |
| DPIA/privacy review | Launch, material change, annual | DPO or information governance lead | DPIA-lite, retention and access-control evidence |

## Local Implementation Path

1. Keep `/metrics/summary` as the lightweight dashboard endpoint.
2. Add structured prediction logging with `prediction_id`, `model_version`, confidence, priority, and explanation fields.
3. Export local CSV files matching `monitoring/metrics_contract.md`.
4. Generate daily aggregate tables from prediction events and `evaluation.json`.
5. Import the CSV files into Power BI to demonstrate stakeholder dashboards.
6. Replace local CSV exports with Azure storage or Log Analytics when moving toward Azure readiness.

## Acceptance Criteria

- Monitoring covers performance, drift, fairness, explainability, API health, alerting, and governance evidence.
- Every metric has an owner-facing interpretation and a threshold or review rule.
- Outputs are flat enough for Power BI import.
- Sensitive fields and free text are minimised in dashboard-facing data.
- Reports always identify the active `model_version`.
- Fairness and synthetic-data limitations are explicitly stated.

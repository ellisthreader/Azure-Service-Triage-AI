# Model Card

## Model Overview

**Model name:** Azure Council Case Priority Classifier  
**Project type:** Portfolio demonstration  
**Model status:** Baseline design for local development and Azure-ready MLOps demonstration  
**Task:** Multiclass classification  
**Output classes:** `low`, `medium`, `high`  
**Primary users:** Council officers, service managers, data scientists, and governance reviewers  
**Decision role:** Advisory recommendation only. A human officer makes the operational decision.

The model predicts the recommended priority for a fictional council service case. It combines structured case attributes with free-text urgency notes and returns a priority class, confidence score, and explanation factors for officer review.

## Intended Use

The model is intended to help officers triage fictional service cases in a dashboard-first workflow. Appropriate uses include:

- Demonstrating public-sector AI engineering patterns.
- Showing how a model can be served through an API.
- Producing explanations alongside predictions.
- Demonstrating monitoring for model quality, drift, fairness, and operational health.
- Supporting interview discussion about Azure MLOps, Responsible AI, and UK GDPR-aware design.

## Out-Of-Scope Uses

The model must not be used for:

- Fully automated decisions about residents.
- Service denial, eligibility decisions, enforcement decisions, or safeguarding decisions.
- Decisions with legal or similarly significant effects unless a separate legal and governance process approves the use case.
- Real resident data without a completed DPIA, lawful basis assessment, privacy notice, security review, and service owner approval.
- Ranking residents by worthiness, risk, compliance, or entitlement.

## Input Features

| Feature | Type | Description | Responsible AI notes |
| --- | --- | --- | --- |
| `service_type` | Categorical | Service area such as housing repair, highways, waste, benefits, council tax, or social care contact. | Performance should be checked by service because case volumes and urgency patterns differ. |
| `case_age_days` | Numeric | Number of days since case creation. | High age may reflect backlog, not resident need. |
| `previous_contacts` | Numeric | Count of previous resident contacts about the case. | Can reflect urgency, frustration, digital access, or language confidence. |
| `vulnerability_flag` | Boolean | Whether vulnerability is recorded in the case. | Sensitive and likely incomplete. Must not be used as a hard gate. |
| `postcode_deprivation_band` | Categorical or ordinal | Area-level deprivation band, using fictional values in the demo. | May act as a proxy for protected characteristics or socioeconomic status. Requires fairness review. |
| `urgency_notes` | Text | Free-text case notes entered by staff or submitted by residents. | May contain sensitive data and linguistic bias. Requires minimisation and access control. |

## Training Data

The portfolio version uses synthetic data generated for demonstration. It should simulate realistic case patterns without containing real resident information.

### Synthetic Data Assumptions

- Labels are generated from transparent rules with controlled noise.
- Higher priority is more likely for older cases, repeated contacts, vulnerability indicators, urgent terms, and certain service types.
- Synthetic examples are balanced enough to train a baseline but do not represent actual council demand.
- Synthetic fairness analysis is illustrative only.

### Real Deployment Data Requirements

Before using real data, the project would need:

- A documented lawful basis for processing.
- Data minimisation review.
- DPIA approval.
- Data quality profiling.
- Label definition agreed with service experts.
- Sampling plan that covers service types, channels, locations, and seasonal patterns.
- Review for protected characteristic proxies and sensitive free text.
- Retention and deletion schedule.

## Model Approach

Expected baseline pipeline:

- `ColumnTransformer` for structured and text features.
- One-hot encoding for categorical fields.
- Standard scaling or passthrough for numeric fields depending on classifier choice.
- TF-IDF vectorisation for `urgency_notes`.
- Multiclass classifier such as logistic regression, linear SVM with calibrated probabilities, random forest, or gradient boosting.
- Saved model artifact with versioned metadata.

The preferred baseline for explainability is a regularised logistic regression model or another interpretable model that can expose feature contributions. More complex models should be justified by measurable performance gains and explanation quality.

## Evaluation Plan

### Core Metrics

| Metric | Why it matters |
| --- | --- |
| Accuracy | Overall correctness, but insufficient alone. |
| Macro F1 | Gives equal weight to each class and avoids hiding poor minority-class performance. |
| `high` recall | Missing high-priority cases is likely more harmful than over-escalating some low-priority cases. |
| `high` precision | Prevents excessive false escalation and queue pressure. |
| Confusion matrix | Shows which priority classes are confused. |
| Calibration by confidence band | Confidence should be meaningful to officers. |

### Fairness Slices

Evaluate metrics across:

- Service type.
- Vulnerability flag.
- Postcode deprivation band.
- Case submission channel, if introduced.
- Language or accessibility support indicators, if lawfully collected and appropriate.

Metrics should include class distribution, false negative rate for `high`, false positive rate for `high`, override rate, missing data rate, and complaint or challenge rate where available.

### Acceptance Gates For A Real Deployment

A real deployment should define service-specific thresholds. Example gates:

- `high` recall meets the service-approved minimum on validation data.
- No monitored group has unexplained materially worse false negative rates.
- Confidence calibration is documented.
- Explanations are available for at least 99 percent of successful predictions.
- Override workflow is live and audited.
- DPIA and information governance approvals are complete.

## Explainability

Each prediction should return:

- Predicted priority.
- Confidence score.
- Top positive factors.
- Top negative factors.
- Missing or low-quality input warnings.
- Model version.

The explanation should be suitable for a non-technical officer. It should not expose raw model internals as the only explanation. Technical details can be available in logs or model metadata, but the dashboard should focus on plain-English reasons.

Example response text:

> Recommended priority is high because the case has repeated contacts, vulnerability is recorded, the case has been open for several days, and the notes include urgent repair language. Confidence is moderate. Review the case history before action.

## Ethical And Social Impact

Potential benefits:

- More consistent triage.
- Earlier identification of urgent cases.
- Better visibility of backlog and demand patterns.
- Stronger evidence base for service managers.

Potential harms:

- Mis-prioritising cases and delaying support.
- Reproducing historical service bias.
- Over-weighting articulate or persistent residents.
- Treating deprivation or vulnerability as simplistic indicators.
- Staff over-reliance on model outputs.
- Residents losing trust if decisions are opaque.

The system should be introduced only where the service can maintain human judgement, clear accountability, and meaningful routes for correction.

## Limitations

- Synthetic data does not validate real-world accuracy or fairness.
- The three-class priority scheme is a simplification.
- The model does not understand legislation, local policy, safeguarding duties, or service-specific statutory deadlines.
- Text features may perform poorly with spelling variation, abbreviations, multiple languages, or very short notes.
- Confidence is not a guarantee of correctness.
- Explanation factors describe model behaviour and are not proof of causal relationships.
- Fairness metrics depend on data quality and group definitions.
- The model can become stale when policies, demand patterns, or service channels change.

## Monitoring And Maintenance

### Production Monitoring

Track:

- Prediction volume by service type and priority.
- Latency and error rate.
- Missing input fields.
- Explanation generation failures.
- Confidence distribution.
- Drift in structured features and text terms.
- Model quality against labelled outcomes.
- Fairness metrics across approved slices.
- Override rates and override reasons.
- Complaints, challenges, and incident reports.

### Retraining Triggers

Retraining should be considered when:

- Performance drops below agreed thresholds.
- Drift persists across multiple monitoring periods.
- A service policy changes.
- A new channel or case type is introduced.
- Override analysis shows repeated model blind spots.
- Fairness review identifies unexplained disparities.

Retraining should not be automatic. It should require documented approval, comparison against the current model, regression testing, updated model card entries, and deployment sign-off.

## Governance

| Area | Required control |
| --- | --- |
| Accountability | Named service owner, technical owner, and information governance owner. |
| Access | Role-based access to case data, predictions, explanations, and logs. |
| Audit | Record input metadata, model version, prediction, confidence, explanation, reviewer, final decision, and override reason where proportionate. |
| Change control | Version datasets, code, model artifacts, schemas, and monitoring logic. |
| Privacy | Complete DPIA before real data use. Minimise free-text storage and restrict sensitive data access. |
| Human oversight | Officer review and override must be part of the operating model. |
| Incident response | Define process for harmful predictions, data incidents, and model rollback. |

## Interview Talking Points

- I would start with a transparent baseline model because the public-sector priority is accountable decision support, not leaderboard performance.
- I would evaluate `high` recall separately because a missed urgent case is a different risk from an over-escalated routine case.
- I would not treat postcode deprivation as a neutral feature. It can improve equity analysis, but it can also create proxy discrimination risk.
- I would monitor overrides because they reveal where operational experts disagree with the model.
- I would require a DPIA and service-level sign-off before any real resident data or live workflow use.
- I would version the model card with every material model, data, or policy change.

## Reference Guidance

- ICO, explaining decisions made with AI: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/explaining-decisions-made-with-artificial-intelligence/
- ICO, AI and data protection: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/guidance-on-ai-and-data-protection/
- ICO, automated decision-making and profiling: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/automated-decision-making-and-profiling/


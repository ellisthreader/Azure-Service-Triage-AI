# ML Layer

This folder defines the synthetic service request prioritisation dataset, the
baseline training approach, and the model artifacts expected by the backend API.
The project is a local, Azure-ready demonstration. It does not use real council
records or automate service decisions.

## Synthetic Dataset

The dataset represents fictional public-sector service cases. Each row is one
case submitted to a council service area and labelled with a recommended
priority: `low`, `medium`, or `high`.

Intended example service areas:

- `housing`
- `adult_social_care`
- `highways`
- `waste`
- `benefits`
- `council_tax`
- `children_services`

Core input fields:

- `service_type`: case domain used for routing and priority context.
- `days_open`: number of days since the case was opened.
- `previous_contacts`: count of prior contacts about the same issue.
- `vulnerability_flag`: whether the case involves an explicit vulnerability or
  safeguarding indicator.
- `deprivation_band`: synthetic area deprivation band: `low`, `medium`, or
  `high`.
- `channel`: synthetic submission channel: `web`, `phone`, `email`, or
  `in_person`.
- `urgency_text`: short free-text notes describing urgency, impact, risk, or
  access needs.

Optional generator-only fields may be retained for audit or monitoring, but
must not be required by the prediction API unless they are added to the feature
contract.

## Expected Labels

Labels are generated from transparent rules plus controlled noise so the model
has a learnable but imperfect task:

- `high`: likely where vulnerability, safeguarding language, long case age,
  repeated contacts, severe service impact, or adult social care context is
  present.
- `medium`: likely where the issue has moderate delay, repeat contact, access
  impact, or clear but non-critical urgency.
- `low`: likely where the case is recent, isolated, routine, and has no
  vulnerability or severe impact indicators.

The label is a recommendation target only. It must be presented as decision
support for a human officer, not as a final decision.

## Baseline Model

The baseline model should be a scikit-learn `Pipeline` that combines:

- `TfidfVectorizer` for `urgency_text`.
- One-hot encoding for categorical fields.
- Scaling for numeric fields.
- A multiclass `LogisticRegression` classifier.

Logistic regression is the preferred first model because it is quick to train,
works well with sparse TF-IDF features, provides calibrated-style decision
scores with suitable settings, and is easier to explain in a public-sector demo
than a high-complexity model. Tree-based alternatives can be explored later, but
the first artifact should prioritise reproducibility, explainability, and API
stability.

## Evaluation Outputs

Training should produce a validation report with:

- overall accuracy
- macro precision
- macro recall
- macro F1
- per-class precision, recall, and F1 for `low`, `medium`, and `high`
- confusion matrix
- calibration or confidence summary where available
- fairness slices for selected synthetic groups, especially
  `vulnerability_flag`, `deprivation_band`, `channel`, and `service_type`

Macro metrics are required because the `high` class is expected to be less
common but operationally important.

## Model Artifacts

The current training process writes artifacts under `ml/artifacts/`.

Expected files:

- `case_priority_model.joblib`: fitted scikit-learn pipeline and metadata
  bundled for API loading.
- `model_metadata.json`: model version, model type, feature list, target, class
  labels, row counts, and intended-use notes.
- `evaluation.json`: validation metrics and confusion matrix.
- `feature_contract.json` or equivalent exported schema derived from this
  documentation, when a machine-readable contract is added.
- `docs/model-card.md`: human-readable Responsible AI summary, limitations, and
  intended use.

The backend must load the model through the artifact directory rather than by
depending on training-time globals. Any artifact promoted to an Azure ML model
registry should preserve the same file layout.

## Local Workflow

The intended local flow is:

1. Generate synthetic data.
2. Train the baseline model with a fixed random seed.
3. Save the model, metadata, evaluation report, and model card.
4. Run API smoke checks against the saved artifact.
5. Review monitoring and Responsible AI documentation before treating a model as
   deployable.

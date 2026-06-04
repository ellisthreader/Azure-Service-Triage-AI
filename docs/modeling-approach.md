# Modeling Approach

## Purpose

The model recommends a fictional council case priority of `low`, `medium`, or
`high` for human review. It is designed as a portfolio demonstration of
public-sector ML engineering, not as a production decisioning system.

The system should always make clear that the recommendation supports an officer
workflow. It must not deny, delay, or approve services without human judgement.

## Dataset Design

The dataset is synthetic and should be generated from transparent rules. It
should imitate common council case triage signals without copying or resembling
real resident records.

Each generated case should contain:

- a service area such as housing repairs, highways, waste, benefits, council
  tax, adult social care, or children services
- case age in days, stored as `days_open`
- previous contact count
- vulnerability indicator
- synthetic area deprivation band: `low`, `medium`, or `high`
- submission channel: `web`, `phone`, `email`, or `in_person`
- short urgency notes, stored as `urgency_text`
- generated priority label

The generator should include realistic variation:

- most cases are routine or moderate
- `high` priority cases are less frequent but not rare
- some labels include noise to avoid a perfectly deterministic task
- free text includes both clear urgency phrases and neutral descriptions
- service areas differ in typical age, contact count, and urgency distribution

No protected characteristic should be generated for model use. Synthetic
deprivation band can be used to demonstrate fairness and drift monitoring, but
the project documentation must explain the governance risk of using area-level
proxies.

## Label Rules

The target label is `priority`.

Expected labels:

- `low`: recent, routine, low-impact cases with no vulnerability or repeated
  contact signal.
- `medium`: cases with moderate urgency, some delay, repeated contact, or
  service disruption.
- `high`: cases involving vulnerability, safeguarding terms, severe impact,
  long-running delay, repeated unresolved contact, or adult social care urgency.

The training generator should compute a transparent priority score from these
signals, map score bands to labels, then apply a small amount of seeded random
noise. This supports explainability while making evaluation more realistic.

## Feature Contract

Version `council_case_priority.v1` uses the implemented training/API fields:

- `service_type`
- `days_open`
- `previous_contacts`
- `vulnerability_flag`
- `deprivation_band`
- `channel`
- `urgency_text`

The same preprocessing must be used during training and inference. The safest
implementation is a single persisted scikit-learn pipeline containing all text,
categorical, numeric, and classifier steps.

## Model Choice

The first model should be a scikit-learn multiclass logistic regression pipeline.

Recommended pipeline:

- `ColumnTransformer`
- `TfidfVectorizer` for `urgency_text`
- `OneHotEncoder` for service type, vulnerability flag, deprivation band, and
  channel
- numeric scaling for days open and previous contacts
- `LogisticRegression` with multiclass support and a fixed random seed

Reasons for this choice:

- strong baseline for mixed sparse text and structured features
- fast local training and easy CI smoke checks
- easier explanation through feature weights than more complex models
- stable artifact format for FastAPI loading
- suitable for Azure ML registration as a single joblib artifact

Later experiments can compare gradient boosted trees, calibrated linear SVMs, or
hybrid text models, but only after the baseline contract and monitoring outputs
are stable.

## Evaluation Metrics

Required validation metrics:

- accuracy
- macro precision
- macro recall
- macro F1
- weighted F1
- per-class precision, recall, and F1
- confusion matrix using label order `low`, `medium`, `high`

Macro recall and macro F1 should be treated as headline metrics because missed
`high` priority cases are operationally important and class balance may vary.
Accuracy alone is not sufficient.

Recommended quality checks:

- `high` class recall
- false negatives where `high` is predicted as `low` or `medium`
- confidence distribution by predicted class
- performance by `service_type`
- performance by `vulnerability_flag`
- performance by `deprivation_band`
- performance by `channel`

Fairness checks should be framed as monitoring indicators, not proof of fairness.
The dataset is synthetic, so fairness results demonstrate the engineering
workflow rather than real-world equity.

## Explanation Expectations

The API should return plain-English explanation factors with each prediction.
For the baseline model, explanations can be derived from:

- top weighted TF-IDF terms present in `urgency_text`
- high-impact structured fields such as vulnerability flag
- thresholds for case age or repeated contact
- service-area context where relevant

Explanations should say "signals associated with the recommendation" rather than
claiming direct causality.

## Artifact Expectations

Each trained model version should produce:

- `case_priority_model.joblib`: complete fitted preprocessing and classifier
  pipeline, currently bundled with metadata
- `model_metadata.json`: model version, feature list, target, classes, row
  counts, model type, and intended-use notes
- `evaluation.json`: metrics, confusion matrix, and slice summaries
- `docs/model-card.md`: intended use, limitations, ethical considerations,
  evaluation summary, and human oversight guidance
- `feature_contract.json`: machine-readable version of the accepted input schema

The backend should load artifacts by directory path where possible and expose
the active `model_version` in health or metadata responses. Artifact promotion
to Azure ML should preserve these files together so evaluation, governance, and
serving behavior remain auditable.

## Deployment Readiness

Before a model is treated as deployable, the project should verify:

- training is reproducible from a fixed command and seed
- evaluation reports are generated automatically
- API smoke tests can load the artifact and return all output fields
- monitoring can aggregate prediction, confidence, drift, and fairness slices
- documentation states that the model uses synthetic data and requires human
  review

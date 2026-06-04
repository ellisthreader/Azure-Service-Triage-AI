# Feature Contract

This contract defines the fields accepted by the model training pipeline and the
FastAPI prediction endpoint. Any implementation should validate these fields
before inference and reject or clearly default invalid inputs.

Schema version: `council_case_priority.v1`

## Prediction Input

| Field | Type | Required | Allowed values / range | Model use |
| --- | --- | --- | --- | --- |
| `service_type` | string | yes | `housing`, `adult_social_care`, `highways`, `waste`, `benefits`, `council_tax`, `children_services` | Categorical feature |
| `days_open` | integer | yes | `0` to `365` | Numeric feature |
| `previous_contacts` | integer | yes | `0` to `50` | Numeric feature |
| `vulnerability_flag` | boolean | yes | `true` or `false` | Binary categorical feature |
| `deprivation_band` | string | yes | `low`, `medium`, `high` | Categorical feature for monitoring and modelling |
| `channel` | string | yes | `web`, `phone`, `email`, `in_person` | Categorical feature |
| `urgency_text` | string | yes | `3` to `800` characters after trimming | Text feature |

The API may accept non-model metadata such as `case_id` or `submitted_at` for
logging, but those fields must not change the prediction unless they are added
to this contract.

## Target Label

Training data must include `priority` with one of:

- `low`
- `medium`
- `high`

Prediction responses should return the same label set as `priority`, plus a
confidence score and explanation factors.

## Feature Preparation

Expected transformations:

- Trim `urgency_text`; reject text below the minimum length after trimming.
- Lowercase text inside the vectorizer or preprocessing pipeline.
- Encode `service_type`, `vulnerability_flag`, and
  `deprivation_band`.
- Encode `channel`.
- Pass `days_open` and `previous_contacts` as numeric features.
- Keep training and inference transformations inside the saved scikit-learn
  pipeline to avoid API/training skew.

Recommended derived features for future versions:

- `is_repeat_contact`: `previous_contacts > 0`
- `days_open_bucket`: recent, ageing, overdue, long-running
- urgency keyword indicators for safeguarding, blocked access, severe disrepair,
  missed collections, financial hardship, and mobility impact

Derived features must be produced consistently in training and inference before
they become part of a production artifact.

## Validation Rules

Inputs should fail validation when:

- a required field is missing
- `service_type` is outside the allowed set
- `channel` is outside the allowed set
- numeric values are negative or above the maximum range
- `deprivation_band` is outside `low`, `medium`, or `high`
- `urgency_text` is shorter than the minimum after trimming
- `urgency_text` exceeds the maximum accepted length

For demo ergonomics, the frontend can provide defaults, but the backend remains
the source of truth for validation.

## Prediction Output Contract

The model service should return:

| Field | Type | Notes |
| --- | --- | --- |
| `priority` | string | One of `low`, `medium`, `high` |
| `confidence` | number | Highest predicted class probability or normalised decision confidence |
| `class_probabilities` | object | Probability per class when supported by the classifier |
| `main_reasons` | array | Plain-English factors contributing to the recommendation |
| `model_version` | string | Version from artifact metadata |
| `human_review_required` | boolean | Always expected to be true for advisory use |

Explanations should avoid claiming causality. They should describe influential
signals, for example: "vulnerability flag present", "case is long-running", or
"urgency notes include high-impact language".

## Monitoring Slices

The following fields should be logged for aggregate monitoring:

- `service_type`
- `vulnerability_flag`
- `deprivation_band`
- `channel`
- predicted `priority`
- `confidence`
- human override or final outcome when available

Monitoring output must aggregate records. It should not expose free-text notes
or personal data in dashboards.

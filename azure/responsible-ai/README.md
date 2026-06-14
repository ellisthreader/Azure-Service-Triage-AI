# Responsible AI Dashboard Runbook

Azure Machine Learning Responsible AI dashboard work is a review stage after a model candidate is trained and before it is promoted to a wider deployment.

## What This Project Prepares

Run this locally or as a pipeline step:

```bash
python ml/prepare_responsible_ai_inputs.py
```

It writes:

- `azure/responsible-ai/inputs/train.csv`
- `azure/responsible-ai/inputs/test.csv`
- `azure/responsible-ai/inputs/responsible_ai_input_metadata.json`

These files separate the training and test cohorts and document the target, feature types, and cohort candidates.

## Dashboard Components To Use

For this project, configure the dashboard with:

- Model overview and performance.
- Error analysis, especially high-priority false negatives.
- Interpretability for the tabular/text feature pipeline.
- Fairness cohorts:
  - `vulnerability_flag`
  - `deprivation_band`
  - `service_type`
- Counterfactual analysis only as an exploratory review tool, not as resident-facing advice.

## Governance Review Questions

- Does high-priority recall meet the agreed floor?
- Are error rates materially worse for any cohort?
- Are explanation factors stable and understandable?
- Are free-text notes excluded from avoidable logs?
- Is the model still advisory with human review?
- Is the model card updated with the dashboard findings?

## Scorecard Expectation

Export a Responsible AI scorecard PDF from Azure ML Studio and attach it to the model version review package with:

- `ml/artifacts/evaluation.json`
- `ml/artifacts/gate_summary.json`
- `docs/model-card.md`
- `docs/dpia-lite.md`
- endpoint smoke-test output

The scorecard should be treated as a deployment gate, not as an automatic approval.

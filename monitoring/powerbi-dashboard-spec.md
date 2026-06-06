# Power BI Dashboard Specification

This project cannot publish a real Power BI report without a Power BI workspace, but the `monitoring/export_powerbi.py` script creates import-ready CSV tables for a monitoring dashboard.

## Generate Data

```bash
python monitoring/export_powerbi.py
```

Output folder:

```text
monitoring/powerbi/
```

## Suggested Report Pages

### Model Overview

Cards:

- Accuracy
- Macro F1
- High-priority recall
- Model version
- Gate status

Tables:

- `model_summary.csv`
- `operational_metrics.csv`

### Fairness And Drift Review

Visuals:

- Bar chart of `high_priority_rate` by `slice_feature` and `slice_value`
- Table of cohort `accuracy`
- Alert card for `fairness_review`

Table:

- `fairness_slices.csv`

### Explainability

Visuals:

- Bar chart of `mean_absolute_shap` by feature
- Slicer for class: low, medium, high

Table:

- `shap_feature_importance.csv`

### Prediction QA

Visuals:

- Distribution of predicted priority
- Distribution of confidence
- Table of prediction examples

Table:

- `prediction_examples.csv`

## Governance Note

This dashboard is for monitoring and review. It should not be used to automatically approve model changes or remove human oversight.

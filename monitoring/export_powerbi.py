from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ml.train_model import FEATURES

DATA_PATH = ROOT / "ml" / "data" / "synthetic_cases.csv"
MODEL_PATH = ROOT / "ml" / "artifacts" / "case_priority_model.joblib"
EVALUATION_PATH = ROOT / "ml" / "artifacts" / "evaluation.json"
GATE_PATH = ROOT / "ml" / "artifacts" / "gate_summary.json"
SHAP_PATH = ROOT / "ml" / "artifacts" / "shap_summary.json"
OUTPUT_DIR = ROOT / "monitoring" / "powerbi"


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(DATA_PATH)
    evaluation = read_json(EVALUATION_PATH)
    gate_summary = read_json(GATE_PATH)
    shap_summary = read_json(SHAP_PATH)

    write_model_summary(evaluation, gate_summary)
    write_fairness_slices(evaluation)
    write_prediction_examples(df)
    write_shap_summary(shap_summary)
    write_data_dictionary()
    write_operational_metrics(gate_summary)
    print(f"Wrote Power BI-ready CSV files to {OUTPUT_DIR}")


def write_model_summary(evaluation: dict[str, object], gate_summary: dict[str, object]) -> None:
    rows = [
        {"metric": "accuracy", "value": evaluation.get("accuracy")},
        {"metric": "macro_f1", "value": evaluation.get("macro_f1")},
        {"metric": "high_priority_recall", "value": evaluation.get("high_priority_recall")},
        {"metric": "high_priority_recall_floor", "value": gate_summary.get("high_priority_recall_floor")},
        {"metric": "high_priority_recall_gate", "value": gate_summary.get("high_priority_recall_gate")},
        {"metric": "human_review_required", "value": gate_summary.get("human_review_required")},
        {"metric": "data", "value": gate_summary.get("data")},
    ]
    pd.DataFrame(rows).to_csv(OUTPUT_DIR / "model_summary.csv", index=False)


def write_fairness_slices(evaluation: dict[str, object]) -> None:
    rows = []
    for feature, groups in (evaluation.get("fairness_slices") or {}).items():
        for group, values in groups.items():
            rows.append(
                {
                    "slice_feature": feature,
                    "slice_value": group,
                    "rows": values.get("rows"),
                    "high_priority_rate": values.get("high_priority_rate"),
                    "accuracy": values.get("accuracy"),
                }
            )
    pd.DataFrame(rows).to_csv(OUTPUT_DIR / "fairness_slices.csv", index=False)


def write_prediction_examples(df: pd.DataFrame) -> None:
    artifact = joblib.load(MODEL_PATH)
    model = artifact["model"]
    sample = df.head(50).copy()
    predictions = model.predict(sample[FEATURES])
    probabilities = model.predict_proba(sample[FEATURES])
    classes = [str(label) for label in model.classes_]

    sample["predicted_priority"] = predictions
    sample["confidence"] = [
        round(float(probabilities[index][classes.index(str(priority))]), 4)
        for index, priority in enumerate(predictions)
    ]
    sample["human_review_required"] = (sample["predicted_priority"] == "high") | (sample["confidence"] < 0.65)
    sample.to_csv(OUTPUT_DIR / "prediction_examples.csv", index=False)


def write_shap_summary(shap_summary: dict[str, object]) -> None:
    rows = []
    for class_name, features in (shap_summary.get("top_features_by_class") or {}).items():
        for rank, item in enumerate(features, start=1):
            rows.append(
                {
                    "class": class_name,
                    "rank": rank,
                    "feature": item.get("feature"),
                    "mean_absolute_shap": item.get("mean_absolute_shap"),
                }
            )
    pd.DataFrame(rows).to_csv(OUTPUT_DIR / "shap_feature_importance.csv", index=False)


def write_data_dictionary() -> None:
    rows = [
        {"table": "model_summary", "field": "metric", "description": "Model performance or governance metric name."},
        {"table": "model_summary", "field": "value", "description": "Metric value."},
        {"table": "fairness_slices", "field": "slice_feature", "description": "Cohort feature used for fairness review."},
        {"table": "fairness_slices", "field": "high_priority_rate", "description": "Share of requests predicted as high priority."},
        {"table": "prediction_examples", "field": "confidence", "description": "Model confidence for predicted priority."},
        {"table": "shap_feature_importance", "field": "mean_absolute_shap", "description": "Average absolute SHAP impact by class."},
        {"table": "operational_metrics", "field": "alert_status", "description": "Demo alert status for monitoring dashboard."},
    ]
    pd.DataFrame(rows).to_csv(OUTPUT_DIR / "data_dictionary.csv", index=False)


def write_operational_metrics(gate_summary: dict[str, object]) -> None:
    rows = [
        {"metric": "endpoint_status", "value": "healthy", "alert_status": "green"},
        {"metric": "model_version", "value": gate_summary.get("model_version", "0.1.0"), "alert_status": "green"},
        {"metric": "drift_watch", "value": "configured", "alert_status": "amber"},
        {"metric": "fairness_review", "value": "required", "alert_status": "amber"},
        {"metric": "responsible_ai_scorecard", "value": "inputs_prepared", "alert_status": "amber"},
    ]
    pd.DataFrame(rows).to_csv(OUTPUT_DIR / "operational_metrics.csv", index=False)


def read_json(path: Path) -> dict[str, object]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()

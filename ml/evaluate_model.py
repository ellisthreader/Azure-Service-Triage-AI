from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, recall_score
from sklearn.model_selection import train_test_split

from train_model import FEATURES, TARGET


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "ml" / "data" / "synthetic_cases.csv"
MODEL_PATH = ROOT / "ml" / "artifacts" / "case_priority_model.joblib"
OUTPUT_DIR = ROOT / "ml" / "artifacts"


def main() -> None:
    if not DATA_PATH.exists():
        raise SystemExit("Synthetic data missing. Run `python ml/generate_data.py` first.")
    if not MODEL_PATH.exists():
        raise SystemExit("Model artifact missing. Run `python ml/train_model.py` first.")

    df = pd.read_csv(DATA_PATH)
    artifact = joblib.load(MODEL_PATH)
    model = artifact["model"]
    metadata = artifact.get("metadata", {})

    _, X_test, _, y_test = train_test_split(
        df[FEATURES],
        df[TARGET],
        test_size=0.2,
        stratify=df[TARGET],
        random_state=42,
    )

    predictions = model.predict(X_test)
    evaluation = {
        "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
        "macro_f1": round(float(f1_score(y_test, predictions, average="macro")), 4),
        "high_priority_recall": round(float(recall_score(y_test, predictions, labels=["high"], average="macro")), 4),
        "classification_report": classification_report(y_test, predictions, output_dict=True),
        "confusion_matrix": confusion_matrix(y_test, predictions, labels=list(model.classes_)).tolist(),
        "labels": list(model.classes_),
        "validation_rows": int(len(X_test)),
        "fairness_slices": fairness_slices(X_test.assign(actual=y_test, predicted=predictions)),
    }

    gate_summary = {
        "model_name": metadata.get("model_name", "service-priority-ai"),
        "model_version": metadata.get("model_version", "0.1.0"),
        "accuracy": evaluation["accuracy"],
        "macro_f1": evaluation["macro_f1"],
        "high_priority_recall": evaluation["high_priority_recall"],
        "high_priority_recall_floor": 0.75,
        "high_priority_recall_gate": "pass" if evaluation["high_priority_recall"] >= 0.75 else "review",
        "fairness_status": "review_required",
        "human_review_required": True,
        "data": "synthetic",
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "evaluation.json").write_text(json.dumps(evaluation, indent=2), encoding="utf-8")
    (OUTPUT_DIR / "gate_summary.json").write_text(json.dumps(gate_summary, indent=2), encoding="utf-8")
    (OUTPUT_DIR / "registry_tags.json").write_text(json.dumps(registry_tags(gate_summary), indent=2), encoding="utf-8")
    print(json.dumps(gate_summary, indent=2))


def fairness_slices(frame: pd.DataFrame) -> dict[str, object]:
    slices: dict[str, object] = {}
    for column in ["vulnerability_flag", "deprivation_band", "service_type"]:
        grouped = {}
        for value, group in frame.groupby(column):
            grouped[str(value)] = {
                "rows": int(len(group)),
                "high_priority_rate": round(float((group["predicted"] == "high").mean()), 4),
                "accuracy": round(float((group["predicted"] == group["actual"]).mean()), 4),
            }
        slices[column] = grouped
    return slices


def registry_tags(gate_summary: dict[str, object]) -> dict[str, str]:
    return {
        "project": "service-priority-ai",
        "data": "synthetic",
        "model_framework": "scikit-learn",
        "model_format": "joblib",
        "human_review_required": "true",
        "high_priority_recall_gate": str(gate_summary["high_priority_recall_gate"]),
        "responsible_ai_review": "pending",
    }


if __name__ == "__main__":
    main()

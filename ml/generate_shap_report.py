from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import shap
from sklearn.model_selection import train_test_split

from train_model import FEATURES, TARGET


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "ml" / "data" / "synthetic_cases.csv"
MODEL_PATH = ROOT / "ml" / "artifacts" / "case_priority_model.joblib"
OUTPUT_PATH = ROOT / "ml" / "artifacts" / "shap_summary.json"


def main() -> None:
    if not DATA_PATH.exists():
        raise SystemExit("Synthetic data missing. Run `python ml/generate_data.py` first.")
    if not MODEL_PATH.exists():
        raise SystemExit("Model artifact missing. Run `python ml/train_model.py` first.")

    df = pd.read_csv(DATA_PATH)
    artifact = joblib.load(MODEL_PATH)
    model = artifact["model"]
    metadata = artifact.get("metadata", {})

    _, X_test, _, _ = train_test_split(
        df[FEATURES],
        df[TARGET],
        test_size=0.2,
        stratify=df[TARGET],
        random_state=42,
    )

    sample = X_test.head(120)
    transformed = model.named_steps["preprocess"].transform(sample)
    transformed_array = transformed.toarray() if hasattr(transformed, "toarray") else np.asarray(transformed)
    classifier = model.named_steps["classifier"]
    feature_names = [str(name) for name in model.named_steps["preprocess"].get_feature_names_out()]

    explainer = shap.LinearExplainer(classifier, transformed_array)
    shap_values = explainer.shap_values(transformed_array)
    summary = {
        "model_name": metadata.get("model_name", "service-priority-ai-baseline"),
        "model_version": metadata.get("model_version", "0.1.0"),
        "explanation_method": "SHAP LinearExplainer over the transformed scikit-learn pipeline features",
        "sample_rows": int(len(sample)),
        "classes": [str(label) for label in classifier.classes_],
        "top_features_by_class": {},
    }

    for class_index, class_name in enumerate(classifier.classes_):
        class_values = shap_values[:, :, class_index] if np.asarray(shap_values).ndim == 3 else shap_values[class_index]
        mean_abs = np.abs(class_values).mean(axis=0)
        top_indices = np.argsort(mean_abs)[::-1][:10]
        summary["top_features_by_class"][str(class_name)] = [
            {
                "feature": friendly_feature_name(feature_names[index]),
                "mean_absolute_shap": round(float(mean_abs[index]), 6),
            }
            for index in top_indices
        ]

    OUTPUT_PATH.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"Wrote SHAP summary to {OUTPUT_PATH}")


def friendly_feature_name(raw_name: str) -> str:
    name = raw_name
    for prefix in ["categorical__", "numeric__", "text__"]:
        name = name.replace(prefix, "")
    return name.replace("_", " ")


if __name__ == "__main__":
    main()

from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "ml" / "data" / "synthetic_cases.csv"
ARTIFACT_DIR = ROOT / "ml" / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "case_priority_model.joblib"
METADATA_PATH = ARTIFACT_DIR / "model_metadata.json"
EVALUATION_PATH = ARTIFACT_DIR / "evaluation.json"

FEATURES = [
    "service_type",
    "days_open",
    "previous_contacts",
    "vulnerability_flag",
    "deprivation_band",
    "channel",
    "urgency_text",
]
TARGET = "priority"


def build_pipeline() -> Pipeline:
    categorical_features = ["service_type", "vulnerability_flag", "deprivation_band", "channel"]
    numeric_features = ["days_open", "previous_contacts"]

    try:
        encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    except TypeError:
        encoder = OneHotEncoder(handle_unknown="ignore", sparse=False)

    preprocess = ColumnTransformer(
        transformers=[
            ("categorical", encoder, categorical_features),
            ("numeric", StandardScaler(), numeric_features),
            ("text", TfidfVectorizer(ngram_range=(1, 2), min_df=2), "urgency_text"),
        ],
        remainder="drop",
    )

    return Pipeline(
        steps=[
            ("preprocess", preprocess),
            ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)),
        ]
    )


def main() -> None:
    if not DATA_PATH.exists():
        raise SystemExit("Synthetic data missing. Run `python ml/generate_data.py` first.")

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(DATA_PATH)
    X = df[FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        stratify=y,
        random_state=42,
    )

    model = build_pipeline()
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)
    probabilities = model.predict_proba(X_test)

    evaluation = {
        "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
        "classification_report": classification_report(y_test, predictions, output_dict=True),
        "confusion_matrix": confusion_matrix(y_test, predictions, labels=list(model.classes_)).tolist(),
        "labels": list(model.classes_),
        "validation_rows": int(len(X_test)),
    }

    metadata = {
        "model_name": "service-priority-ai-baseline",
        "model_version": "0.1.0",
        "model_type": "scikit-learn LogisticRegression pipeline",
        "features": FEATURES,
        "target": TARGET,
        "classes": list(model.classes_),
        "training_rows": int(len(X_train)),
        "validation_rows": int(len(X_test)),
        "intended_use": "Advisory prioritisation for fictional service requests with human review.",
        "not_for": "Automated denial, eligibility decisions, or live services without governance approval.",
    }

    joblib.dump({"model": model, "metadata": metadata}, MODEL_PATH)
    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    EVALUATION_PATH.write_text(json.dumps(evaluation, indent=2), encoding="utf-8")
    print(f"Saved model to {MODEL_PATH}")
    print(f"Accuracy: {evaluation['accuracy']}")


if __name__ == "__main__":
    main()

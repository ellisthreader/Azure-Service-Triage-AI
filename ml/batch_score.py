from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import pandas as pd


FEATURES = [
    "service_type",
    "service_subtype",
    "district",
    "month",
    "source_system",
    "sla_hours",
    "out_of_hours",
    "accessibility_need",
    "duplicate_signal",
    "days_open",
    "previous_contacts",
    "vulnerability_flag",
    "deprivation_band",
    "channel",
    "urgency_text",
]

DEFAULTS = {
    "service_subtype": "routine_repair_update",
    "district": "Chelmsford",
    "month": 1,
    "source_system": "web_form",
    "sla_hours": 168,
    "out_of_hours": False,
    "accessibility_need": False,
    "duplicate_signal": False,
}

MODEL: Any | None = None
METADATA: dict[str, Any] = {}


def init() -> None:
    global MODEL, METADATA

    model_dir = Path(os.getenv("AZUREML_MODEL_DIR", "ml/artifacts"))
    artifact_path = _find_model_artifact(model_dir)
    artifact = joblib.load(artifact_path)
    MODEL = artifact["model"] if isinstance(artifact, dict) else artifact
    METADATA = artifact.get("metadata", {}) if isinstance(artifact, dict) else {"model_version": "unknown"}


def run(mini_batch: list[str]) -> pd.DataFrame:
    if MODEL is None:
        init()

    frames = []
    for file_path in mini_batch:
        path = Path(file_path)
        if path.suffix.lower() == ".json":
            frames.append(pd.read_json(path))
        else:
            frames.append(pd.read_csv(path))

    if not frames:
        return pd.DataFrame()

    input_frame = pd.concat(frames, ignore_index=True)
    predictions = score_frame(input_frame)
    return predictions


def score_frame(input_frame: pd.DataFrame) -> pd.DataFrame:
    if MODEL is None:
        raise RuntimeError("Model is not loaded.")

    frame = input_frame.copy()
    for column, value in DEFAULTS.items():
        if column not in frame.columns:
            frame[column] = value

    missing = [column for column in FEATURES if column not in frame.columns]
    if missing:
        raise ValueError(f"Missing required fields: {missing}")
    predictions = MODEL.predict(frame[FEATURES])
    probabilities = MODEL.predict_proba(frame[FEATURES])
    classes = [str(label) for label in MODEL.classes_]

    rows = []
    scored_at = datetime.now(timezone.utc).isoformat()
    for index, prediction in enumerate(predictions):
        probability_map = {
            label: round(float(probability), 4)
            for label, probability in zip(classes, probabilities[index], strict=True)
        }
        priority = str(prediction)
        rows.append(
            {
                "case_id": frame.iloc[index].get("case_id", index),
                "priority": priority,
                "confidence": probability_map[priority],
                "class_probabilities": json.dumps(probability_map),
                "model_version": METADATA.get("model_version", "unknown"),
                "human_review_required": priority == "high" or probability_map[priority] < 0.65,
                "scored_at": scored_at,
                "data_classification": "synthetic_demo",
            }
        )

    return pd.DataFrame(rows)


def _find_model_artifact(model_dir: Path) -> Path:
    candidates = [
        model_dir / "case_priority_model.joblib",
        *model_dir.rglob("case_priority_model.joblib"),
        *model_dir.rglob("*.joblib"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"No .joblib model artifact found under {model_dir}")


if __name__ == "__main__":
    init()
    output = run(["azure/samples/batch-input.csv"])
    print(output.to_csv(index=False))

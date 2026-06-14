from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import joblib
import numpy as np
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

    if isinstance(artifact, dict) and "model" in artifact:
        MODEL = artifact["model"]
        METADATA = artifact.get("metadata", {})
    else:
        MODEL = artifact
        METADATA = {"model_version": "unknown"}


def run(raw_data: str | dict[str, Any] | list[dict[str, Any]]) -> dict[str, Any] | list[dict[str, Any]]:
    if MODEL is None:
        raise RuntimeError("Model is not loaded. Azure ML should call init() before run().")

    payload = _parse_payload(raw_data)
    rows = payload if isinstance(payload, list) else [payload]
    frame = pd.DataFrame(rows)
    for column, value in DEFAULTS.items():
        if column not in frame.columns:
            frame[column] = value
    _validate_columns(frame)

    predictions = MODEL.predict(frame[FEATURES])
    probabilities = MODEL.predict_proba(frame[FEATURES])
    classes = [str(label) for label in MODEL.classes_]

    results = []
    for row, priority, probability_row in zip(rows, predictions, probabilities, strict=True):
        probability_map = {
            label: round(float(probability), 4)
            for label, probability in zip(classes, probability_row, strict=True)
        }
        priority_value = str(priority)
        confidence = probability_map[priority_value]
        results.append(
            {
                "priority": priority_value,
                "confidence": confidence,
                "class_probabilities": probability_map,
                "main_reasons": _reason_codes(row),
                "feature_attributions": _feature_attributions(frame.iloc[[len(results)]], priority_value),
                "model_version": METADATA.get("model_version", "unknown"),
                "human_review_required": priority_value == "high" or confidence < 0.65,
            }
        )

    return results[0] if isinstance(payload, dict) else results


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


def _parse_payload(raw_data: str | dict[str, Any] | list[dict[str, Any]]) -> dict[str, Any] | list[dict[str, Any]]:
    if isinstance(raw_data, str):
        payload = json.loads(raw_data)
    else:
        payload = raw_data

    if isinstance(payload, dict) and "data" in payload:
        payload = payload["data"]

    if not isinstance(payload, (dict, list)):
        raise ValueError("Payload must be a JSON object or list of objects.")
    return payload


def _validate_columns(frame: pd.DataFrame) -> None:
    missing = [column for column in FEATURES if column not in frame.columns]
    if missing:
        raise ValueError(f"Missing required fields: {missing}")


def _reason_codes(row: dict[str, Any]) -> list[dict[str, str]]:
    reasons: list[dict[str, str]] = []
    text = str(row.get("urgency_text", "")).lower()

    if bool(row.get("vulnerability_flag")):
        reasons.append({"factor": "Vulnerability flag", "impact": "Raises priority because extra care is needed."})
    if row.get("service_type") in {"adult_social_care", "children_services"}:
        reasons.append({"factor": "Service area", "impact": "Safeguarding-related services receive extra caution."})
    if int(row.get("days_open", 0)) >= 10:
        reasons.append({"factor": "Case age", "impact": "Older unresolved requests are more likely to need escalation."})
    elif int(row.get("days_open", 0)) >= 5:
        reasons.append({"factor": "Case age", "impact": "The request has been open long enough to require attention."})
    if int(row.get("previous_contacts", 0)) >= 3:
        reasons.append({"factor": "Repeat contacts", "impact": "Multiple contacts can indicate unresolved service impact."})
    if any(term in text for term in ["safeguarding", "homelessness", "unsafe", "no heating", "failing"]):
        reasons.append({"factor": "Urgency wording", "impact": "The request text contains high-risk terms."})

    return reasons[:4] or [{"factor": "Baseline request profile", "impact": "No high-risk indicators were detected."}]


def _feature_attributions(row: pd.DataFrame, priority: str) -> list[dict[str, str | float]]:
    if MODEL is None:
        return []
    try:
        preprocess = MODEL.named_steps["preprocess"]
        classifier = MODEL.named_steps["classifier"]
        transformed = preprocess.transform(row[FEATURES])
        values = transformed.toarray()[0] if hasattr(transformed, "toarray") else np.asarray(transformed)[0]
        class_index = list(classifier.classes_).index(priority)
        contributions = values * classifier.coef_[class_index]
        names = [str(name) for name in preprocess.get_feature_names_out()]
    except Exception:
        return []

    ranked = sorted(zip(names, contributions, strict=False), key=lambda item: abs(float(item[1])), reverse=True)
    output = []
    for feature, contribution in ranked[:5]:
        value = round(float(contribution), 4)
        if value == 0:
            continue
        output.append(
            {
                "feature": _friendly_feature_name(feature),
                "value": value,
                "direction": "raises_priority" if value > 0 else "lowers_priority",
            }
        )
    return output


def _friendly_feature_name(raw_name: str) -> str:
    name = raw_name
    for prefix in ["categorical__", "numeric__", "text__"]:
        name = name.replace(prefix, "")
    return name.replace("_", " ")


if __name__ == "__main__":
    init()
    sample_path = Path("azure/samples/online-request.json")
    print(json.dumps(run(sample_path.read_text(encoding="utf-8"))))

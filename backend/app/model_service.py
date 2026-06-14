from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from .schemas import CaseRequest, FeatureAttribution, Reason


ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "ml" / "artifacts" / "case_priority_model.joblib"
METADATA_PATH = ROOT / "ml" / "artifacts" / "model_metadata.json"


class ModelService:
    def __init__(self) -> None:
        self.model: Any | None = None
        self.metadata: dict[str, Any] = {}
        self.feature_names: list[str] = []
        self.load()

    def load(self) -> None:
        if MODEL_PATH.exists():
            artifact = joblib.load(MODEL_PATH)
            self.model = artifact["model"]
            self.metadata = artifact.get("metadata", {})
            self.feature_names = self._feature_names()
        elif METADATA_PATH.exists():
            self.metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))

    @property
    def loaded(self) -> bool:
        return self.model is not None

    @property
    def version(self) -> str | None:
        return self.metadata.get("model_version")

    def predict(self, payload: CaseRequest) -> dict[str, Any]:
        if self.model is None:
            return self._fallback_predict(payload)

        row = pd.DataFrame([payload.model_dump()])
        priority = str(self.model.predict(row)[0])
        probabilities = self.model.predict_proba(row)[0]
        classes = [str(label) for label in self.model.classes_]
        class_probabilities = {
            label: round(float(prob), 4) for label, prob in zip(classes, probabilities, strict=True)
        }
        confidence = class_probabilities[priority]

        return {
            "priority": priority,
            "confidence": confidence,
            "class_probabilities": class_probabilities,
            "main_reasons": self.explain(payload),
            "feature_attributions": self.feature_attributions(row, priority),
            "model_version": self.version or "untrained",
            "human_review_required": priority == "high" or confidence < 0.65,
        }

    def feature_attributions(self, row: pd.DataFrame, priority: str) -> list[FeatureAttribution]:
        if self.model is None:
            return []

        try:
            preprocess = self.model.named_steps["preprocess"]
            classifier = self.model.named_steps["classifier"]
            transformed = preprocess.transform(row)
            values = transformed.toarray()[0] if hasattr(transformed, "toarray") else np.asarray(transformed)[0]
            class_index = list(classifier.classes_).index(priority)
            coefficients = classifier.coef_[class_index]
            contributions = values * coefficients
            names = self.feature_names or [f"feature_{index}" for index in range(len(contributions))]
        except Exception:
            return []

        ranked = sorted(
            zip(names, contributions, strict=False),
            key=lambda item: abs(float(item[1])),
            reverse=True,
        )

        attributions = []
        for feature, contribution in ranked[:5]:
            value = round(float(contribution), 4)
            if value == 0:
                continue
            attributions.append(
                FeatureAttribution(
                    feature=self._friendly_feature_name(feature),
                    value=value,
                    direction="raises_priority" if value > 0 else "lowers_priority",
                )
            )
        return attributions

    def _feature_names(self) -> list[str]:
        if self.model is None:
            return []
        try:
            return [str(name) for name in self.model.named_steps["preprocess"].get_feature_names_out()]
        except Exception:
            return []

    def _friendly_feature_name(self, raw_name: str) -> str:
        name = raw_name
        for prefix in ["categorical__", "numeric__", "text__"]:
            name = name.replace(prefix, "")
        return name.replace("_", " ")

    def explain(self, payload: CaseRequest) -> list[Reason]:
        reasons: list[Reason] = []
        text = payload.urgency_text.lower()

        if payload.vulnerability_flag:
            reasons.append(Reason(factor="Vulnerability flag", impact="Raises priority because extra care is needed."))
        if payload.service_type in {"adult_social_care", "children_services"}:
            reasons.append(Reason(factor="Service area", impact="Safeguarding-related services receive extra caution."))
        if payload.days_open >= 10:
            reasons.append(Reason(factor="Case age", impact="Older unresolved cases are more likely to need escalation."))
        elif payload.days_open >= 5:
            reasons.append(Reason(factor="Case age", impact="The case has been open long enough to require attention."))
        if payload.previous_contacts >= 3:
            reasons.append(Reason(factor="Repeat contacts", impact="Multiple contacts can indicate unresolved resident impact."))
        if any(term in text for term in ["safeguarding", "homelessness", "unsafe", "no heating", "fire risk", "children", "child", "failing"]):
            reasons.append(Reason(factor="Urgency wording", impact="The case text contains high-risk terms."))
        if payload.deprivation_band == "high":
            reasons.append(Reason(factor="Area context", impact="Used as a service-risk context signal, not an eligibility decision."))

        if not reasons:
            reasons.append(Reason(factor="Baseline case profile", impact="No high-risk indicators were detected in the demo features."))
        return reasons[:4]

    def _fallback_predict(self, payload: CaseRequest) -> dict[str, Any]:
        score = 0
        if payload.vulnerability_flag:
            score += 3
        if payload.previous_contacts >= 3:
            score += 2
        if payload.days_open >= 10:
            score += 2
        elif payload.days_open >= 5:
            score += 1
        if payload.service_type in {"adult_social_care", "children_services"}:
            score += 2
        urgency_text = payload.urgency_text.lower()
        if any(term in urgency_text for term in ["safeguarding", "homelessness", "unsafe", "fire risk", "children", "child"]):
            score += 3

        priority = "high" if score >= 7 else "medium" if score >= 4 else "low"
        probabilities = {"low": 0.15, "medium": 0.25, "high": 0.6}
        if priority == "medium":
            probabilities = {"low": 0.2, "medium": 0.6, "high": 0.2}
        if priority == "low":
            probabilities = {"low": 0.72, "medium": 0.2, "high": 0.08}

        return {
            "priority": priority,
            "confidence": probabilities[priority],
            "class_probabilities": probabilities,
            "main_reasons": self.explain(payload),
            "feature_attributions": [],
            "model_version": "rules-fallback",
            "human_review_required": priority == "high",
        }

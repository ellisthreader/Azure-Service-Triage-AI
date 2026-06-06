from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .model_service import ModelService
from .schemas import CaseRequest, Citation

ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS = ROOT / "ml" / "artifacts"

# Follow-up prompt chips offered when no more specific suggestion applies.
DEFAULT_SUGGESTIONS = [
    "How does the scoring work?",
    "Is the model fair?",
    "Triage my current case",
    "What needs human review?",
]


def _load(name: str) -> dict[str, Any]:
    path = ARTIFACTS / name
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


class ChatAssistant:
    """Deterministic, offline, grounded assistant.

    There is no external LLM call. Replies are produced by keyword-based
    intent routing over the model artifacts, so the assistant stays
    consistent with whatever the trained model actually reports.
    """

    def __init__(self, model_service: ModelService) -> None:
        self.model_service = model_service

    # -- artifact accessors (read lazily so retraining is picked up) --
    @property
    def evaluation(self) -> dict[str, Any]:
        return _load("evaluation.json")

    @property
    def metadata(self) -> dict[str, Any]:
        return _load("model_metadata.json")

    @property
    def shap(self) -> dict[str, Any]:
        return _load("shap_summary.json")

    def respond(self, message: str, case_context: CaseRequest | None) -> dict[str, Any]:
        text = message.lower().strip()

        if self._matches(text, ["triage", "score", "predict", "priorit", "how urgent", "urgency", "this case", "my case"]):
            return self._triage(case_context)
        if self._matches(text, ["fair", "bias", "cohort", "discriminat", "equit"]):
            return self._fairness()
        if self._matches(text, ["feature", "important", "shap", "drives", "factor", "weight"]):
            return self._features()
        if self._matches(text, ["govern", "human review", "responsib", "oversight", "accountab", "dpia", "model card"]):
            return self._governance()
        if self._matches(text, ["how does", "what is", "explain", "how it works", "model", "accuracy", "trained"]):
            return self._explain_model()
        if self._matches(text, ["hi", "hello", "hey", "help", "what can you", "who are you", "start"]):
            return self._greeting()
        return self._fallback()

    @staticmethod
    def _matches(text: str, keywords: list[str]) -> bool:
        return any(keyword in text for keyword in keywords)

    # -- intent handlers --
    def _greeting(self) -> dict[str, Any]:
        return {
            "reply": (
                "I'm the Service Priority assistant. I can explain how the model scores a case, "
                "summarise its fairness and governance posture, or triage a request you're working on. "
                "Everything I report is advisory — a caseworker always makes the final call."
            ),
            "suggestions": DEFAULT_SUGGESTIONS,
            "prediction": None,
            "citations": [],
        }

    def _explain_model(self) -> dict[str, Any]:
        evaluation = self.evaluation
        metadata = self.metadata
        accuracy = _pct(evaluation.get("accuracy"))
        macro_f1 = _pct(evaluation.get("macro_f1"))
        model_type = metadata.get("model_type", "a scikit-learn classification pipeline")
        train = metadata.get("training_rows", 1200)
        reply = (
            f"The model is {model_type}. It combines the structured case fields (service, days open, prior contacts, "
            f"vulnerability, area risk, channel) with the free-text notes, and predicts a priority of low, medium, or high. "
            f"On the held-out validation set it scores about {accuracy} accuracy and {macro_f1} macro-F1, "
            f"trained on roughly {train:,} synthetic cases. Each prediction ships with reason codes and feature attributions."
        )
        return {
            "reply": reply,
            "suggestions": ["Which features matter most?", "Is the model fair?", "Triage my current case"],
            "prediction": None,
            "citations": [
                Citation(label="evaluation.json", source="ml/artifacts/evaluation.json").model_dump(),
                Citation(label="model_metadata.json", source="ml/artifacts/model_metadata.json").model_dump(),
            ],
        }

    def _fairness(self) -> dict[str, Any]:
        evaluation = self.evaluation
        recall = _pct(evaluation.get("high_priority_recall") or _gate_recall())
        slices = evaluation.get("fairness_slices") or {}
        vuln = slices.get("vulnerability_flag") or {}
        detail = ""
        if isinstance(vuln, dict) and vuln:
            rates = {
                key: _pct(value.get("high_priority_rate"))
                for key, value in vuln.items()
                if isinstance(value, dict)
            }
            if rates:
                detail = " High-priority rates differ across the vulnerability cohort (" + ", ".join(
                    f"{key}: {rate}" for key, rate in rates.items()
                ) + "), which is expected — vulnerability is a deliberate priority signal, and the split is monitored rather than hidden."
        reply = (
            f"Fairness is measured, not assumed. High-priority recall is around {recall}, and accuracy is tracked per cohort "
            f"across vulnerability, deprivation band, and service type.{detail} Any cohort gap is reviewed by a human before it "
            f"changes how cases are handled."
        )
        return {
            "reply": reply,
            "suggestions": ["What needs human review?", "Which features matter most?", "How accurate is it?"],
            "prediction": None,
            "citations": [Citation(label="evaluation.json", source="ml/artifacts/evaluation.json").model_dump()],
        }

    def _features(self) -> dict[str, Any]:
        top = ((self.shap.get("top_features_by_class") or {}).get("high")) or []
        if top:
            ranked = ", ".join(
                f"{item.get('feature')} ({float(item.get('mean_absolute_shap', 0)):.2f})" for item in top[:5]
            )
            body = f"For high-priority cases the strongest drivers (mean |SHAP|) are: {ranked}."
        else:
            body = "Prior contacts, case age, and the vulnerability flag are the strongest drivers of a high-priority score."
        reply = (
            f"{body} These are global importances; every individual prediction also returns its own per-case attributions "
            f"so a caseworker can see exactly what pushed that score up or down."
        )
        return {
            "reply": reply,
            "suggestions": ["Triage my current case", "Is the model fair?", "How does the scoring work?"],
            "prediction": None,
            "citations": [Citation(label="shap_summary.json", source="ml/artifacts/shap_summary.json").model_dump()],
        }

    def _governance(self) -> dict[str, Any]:
        reply = (
            "The model is advisory only: it ranks and explains, but a caseworker makes every final decision. "
            "High-priority or low-confidence predictions are automatically flagged for human review. "
            "Governance artifacts include a model card, a DPIA-lite, documented fairness cohorts, and an Azure Responsible AI "
            "scorecard pathway. Predictions and drift are monitored continuously."
        )
        return {
            "reply": reply,
            "suggestions": ["Is the model fair?", "How does the scoring work?", "Triage my current case"],
            "prediction": None,
            "citations": [],
        }

    def _triage(self, case_context: CaseRequest | None) -> dict[str, Any]:
        if case_context is None:
            return {
                "reply": (
                    "Happy to triage a case. Tell me the service area, how many days it has been open, the number of prior "
                    "contacts, whether a vulnerability indicator is present, the area-risk band, and the channel — or open the "
                    "Dashboard and I'll read the case you're editing."
                ),
                "suggestions": ["How does the scoring work?", "Which features matter most?", "What needs human review?"],
                "prediction": None,
                "citations": [],
            }

        result = self.model_service.predict(case_context)
        priority = result["priority"]
        confidence = _pct(result["confidence"])
        reasons = "; ".join(reason.factor for reason in result["main_reasons"][:3])
        review = " It's flagged for human review before any action." if result["human_review_required"] else ""
        reply = (
            f"This case scores {priority} priority at {confidence} confidence. "
            f"Main drivers: {reasons}.{review} This is advisory — please confirm with your own judgement."
        )
        return {
            "reply": reply,
            "suggestions": ["Why this priority?", "Is the model fair?", "What needs human review?"],
            "prediction": result,
            "citations": [Citation(label=f"model {result['model_version']}", source="ml/artifacts/model_metadata.json").model_dump()],
        }

    def _fallback(self) -> dict[str, Any]:
        return {
            "reply": (
                "I can help with three things: how the model scores a case, its fairness and governance posture, and "
                "triaging a specific request. Try one of the prompts below."
            ),
            "suggestions": DEFAULT_SUGGESTIONS,
            "prediction": None,
            "citations": [],
        }


def _gate_recall() -> float | None:
    return _load("gate_summary.json").get("high_priority_recall")


def _pct(value: Any) -> str:
    try:
        return f"{round(float(value) * 100)}%"
    except (TypeError, ValueError):
        return "n/a"

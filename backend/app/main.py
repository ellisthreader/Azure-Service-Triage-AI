from __future__ import annotations

import csv
import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .chat import ChatAssistant
from .model_service import ModelService
from .monitoring import metrics_summary, record_prediction
from .schemas import (
    CaseRequest,
    ChatRequest,
    ChatResponse,
    HealthResponse,
    MetricsSummary,
    PredictionResponse,
)


app = FastAPI(
    title="Service Priority AI API",
    version="0.1.0",
    description="Responsible AI demo API for fictional service request prioritisation.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "https://blue-plant-0b724eb03.7.azurestaticapps.net",
    ],
    allow_origin_regex=r"https://.*\.(azurestaticapps\.net|azurewebsites\.net)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_service = ModelService()
chat_assistant = ChatAssistant(model_service)
ROOT = Path(__file__).resolve().parents[2]


@app.get("/", tags=["status"])
def root() -> dict[str, object]:
    return {
        "service": "Service Priority AI API",
        "status": "ok",
        "health": "/health",
        "docs": "/docs",
        "predict": "POST /predict",
    }


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        model_loaded=model_service.loaded,
        model_version=model_service.version or "rules-fallback",
    )


@app.post("/predict", response_model=PredictionResponse)
def predict(payload: CaseRequest) -> PredictionResponse:
    result = model_service.predict(payload)
    record_prediction(payload.model_dump(), result)
    return PredictionResponse(**result)


@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    result = chat_assistant.respond(payload.message, payload.case_context)
    return ChatResponse(**result)


@app.get("/metrics/summary", response_model=MetricsSummary)
def summary() -> MetricsSummary:
    return MetricsSummary(**metrics_summary())


@app.get("/model/metadata")
def metadata() -> dict[str, object]:
    return model_service.metadata or {
        "model_name": "rules-fallback",
        "model_version": "rules-fallback",
        "note": "Train the model with `python ml/generate_data.py && python ml/train_model.py`.",
    }


@app.get("/explainability/sample")
def explainability_sample() -> dict[str, object]:
    sample = CaseRequest(
        service_type="housing",
        days_open=7,
        previous_contacts=4,
        vulnerability_flag=True,
        deprivation_band="high",
        channel="phone",
        urgency_text="Tenant has no heating and there are young children in the property",
    )
    return {
        "sample_case": sample.model_dump(),
        "prediction": model_service.predict(sample),
        "note": "Local demo explanations are reason-code based. Azure Responsible AI dashboard or SHAP can be added for production analysis.",
    }


@app.get("/dashboard/summary")
def dashboard_summary() -> dict[str, object]:
    evaluation = read_json(ROOT / "ml" / "artifacts" / "evaluation.json")
    gate_summary = read_json(ROOT / "ml" / "artifacts" / "gate_summary.json")
    metadata = read_json(ROOT / "ml" / "artifacts" / "model_metadata.json")
    shap_summary = read_json(ROOT / "ml" / "artifacts" / "shap_summary.json")
    batch_preview = read_csv(ROOT / "monitoring" / "powerbi" / "prediction_examples.csv", limit=6)

    return {
        "pipeline": [
            {"step": "Data generation", "status": "complete", "detail": "1,500 synthetic service requests"},
            {"step": "Training", "status": "complete", "detail": metadata.get("model_type", "scikit-learn pipeline")},
            {"step": "Evaluation", "status": "complete", "detail": f"Accuracy {evaluation.get('accuracy', 0)}"},
            {"step": "Registry candidate", "status": "ready", "detail": "Tags and gate summary generated"},
            {"step": "Online endpoint", "status": "ready", "detail": "Azure managed endpoint YAML + scoring script"},
            {"step": "Batch scoring", "status": "ready", "detail": "Batch endpoint YAML + scoring script"},
        ],
        "azure_status": [
            {"item": "Workspace", "status": "complete", "detail": "Azure ML workspace SaaS in rg-essex-mlops-demo, UK South"},
            {"item": "Training job", "status": "complete", "detail": "credit_default_prediction completed on Azure serverless compute"},
            {"item": "Model registry", "status": "complete", "detail": "Latest registered model version resolved as v1"},
            {"item": "Managed endpoint", "status": "complete", "detail": "credit-endpoint-af589413 created successfully"},
            {"item": "Online deployment", "status": "blocked", "detail": "Free subscription CPU quota blocked DSv2/DS1v2 managed deployment"},
            {"item": "Website serving", "status": "ready", "detail": "Dashboard uses Railway FastAPI /predict until Azure ML endpoint quota is approved"},
        ],
        "registry": [
            {
                "version": metadata.get("model_version", "0.1.0"),
                "name": metadata.get("model_name", "service-priority-ai-baseline"),
                "accuracy": evaluation.get("accuracy"),
                "macro_f1": evaluation.get("macro_f1"),
                "high_priority_recall": gate_summary.get("high_priority_recall"),
                "gate": gate_summary.get("high_priority_recall_gate", "review"),
                "target": "Railway FastAPI / Azure ML managed endpoint",
            }
        ],
        "monitoring_trend": [
            {"label": "Mon", "volume": 28, "confidence": 0.82, "high_priority_rate": 0.18},
            {"label": "Tue", "volume": 34, "confidence": 0.84, "high_priority_rate": 0.21},
            {"label": "Wed", "volume": 31, "confidence": 0.81, "high_priority_rate": 0.16},
            {"label": "Thu", "volume": 43, "confidence": 0.86, "high_priority_rate": 0.24},
            {"label": "Fri", "volume": 39, "confidence": 0.85, "high_priority_rate": 0.20},
        ],
        "fairness": flatten_fairness(evaluation),
        "shap_top_features": (shap_summary.get("top_features_by_class") or {}).get("high", [])[:6],
        "batch_preview": batch_preview,
        "governance": [
            {"item": "Model card", "status": "ready", "owner": "AI/ML engineer"},
            {"item": "DPIA-lite review", "status": "ready", "owner": "Information governance"},
            {"item": "Fairness cohorts", "status": "ready", "owner": "Data science"},
            {"item": "Human review route", "status": "required", "owner": "Service team"},
            {"item": "Azure RAI scorecard", "status": "requires Azure", "owner": "AI/ML engineer"},
            {"item": "Power BI publish", "status": "requires workspace", "owner": "Analytics"},
        ],
    }


def read_json(path: Path) -> dict[str, object]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def read_csv(path: Path, limit: int) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))[:limit]


def flatten_fairness(evaluation: dict[str, object]) -> list[dict[str, object]]:
    output = []
    slices = evaluation.get("fairness_slices") or {}
    if not isinstance(slices, dict):
        return output

    for feature, groups in slices.items():
        if not isinstance(groups, dict):
            continue
        for value, metrics in groups.items():
            if not isinstance(metrics, dict):
                continue
            output.append(
                {
                    "feature": feature,
                    "value": value,
                    "rows": metrics.get("rows"),
                    "high_priority_rate": metrics.get("high_priority_rate"),
                    "accuracy": metrics.get("accuracy"),
                }
            )
    return output[:10]

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .model_service import ModelService
from .monitoring import metrics_summary, record_prediction
from .schemas import CaseRequest, HealthResponse, MetricsSummary, PredictionResponse


app = FastAPI(
    title="Service Priority AI API",
    version="0.1.0",
    description="Responsible AI demo API for fictional service request prioritisation.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_service = ModelService()


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

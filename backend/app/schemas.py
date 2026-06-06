from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


Priority = Literal["low", "medium", "high"]
ServiceType = Literal[
    "housing",
    "adult_social_care",
    "highways",
    "waste",
    "benefits",
    "council_tax",
    "children_services",
]
DeprivationBand = Literal["low", "medium", "high"]
Channel = Literal["web", "phone", "email", "in_person"]


class CaseRequest(BaseModel):
    service_type: ServiceType = "housing"
    days_open: int = Field(default=3, ge=0, le=365)
    previous_contacts: int = Field(default=1, ge=0, le=50)
    vulnerability_flag: bool = False
    deprivation_band: DeprivationBand = "medium"
    channel: Channel = "web"
    urgency_text: str = Field(default="Resident has requested an update", min_length=3, max_length=800)


class Reason(BaseModel):
    factor: str
    impact: str


class FeatureAttribution(BaseModel):
    feature: str
    value: float
    direction: Literal["raises_priority", "lowers_priority"]


class PredictionResponse(BaseModel):
    priority: Priority
    confidence: float
    class_probabilities: dict[str, float]
    main_reasons: list[Reason]
    feature_attributions: list[FeatureAttribution] = []
    model_version: str
    human_review_required: bool


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_version: str | None


class MetricsSummary(BaseModel):
    total_predictions: int
    high_priority_rate: float
    average_confidence: float
    fairness_watch: dict[str, float | str]
    drift_watch: dict[str, float | str]
    operational_health: dict[str, float | int | str]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class Citation(BaseModel):
    label: str
    source: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = []
    case_context: CaseRequest | None = None


class ChatResponse(BaseModel):
    reply: str
    suggestions: list[str] = []
    prediction: PredictionResponse | None = None
    citations: list[Citation] = []

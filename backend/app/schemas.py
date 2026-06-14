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
SourceSystem = Literal["web_form", "contact_centre", "shared_mailbox", "teams_referral", "case_portal"]
DecisionStatus = Literal["recorded"]
EvidenceType = Literal["photo", "document", "note"]
SourceItemType = Literal["case_note", "previous_contact", "evidence"]
SourceApp = Literal["Outlook", "Teams", "SharePoint", "Case portal"]
CaseStatus = Literal["New", "In review", "Waiting update", "In progress"]


class CaseRequest(BaseModel):
    service_type: ServiceType = "housing"
    service_subtype: str = Field(default="routine_repair_update", min_length=3, max_length=80)
    district: str = Field(default="Chelmsford", min_length=3, max_length=80)
    month: int = Field(default=1, ge=1, le=12)
    source_system: SourceSystem = "web_form"
    sla_hours: int = Field(default=168, ge=1, le=8760)
    out_of_hours: bool = False
    accessibility_need: bool = False
    duplicate_signal: bool = False
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


class EvidenceItem(BaseModel):
    type: EvidenceType
    title: str
    detail: str
    source: str
    image_url: str | None = None


class SourceItem(BaseModel):
    id: str
    type: SourceItemType
    app: SourceApp
    title: str
    summary: str
    body: str
    time: str
    owner: str
    external_url: str = ""


class StaffMember(BaseModel):
    id: str
    name: str
    username: str
    role: str
    team: str
    avatar_url: str


class ActivityItem(BaseModel):
    id: str
    action: str
    detail: str
    time: str
    actor: StaffMember


class CaseRecord(BaseModel):
    case_id: str
    title: str
    service_label: str
    team: str
    source: str
    evidence: str
    handover: str
    due: str
    risk: Priority
    action: str
    summary: str
    access_notes: str
    household_context: str
    status: CaseStatus = "New"
    last_updated: str = ""
    assigned_to: StaffMember
    activity: list[ActivityItem] = []
    evidence_items: list[EvidenceItem] = []
    case_notes: list[SourceItem] = []
    previous_contacts: list[SourceItem] = []
    case_request: CaseRequest
    prediction: PredictionResponse | None = None


class DecisionRequest(BaseModel):
    final_priority: Priority
    override_reason: str = Field(default="", max_length=500)
    action_taken: str = Field(default="", max_length=120)
    officer_id: str = Field(default="demo.officer", min_length=3, max_length=80)
    case_request: CaseRequest
    prediction: PredictionResponse


class DecisionReceipt(BaseModel):
    case_id: str
    status: DecisionStatus
    audit_id: str
    recorded_at: str
    final_priority: Priority
    model_priority: Priority
    override_recorded: bool
    action_taken: str = ""


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

from __future__ import annotations

import csv
import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .audit_store import AuditStore, make_audit_id, utc_now
from .chat import ChatAssistant
from .model_service import ModelService
from .monitoring import metrics_summary, record_prediction
from .schemas import (
    ActivityItem,
    CaseRequest,
    CaseRecord,
    ChatRequest,
    ChatResponse,
    DecisionReceipt,
    DecisionRequest,
    HealthResponse,
    MetricsSummary,
    PredictionResponse,
    StaffMember,
)


app = FastAPI(
    title="Service Priority AI API",
    version="0.1.0",
    description="Responsible AI demo API for fictional service request prioritisation.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_origin_regex=r"^(https://.*\.(azurestaticapps\.net|azurewebsites\.net|web\.core\.windows\.net)|http://(localhost|127\.0\.0\.1):517[0-9])$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_service = ModelService()
chat_assistant = ChatAssistant(model_service)
audit_store = AuditStore()
ROOT = Path(__file__).resolve().parents[2]

STAFF = {
    "me": {
        "id": "staff-demo-user",
        "name": "Alex Carter",
        "username": "alex.carter@essex.example",
        "role": "Senior case review officer",
        "team": "Today duty desk",
        "avatar_url": "/staff/demo-officer-profile.png",
    },
    "alice": {
        "id": "staff-alice",
        "name": "Alice Morgan",
        "username": "alice.morgan@essex.example",
        "role": "Housing repairs officer",
        "team": "Contact centre",
        "avatar_url": "/staff/alice-morgan.png",
    },
    "samir": {
        "id": "staff-samir",
        "name": "Samir Khan",
        "username": "samir.khan@essex.example",
        "role": "Duty manager",
        "team": "Adult support",
        "avatar_url": "/staff/samir-khan.png",
    },
    "tom": {
        "id": "staff-tom",
        "name": "Tom Bennett",
        "username": "tom.bennett@essex.example",
        "role": "Highways coordinator",
        "team": "Highways duty desk",
        "avatar_url": "/staff/tom-bennett.png",
    },
    "rachel": {
        "id": "staff-rachel",
        "name": "Rachel Hughes",
        "username": "rachel.hughes@essex.example",
        "role": "Revenues officer",
        "team": "Revenues",
        "avatar_url": "/staff/rachel-hughes.png",
    },
    "maya": {
        "id": "staff-maya",
        "name": "Maya Patel",
        "username": "maya.patel@essex.example",
        "role": "Benefits officer",
        "team": "Financial support",
        "avatar_url": "/staff/alice-morgan.png",
    },
    "daniel": {
        "id": "staff-daniel",
        "name": "Daniel Reed",
        "username": "daniel.reed@essex.example",
        "role": "Waste services coordinator",
        "team": "Waste operations",
        "avatar_url": "/staff/tom-bennett.png",
    },
    "nina": {
        "id": "staff-nina",
        "name": "Nina Scott",
        "username": "nina.scott@essex.example",
        "role": "Family support coordinator",
        "team": "Children & families",
        "avatar_url": "/staff/rachel-hughes.png",
    },
    "owen": {
        "id": "staff-owen",
        "name": "Owen Clarke",
        "username": "owen.clarke@essex.example",
        "role": "Housing allocations officer",
        "team": "Housing options",
        "avatar_url": "/staff/samir-khan.png",
    },
}

CASE_ASSIGNMENTS: dict[str, StaffMember] = {}

CASE_QUEUE = [
    CaseRecord(
        case_id="ECC-365-1042",
        title="Review now",
        service_label="Housing repair",
        team="Contact centre",
        source="Outlook shared mailbox",
        evidence="SharePoint repair photos",
        handover="Teams duty note",
        due="Within 2 hours",
        risk="high",
        action="Review and confirm priority",
        summary="Possible fire risk in a housing repair case with children in the household.",
        access_notes="Contact by phone first. Check safe access arrangements before assigning a repair visit.",
        household_context="Children in household; vulnerability/safeguarding indicator present.",
        status="In review",
        last_updated="Today 09:24",
        assigned_to=STAFF["alice"],
        activity=[
            {
                "id": "act-1042-1",
                "action": "System flag reviewed",
                "detail": "High-priority flag opened from today's queue.",
                "time": "Today 09:24",
                "actor": STAFF["alice"],
            },
            {
                "id": "act-1042-2",
                "action": "Evidence attached",
                "detail": "Repair photo and previous contact linked from 365 context.",
                "time": "Today 09:20",
                "actor": STAFF["alice"],
            },
        ],
        evidence_items=[
            {
                "type": "photo",
                "title": "Repair photo",
                "detail": "Synthetic image showing the reported fire-risk area.",
                "source": "SharePoint",
                "image_url": "/case-evidence/housing-fire-risk-photo.png",
            },
            {
                "type": "note",
                "title": "Case note",
                "detail": "Structured handover note with the key risk and access points.",
                "source": "Teams handover",
                "image_url": "/case-evidence/housing-case-note.png",
            },
            {"type": "document", "title": "Previous contact", "detail": "One earlier contact linked to the same repair issue.", "source": "Outlook"},
        ],
        case_notes=[
            {
                "id": "note-1042-teams",
                "type": "case_note",
                "app": "Teams",
                "title": "Duty handover note",
                "summary": "Contact centre flagged fire-risk wording and children in the household.",
                "body": "Caller reported a possible fire risk in the repair area. Children are in the household. Officer should check safe access arrangements before assigning a visit.",
                "time": "Today 09:12",
                "owner": "Contact centre",
                "external_url": "https://teams.microsoft.com/",
            },
            {
                "id": "note-1042-sharepoint",
                "type": "evidence",
                "app": "SharePoint",
                "title": "Repair evidence folder",
                "summary": "Photos and the synthetic repair evidence record are linked to this case.",
                "body": "Evidence folder contains the resident repair photo, previous contact reference, and audit note placeholders for the demo.",
                "time": "Today 09:20",
                "owner": "Housing repairs",
                "external_url": "https://www.office.com/launch/sharepoint",
            },
        ],
        previous_contacts=[
            {
                "id": "contact-1042-outlook",
                "type": "previous_contact",
                "app": "Outlook",
                "title": "Resident email follow-up",
                "summary": "Earlier email linked to the same repair issue.",
                "body": "Resident asked for an update on the repair and repeated concern about safety in the home. No real personal data is stored in this synthetic demo.",
                "time": "Yesterday 16:42",
                "owner": "Shared mailbox",
                "external_url": "https://outlook.office.com/mail/",
            }
        ],
        case_request=CaseRequest(
            service_type="housing",
            service_subtype="fire_risk",
            district="Chelmsford",
            source_system="contact_centre",
            sla_hours=24,
            accessibility_need=True,
            days_open=5,
            previous_contacts=1,
            vulnerability_flag=True,
            deprivation_band="high",
            channel="phone",
            urgency_text="Fire risk and also children in house",
        ),
    ),
    CaseRecord(
        case_id="ECC-365-1044",
        title="Assign officer",
        service_label="Adult support",
        team="Locality team",
        source="SharePoint case library",
        evidence="Care record export",
        handover="Teams locality update",
        due="Today",
        risk="high",
        action="Check safeguarding context",
        summary="Adult support case where care package concerns suggest same-day review.",
        access_notes="Assign to locality team before contacting provider.",
        household_context="Vulnerability indicator present; resident may be without support.",
        status="Waiting update",
        last_updated="Today 08:48",
        assigned_to=STAFF["samir"],
        activity=[
            {
                "id": "act-1044-1",
                "action": "Locality update added",
                "detail": "Teams note says provider status needs checking.",
                "time": "Today 08:48",
                "actor": STAFF["samir"],
            },
            {
                "id": "act-1044-2",
                "action": "Care record linked",
                "detail": "Synthetic SharePoint care record export attached.",
                "time": "Today 08:41",
                "actor": STAFF["samir"],
            },
        ],
        evidence_items=[
            {"type": "document", "title": "Care record export", "detail": "Synthetic care-package summary from SharePoint.", "source": "SharePoint"},
            {"type": "note", "title": "Locality update", "detail": "Team note says support may have failed.", "source": "Teams"},
        ],
        case_notes=[
            {
                "id": "note-1044-teams",
                "type": "case_note",
                "app": "Teams",
                "title": "Locality team update",
                "summary": "Team note says the support package may not have been delivered.",
                "body": "Locality team should check provider status before contacting the resident. Same-day review recommended because support may have failed.",
                "time": "Today 08:35",
                "owner": "Locality team",
                "external_url": "https://teams.microsoft.com/",
            }
        ],
        previous_contacts=[
            {
                "id": "contact-1044-sharepoint",
                "type": "previous_contact",
                "app": "SharePoint",
                "title": "Previous support concern",
                "summary": "Earlier case record mentions a related support concern.",
                "body": "Synthetic previous contact record: resident may have experienced a missed support visit. Escalate according to service policy if confirmed.",
                "time": "Yesterday 11:05",
                "owner": "Adult support",
                "external_url": "https://www.office.com/launch/sharepoint",
            },
            {
                "id": "contact-1044-outlook",
                "type": "previous_contact",
                "app": "Outlook",
                "title": "Provider update request",
                "summary": "Email requesting confirmation from provider.",
                "body": "Synthetic shared mailbox entry requesting provider confirmation. No live email is connected in this demo.",
                "time": "Yesterday 14:18",
                "owner": "Shared mailbox",
                "external_url": "https://outlook.office.com/mail/",
            },
        ],
        case_request=CaseRequest(
            service_type="adult_social_care",
            service_subtype="care_package_concern",
            district="Harlow",
            source_system="case_portal",
            sla_hours=12,
            days_open=2,
            previous_contacts=2,
            vulnerability_flag=True,
            deprivation_band="medium",
            channel="email",
            urgency_text="Care package concern and resident left without support",
        ),
    ),
    CaseRecord(
        case_id="ECC-365-1043",
        title="Check duplicate reports",
        service_label="Highways & roads",
        team="Highways duty desk",
        source="Teams service channel",
        evidence="SharePoint highways report",
        handover="Highways channel thread",
        due="1 day",
        risk="medium",
        action="Review repeated impact",
        summary="Repeated highways report near a school route.",
        access_notes="Check duplicate reports before scheduling inspection.",
        household_context="No vulnerability indicator recorded.",
        status="New",
        last_updated="Today 10:05",
        assigned_to=STAFF["tom"],
        activity=[
            {
                "id": "act-1043-1",
                "action": "Duplicate signal found",
                "detail": "Teams handover mentions linked reports for the same route.",
                "time": "Today 10:05",
                "actor": STAFF["tom"],
            },
        ],
        evidence_items=[
            {"type": "photo", "title": "Road defect photo", "detail": "Synthetic photo placeholder from resident report.", "source": "SharePoint"},
            {"type": "note", "title": "Duplicate signal", "detail": "Several reports mention the same location.", "source": "Teams"},
        ],
        case_notes=[
            {
                "id": "note-1043-teams",
                "type": "case_note",
                "app": "Teams",
                "title": "Highways channel thread",
                "summary": "Several reports may relate to the same location.",
                "body": "Duty desk should check duplicate reports and decide whether one inspection can cover the linked reports.",
                "time": "Today 10:05",
                "owner": "Highways duty desk",
                "external_url": "https://teams.microsoft.com/",
            }
        ],
        previous_contacts=[
            {
                "id": "contact-1043-teams",
                "type": "previous_contact",
                "app": "Teams",
                "title": "Duplicate report mention",
                "summary": "Earlier handover message mentions the same route.",
                "body": "Synthetic channel note: repeated resident reports mention a pothole near a school route.",
                "time": "Yesterday 09:47",
                "owner": "Highways duty desk",
                "external_url": "https://teams.microsoft.com/",
            }
        ],
        case_request=CaseRequest(
            service_type="highways",
            service_subtype="road_defect",
            district="Colchester",
            source_system="teams_referral",
            sla_hours=72,
            duplicate_signal=True,
            days_open=4,
            previous_contacts=3,
            vulnerability_flag=False,
            deprivation_band="medium",
            channel="web",
            urgency_text="Repeated pothole report near school route",
        ),
    ),
    CaseRecord(
        case_id="ECC-365-1045",
        title="Standard queue",
        service_label="Council tax & billing",
        team="Revenues",
        source="Online form",
        evidence="Case portal record",
        handover="Revenues queue",
        due="3 days",
        risk="low",
        action="Handle in date order",
        summary="Standard council tax billing query with no urgent risk indicators.",
        access_notes="Respond through the case portal.",
        household_context="No vulnerability indicator recorded.",
        status="In progress",
        last_updated="Today 12:18",
        assigned_to=STAFF["rachel"],
        activity=[
            {
                "id": "act-1045-1",
                "action": "Form reviewed",
                "detail": "Standard billing query accepted into the normal queue.",
                "time": "Today 12:18",
                "actor": STAFF["rachel"],
            },
        ],
        evidence_items=[
            {"type": "document", "title": "Form submission", "detail": "Synthetic online form record.", "source": "Case portal"},
        ],
        case_notes=[
            {
                "id": "note-1045-caseportal",
                "type": "case_note",
                "app": "Case portal",
                "title": "Form submission",
                "summary": "Resident asks for an update on a council tax bill.",
                "body": "Standard billing query with no urgent risk wording. Handle in normal queue order.",
                "time": "Today 12:10",
                "owner": "Revenues",
                "external_url": "https://www.office.com/",
            }
        ],
        previous_contacts=[],
        case_request=CaseRequest(
            service_type="council_tax",
            service_subtype="billing_query",
            district="Basildon",
            source_system="web_form",
            sla_hours=168,
            days_open=1,
            previous_contacts=0,
            vulnerability_flag=False,
            deprivation_band="low",
            channel="web",
            urgency_text="Resident asks for update on council tax bill",
        ),
    ),
    CaseRecord(
        case_id="ECC-365-1046",
        title="Unassigned",
        service_label="Benefits",
        team="Financial support",
        source="Outlook shared mailbox",
        evidence="Case portal income evidence",
        handover="Benefits duty inbox",
        due="Today 15:00",
        risk="high",
        action="Assign reviewer and check vulnerability context",
        summary="Benefit support enquiry with rent arrears wording and repeated contact.",
        access_notes="Assign an officer before contacting the resident. Check consent and evidence status in the case portal.",
        household_context="Vulnerability indicator present; affordability pressure mentioned in the contact notes.",
        status="New",
        last_updated="Today 11:32",
        assigned_to=None,
        activity=[
            {
                "id": "act-1046-1",
                "action": "Mailbox item received",
                "detail": "Outlook shared mailbox item linked to benefits queue.",
                "time": "Today 11:32",
                "actor": STAFF["maya"],
            }
        ],
        evidence_items=[
            {"type": "document", "title": "Income evidence checklist", "detail": "Case portal checklist shows two evidence items still outstanding.", "source": "Case portal"},
            {"type": "note", "title": "Benefits inbox handover", "detail": "Shared mailbox note asks duty reviewer to check arrears risk.", "source": "Outlook"},
        ],
        case_notes=[
            {
                "id": "note-1046-outlook",
                "type": "case_note",
                "app": "Outlook",
                "title": "Benefits shared mailbox handover",
                "summary": "Email asks the duty team to review rent arrears wording today.",
                "body": "Shared mailbox note for demo: the resident describes rent arrears and asks for urgent benefit support. Assign a reviewer, check evidence status, and follow the service escalation route if hardship is confirmed.",
                "time": "Today 11:28",
                "owner": "Benefits shared mailbox",
                "external_url": "https://outlook.office.com/mail/",
            },
            {
                "id": "note-1046-caseportal",
                "type": "evidence",
                "app": "Case portal",
                "title": "Evidence checklist",
                "summary": "Case portal shows the claim evidence checklist and missing items.",
                "body": "Demo case portal note: income evidence and tenancy confirmation are pending. Officer should not make an eligibility decision from the AI priority flag.",
                "time": "Today 11:30",
                "owner": "Financial support",
                "external_url": "https://www.office.com/",
            },
        ],
        previous_contacts=[
            {
                "id": "contact-1046-outlook",
                "type": "previous_contact",
                "app": "Outlook",
                "title": "Earlier rent arrears email",
                "summary": "Earlier message mentioned arrears and a request for a call back.",
                "body": "Synthetic previous contact record: resident asked for a call back about arrears and evidence needed for benefit support.",
                "time": "Yesterday 15:44",
                "owner": "Benefits shared mailbox",
                "external_url": "https://outlook.office.com/mail/",
            }
        ],
        case_request=CaseRequest(
            service_type="benefits",
            service_subtype="rent_arrears_support",
            district="Tendring",
            source_system="shared_mailbox",
            sla_hours=24,
            days_open=3,
            previous_contacts=2,
            vulnerability_flag=True,
            deprivation_band="high",
            channel="email",
            urgency_text="Rent arrears and urgent benefits support requested",
        ),
    ),
    CaseRecord(
        case_id="ECC-365-1047",
        title="Route today",
        service_label="Waste & recycling",
        team="Waste operations",
        source="Online form",
        evidence="Resident photo",
        handover="Waste operations Teams channel",
        due="Tomorrow",
        risk="medium",
        action="Check missed assisted collection route",
        summary="Missed assisted collection with accessibility need and repeat contact.",
        access_notes="Check assisted-collection marker before scheduling return collection.",
        household_context="Accessibility need recorded; no safeguarding indicator.",
        status="In progress",
        last_updated="Today 10:41",
        assigned_to=STAFF["daniel"],
        activity=[
            {
                "id": "act-1047-1",
                "action": "Route note added",
                "detail": "Teams channel asks waste operations to confirm missed assisted collection route.",
                "time": "Today 10:41",
                "actor": STAFF["daniel"],
            }
        ],
        evidence_items=[
            {"type": "photo", "title": "Collection point photo", "detail": "Resident-submitted collection point image placeholder.", "source": "SharePoint"},
            {"type": "note", "title": "Route handover", "detail": "Teams note links the assisted-collection route.", "source": "Teams"},
        ],
        case_notes=[
            {
                "id": "note-1047-teams",
                "type": "case_note",
                "app": "Teams",
                "title": "Waste operations route handover",
                "summary": "Team channel asks for a route check before booking a return visit.",
                "body": "Demo Teams handover: assisted collection may have been missed on the route. Check route sheet and accessibility marker before contacting the resident.",
                "time": "Today 10:39",
                "owner": "Waste operations",
                "external_url": "https://teams.microsoft.com/",
            }
        ],
        previous_contacts=[
            {
                "id": "contact-1047-caseportal",
                "type": "previous_contact",
                "app": "Case portal",
                "title": "Earlier missed collection report",
                "summary": "Case portal shows one earlier missed collection report.",
                "body": "Synthetic case portal contact: resident reported a previous missed assisted collection.",
                "time": "Monday 09:11",
                "owner": "Waste operations",
                "external_url": "https://www.office.com/",
            }
        ],
        case_request=CaseRequest(
            service_type="waste",
            service_subtype="missed_assisted_collection",
            district="Braintree",
            source_system="web_form",
            sla_hours=72,
            accessibility_need=True,
            days_open=2,
            previous_contacts=1,
            vulnerability_flag=False,
            deprivation_band="medium",
            channel="web",
            urgency_text="Missed assisted bin collection again",
        ),
    ),
    CaseRecord(
        case_id="ECC-365-1048",
        title="Unassigned",
        service_label="Family support",
        team="Children & families",
        source="Teams referral",
        evidence="Referral note",
        handover="MASH duty Teams handover",
        due="Within 4 hours",
        risk="high",
        action="Assign duty reviewer and check referral note",
        summary="Family support referral with safeguarding language and out-of-hours handover.",
        access_notes="Assign a duty reviewer before any outbound contact. Follow safeguarding triage policy.",
        household_context="Safeguarding/vulnerability context present in the referral note.",
        status="New",
        last_updated="Today 13:06",
        assigned_to=None,
        activity=[
            {
                "id": "act-1048-1",
                "action": "Teams referral received",
                "detail": "Duty channel referral added to today's unassigned queue.",
                "time": "Today 13:06",
                "actor": STAFF["nina"],
            }
        ],
        evidence_items=[
            {"type": "note", "title": "Referral note", "detail": "Teams handover says duty review is needed today.", "source": "Teams"},
            {"type": "document", "title": "Case portal shell", "detail": "Case portal record created but no officer assigned yet.", "source": "Case portal"},
        ],
        case_notes=[
            {
                "id": "note-1048-teams",
                "type": "case_note",
                "app": "Teams",
                "title": "MASH duty handover",
                "summary": "Teams referral asks children and families duty to review today.",
                "body": "Demo Teams handover: referral note includes safeguarding wording and asks for duty review within four hours. The AI flag is only a queueing aid; staff must follow statutory safeguarding process.",
                "time": "Today 13:03",
                "owner": "Children & families",
                "external_url": "https://teams.microsoft.com/",
            },
            {
                "id": "note-1048-caseportal",
                "type": "evidence",
                "app": "Case portal",
                "title": "Referral case shell",
                "summary": "Case shell exists with source referral metadata.",
                "body": "Demo case shell: referral source and timestamp are present. No final priority decision has been recorded.",
                "time": "Today 13:05",
                "owner": "Children & families",
                "external_url": "https://www.office.com/",
            },
        ],
        previous_contacts=[],
        case_request=CaseRequest(
            service_type="children_services",
            service_subtype="family_support_referral",
            district="Epping Forest",
            source_system="teams_referral",
            sla_hours=4,
            out_of_hours=True,
            days_open=0,
            previous_contacts=0,
            vulnerability_flag=True,
            deprivation_band="medium",
            channel="email",
            urgency_text="Safeguarding concern in family support referral",
        ),
    ),
    CaseRecord(
        case_id="ECC-365-1049",
        title="Check options",
        service_label="Housing repair",
        team="Housing options",
        source="Case portal",
        evidence="Tenancy note",
        handover="Housing options queue",
        due="2 days",
        risk="medium",
        action="Review tenancy and previous contact",
        summary="Housing options enquiry with previous contact and accessibility need.",
        access_notes="Respond through the case portal unless phone contact is requested.",
        household_context="Accessibility need recorded; no safeguarding indicator.",
        status="Waiting update",
        last_updated="Today 09:58",
        assigned_to=STAFF["owen"],
        activity=[
            {
                "id": "act-1049-1",
                "action": "Tenancy note checked",
                "detail": "Housing options note says the resident asked for accessible contact.",
                "time": "Today 09:58",
                "actor": STAFF["owen"],
            }
        ],
        evidence_items=[
            {"type": "document", "title": "Tenancy note", "detail": "Case portal note linked to housing options enquiry.", "source": "Case portal"},
        ],
        case_notes=[
            {
                "id": "note-1049-caseportal",
                "type": "case_note",
                "app": "Case portal",
                "title": "Housing options case note",
                "summary": "Resident asks for an update and accessible contact.",
                "body": "Synthetic case note: officer should review tenancy context and use the resident's requested accessible contact method.",
                "time": "Today 09:52",
                "owner": "Housing options",
                "external_url": "https://www.office.com/",
            }
        ],
        previous_contacts=[
            {
                "id": "contact-1049-outlook",
                "type": "previous_contact",
                "app": "Outlook",
                "title": "Previous housing options email",
                "summary": "Previous contact requested a status update.",
                "body": "Synthetic Outlook item: resident requested an update and asked for accessible contact.",
                "time": "Yesterday 10:21",
                "owner": "Housing options shared mailbox",
                "external_url": "https://outlook.office.com/mail/",
            }
        ],
        case_request=CaseRequest(
            service_type="housing",
            service_subtype="housing_options_update",
            district="Maldon",
            source_system="case_portal",
            sla_hours=96,
            accessibility_need=True,
            days_open=6,
            previous_contacts=1,
            vulnerability_flag=False,
            deprivation_band="medium",
            channel="email",
            urgency_text="Housing options update requested with accessible contact",
        ),
    ),
]


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
    audit_store.record_prediction(payload.model_dump(), result)
    return PredictionResponse(**result)


@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    result = chat_assistant.respond(payload.message, payload.case_context)
    return ChatResponse(**result)


@app.get("/metrics/summary", response_model=MetricsSummary)
def summary() -> MetricsSummary:
    metrics = metrics_summary()
    audit = audit_store.summary()
    metrics["operational_health"] = {
        **metrics["operational_health"],
        "audit_store": audit["store_mode"],
        "durable_audit": audit["durable"],
        "decision_records": audit["decision_records"],
        "override_rate": audit["override_rate"],
    }
    return MetricsSummary(**metrics)


@app.get("/model/metadata")
def metadata() -> dict[str, object]:
    return model_service.metadata or {
        "model_name": "rules-fallback",
        "model_version": "rules-fallback",
        "note": "Train the model with `python ml/generate_data.py && python ml/train_model.py`.",
    }


@app.get("/cases/queue", response_model=list[CaseRecord])
def case_queue() -> list[CaseRecord]:
    return [case_with_live_state(record) for record in CASE_QUEUE]


@app.post("/cases/{case_id}/assign-to-self", response_model=CaseRecord)
def assign_case_to_self(case_id: str, current_user: StaffMember) -> CaseRecord:
    record = next((item for item in CASE_QUEUE if item.case_id == case_id), None)
    if record is None:
        raise HTTPException(status_code=404, detail="Case not found")
    CASE_ASSIGNMENTS[case_id] = current_user
    return case_with_live_state(record)


@app.post("/cases/{case_id}/decision", response_model=DecisionReceipt)
def record_decision(case_id: str, payload: DecisionRequest) -> DecisionReceipt:
    receipt = DecisionReceipt(
        case_id=case_id,
        status="recorded",
        audit_id=make_audit_id("AUD"),
        recorded_at=utc_now(),
        final_priority=payload.final_priority,
        model_priority=payload.prediction.priority,
        override_recorded=payload.final_priority != payload.prediction.priority or bool(payload.override_reason.strip()),
        action_taken=payload.action_taken,
    )
    audit_store.record_decision(case_id, payload.model_dump(), receipt.model_dump())
    return receipt


@app.get("/audit/decisions", response_model=list[DecisionReceipt])
def audit_decisions() -> list[DecisionReceipt]:
    return [DecisionReceipt(**item) for item in audit_store.decision_receipts(20)]


@app.get("/audit/summary")
def audit_summary() -> dict[str, object]:
    return audit_store.summary()


@app.get("/audit/predictions")
def audit_predictions() -> list[dict[str, object]]:
    return audit_store.list_predictions(20)


@app.get("/monitoring/feedback-report")
def feedback_report() -> dict[str, object]:
    decisions = audit_store.list_decisions(200)
    total = len(decisions)
    overrides = [item for item in decisions if item.get("override_recorded")]
    return {
        "label_source": "officer_final_priority",
        "decision_records": total,
        "override_records": len(overrides),
        "override_rate": round(len(overrides) / total, 4) if total else 0.0,
        "review_note": "Synthetic officer decisions demonstrate the feedback loop needed before retraining or promotion.",
        "recent_overrides": overrides[:5],
    }


@app.get("/monitoring/drift-report")
def drift_report() -> dict[str, object]:
    predictions = audit_store.list_predictions(200)
    baseline = [record.case_request.model_dump() for record in CASE_QUEUE]
    live = [
        json.loads(str(item["payload_json"]))
        for item in predictions
        if item.get("payload_json")
    ]

    def distribution(rows: list[dict[str, object]], field: str) -> dict[str, float]:
        if not rows:
            return {}
        counts: dict[str, int] = {}
        for row in rows:
            key = str(row.get(field, "unknown"))
            counts[key] = counts.get(key, 0) + 1
        return {key: round(value / len(rows), 4) for key, value in sorted(counts.items())}

    service_baseline = distribution(baseline, "service_type")
    service_live = distribution(live, "service_type")
    drift_score = round(
        sum(abs(service_live.get(key, 0.0) - service_baseline.get(key, 0.0)) for key in set(service_baseline) | set(service_live)),
        4,
    )
    return {
        "baseline": "synthetic_case_queue",
        "live_window_records": len(live),
        "status": "watch" if drift_score >= 0.35 else "stable",
        "service_mix_drift_score": drift_score,
        "service_type_baseline": service_baseline,
        "service_type_live": service_live,
        "deprivation_live": distribution(live, "deprivation_band"),
        "review_note": "Synthetic drift report compares live scoring traffic against the demo queue baseline.",
    }


@app.get("/explainability/sample")
def explainability_sample() -> dict[str, object]:
    sample = CaseRequest(
        service_type="housing",
        service_subtype="fire_risk",
        days_open=5,
        previous_contacts=1,
        vulnerability_flag=True,
        deprivation_band="high",
        channel="phone",
        urgency_text="Fire risk and also children in house",
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
    audit = audit_store.summary()

    return {
        "pipeline": [
            {"step": "Data generation", "status": "complete", "detail": "25,000 synthetic Essex-style service requests"},
            {"step": "Training", "status": "complete", "detail": metadata.get("model_type", "scikit-learn pipeline")},
            {"step": "Evaluation", "status": "complete", "detail": f"Accuracy {evaluation.get('accuracy', 0)}"},
            {"step": "Registry candidate", "status": "ready", "detail": "Tags and gate summary generated"},
            {"step": "Online endpoint", "status": "ready", "detail": "Azure managed endpoint YAML + scoring script"},
            {"step": "Batch scoring", "status": "ready", "detail": "Batch endpoint YAML + scoring script"},
        ],
        "azure_status": [
            {"item": "Workspace", "status": "complete", "detail": "Azure ML workspace mlw-service-priority-ai-v2 in rg-service-priority-ai-demo, UK South"},
            {"item": "Model registry", "status": "complete", "detail": "service-priority-ai model registered as v1 with synthetic-data governance tags"},
            {"item": "Online endpoint", "status": "complete", "detail": "ep-service-priority-ai scoring endpoint routes 100% traffic to blue"},
            {"item": "Online deployment", "status": "complete", "detail": "blue deployment serves model v0.1.0 on service-priority-serving v2"},
            {"item": "Batch endpoint", "status": "complete", "detail": "be-service-priority-ai default deployment completed a sample CSV scoring run"},
            {"item": "Browser API", "status": "complete", "detail": "Azure Functions exposes FastAPI for the browser without exposing Azure ML endpoint credentials"},
            {"item": "Durable audit", "status": "complete" if audit["durable"] else "ready", "detail": f"{audit['store_mode']} audit store records predictions, officer decisions, overrides, model version and confidence"},
            {"item": "Website serving", "status": "complete", "detail": "Azure-hosted frontend builds with VITE_API_BASE pointing at the Functions API"},
        ],
        "registry": [
            {
                "version": metadata.get("model_version", "0.1.0"),
                "name": metadata.get("model_name", "service-priority-ai-baseline"),
                "accuracy": evaluation.get("accuracy"),
                "macro_f1": evaluation.get("macro_f1"),
                "high_priority_recall": gate_summary.get("high_priority_recall"),
                "gate": gate_summary.get("high_priority_recall_gate", "review"),
                "target": "FastAPI local / Azure ML managed endpoint",
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
            {"item": "Human review route", "status": "ready", "owner": "Service team"},
            {"item": "Prediction audit trail", "status": "ready", "owner": "AI/ML engineer"},
            {"item": "Officer feedback loop", "status": "ready", "owner": "Service team"},
            {"item": "Azure RAI scorecard", "status": "requires Azure", "owner": "AI/ML engineer"},
            {"item": "Power BI publish", "status": "requires workspace", "owner": "Analytics"},
        ],
        "audit": audit,
    }


def case_with_live_state(record: CaseRecord) -> CaseRecord:
    result = model_service.predict(record.case_request)
    assigned_to = CASE_ASSIGNMENTS.get(record.case_id, record.assigned_to)
    if isinstance(assigned_to, dict):
        assigned_to = StaffMember(**assigned_to)
    activity = list(record.activity)
    if record.case_id in CASE_ASSIGNMENTS and assigned_to is not None:
        activity = [
            ActivityItem(
                id=f"act-{record.case_id}-assigned-self",
                action="Assigned to you",
                detail=f"{assigned_to.name} picked this unassigned case from today's priority list.",
                time="Now",
                actor=assigned_to,
            ),
            *activity,
        ]
    return record.model_copy(
        update={
            "assigned_to": assigned_to,
            "activity": activity,
            "prediction": PredictionResponse(**result),
        }
    )


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

from __future__ import annotations

import csv
import json
import os
import re
import time
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .audit_store import AuditStore, make_audit_id, utc_now
from .chat import ChatAssistant
from .microsoft_graph import MicrosoftGraphService
from .model_service import ModelService
from .monitoring import metrics_summary, record_prediction
from .schemas import (
    ActivityItem,
    CaseExtractionRequest,
    CaseExtractionResponse,
    CaseRequest,
    CaseRecord,
    ChatRequest,
    ChatResponse,
    DecisionReceipt,
    DecisionRequest,
    EvidenceItem,
    HealthResponse,
    M365SourceDetail,
    MetricsSummary,
    PredictionResponse,
    SourceItem,
    StaffMember,
)


def load_local_env(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


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
load_local_env(ROOT / ".env")
graph_service = MicrosoftGraphService()

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
LIVE_QUEUE_STARTED_AT = time.monotonic()
LIVE_QUEUE_STEP_SECONDS = 5
LIVE_BASE_CASE_IDS = {
    "ECC-365-1042",
    "ECC-365-1044",
    "ECC-365-1043",
    "ECC-365-1045",
    "ECC-365-1046",
    "ECC-365-1048",
}

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
                "id": "evidence-1042-photo",
                "type": "photo",
                "title": "Repair photo",
                "detail": "Synthetic image showing the reported fire-risk area.",
                "source": "SharePoint",
                "image_url": "/case-evidence/housing-fire-risk-photo.png",
                "graph_source": "sharepoint",
            },
            {
                "id": "evidence-1042-note",
                "type": "note",
                "title": "Case note",
                "detail": "Structured handover note with the key risk and access points.",
                "source": "Teams handover",
                "image_url": "/case-evidence/housing-case-note.png",
            },
            {"id": "evidence-1042-contact", "type": "document", "title": "Previous contact", "detail": "One earlier contact linked to the same repair issue.", "source": "Outlook"},
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

ACCOUNT_CONTEXT: dict[str, dict[str, list[dict[str, object]]]] = {
    "ECC-365-1042": {
        "evidence_items": [
            {
                "id": "evidence-1042-photo",
                "type": "photo",
                "title": "Kitchen meter cupboard photo",
                "detail": "Resident-submitted repair photo showing scorch marks around the meter cupboard door frame.",
                "source": "SharePoint",
                "image_url": "/case-evidence/housing-fire-risk-photo.png",
                "graph_source": "sharepoint",
            },
            {
                "id": "evidence-1042-call-log",
                "type": "document",
                "title": "Contact centre call log",
                "detail": "Call handler notes mention burning smell, children in the property, and phone-first contact preference.",
                "source": "Phone",
            },
            {
                "id": "evidence-1042-duty-note",
                "type": "note",
                "title": "Repairs duty note",
                "detail": "Teams handover records the safety concern and asks repairs to confirm safe access before appointment booking.",
                "source": "Teams",
                "image_url": "/case-evidence/housing-case-note.png",
            },
        ],
        "case_notes": [
            {
                "id": "note-1042-phone",
                "type": "case_note",
                "app": "Phone",
                "title": "Inbound call transcript summary",
                "summary": "Resident reported a burning smell near the meter cupboard and asked for a call back before any visit.",
                "body": "Synthetic call log: caller reported scorch marks near the meter cupboard and a burning smell after using the kitchen sockets. Children are in the household. Officer should confirm whether the supply has been isolated and book an urgent repair inspection if safe access is available.",
                "time": "Today 09:08",
                "owner": "Contact centre",
            },
            {
                "id": "note-1042-teams",
                "type": "case_note",
                "app": "Teams",
                "title": "Repairs duty handover",
                "summary": "Contact centre flagged possible fire-risk wording and children in the household.",
                "body": "Repairs duty note: review photo evidence, contact resident by phone first, and follow emergency repair triage if the meter cupboard remains unsafe.",
                "time": "Today 09:12",
                "owner": "Housing repairs",
                "external_url": "https://teams.microsoft.com/",
            },
            {
                "id": "note-1042-sharepoint",
                "type": "evidence",
                "app": "SharePoint",
                "title": "Repair evidence folder",
                "summary": "Repair photo, call summary, and previous email are linked to the case folder.",
                "body": "Synthetic SharePoint folder summary: contains resident photo, call-handler note, and previous contact reference. No real resident data is stored in this demo.",
                "time": "Today 09:20",
                "owner": "Housing repairs",
                "external_url": "https://www.office.com/launch/sharepoint",
            },
        ],
        "previous_contacts": [
            {
                "id": "contact-1042-outlook",
                "type": "previous_contact",
                "app": "Outlook",
                "title": "Resident email follow-up",
                "summary": "Earlier email asked for an update and repeated concern about safety in the home.",
                "body": "Synthetic email: resident asked whether the repair could be inspected urgently and noted that the same area had been reported previously.",
                "time": "Yesterday 16:42",
                "owner": "Repairs shared mailbox",
                "external_url": "https://outlook.office.com/mail/",
            }
        ],
    },
    "ECC-365-1044": {
        "evidence_items": [
            {"id": "evidence-1044-care-export", "type": "document", "title": "Care package record export", "detail": "SharePoint care summary shows scheduled support was not confirmed for the morning visit.", "source": "SharePoint"},
            {"id": "evidence-1044-provider-email", "type": "document", "title": "Provider confirmation email", "detail": "Outlook message asks the provider to confirm whether the missed visit has been resolved.", "source": "Outlook"},
            {"id": "evidence-1044-phone-log", "type": "note", "title": "Resident welfare call log", "detail": "Phone note says the resident may be without support until the provider confirms cover.", "source": "Phone"},
        ],
        "case_notes": [
            {
                "id": "note-1044-phone",
                "type": "case_note",
                "app": "Phone",
                "title": "Welfare call summary",
                "summary": "Call handler recorded concern that the planned support visit may not have taken place.",
                "body": "Synthetic phone note: caller said the care visit expected this morning had not been confirmed. Resident may need a same-day welfare check if provider cannot confirm attendance.",
                "time": "Today 08:29",
                "owner": "Adult support contact centre",
            },
            {
                "id": "note-1044-teams",
                "type": "case_note",
                "app": "Teams",
                "title": "Locality team update",
                "summary": "Locality team asked duty officer to check provider status before contacting the resident.",
                "body": "Teams handover: provider status is unclear. Check the care record, then call the provider and record whether cover is in place today.",
                "time": "Today 08:35",
                "owner": "Locality team",
                "external_url": "https://teams.microsoft.com/",
            },
            {
                "id": "note-1044-outlook",
                "type": "case_note",
                "app": "Outlook",
                "title": "Provider update request",
                "summary": "Shared mailbox email requests confirmation of the missed support visit.",
                "body": "Synthetic email to provider: please confirm whether the morning support visit was completed or whether replacement cover is needed today.",
                "time": "Today 08:43",
                "owner": "Adult support shared mailbox",
                "external_url": "https://outlook.office.com/mail/",
            },
        ],
        "previous_contacts": [
            {
                "id": "contact-1044-sharepoint",
                "type": "previous_contact",
                "app": "SharePoint",
                "title": "Previous support concern",
                "summary": "Earlier case record mentions a related missed support concern.",
                "body": "Synthetic previous case note: resident reported a missed support visit earlier in the week. Escalate according to service policy if a second missed visit is confirmed.",
                "time": "Yesterday 11:05",
                "owner": "Adult support",
                "external_url": "https://www.office.com/launch/sharepoint",
            }
        ],
    },
    "ECC-365-1043": {
        "evidence_items": [
            {
                "id": "evidence-1043-road-photo",
                "type": "photo",
                "title": "Road defect photo",
                "detail": "Resident photo shows a pothole near a marked school crossing approach.",
                "source": "SharePoint",
                "image_url": "/case-evidence/highways-road-defect-photo.png",
            },
            {"id": "evidence-1043-map-note", "type": "document", "title": "Duplicate-location map note", "detail": "Case portal map pins show three reports within the same short road section.", "source": "Case portal"},
            {"id": "evidence-1043-phone-note", "type": "note", "title": "School-run phone call", "detail": "Phone contact says vehicles are swerving around the defect during school drop-off.", "source": "Phone"},
        ],
        "case_notes": [
            {
                "id": "note-1043-phone",
                "type": "case_note",
                "app": "Phone",
                "title": "Resident call about school-route impact",
                "summary": "Caller reported repeated near-misses as drivers avoid the road defect.",
                "body": "Synthetic phone note: caller described vehicles moving into the opposite lane near school drop-off time. Check duplicate reports and consider whether inspection priority should be raised.",
                "time": "Today 09:58",
                "owner": "Highways contact centre",
            },
            {
                "id": "note-1043-teams",
                "type": "case_note",
                "app": "Teams",
                "title": "Highways duty thread",
                "summary": "Several reports may relate to the same school-route location.",
                "body": "Duty desk should group linked reports, check prior inspection history, and decide whether one inspection can cover the route.",
                "time": "Today 10:05",
                "owner": "Highways duty desk",
                "external_url": "https://teams.microsoft.com/",
            },
        ],
        "previous_contacts": [
            {
                "id": "contact-1043-caseportal",
                "type": "previous_contact",
                "app": "Case portal",
                "title": "Earlier road defect report",
                "summary": "Portal report from yesterday refers to the same school route.",
                "body": "Synthetic portal submission: resident uploaded a location pin and noted the defect had worsened after rainfall.",
                "time": "Yesterday 09:47",
                "owner": "Highways case portal",
                "external_url": "https://www.office.com/",
            }
        ],
    },
    "ECC-365-1045": {
        "evidence_items": [
            {"id": "evidence-1045-form", "type": "document", "title": "Billing enquiry form", "detail": "Case portal submission asks why the instalment amount changed after a revised bill.", "source": "Case portal"},
            {"id": "evidence-1045-email", "type": "document", "title": "Automated receipt email", "detail": "Outlook receipt confirms the resident received the case reference and standard response timescale.", "source": "Outlook"},
        ],
        "case_notes": [
            {
                "id": "note-1045-caseportal",
                "type": "case_note",
                "app": "Case portal",
                "title": "Council tax billing enquiry",
                "summary": "Resident asks why monthly instalments changed after a revised bill.",
                "body": "Synthetic portal form: resident asks for an explanation of a revised council tax instalment schedule. No hardship, enforcement, vulnerability, or urgent risk wording is present.",
                "time": "Today 12:10",
                "owner": "Revenues",
                "external_url": "https://www.office.com/",
            },
            {
                "id": "note-1045-outlook",
                "type": "case_note",
                "app": "Outlook",
                "title": "Acknowledgement email",
                "summary": "Automated email confirms the enquiry was accepted into the standard billing queue.",
                "body": "Synthetic email receipt: your billing enquiry has been received and will be handled in date order. Please use the portal reference for further messages.",
                "time": "Today 12:11",
                "owner": "Revenues shared mailbox",
                "external_url": "https://outlook.office.com/mail/",
            },
        ],
        "previous_contacts": [
            {
                "id": "contact-1045-phone",
                "type": "previous_contact",
                "app": "Phone",
                "title": "Earlier balance query call",
                "summary": "Short call last week asked where to find the revised bill online.",
                "body": "Synthetic phone note: caller was directed to the case portal and advised to submit the billing query form if the instalment schedule still looked incorrect.",
                "time": "Friday 14:22",
                "owner": "Revenues contact centre",
            }
        ],
    },
    "ECC-365-1046": {
        "evidence_items": [
            {"id": "evidence-1046-income-checklist", "type": "document", "title": "Income evidence checklist", "detail": "Case portal checklist shows tenancy confirmation and one income document still outstanding.", "source": "Case portal"},
            {"id": "evidence-1046-email", "type": "document", "title": "Rent arrears email", "detail": "Shared mailbox email mentions arrears, callback request, and difficulty uploading evidence.", "source": "Outlook"},
            {"id": "evidence-1046-call-note", "type": "note", "title": "Callback attempt note", "detail": "Phone note records unsuccessful callback and asks the reviewer to try again before close of day.", "source": "Phone"},
        ],
        "case_notes": [
            {
                "id": "note-1046-outlook",
                "type": "case_note",
                "app": "Outlook",
                "title": "Benefits shared mailbox handover",
                "summary": "Email asks the duty team to review rent arrears wording today.",
                "body": "Synthetic email: resident says rent arrears have increased and asks for urgent support with benefit evidence. Assign a reviewer, check consent and evidence status, and follow the hardship escalation route if needed.",
                "time": "Today 11:28",
                "owner": "Benefits shared mailbox",
                "external_url": "https://outlook.office.com/mail/",
            },
            {
                "id": "note-1046-phone",
                "type": "case_note",
                "app": "Phone",
                "title": "Callback attempt",
                "summary": "Contact centre attempted callback and left the case for duty review.",
                "body": "Synthetic phone note: callback attempt was unsuccessful. Reviewer should retry before close of day because the email mentions rent arrears and difficulty uploading documents.",
                "time": "Today 11:36",
                "owner": "Benefits contact centre",
            },
            {
                "id": "note-1046-caseportal",
                "type": "evidence",
                "app": "Case portal",
                "title": "Evidence checklist",
                "summary": "Case portal shows missing tenancy confirmation and one income document.",
                "body": "Demo case portal note: income evidence and tenancy confirmation are pending. Officer should not make an eligibility decision from the AI priority flag.",
                "time": "Today 11:30",
                "owner": "Financial support",
                "external_url": "https://www.office.com/",
            },
        ],
        "previous_contacts": [
            {
                "id": "contact-1046-outlook",
                "type": "previous_contact",
                "app": "Outlook",
                "title": "Earlier rent arrears email",
                "summary": "Earlier message mentioned arrears and a request for a call back.",
                "body": "Synthetic previous email: resident asked for a call back about arrears and evidence needed for benefit support.",
                "time": "Yesterday 15:44",
                "owner": "Benefits shared mailbox",
                "external_url": "https://outlook.office.com/mail/",
            }
        ],
    },
    "ECC-365-1047": {
        "evidence_items": [
            {
                "id": "evidence-1047-photo",
                "type": "photo",
                "title": "Collection point photo",
                "detail": "Resident photo shows bins still at the assisted-collection point after scheduled collection.",
                "source": "SharePoint",
                "image_url": "/case-evidence/waste-collection-point-photo.png",
            },
            {"id": "evidence-1047-route-sheet", "type": "document", "title": "Assisted route sheet", "detail": "Waste operations route sheet flags an assisted-collection marker for the address.", "source": "SharePoint"},
            {"id": "evidence-1047-phone-note", "type": "note", "title": "Assisted collection call", "detail": "Phone note says the resident cannot move bins to the kerb without assistance.", "source": "Phone"},
        ],
        "case_notes": [
            {
                "id": "note-1047-phone",
                "type": "case_note",
                "app": "Phone",
                "title": "Missed assisted-collection call",
                "summary": "Caller reported a repeated missed assisted collection and asked for a return collection.",
                "body": "Synthetic phone note: resident has an assisted-collection marker and cannot move bins to the kerb. Check route sheet before booking a return collection.",
                "time": "Today 10:34",
                "owner": "Waste contact centre",
            },
            {
                "id": "note-1047-teams",
                "type": "case_note",
                "app": "Teams",
                "title": "Waste operations route handover",
                "summary": "Team channel asks for a route check before booking a return visit.",
                "body": "Teams handover: assisted collection may have been missed on the route. Confirm crew note and accessibility marker before contacting the resident.",
                "time": "Today 10:39",
                "owner": "Waste operations",
                "external_url": "https://teams.microsoft.com/",
            },
        ],
        "previous_contacts": [
            {
                "id": "contact-1047-caseportal",
                "type": "previous_contact",
                "app": "Case portal",
                "title": "Earlier missed collection report",
                "summary": "Case portal shows one earlier missed assisted-collection report.",
                "body": "Synthetic portal contact: resident reported a previous missed assisted collection and confirmed the assisted marker should still apply.",
                "time": "Monday 09:11",
                "owner": "Waste operations",
                "external_url": "https://www.office.com/",
            }
        ],
    },
    "ECC-365-1048": {
        "evidence_items": [
            {"id": "evidence-1048-referral", "type": "note", "title": "Teams referral note", "detail": "Referral note asks children and families duty to review within four hours.", "source": "Teams"},
            {"id": "evidence-1048-call-log", "type": "document", "title": "Out-of-hours call log", "detail": "Phone log records the referral source and states no final decision has been made.", "source": "Phone"},
            {"id": "evidence-1048-case-shell", "type": "document", "title": "Case portal shell", "detail": "Case portal shell has referral metadata and is waiting for duty reviewer assignment.", "source": "Case portal"},
        ],
        "case_notes": [
            {
                "id": "note-1048-phone",
                "type": "case_note",
                "app": "Phone",
                "title": "Out-of-hours referral call",
                "summary": "Duty line logged a family-support referral requiring review today.",
                "body": "Synthetic phone note: referral source used safeguarding language and asked for same-day duty review. Follow statutory process; the AI flag is only a queueing aid.",
                "time": "Today 13:01",
                "owner": "Children and families duty line",
            },
            {
                "id": "note-1048-teams",
                "type": "case_note",
                "app": "Teams",
                "title": "MASH duty handover",
                "summary": "Teams referral asks children and families duty to review today.",
                "body": "Teams handover: referral note includes safeguarding wording and asks for duty review within four hours. Staff must follow statutory safeguarding process.",
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
        "previous_contacts": [
            {
                "id": "contact-1048-outlook",
                "type": "previous_contact",
                "app": "Outlook",
                "title": "Previous information request",
                "summary": "Earlier mailbox item requested background information from a partner team.",
                "body": "Synthetic email: partner team asked whether there was any existing family-support context before the referral was sent to duty.",
                "time": "Yesterday 17:36",
                "owner": "Children and families shared mailbox",
                "external_url": "https://outlook.office.com/mail/",
            }
        ],
    },
    "ECC-365-1049": {
        "evidence_items": [
            {"id": "evidence-1049-tenancy-note", "type": "document", "title": "Housing options tenancy note", "detail": "Case portal note records the current housing-options enquiry and accessible contact request.", "source": "Case portal"},
            {"id": "evidence-1049-email", "type": "document", "title": "Accessible contact email", "detail": "Outlook email asks for written updates and an accessible contact method.", "source": "Outlook"},
            {"id": "evidence-1049-phone-note", "type": "note", "title": "Previous callback note", "detail": "Phone note records that the resident asked for email follow-up after a missed callback.", "source": "Phone"},
        ],
        "case_notes": [
            {
                "id": "note-1049-caseportal",
                "type": "case_note",
                "app": "Case portal",
                "title": "Housing options case note",
                "summary": "Resident asks for an update and accessible contact.",
                "body": "Synthetic portal note: officer should review tenancy context and use the requested accessible contact method before sending the next update.",
                "time": "Today 09:52",
                "owner": "Housing options",
                "external_url": "https://www.office.com/",
            },
            {
                "id": "note-1049-phone",
                "type": "case_note",
                "app": "Phone",
                "title": "Missed callback note",
                "summary": "Contact centre recorded a missed callback and email follow-up preference.",
                "body": "Synthetic phone note: callback was missed yesterday afternoon. Resident asked for written updates because phone contact is difficult during working hours.",
                "time": "Today 09:56",
                "owner": "Housing options contact centre",
            },
        ],
        "previous_contacts": [
            {
                "id": "contact-1049-outlook",
                "type": "previous_contact",
                "app": "Outlook",
                "title": "Previous housing options email",
                "summary": "Previous contact requested a status update and accessible communication.",
                "body": "Synthetic email: resident requested an update and asked for communication by email where possible.",
                "time": "Yesterday 10:21",
                "owner": "Housing options shared mailbox",
                "external_url": "https://outlook.office.com/mail/",
            }
        ],
    },
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
    audit_store.record_prediction(payload.model_dump(), result)
    return PredictionResponse(**result)


@app.post("/pipeline/score")
def pipeline_score(payload: CaseRequest) -> dict[str, object]:
    prediction = model_service.predict(payload)
    evaluation = read_json(ROOT / "ml" / "artifacts" / "evaluation.json")
    gate_summary = read_json(ROOT / "ml" / "artifacts" / "gate_summary.json")
    metadata = read_json(ROOT / "ml" / "artifacts" / "model_metadata.json")

    probabilities = prediction.get("class_probabilities", {})
    probability_values = sorted(
        [float(value) for value in probabilities.values() if isinstance(value, (int, float))],
        reverse=True,
    )
    confidence = float(prediction.get("confidence", 0))
    probability_margin = probability_values[0] - probability_values[1] if len(probability_values) > 1 else confidence
    predicted_class = str(prediction.get("priority", "medium"))
    class_report = evaluation.get("classification_report", {})
    class_metrics = class_report.get(predicted_class, {}) if isinstance(class_report, dict) else {}
    if not isinstance(class_metrics, dict):
        class_metrics = {}

    cohort_evidence = pipeline_score_cohorts(payload, evaluation)
    accuracy = metric_float(evaluation.get("accuracy"))
    macro_f1 = metric_float(evaluation.get("macro_f1"))
    high_priority_recall = metric_float(gate_summary.get("high_priority_recall"))
    class_precision = metric_float(class_metrics.get("precision"), accuracy)
    class_recall = metric_float(class_metrics.get("recall"), accuracy)
    class_f1 = metric_float(class_metrics.get("f1-score"), macro_f1)
    class_support = metric_float(class_metrics.get("support"))
    cohort_accuracy_values = [
        float(row["accuracy"])
        for row in cohort_evidence
        if isinstance(row.get("accuracy"), (int, float))
    ]
    cohort_accuracy = (
        sum(cohort_accuracy_values) / len(cohort_accuracy_values)
        if cohort_accuracy_values
        else float(evaluation.get("accuracy", 0) or 0)
    )
    predictability_score = round(
        (confidence * 0.45)
        + (max(0.0, min(probability_margin, 1.0)) * 0.25)
        + (class_precision * 0.2)
        + (cohort_accuracy * 0.1),
        4,
    )
    rating = "strong" if predictability_score >= 0.85 else "moderate" if predictability_score >= 0.7 else "review"

    return {
        "prediction": prediction,
        "quality": {
            "accuracy": accuracy,
            "macro_f1": macro_f1,
            "high_priority_recall": high_priority_recall,
            "validation_rows": int(metric_float(evaluation.get("validation_rows") or metadata.get("validation_rows"))),
            "training_rows": int(metric_float(metadata.get("training_rows"))),
            "gate": gate_summary.get("high_priority_recall_gate", "review"),
        },
        "predicted_class_metrics": {
            "label": predicted_class,
            "precision": class_precision,
            "recall": class_recall,
            "f1_score": class_f1,
            "support": class_support,
        },
        "cohort_evidence": cohort_evidence,
        "predictability": {
            "score": predictability_score,
            "rating": rating,
            "confidence": confidence,
            "probability_margin": round(probability_margin, 4),
            "explanation": "Predictability combines this response confidence, class probability margin, measured class precision, and matching validation cohort accuracy.",
        },
        "review": {
            "human_review_required": prediction.get("human_review_required", True) or rating != "strong",
            "note": "Measured accuracy comes from validation data. A new unlabeled case has predictability and confidence, not known accuracy, until a human outcome is recorded.",
        },
        "model": {
            "name": metadata.get("model_name", "service-priority-ai-baseline"),
            "version": prediction.get("model_version") or metadata.get("model_version", "0.1.0"),
            "data": gate_summary.get("data", "synthetic"),
        },
    }


@app.post("/pipeline/extract", response_model=CaseExtractionResponse)
def extract_case_request(payload: CaseExtractionRequest) -> CaseExtractionResponse:
    heuristic_result = extract_case_fields(payload.text, payload.defaults)
    openai_result = extract_case_fields_with_openai(payload.text, payload.defaults, heuristic_result)
    return CaseExtractionResponse(**(openai_result or heuristic_result))


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
    return [case_with_live_state(record) for record in live_queue_records()]


@app.get("/cases/{case_id}/sources/{source_id}", response_model=M365SourceDetail)
async def case_source_detail(case_id: str, source_id: str) -> M365SourceDetail:
    record = case_with_m365_links(enrich_case_account_context(find_case(case_id)))
    source = next((item for item in [*record.case_notes, *record.previous_contacts] if item.id == source_id), None)
    if source is None:
        raise HTTPException(status_code=404, detail="Case source not found")
    return await graph_service.source_detail(source)


@app.get("/cases/{case_id}/evidence/{evidence_id}", response_model=M365SourceDetail)
async def case_evidence_detail(case_id: str, evidence_id: str) -> M365SourceDetail:
    record = case_with_m365_links(enrich_case_account_context(find_case(case_id)))
    evidence = next((item for item in record.evidence_items if (item.id or item_slug(item.title)) == evidence_id), None)
    if evidence is None:
        raise HTTPException(status_code=404, detail="Case evidence not found")
    return await graph_service.evidence_detail(evidence)


@app.get("/m365/status")
async def microsoft_365_status() -> dict[str, object]:
    return await graph_service.status()


@app.get("/m365/missing-links")
def microsoft_365_missing_links() -> dict[str, list[dict[str, object]]]:
    missing: dict[str, list[dict[str, object]]] = {"sources": [], "evidence": []}
    for record in CASE_QUEUE:
        linked = case_with_m365_links(record)
        for item in [*linked.case_notes, *linked.previous_contacts]:
            required = missing_source_fields(item)
            if required:
                missing["sources"].append(
                    {
                        "case_id": record.case_id,
                        "id": item.id,
                        "title": item.title,
                        "graph_source": item.graph_source,
                        "missing": required,
                    }
                )
        for item in linked.evidence_items:
            required = missing_evidence_fields(item)
            if required:
                missing["evidence"].append(
                    {
                        "case_id": record.case_id,
                        "id": item.id,
                        "title": item.title,
                        "graph_source": item.graph_source,
                        "missing": required,
                    }
                )
    return missing


@app.get("/m365/files/{drive_id}/items/{item_id}/content")
async def microsoft_365_file_content(drive_id: str, item_id: str) -> Response:
    try:
        content, content_type, content_disposition = await graph_service.file_content(drive_id, item_id)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail="Microsoft 365 file content could not be loaded.") from exc
    headers = {}
    if content_disposition:
        headers["content-disposition"] = content_disposition
    return Response(content=content, media_type=content_type, headers=headers)


@app.post("/cases/{case_id}/assign-to-self", response_model=CaseRecord)
def assign_case_to_self(case_id: str, current_user: StaffMember) -> CaseRecord:
    record = find_case(case_id)
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


def live_queue_phase() -> int:
    return int((time.monotonic() - LIVE_QUEUE_STARTED_AT) // LIVE_QUEUE_STEP_SECONDS)


def live_staff(key: str) -> StaffMember:
    return StaffMember(**STAFF[key])


def live_activity(case_id: str, suffix: str, action: str, detail: str, actor_key: str, time_label: str = "Just now") -> ActivityItem:
    return ActivityItem(
        id=f"act-{case_id.lower()}-live-{suffix}",
        action=action,
        detail=detail,
        time=time_label,
        actor=live_staff(actor_key),
    )


def enrich_case_account_context(record: CaseRecord) -> CaseRecord:
    context = ACCOUNT_CONTEXT.get(record.case_id)
    if not context:
        return record

    return record.model_copy(
        update={
            "evidence_items": [EvidenceItem.model_validate(item) for item in context.get("evidence_items", [])],
            "case_notes": [SourceItem.model_validate(item) for item in context.get("case_notes", [])],
            "previous_contacts": [SourceItem.model_validate(item) for item in context.get("previous_contacts", [])],
        }
    )


def live_queue_records() -> list[CaseRecord]:
    phase = live_queue_phase() % 8
    visible_ids = set(LIVE_BASE_CASE_IDS)
    if phase >= 2:
        visible_ids.add("ECC-365-1047")
    if phase >= 5:
        visible_ids.add("ECC-365-1049")

    records = [enrich_case_account_context(live_case_update(record, phase)) for record in CASE_QUEUE if record.case_id in visible_ids]
    return sorted(records, key=lambda record: live_queue_order(record, phase))


def live_queue_order(record: CaseRecord, phase: int) -> tuple[int, int]:
    base_index = next((index for index, item in enumerate(CASE_QUEUE) if item.case_id == record.case_id), 99)
    if record.case_id == "ECC-365-1042":
        return (0, base_index)
    current_movement = {
        1: "ECC-365-1046",
        2: "ECC-365-1047",
        3: "ECC-365-1043",
        4: "ECC-365-1048",
        5: "ECC-365-1049",
        6: "ECC-365-1046",
    }.get(phase)
    if record.case_id == current_movement:
        return (1, base_index)
    return (2, base_index)


def live_case_update(record: CaseRecord, phase: int) -> CaseRecord:
    activity = list(record.activity)
    update: dict[str, object] = {}

    if record.case_id == "ECC-365-1046" and 1 <= phase <= 5:
        activity = [
            live_activity(
                record.case_id,
                "assigned-benefits",
                "Maya Patel assigned herself",
                "Benefits duty desk allocated the rent arrears enquiry for same-day review.",
                "maya",
                time_label="Just now" if phase == 1 else "Earlier today",
            ),
            *activity,
        ]
        update = {
            "title": "Review today",
            "status": "In review",
            "last_updated": "Just now" if phase == 1 else "Today 12:24",
            "assigned_to": live_staff("maya"),
            "activity": activity,
        }

    if record.case_id == "ECC-365-1046" and phase >= 6:
        activity = [
            live_activity(
                record.case_id,
                "released-benefits",
                "Maya Patel released the case",
                "The case returned to the benefits duty queue while evidence is checked.",
                "maya",
                time_label="Just now" if phase == 6 else "Earlier today",
            ),
            *activity,
        ]
        update = {
            "title": "Unassigned",
            "status": "Waiting update",
            "last_updated": "Just now" if phase == 6 else "Today 12:38",
            "assigned_to": None,
            "activity": activity,
        }

    if record.case_id == "ECC-365-1047" and phase >= 2:
        activity = [
            live_activity(
                record.case_id,
                "route-note",
                "Route update received",
                "Waste operations confirmed the assisted-collection route needs a return check.",
                "daniel",
                time_label="Just now" if phase == 2 else "Earlier today",
            ),
            *activity,
        ]
        update = {
            "title": "New update",
            "status": "Waiting update",
            "last_updated": "Just now" if phase == 2 else "Today 12:29",
            "activity": activity,
        }

    if record.case_id == "ECC-365-1043" and phase >= 3:
        activity = [
            live_activity(
                record.case_id,
                "inspection-slot",
                "Inspection slot requested",
                "Highways duty desk requested a school-route inspection window.",
                "tom",
                time_label="Just now" if phase == 3 else "Earlier today",
            ),
            *activity,
        ]
        update = {
            "status": "Waiting update",
            "last_updated": "Just now" if phase == 3 else "Today 12:31",
            "action": "Confirm inspection slot",
            "activity": activity,
        }

    if record.case_id == "ECC-365-1048" and phase >= 4:
        activity = [
            live_activity(
                record.case_id,
                "assigned-family",
                "Duty reviewer assigned",
                "Children and families duty picked up the Teams referral for review.",
                "nina",
                time_label="Just now" if phase == 4 else "Earlier today",
            ),
            *activity,
        ]
        update = {
            "title": "Review now",
            "status": "In review",
            "last_updated": "Just now" if phase == 4 else "Today 12:34",
            "assigned_to": live_staff("nina"),
            "activity": activity,
        }

    if record.case_id == "ECC-365-1049" and phase >= 5:
        activity = [
            live_activity(
                record.case_id,
                "portal-update",
                "Portal update added",
                "Housing options case portal added an accessible contact note.",
                "owen",
                time_label="Just now" if phase == 5 else "Earlier today",
            ),
            *activity,
        ]
        update = {
            "title": "New portal update",
            "last_updated": "Just now" if phase == 5 else "Today 12:36",
            "activity": activity,
        }

    return record.model_copy(update=update) if update else record


def case_with_live_state(record: CaseRecord) -> CaseRecord:
    record = enrich_case_account_context(record)
    record = case_with_m365_links(record)
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


def find_case(case_id: str) -> CaseRecord:
    record = next((item for item in CASE_QUEUE if item.case_id == case_id), None)
    if record is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return record


def case_with_m365_links(record: CaseRecord) -> CaseRecord:
    links = read_m365_case_links()
    source_links = links.get("sources", {}) if isinstance(links.get("sources"), dict) else {}
    evidence_links = links.get("evidence", {}) if isinstance(links.get("evidence"), dict) else {}

    case_notes = [
        enrich_source_item(item, source_links.get(item.id, {}) if isinstance(source_links.get(item.id), dict) else {})
        for item in record.case_notes
    ]
    previous_contacts = [
        enrich_source_item(item, source_links.get(item.id, {}) if isinstance(source_links.get(item.id), dict) else {})
        for item in record.previous_contacts
    ]
    evidence_items = []
    for index, item in enumerate(record.evidence_items, start=1):
        stable_id = item.id or f"evidence-{record.case_id.lower()}-{index}-{item_slug(item.title)}"
        configured = evidence_links.get(stable_id, {}) if isinstance(evidence_links.get(stable_id), dict) else {}
        evidence_items.append(enrich_evidence_item(item, stable_id, configured))

    return record.model_copy(
        update={
            "case_notes": case_notes,
            "previous_contacts": previous_contacts,
            "evidence_items": evidence_items,
        }
    )


def enrich_source_item(item, configured: dict[str, object]):
    update = {
        "graph_source": item.graph_source or infer_graph_source(item.app),
        **string_values(configured),
    }
    return item.model_copy(update=update)


def enrich_evidence_item(item, stable_id: str, configured: dict[str, object]):
    update = {
        "id": stable_id,
        "graph_source": item.graph_source or infer_graph_source(item.source),
        **string_values(configured),
    }
    return item.model_copy(update=update)


def infer_graph_source(value: str):
    normalized = value.lower()
    if "outlook" in normalized or "mailbox" in normalized:
        return "outlook"
    if "teams" in normalized:
        return "teams"
    if "sharepoint" in normalized:
        return "sharepoint"
    if "onedrive" in normalized:
        return "onedrive"
    if "case portal" in normalized:
        return "case_portal"
    return None


def missing_source_fields(item) -> list[str]:
    if item.graph_source == "outlook":
        return [field for field in ["mailbox", "graph_id"] if not getattr(item, field)]
    if item.graph_source == "teams":
        missing = []
        if not item.graph_id:
            missing.append("graph_id")
        if not item.chat_id and not (item.team_id and item.channel_id):
            missing.extend(["chat_id or team_id+channel_id"])
        return missing
    if item.graph_source in {"sharepoint", "onedrive"}:
        return [field for field in ["drive_id", "item_id"] if not getattr(item, field)]
    return []


def missing_evidence_fields(item) -> list[str]:
    if item.graph_source in {"sharepoint", "onedrive"}:
        return [field for field in ["drive_id", "item_id"] if not getattr(item, field)]
    if item.graph_source == "outlook":
        return [field for field in ["mailbox", "graph_id"] if not getattr(item, field)]
    if item.graph_source == "teams":
        missing = []
        if not item.graph_id:
            missing.append("graph_id")
        if not item.chat_id and not (item.team_id and item.channel_id):
            missing.extend(["chat_id or team_id+channel_id"])
        return missing
    return []


def string_values(values: dict[str, object]) -> dict[str, str]:
    allowed = {
        "graph_source",
        "graph_id",
        "mailbox",
        "team_id",
        "channel_id",
        "chat_id",
        "drive_id",
        "site_id",
        "item_id",
        "web_url",
        "content_type",
    }
    return {key: str(value) for key, value in values.items() if key in allowed and value is not None}


def read_m365_case_links() -> dict[str, object]:
    path = Path(os.getenv("M365_CASE_LINKS_PATH", str(ROOT / "m365-case-links.json")))
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def item_slug(value: str) -> str:
    return value.lower().replace("&", "and").replace("/", "-").replace(" ", "-")


SERVICE_RULES = {
    "housing": ["housing", "tenant", "repair", "damp", "mould", "leak", "fire risk", "burning smell", "meter cupboard", "homeless", "temporary accommodation"],
    "adult_social_care": ["adult social care", "care package", "carer", "safeguarding adult", "missed visit", "support package"],
    "highways": ["highway", "road", "pothole", "streetlight", "pavement", "traffic", "school route"],
    "waste": ["waste", "bin", "collection", "recycling", "missed collection", "fly tipping"],
    "benefits": ["benefit", "rent arrears", "hardship", "universal credit", "housing benefit", "financial support"],
    "council_tax": ["council tax", "bill", "billing", "arrears", "instalment", "single person discount"],
    "children_services": ["children services", "family support", "child safeguarding", "safeguarding child", "mash", "school referral", "early help"],
}

DISTRICTS = [
    "Basildon",
    "Braintree",
    "Brentwood",
    "Castle Point",
    "Chelmsford",
    "Colchester",
    "Epping Forest",
    "Harlow",
    "Maldon",
    "Rochford",
    "Tendring",
    "Uttlesford",
]


def extract_case_fields_with_openai(
    text: str,
    defaults: CaseRequest | None,
    fallback: dict[str, object],
) -> dict[str, object] | None:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    enabled = os.getenv("OPENAI_EXTRACTION_ENABLED", "true").strip().lower() not in {"0", "false", "no"}
    if not api_key or not enabled:
        return None

    model = os.getenv("OPENAI_EXTRACTION_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
    base = defaults or CaseRequest()
    allowed_fields = set(base.model_dump().keys())
    system_prompt = (
        "Extract council case fields from staff supplied operational text. "
        "Return JSON only with a case_request object containing only known case fields, "
        "a field_confidence object from 0 to 1, extracted_fields, defaulted_fields, and warnings. "
        "Do not make final decisions; this supports staff review."
    )
    user_payload = {
        "text": text,
        "defaults": base.model_dump(),
        "allowed_fields": sorted(allowed_fields),
    }

    try:
        response = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(user_payload)},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0,
            },
            timeout=15,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        extracted_payload = json.loads(content)
        return normalize_openai_extraction(extracted_payload, base, fallback)
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        return None


def normalize_openai_extraction(
    extracted_payload: dict[str, object],
    base: CaseRequest,
    fallback: dict[str, object],
) -> dict[str, object]:
    allowed_fields = set(base.model_dump().keys())
    model_fields = extracted_payload.get("case_request", extracted_payload)
    if not isinstance(model_fields, dict):
        raise ValueError("OpenAI extraction did not return a case_request object.")

    values = base.model_dump()
    values.update({key: value for key, value in model_fields.items() if key in allowed_fields})
    case_request = CaseRequest(**values)

    field_confidence = extracted_payload.get("field_confidence")
    if not isinstance(field_confidence, dict):
        field_confidence = fallback.get("field_confidence", {})
    normalized_confidence = {
        key: round(float(value), 4)
        for key, value in field_confidence.items()
        if key in allowed_fields and isinstance(value, (int, float))
    }

    extracted_fields = extracted_payload.get("extracted_fields")
    if not isinstance(extracted_fields, list):
        extracted_fields = fallback.get("extracted_fields", [])
    extracted = sorted({str(field) for field in extracted_fields if str(field) in allowed_fields})
    defaulted = [field for field in case_request.model_dump().keys() if field not in extracted]

    warnings = extracted_payload.get("warnings")
    if not isinstance(warnings, list):
        warnings = []
    warnings = [str(warning) for warning in warnings[:5]]
    warnings.append("OpenAI extracted these fields; staff should review before generating a recommendation.")

    confidence = round(
        sum(normalized_confidence.values()) / max(len(normalized_confidence), 1),
        4,
    )
    return {
        "case_request": case_request.model_dump(),
        "confidence": confidence,
        "field_confidence": normalized_confidence,
        "extracted_fields": extracted,
        "defaulted_fields": defaulted,
        "warnings": warnings,
    }


def extract_case_fields(text: str, defaults: CaseRequest | None) -> dict[str, object]:
    normalized = text.lower()
    base = defaults or CaseRequest()
    values = base.model_dump()
    extracted: set[str] = set()
    warnings: list[str] = []
    field_confidence: dict[str, float] = {}

    service_type, service_confidence = infer_service_type(normalized, base.service_type)
    values["service_type"] = service_type
    values["service_subtype"] = infer_service_subtype(service_type, normalized)
    mark_field("service_type", service_confidence, extracted, field_confidence, warnings, service_confidence >= 0.7)
    mark_field("service_subtype", 0.72 if service_confidence >= 0.7 else 0.5, extracted, field_confidence, warnings, service_confidence >= 0.7)

    district_match = next((name for name in DISTRICTS if name.lower() in normalized), None)
    district = district_match or base.district
    values["district"] = district
    mark_field("district", 0.86 if district_match else 0.45, extracted, field_confidence, warnings, district_match is not None)

    source_system, channel = infer_source(normalized, base.source_system, base.channel)
    values["source_system"] = source_system
    values["channel"] = channel
    mark_field("source_system", 0.82 if source_system != base.source_system else 0.5, extracted, field_confidence, warnings, source_system != base.source_system)
    mark_field("channel", 0.82 if channel != base.channel else 0.5, extracted, field_confidence, warnings, channel != base.channel)

    values["vulnerability_flag"] = any_signal(normalized, ["vulnerable", "safeguarding", "elderly", "disabled", "children", "risk to resident"])
    values["accessibility_need"] = any_signal(normalized, ["accessibility", "accessible", "interpreter", "large print", "hearing", "wheelchair", "phone contact", "contact by phone"])
    values["duplicate_signal"] = any_signal(normalized, ["again", "repeated", "duplicate", "several reports", "multiple reports", "previously reported"])
    values["deprivation_band"] = infer_deprivation_band(normalized, district, base.deprivation_band)
    for field in ["vulnerability_flag", "accessibility_need", "duplicate_signal", "deprivation_band"]:
        changed = values[field] != getattr(base, field)
        mark_field(field, 0.78 if changed else 0.5, extracted, field_confidence, warnings, changed)

    days_open_signal = first_number(normalized, [r"(\d+)\s+days?\s+open", r"open\s+for\s+(\d+)\s+days?", r"open\s+(\d+)\s+days?"])
    previous_contacts_signal = first_number(normalized, [r"(\d+|one|two|three|four|five)\s+previous\s+contacts?", r"contacted\s+(\d+|one|two|three|four|five)\s+times?"])
    values["days_open"] = bounded_int(days_open_signal, base.days_open, 0, 365)
    values["previous_contacts"] = bounded_int(previous_contacts_signal, base.previous_contacts, 0, 50)
    values["sla_hours"] = infer_sla_hours(normalized, base.sla_hours)
    numeric_signals = {"days_open": days_open_signal, "previous_contacts": previous_contacts_signal, "sla_hours": values["sla_hours"] if values["sla_hours"] != base.sla_hours else None}
    for field in ["days_open", "previous_contacts", "sla_hours"]:
        was_extracted = numeric_signals[field] is not None
        mark_field(field, 0.8 if was_extracted else 0.5, extracted, field_confidence, warnings, was_extracted)

    values["out_of_hours"] = any_signal(normalized, ["out of hours", "overnight", "weekend", "evening"])
    if values["out_of_hours"]:
        mark_field("out_of_hours", 0.82, extracted, field_confidence, warnings, True)
    else:
        mark_field("out_of_hours", 0.5, extracted, field_confidence, warnings, False)

    values["urgency_text"] = summarize_urgency(text)
    mark_field("urgency_text", 0.9, extracted, field_confidence, warnings, True)

    case_request = CaseRequest(**values)
    all_fields = list(case_request.model_dump().keys())
    defaulted = [field for field in all_fields if field not in extracted]
    if defaulted:
        warnings.append("Some fields stayed as current case values. Review them before continuing.")

    confidence = round(sum(field_confidence.values()) / max(len(field_confidence), 1), 4)
    return {
        "case_request": case_request.model_dump(),
        "confidence": confidence,
        "field_confidence": field_confidence,
        "extracted_fields": sorted(extracted),
        "defaulted_fields": defaulted,
        "warnings": warnings,
    }


def mark_field(
    field: str,
    confidence: float,
    extracted: set[str],
    field_confidence: dict[str, float],
    warnings: list[str],
    was_extracted: bool,
) -> None:
    field_confidence[field] = round(confidence, 4)
    if was_extracted:
        extracted.add(field)


def infer_service_type(text: str, default: str) -> tuple[str, float]:
    scores = {
        service: sum(1 for keyword in keywords if keyword in text)
        for service, keywords in SERVICE_RULES.items()
    }
    service, score = max(scores.items(), key=lambda item: item[1])
    if score == 0:
        return default, 0.45
    return service, min(0.95, 0.64 + (score * 0.1))


def infer_service_subtype(service_type: str, text: str) -> str:
    if "fire" in text or "burning smell" in text or "meter cupboard" in text:
        return "fire_risk"
    if "mould" in text or "damp" in text:
        return "damp_and_mould"
    if "rent arrears" in text:
        return "rent_arrears_support"
    if "care package" in text or "missed visit" in text:
        return "care_package_concern"
    if "pothole" in text:
        return "road_defect"
    if "missed collection" in text:
        return "missed_collection"
    if "billing" in text or "bill" in text:
        return "billing_query"
    if "safeguarding" in text:
        return "safeguarding_referral"
    return f"{service_type}_review"


def infer_source(text: str, default_source: str, default_channel: str) -> tuple[str, str]:
    if "email" in text or "mailbox" in text:
        return "shared_mailbox", "email"
    if "teams" in text or "referral" in text:
        return "teams_referral", "email"
    if "portal" in text or "online form" in text:
        return "case_portal", "web"
    if "phone" in text or "called" in text or "caller" in text:
        return "contact_centre", "phone"
    return default_source, default_channel


def any_signal(text: str, signals: list[str]) -> bool:
    return any(signal in text for signal in signals)


def first_number(text: str, patterns: list[str]) -> int | None:
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return number_word_to_int(match.group(1))
    return None


def number_word_to_int(value: str) -> int:
    words = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5}
    if value in words:
        return words[value]
    return int(value) if value.isdigit() else 0


def bounded_int(value: int | None, default: int, minimum: int, maximum: int) -> int:
    if value is None:
        return default
    return max(minimum, min(value, maximum))


def infer_sla_hours(text: str, default: int) -> int:
    explicit = first_number(text, [r"within\s+(\d+)\s+hours?", r"due\s+within\s+(\d+)\s+hours?", r"sla\s+(\d+)\s+hours?"])
    if explicit is not None:
        return bounded_int(explicit, default, 1, 8760)
    if any_signal(text, ["immediate", "urgent", "today", "same day", "safeguarding", "fire risk"]):
        return 24
    if "within 4 hours" in text or "four hours" in text:
        return 4
    if "within 2 hours" in text or "two hours" in text:
        return 2
    return default


def infer_deprivation_band(text: str, district: str, default: str) -> str:
    if any_signal(text, ["hardship", "arrears", "homeless", "food bank"]):
        return "high"
    if district in {"Basildon", "Harlow", "Tendring"}:
        return "high"
    if district in {"Brentwood", "Rochford", "Uttlesford"}:
        return "low"
    return default


def summarize_urgency(text: str) -> str:
    clean_text = re.sub(r"\s+", " ", text).strip()
    clean_text = re.sub(r"[\w.\-+]+@[\w.\-]+", "[email removed]", clean_text)
    clean_text = re.sub(r"\b(?:\+?44|0)\d[\d\s-]{8,}\b", "[phone removed]", clean_text)
    if len(clean_text) < 3:
        return "New operational information supplied for review."
    return clean_text[:800]


def pipeline_score_cohorts(payload: CaseRequest, evaluation: dict[str, object]) -> list[dict[str, object]]:
    slices = evaluation.get("fairness_slices") or {}
    if not isinstance(slices, dict):
        return []

    requested = {
        "service_type": payload.service_type,
        "deprivation_band": payload.deprivation_band,
        "vulnerability_flag": str(payload.vulnerability_flag),
    }
    cohorts: list[dict[str, object]] = []
    for feature, value in requested.items():
        groups = slices.get(feature)
        if not isinstance(groups, dict):
            continue
        metrics = groups.get(value)
        if not isinstance(metrics, dict):
            continue
        cohorts.append(
            {
                "feature": feature,
                "value": value,
                "rows": int(metric_float(metrics.get("rows"))),
                "accuracy": metric_float(metrics.get("accuracy")),
                "high_priority_rate": metric_float(metrics.get("high_priority_rate")),
            }
        )
    return cohorts


def metric_float(value: object, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


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

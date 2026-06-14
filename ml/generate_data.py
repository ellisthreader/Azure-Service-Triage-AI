from __future__ import annotations

import random
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "ml" / "data"
DATA_PATH = DATA_DIR / "synthetic_cases.csv"

SERVICE_TYPES = [
    "housing",
    "adult_social_care",
    "highways",
    "waste",
    "benefits",
    "council_tax",
    "children_services",
]
CHANNELS = ["web", "phone", "email", "in_person"]
SOURCE_SYSTEMS = ["web_form", "contact_centre", "shared_mailbox", "teams_referral", "case_portal"]

DISTRICTS = {
    "Basildon": "high",
    "Braintree": "medium",
    "Brentwood": "low",
    "Castle Point": "medium",
    "Chelmsford": "medium",
    "Colchester": "medium",
    "Epping Forest": "medium",
    "Harlow": "high",
    "Maldon": "medium",
    "Rochford": "low",
    "Tendring": "high",
    "Uttlesford": "low",
}

SERVICE_PROFILE = {
    "housing": {
        "weight": 13,
        "subtypes": [
            ("no_heating_or_hot_water", 14),
            ("damp_mould_or_disrepair", 16),
            ("temporary_accommodation", 10),
            ("homelessness_prevention", 9),
            ("routine_repair_update", 28),
            ("access_to_property", 8),
            ("neighbourhood_nuisance", 15),
        ],
        "days_mean": 7,
        "days_sd": 5,
        "vulnerability_rate": 0.28,
        "high_terms": ["no heating", "homelessness", "unsafe electrics", "child in household", "severe damp"],
        "medium_terms": ["repair delay", "repeat repair", "temporary accommodation query", "mould recurring"],
        "low_terms": ["repair appointment update", "general housing enquiry", "routine repair question"],
    },
    "adult_social_care": {
        "weight": 14,
        "subtypes": [
            ("care_package_breakdown", 18),
            ("safeguarding_adult", 12),
            ("blue_badge_or_mobility", 18),
            ("financial_assessment", 13),
            ("carer_support", 12),
            ("equipment_or_adaptation", 15),
            ("assessment_waiting_list", 12),
        ],
        "days_mean": 5,
        "days_sd": 4,
        "vulnerability_rate": 0.46,
        "high_terms": ["care package failing", "safeguarding concern", "resident left without support", "hospital discharge risk"],
        "medium_terms": ["carer is struggling", "equipment delay", "assessment overdue", "mobility worsening"],
        "low_terms": ["blue badge update", "care charge question", "information about support options"],
    },
    "highways": {
        "weight": 18,
        "subtypes": [
            ("pothole_or_carriageway", 26),
            ("flooding_or_drainage", 13),
            ("street_lighting", 14),
            ("traffic_signal_fault", 8),
            ("footway_defect", 15),
            ("winter_or_obstruction", 8),
            ("permit_or_roadworks", 16),
        ],
        "days_mean": 6,
        "days_sd": 5,
        "vulnerability_rate": 0.12,
        "high_terms": ["unsafe road defect near school", "traffic lights failed", "carriageway flooding", "blocked emergency access"],
        "medium_terms": ["large pothole reported twice", "street light out on footpath", "drain blocked after rain"],
        "low_terms": ["roadworks update", "minor pothole report", "request for inspection update"],
    },
    "waste": {
        "weight": 10,
        "subtypes": [
            ("missed_collection", 26),
            ("recycling_centre_query", 18),
            ("fly_tipping", 17),
            ("assisted_collection", 8),
            ("clinical_or_special_waste", 6),
            ("garden_waste", 15),
            ("container_request", 10),
        ],
        "days_mean": 4,
        "days_sd": 3,
        "vulnerability_rate": 0.10,
        "high_terms": ["clinical waste not collected", "hazardous fly tipping", "assisted collection missed repeatedly"],
        "medium_terms": ["missed collection repeated", "fly tipping blocking access", "bin collection dispute"],
        "low_terms": ["container request", "recycling centre opening times", "garden waste subscription question"],
    },
    "benefits": {
        "weight": 13,
        "subtypes": [
            ("housing_benefit_query", 20),
            ("cost_of_living_support", 18),
            ("discretionary_payment", 10),
            ("evidence_request", 16),
            ("change_of_circumstances", 13),
            ("overpayment_or_appeal", 10),
            ("signposting_to_district", 13),
        ],
        "days_mean": 6,
        "days_sd": 4,
        "vulnerability_rate": 0.24,
        "high_terms": ["rent arrears risk", "no money for food", "eviction risk", "urgent cost of living support"],
        "medium_terms": ["payment delayed", "evidence already supplied", "appeal deadline approaching"],
        "low_terms": ["benefit calculation query", "change of circumstances form", "request for update"],
    },
    "council_tax": {
        "weight": 13,
        "subtypes": [
            ("bill_query", 24),
            ("discount_or_exemption", 18),
            ("payment_plan", 15),
            ("recovery_or_summons", 10),
            ("move_in_or_move_out", 13),
            ("single_person_discount", 12),
            ("direct_debit", 8),
        ],
        "days_mean": 5,
        "days_sd": 4,
        "vulnerability_rate": 0.16,
        "high_terms": ["summons received", "cannot afford payment", "bailiff letter received", "vulnerable household debt"],
        "medium_terms": ["payment plan needed", "discount evidence supplied", "bill dispute repeated"],
        "low_terms": ["direct debit question", "single person discount update", "moving home notification"],
    },
    "children_services": {
        "weight": 19,
        "subtypes": [
            ("safeguarding_child", 16),
            ("early_help", 15),
            ("school_transport", 15),
            ("send_support", 15),
            ("adoption_or_fostering", 8),
            ("family_support", 16),
            ("school_admission", 15),
        ],
        "days_mean": 4,
        "days_sd": 4,
        "vulnerability_rate": 0.42,
        "high_terms": ["safeguarding concern for child", "child missing education", "family crisis today", "risk of harm"],
        "medium_terms": ["SEND support delayed", "school transport issue", "family needs early help"],
        "low_terms": ["school admission query", "fostering information request", "general family support question"],
    },
}

MONTH_WEIGHTS = [8, 8, 9, 9, 9, 8, 7, 7, 8, 9, 9, 9]


def weighted_choice(items: list[tuple[str, int]]) -> str:
    labels, weights = zip(*items, strict=True)
    return random.choices(list(labels), weights=list(weights), k=1)[0]


def bounded_int(value: float, lower: int, upper: int) -> int:
    return max(lower, min(upper, int(round(value))))


def derive_deprivation_band(district: str) -> str:
    baseline = DISTRICTS[district]
    if random.random() < 0.14:
        if baseline == "low":
            return "medium"
        if baseline == "high":
            return "medium"
        return random.choice(["low", "high"])
    return baseline


def choose_channel(service_type: str) -> str:
    if service_type in {"adult_social_care", "children_services"}:
        return random.choices(CHANNELS, weights=[24, 42, 20, 14], k=1)[0]
    if service_type == "highways":
        return random.choices(CHANNELS, weights=[58, 22, 17, 3], k=1)[0]
    if service_type == "waste":
        return random.choices(CHANNELS, weights=[62, 18, 17, 3], k=1)[0]
    return random.choices(CHANNELS, weights=[44, 30, 21, 5], k=1)[0]


def source_from_channel(channel: str) -> str:
    if channel == "web":
        return random.choices(["web_form", "case_portal"], weights=[75, 25], k=1)[0]
    if channel == "phone":
        return "contact_centre"
    if channel == "email":
        return "shared_mailbox"
    return random.choices(["case_portal", "teams_referral"], weights=[65, 35], k=1)[0]


def choose_days_open(service_type: str, priority_signal: str, month: int) -> int:
    profile = SERVICE_PROFILE[service_type]
    mean = profile["days_mean"]
    sd = profile["days_sd"]
    if priority_signal == "high":
        mean += 1.2
    if month in {1, 2, 11, 12} and service_type in {"housing", "highways", "adult_social_care"}:
        mean += 1.4
    return bounded_int(random.gauss(mean, sd), 0, 80)


def choose_previous_contacts(priority_signal: str) -> int:
    if priority_signal == "high":
        return random.choices(range(0, 9), weights=[8, 13, 16, 20, 18, 12, 7, 4, 2], k=1)[0]
    if priority_signal == "medium":
        return random.choices(range(0, 8), weights=[16, 23, 24, 17, 10, 6, 3, 1], k=1)[0]
    return random.choices(range(0, 7), weights=[38, 31, 17, 8, 4, 1, 1], k=1)[0]


def choose_signal(service_type: str, vulnerability_flag: bool, month: int) -> str:
    if service_type == "housing" and month in {1, 2, 11, 12} and random.random() < 0.32:
        return "high"
    if service_type == "highways" and month in {1, 2, 3, 11, 12} and random.random() < 0.24:
        return "medium"
    base = random.choices(["low", "medium", "high"], weights=[47, 34, 19], k=1)[0]
    if vulnerability_flag and random.random() < 0.34:
        return "high"
    return base


def compose_urgency_text(service_type: str, signal: str, service_subtype: str, district: str, source_system: str) -> str:
    profile = SERVICE_PROFILE[service_type]
    phrase = random.choice(profile[f"{signal}_terms"])
    context = random.choice(
        [
            f"{service_subtype.replace('_', ' ')} case from {source_system.replace('_', ' ')}",
            f"resident in {district} reports {phrase}",
            f"{phrase}; previous contact history needs review",
            f"{phrase}; officer should check supporting evidence",
        ]
    )
    if random.random() < 0.18:
        context += "; resident asks for reasonable adjustment"
    if random.random() < 0.16:
        context += "; linked case may exist"
    return context[:800]


def score_case(row: dict[str, object]) -> int:
    score = 0
    service_type = str(row["service_type"])
    service_subtype = str(row["service_subtype"])
    urgency_text = str(row["urgency_text"]).lower()

    if row["vulnerability_flag"]:
        score += 3
    if bool(row["accessibility_need"]):
        score += 1
    if bool(row["out_of_hours"]):
        score += 1
    if bool(row["duplicate_signal"]):
        score += 1
    if int(row["previous_contacts"]) >= 5:
        score += 3
    elif int(row["previous_contacts"]) >= 3:
        score += 2
    elif int(row["previous_contacts"]) >= 1:
        score += 1
    if int(row["days_open"]) >= 20:
        score += 3
    elif int(row["days_open"]) >= 10:
        score += 2
    elif int(row["days_open"]) >= 5:
        score += 1
    if row["deprivation_band"] == "high":
        score += 1
    if row["channel"] in {"phone", "in_person"}:
        score += 1
    if service_type in {"adult_social_care", "children_services"}:
        score += 2
    if service_type == "housing":
        score += 1

    high_risk_subtypes = {
        "safeguarding_adult",
        "safeguarding_child",
        "care_package_breakdown",
        "homelessness_prevention",
        "no_heating_or_hot_water",
        "traffic_signal_fault",
        "clinical_or_special_waste",
        "recovery_or_summons",
    }
    if service_subtype in high_risk_subtypes:
        score += 2
    if int(row["sla_hours"]) <= 24:
        score += 2
    elif int(row["sla_hours"]) <= 72:
        score += 1
    if any(
        term in urgency_text
        for term in [
            "safeguarding",
            "homelessness",
            "unsafe",
            "no heating",
            "failing",
            "risk of harm",
            "eviction",
            "clinical waste",
            "emergency access",
        ]
    ):
        score += 3
    return score


def label_from_score(score: int) -> str:
    if score >= 9:
        return "high"
    if score >= 5:
        return "medium"
    return "low"


def sla_hours_for(service_type: str, service_subtype: str, priority_signal: str) -> int:
    if priority_signal == "high":
        return random.choice([4, 8, 24, 24, 48])
    if service_subtype in {"safeguarding_adult", "safeguarding_child", "traffic_signal_fault", "clinical_or_special_waste"}:
        return random.choice([4, 8, 24])
    if priority_signal == "medium":
        return random.choice([48, 72, 120, 168])
    if service_type in {"highways", "housing"}:
        return random.choice([168, 240, 336, 504])
    return random.choice([120, 168, 240, 336])


def maybe_override(priority: str, score: int) -> tuple[bool, str]:
    borderline = priority == "medium" and score in {4, 5, 8, 9}
    if priority == "high" and random.random() < 0.08:
        return True, random.choice(["policy_requirement", "resident_vulnerability", "missing_context"])
    if borderline and random.random() < 0.12:
        return True, random.choice(["missing_context", "duplicate_or_linked_case", "service_backlog_context"])
    if random.random() < 0.025:
        return True, "model_recommendation_unclear"
    return False, ""


def generate_cases(total: int = 25000, seed: int = 42) -> pd.DataFrame:
    random.seed(seed)
    rows = []
    service_weights = [(service, int(profile["weight"])) for service, profile in SERVICE_PROFILE.items()]

    for case_id in range(1, total + 1):
        service_type = weighted_choice(service_weights)
        profile = SERVICE_PROFILE[service_type]
        service_subtype = weighted_choice(profile["subtypes"])
        district = random.choices(
            list(DISTRICTS.keys()),
            weights=[10, 9, 5, 6, 12, 12, 7, 7, 4, 5, 9, 4],
            k=1,
        )[0]
        deprivation_band = derive_deprivation_band(district)
        month = random.choices(list(range(1, 13)), weights=MONTH_WEIGHTS, k=1)[0]
        channel = choose_channel(service_type)
        source_system = source_from_channel(channel)
        vulnerability_flag = random.random() < float(profile["vulnerability_rate"])
        priority_signal = choose_signal(service_type, vulnerability_flag, month)
        previous_contacts = choose_previous_contacts(priority_signal)
        days_open = choose_days_open(service_type, priority_signal, month)
        out_of_hours = channel in {"phone", "email"} and random.random() < (0.18 if priority_signal == "high" else 0.06)
        accessibility_need = vulnerability_flag and random.random() < 0.24
        duplicate_signal = previous_contacts >= 2 and random.random() < 0.18
        sla_hours = sla_hours_for(service_type, service_subtype, priority_signal)
        urgency_text = compose_urgency_text(service_type, priority_signal, service_subtype, district, source_system)

        row = {
            "case_id": f"CASE-{case_id:06d}",
            "service_type": service_type,
            "service_subtype": service_subtype,
            "district": district,
            "month": month,
            "source_system": source_system,
            "sla_hours": sla_hours,
            "out_of_hours": out_of_hours,
            "accessibility_need": accessibility_need,
            "duplicate_signal": duplicate_signal,
            "days_open": days_open,
            "previous_contacts": previous_contacts,
            "vulnerability_flag": vulnerability_flag,
            "deprivation_band": deprivation_band,
            "channel": channel,
            "urgency_text": urgency_text,
        }
        score = score_case(row)

        noise_probability = 0.09
        if service_type in {"adult_social_care", "children_services"}:
            noise_probability = 0.07
        if random.random() < noise_probability:
            score += random.choice([-2, -1, 1, 2])

        priority = label_from_score(score)
        override, override_reason = maybe_override(priority, score)
        row["priority"] = priority
        row["officer_override_simulated"] = override
        row["override_reason_simulated"] = override_reason
        row["data_classification"] = "synthetic_demo"
        rows.append(row)

    columns = [
        "case_id",
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
        "priority",
        "officer_override_simulated",
        "override_reason_simulated",
        "data_classification",
    ]
    return pd.DataFrame(rows, columns=columns)


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    df = generate_cases()
    df.to_csv(DATA_PATH, index=False)
    print(f"Wrote {len(df)} synthetic cases to {DATA_PATH}")
    print(df["priority"].value_counts().to_string())
    print(df["service_type"].value_counts().to_string())


if __name__ == "__main__":
    main()

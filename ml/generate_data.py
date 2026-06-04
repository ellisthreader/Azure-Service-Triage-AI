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
DEPRIVATION_BANDS = ["low", "medium", "high"]
URGENCY_PHRASES = {
    "low": [
        "general enquiry about service times",
        "request for update when possible",
        "minor issue reported online",
        "routine form completion question",
    ],
    "medium": [
        "repeat contact and resident is frustrated",
        "missed appointment causing inconvenience",
        "repair delay affecting daily routine",
        "payment query needs resolution this week",
    ],
    "high": [
        "no heating and vulnerable resident affected",
        "safeguarding concern raised by family member",
        "unsafe road defect near school entrance",
        "risk of homelessness within days",
        "urgent care support appears to be failing",
    ],
}


def score_case(row: dict[str, object]) -> int:
    score = 0
    service_type = str(row["service_type"])
    urgency_text = str(row["urgency_text"]).lower()

    if row["vulnerability_flag"]:
        score += 3
    if int(row["previous_contacts"]) >= 3:
        score += 2
    if int(row["days_open"]) >= 10:
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
    if any(term in urgency_text for term in ["safeguarding", "homelessness", "unsafe", "no heating", "failing"]):
        score += 3
    return score


def label_from_score(score: int) -> str:
    if score >= 7:
        return "high"
    if score >= 4:
        return "medium"
    return "low"


def generate_cases(total: int = 1500, seed: int = 42) -> pd.DataFrame:
    random.seed(seed)
    rows = []

    for case_id in range(1, total + 1):
        service_type = random.choice(SERVICE_TYPES)
        vulnerability_flag = random.random() < 0.24
        previous_contacts = random.choices([0, 1, 2, 3, 4, 5, 6], weights=[20, 25, 20, 15, 10, 6, 4])[0]
        days_open = max(0, int(random.gauss(5, 4)))
        deprivation_band = random.choices(DEPRIVATION_BANDS, weights=[35, 40, 25])[0]
        channel = random.choices(CHANNELS, weights=[45, 30, 20, 5])[0]

        base_urgency = random.choices(["low", "medium", "high"], weights=[45, 35, 20])[0]
        if vulnerability_flag and random.random() < 0.45:
            base_urgency = "high"
        urgency_text = random.choice(URGENCY_PHRASES[base_urgency])

        row = {
            "case_id": f"CASE-{case_id:05d}",
            "service_type": service_type,
            "days_open": days_open,
            "previous_contacts": previous_contacts,
            "vulnerability_flag": vulnerability_flag,
            "deprivation_band": deprivation_band,
            "channel": channel,
            "urgency_text": urgency_text,
        }
        score = score_case(row)

        # Small label noise makes this a realistic supervised-learning demo while
        # preserving an explainable relationship between inputs and priority.
        if random.random() < 0.06:
            score += random.choice([-2, -1, 1, 2])

        row["priority"] = label_from_score(score)
        rows.append(row)

    return pd.DataFrame(rows)


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    df = generate_cases()
    df.to_csv(DATA_PATH, index=False)
    print(f"Wrote {len(df)} synthetic cases to {DATA_PATH}")
    print(df["priority"].value_counts().to_string())


if __name__ == "__main__":
    main()

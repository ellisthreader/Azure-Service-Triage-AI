from __future__ import annotations

from pathlib import Path
import json

import pandas as pd
from sklearn.model_selection import train_test_split

from train_model import FEATURES, TARGET


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "ml" / "data" / "synthetic_cases.csv"
OUTPUT_DIR = ROOT / "azure" / "responsible-ai" / "inputs"


def main() -> None:
    if not DATA_PATH.exists():
        raise SystemExit("Synthetic data missing. Run `python ml/generate_data.py` first.")

    df = pd.read_csv(DATA_PATH)
    train, test = train_test_split(df[FEATURES + [TARGET]], test_size=0.2, stratify=df[TARGET], random_state=42)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    train.to_csv(OUTPUT_DIR / "train.csv", index=False)
    test.to_csv(OUTPUT_DIR / "test.csv", index=False)

    metadata = {
        "target_column": TARGET,
        "task_type": "classification",
        "categorical_features": ["service_type", "vulnerability_flag", "deprivation_band", "channel"],
        "numeric_features": ["days_open", "previous_contacts"],
        "text_feature": "urgency_text",
        "cohort_candidates": ["vulnerability_flag", "deprivation_band", "service_type"],
    }
    (OUTPUT_DIR / "responsible_ai_input_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"Wrote Responsible AI input files to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()

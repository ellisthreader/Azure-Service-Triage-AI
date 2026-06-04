from __future__ import annotations

from statistics import mean


PREDICTION_LOG: list[dict[str, object]] = []


def record_prediction(payload: dict[str, object], result: dict[str, object]) -> None:
    PREDICTION_LOG.append(
        {
            "service_type": payload["service_type"],
            "vulnerability_flag": payload["vulnerability_flag"],
            "deprivation_band": payload["deprivation_band"],
            "priority": result["priority"],
            "confidence": result["confidence"],
        }
    )


def metrics_summary() -> dict[str, object]:
    total = len(PREDICTION_LOG)
    if total == 0:
        return {
            "total_predictions": 0,
            "high_priority_rate": 0.0,
            "average_confidence": 0.0,
            "fairness_watch": {
                "high_priority_rate_vulnerability_true": 0.0,
                "high_priority_rate_vulnerability_false": 0.0,
                "review_note": "No live predictions yet.",
            },
            "drift_watch": {
                "service_mix_shift": "not_enough_data",
                "low_confidence_rate": 0.0,
            },
            "operational_health": {
                "status": "ready",
                "error_rate": 0.0,
                "p95_latency_ms": "not_measured_in_demo",
            },
        }

    high_count = sum(1 for item in PREDICTION_LOG if item["priority"] == "high")
    confidences = [float(item["confidence"]) for item in PREDICTION_LOG]

    def high_rate_for_vulnerability(flag: bool) -> float:
        group = [item for item in PREDICTION_LOG if item["vulnerability_flag"] is flag]
        if not group:
            return 0.0
        return round(sum(1 for item in group if item["priority"] == "high") / len(group), 4)

    return {
        "total_predictions": total,
        "high_priority_rate": round(high_count / total, 4),
        "average_confidence": round(mean(confidences), 4),
        "fairness_watch": {
            "high_priority_rate_vulnerability_true": high_rate_for_vulnerability(True),
            "high_priority_rate_vulnerability_false": high_rate_for_vulnerability(False),
            "review_note": "Differences need human review before any production use.",
        },
        "drift_watch": {
            "service_mix_shift": "demo_baseline",
            "low_confidence_rate": round(sum(1 for value in confidences if value < 0.65) / total, 4),
        },
        "operational_health": {
            "status": "ready",
            "error_rate": 0.0,
            "p95_latency_ms": "not_measured_in_demo",
        },
    }

---
tags: [responsible-ai, fairness, governance]
created: 2026-06-04
---

# 07 — Responsible AI

Source docs: `docs/responsible-ai-assessment.md`, `docs/model-card.md`, `docs/dpia-lite.md`, `azure/responsible-ai/`.

## Stance
- **Advisory only.** The model ranks and explains; it never actions a case. A human caseworker makes every final decision. See [[09 - Decisions]].
- **Human review is automatic** for any `high` priority **or** confidence `< 0.65` (`model_service.predict` sets `human_review_required`).

## Fairness
- Accuracy and high-priority rate are tracked per cohort across **vulnerability_flag**, **deprivation_band**, and **service_type** (`evaluation.json` → `fairness_slices`).
- The vulnerability cohort shows a large, **expected** high-priority-rate gap (vulnerability is a deliberate priority signal) — surfaced in the [[04 - Dashboard|Fairness panel]], not hidden.
- `evaluation.json` fairness status is `review_required` → a human reviews cohort gaps before they change handling.
- **deprivation_band is a service-risk context feature, not an eligibility/entitlement decision.**

## Governance artifacts
| Artifact | Status | Owner |
|---|---|---|
| Model card | ready | AI/ML engineer |
| DPIA-lite | ready | Information governance |
| Fairness cohorts | ready | Data science |
| Human review route | required | Service team |
| Azure RAI scorecard | requires Azure | AI/ML engineer |
| Power BI publish | requires workspace | Analytics |

## Monitoring
`backend/app/monitoring.py` aggregates live predictions → `/metrics/summary` (volume, high-priority rate, average confidence, low-confidence/drift watch). Exports for Power BI live in `monitoring/powerbi/`.

See [[06 - Model]], [[08 - Azure-Deployment]].

#servicePriorityAI #responsibleAI

# Essex AI / ML Engineer Interview Prep

Interview context captured on 2026-06-14.

## Interview Requirement

Essex County Council invited Ellis to interview for **AI / ML Engineer**. Interviews are scheduled across **Monday 29 June 2026**, **Tuesday 30 June 2026**, and **Friday 3 July 2026** via MS Teams.

The pre-interview task is a **10-minute presentation** about a **real AI/ML model deployed to a cloud environment** such as Azure, AWS, or GCP. The goal is to show how production ML is delivered safely and reliably.

Required deliverable:

- PowerPoint or PDF slides.
- Anonymised supporting artifacts where possible.
- No sensitive or confidential data.
- No live demo required.
- If an LLM helped prepare the presentation, disclose it and explain how accuracy was verified.

## Role Fit To Emphasise

The job description is centred on production Azure MLOps in a public-sector environment. The presentation should therefore focus less on the UI polish and more on:

- Azure Machine Learning pipelines, environments, compute, registry, online endpoints, and batch endpoints.
- Model deployment through a governed API layer rather than direct browser access to model secrets.
- Testing, validation, versioning, rollback, and repeatability.
- Monitoring for performance, drift, fairness, explainability, cost, and operational health.
- Responsible AI, UK GDPR, DPIA-style thinking, auditability, and human oversight.
- Clear communication to non-technical service stakeholders.

## Project Framing

Use **Service Priority AI** as a public-sector MLOps case study:

> Service Priority AI is an Azure-oriented ML system that predicts whether a fictional council service request should be treated as low, medium, or high priority. It uses synthetic data, a scikit-learn model, FastAPI, React, Azure ML deployment assets, monitoring exports, and Responsible AI documentation. The model is advisory: a human officer remains responsible for the decision.

Be precise about scope:

- It demonstrates production-shaped MLOps and governance.
- It uses synthetic data, so it does not prove live resident-service performance.
- It should not be presented as an autonomous decision system.
- It should not be presented as handling real resident data.

## Evidence To Verify Before Slides

Before finalising the deck, verify every cloud claim with an artifact:

- Azure ML workspace name and resource group from `azure/README.md`.
- Registered model version from Azure ML or CLI output.
- Managed online endpoint name, deployment name, and traffic allocation.
- Batch endpoint name and sample scoring output.
- Azure Functions API wrapper `/health` response.
- Azure Functions audit summary `/audit/summary`, showing whether Azure Table Storage is active.
- One saved officer decision receipt from `POST /cases/{case_id}/decision`.
- Feedback and drift report endpoints: `/monitoring/feedback-report` and `/monitoring/drift-report`.
- Monthly budget alert configuration.
- Any endpoint invocation log, CLI output, or Azure Portal screenshot.

Current repo claims in `azure/README.md`:

- Resource group: `rg-service-priority-ai-demo`
- Workspace: `mlw-service-priority-ai-v2`
- Registered model: `service-priority-ai:1`
- Online endpoint: `ep-service-priority-ai`, deployment `blue`, traffic `blue=100`
- Batch endpoint: `be-service-priority-ai`, deployment `default`
- Browser API wrapper: `func-service-priority-ai-api`
- Durable audit table: `ServicePriorityAudit` through the Function App storage account
- Public dashboard: `https://stspaisite154550.z33.web.core.windows.net/#/dashboard`
- Budget: `service-priority-ai-monthly-10`

Important caveat: `azure/azure-deployment-boundary.md` still describes some cloud actions as requiring access. Treat that as a stale/older boundary note unless the current Azure Portal/CLI evidence confirms otherwise.

## Recommended 10-Minute Slide Plan

Target **8 slides**. Aim for about **75 seconds per slide**, with slide 8 as a strong close.

### 1. Title And One-Line System Summary

Message:

- "Service Priority AI: responsible Azure MLOps for public-service case prioritisation."
- State that the model is advisory and uses synthetic data.

Artifacts:

- One screenshot of the dashboard or architecture diagram.

### 2. Context And My Role

Answer the panel prompt:

- Business problem: service teams need a consistent way to surface urgent requests.
- Users: caseworkers, service managers, governance reviewers.
- Personal contribution: designed and built the ML lifecycle, API, deployment assets, monitoring outputs, and Responsible AI documentation.

Keep the wording honest:

- "I built this end-to-end as a portfolio case study aligned to public-sector MLOps."
- If asked whether it was live production with real residents, answer: "No. I deliberately used synthetic data; the cloud deployment proves the delivery pattern, not live operational suitability."

### 3. Data And Real-World Limitations

Cover:

- Synthetic service request records.
- Structured fields: service type, days open, previous contacts, vulnerability flag, deprivation band, channel.
- Text field: urgency notes.
- Risks: proxy discrimination, incomplete vulnerability records, free-text bias, label bias, no proof of real-world generalisation.

Mitigations:

- Synthetic-only public demo.
- Model card and DPIA-lite notes.
- Human review.
- Fairness slices and monitoring design.
- No raw real resident data.

### 4. Model And Evaluation

Cover:

- Baseline scikit-learn pipeline.
- Text plus structured features.
- Explainability through reason codes, feature attributions, SHAP summary artifacts, and model metadata.
- Why not a complex model first: public-sector accountability and auditability matter.

Metrics to highlight:

- Accuracy.
- Macro F1.
- High-priority recall.
- Confusion matrix.
- Confidence and human-review flag.
- Fairness slices by vulnerability, deprivation band, channel, and service type.

### 5. Azure Architecture And Service Choices

Show the cloud architecture:

- Azure ML pipeline for training/evaluation.
- Azure ML environments with pinned dependencies.
- Azure ML model registry for versioned artifacts.
- Managed online endpoint for real-time scoring.
- Batch endpoint for offline scoring.
- Azure Functions FastAPI wrapper for browser-safe API access.
- React frontend can point at the governed API wrapper.
- Azure Table Storage audit records for predictions, officer decisions, overrides, model version, and confidence.
- Power BI-ready CSV outputs for monitoring.

Explain service choices:

- Azure ML over ad hoc scripts: reproducibility and governance.
- Managed endpoint over direct VM: supportability and deployment control.
- API wrapper over direct browser-to-Azure-ML call: auth and governance boundary.
- Batch endpoint: scheduled review queues and monitoring backfills.

### 6. Production Safety Controls

Cover:

- Typed FastAPI/Pydantic schema.
- Backend tests.
- Frontend build check.
- Local validation script.
- Versioned model artifacts.
- Model card, DPIA-lite, Responsible AI assessment.
- Deployment gate: review metrics before model registration or traffic shift.
- Cost control: small compute, scale-to-zero where possible, monthly budget alerts.

This slide should map directly to ECC accountabilities around secure, sustainable, governed AI.

### 7. Monitoring, Incident, And Learning

The panel explicitly asks for one production incident. Do not invent a harmful live-service incident. Use a verified deployment incident or deployment-learning example.

Recommended incident framing if evidence supports it:

- Alert/problem: Linux App Service plan creation in UK South was blocked by subscription VM quota.
- Root cause: quota limitation in the chosen region/subscription.
- Mitigation: used Azure Functions Flex Consumption as the FastAPI browser API wrapper and kept Azure ML endpoint behind a governed layer.
- Validation: checked `/health`, model load status, endpoint response, and budget/cost controls.
- What changed afterwards: documented the hosting path in `azure/web-app-deployment.md`, separated browser API from model endpoint auth, and kept a fallback App Service path for later quota approval.

Alternative if the panel expects model-serving incident:

- Use a "deployment incident during rollout" phrase rather than "production resident-impacting incident."
- State clearly that no real residents were affected because the system used synthetic data.

Monitoring to mention:

- API health, latency, errors, request volume.
- Prediction volume, confidence, class mix, low-confidence rate.
- Drift in input features and text terms.
- Fairness disparity gaps and slice metrics.
- Explanation coverage.
- Officer final decisions, override rate, and complaint monitoring as required for a real service.

### 8. What I Would Do Next At ECC

Close by mapping the project to the role:

- Turn experiments into governed Azure ML pipelines.
- Coach analysts/data scientists on reproducible MLOps.
- Work with Information Governance before real data.
- Keep durable audit telemetry in Azure Table Storage and operational telemetry in Azure Monitor/Application Insights.
- Add service-owner thresholds, override workflow, and model promotion gates.
- Use Power BI for accessible monitoring review.
- Add APIM/Entra/Key Vault controls before any real staff or resident data.

End with:

> "For public-sector AI, deployment is not just getting a model behind an endpoint. It is making the model reproducible, explainable, monitored, governed, and safe for people to challenge."

## Supporting Artifacts To Include

Use anonymised screenshots or snippets only:

- Architecture diagram from `vault/02 - Architecture.md` or a recreated slide version.
- Dashboard screenshot from `docs/screenshots/`.
- Redacted Azure ML endpoint or model registry screenshot.
- `azure/online-endpoint.yml` and `azure/online-deployment.yml` snippets.
- `azure/ml-pipeline.yml` snippet showing generate/train/evaluate/package stages.
- `/health` response from the Azure Functions wrapper.
- `monitoring/powerbi/model_summary.csv` or generated Power BI mock screenshot.
- Model card or Responsible AI assessment excerpt.
- Budget alert screenshot if available.

Do not include:

- Secrets, endpoint keys, tokens, subscription IDs, tenant IDs, private URLs with keys, real personal data, real resident case text, or confidential council material.

## JD Mapping

| ECC Requirement | Project Evidence |
| --- | --- |
| Azure ML pipelines | `azure/ml-pipeline.yml`, `azure/deploy-azureml.sh` |
| Managed online endpoints | `azure/online-endpoint.yml`, `azure/online-deployment.yml`, Azure README status |
| Batch endpoints | `azure/batch-endpoint.yml`, `azure/batch-deployment.yml`, `ml/batch_score.py` |
| Registries/environments/compute | `azure/README.md`, `azure/environments/*.yml` |
| Python production ML | `ml/`, `backend/app/`, `backend/tests/` |
| FastAPI/API frameworks | `backend/app/main.py`, `function_app.py` |
| Responsible AI and UK GDPR | `docs/responsible-ai-assessment.md`, `docs/dpia-lite.md`, `docs/model-card.md` |
| Monitoring and fairness | `monitoring/`, `docs/monitoring-strategy.md`, `ml/artifacts/evaluation.json` |
| Durable audit and feedback loop | `backend/app/audit_store.py`, `/audit/summary`, `/monitoring/feedback-report` |
| Power BI metrics | `monitoring/export_powerbi.py`, `monitoring/powerbi/` |
| Stakeholder communication | dashboard, model card, plain-English explanation factors, presentation narrative |

## Likely Panel Questions

Prepare short answers for these:

- Why did you choose Azure ML rather than just running the model inside FastAPI?
- Why not use AutoML or a larger model?
- What would need to change before using real resident data?
- How would you detect drift?
- How would you define fairness in a public-service context?
- What would you do if high-priority recall dropped?
- How would rollback work?
- How would you secure the endpoint?
- How would you stop staff over-relying on the model?
- What did you personally build?
- What was the incident and what changed afterwards?
- How did you use an LLM in preparing this presentation?

## LLM Disclosure

Suggested wording:

> I used an LLM to help structure the presentation and identify gaps against the interview brief. I verified the content against my repository, Azure configuration, command outputs, and generated artifacts. I did not use it to invent project experience, metrics, incidents, or cloud resources.

## Preparation Checklist

- [ ] Confirm interview date and MS Teams details.
- [ ] Verify Azure resources and capture redacted screenshots.
- [ ] Verify Azure Functions `/health` endpoint.
- [ ] Verify `/audit/summary` returns `durable: true` in Azure.
- [ ] Save one demo decision and verify it appears in `/audit/decisions`.
- [ ] Run local backend tests.
- [ ] Run frontend build.
- [ ] Generate Power BI CSV exports.
- [ ] Decide exact incident story and evidence.
- [ ] Create 8-slide deck.
- [ ] Rehearse to 9 minutes 30 seconds.
- [ ] Prepare 2-minute backup explanation in case they interrupt.
- [ ] Prepare LLM disclosure.

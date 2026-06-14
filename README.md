# Service Priority AI

An end-to-end Azure MLOps and Responsible AI portfolio project for service request triage.

Service Priority AI demonstrates how a machine learning system can be designed, delivered, governed, and monitored in a realistic public-sector decision-support workflow. The project predicts a fictional service request priority of `low`, `medium`, or `high`, then presents the recommendation with confidence scores, explanation factors, and operational monitoring signals so a human reviewer can make the final decision.

This repository is built to show employer-ready engineering judgement, not just model training. It combines a tested FastAPI prediction service, a React triage dashboard, synthetic data generation, scikit-learn model training, Azure Machine Learning deployment assets, CI validation, monitoring contracts, and Responsible AI documentation covering model cards, DPIA-lite thinking, fairness, drift, human oversight, and safe-use boundaries.

## Portfolio Highlights

- End-to-end ML delivery: data generation, training, evaluation artifacts, API serving, frontend consumption, monitoring, and deployment documentation.
- Azure-ready MLOps structure: pipeline, environment, endpoint, batch scoring, and deployment YAML assets designed for Azure Machine Learning CLI v2.
- Responsible AI by design: human-in-the-loop positioning, model card, DPIA-lite assessment, fairness and drift monitoring concepts, and explicit limitations for synthetic demo data.
- Production-style implementation: typed API schemas, FastAPI tests, CI workflow, package-managed frontend, and clearly documented integration contracts.
- Employer-relevant scenario: a practical triage workflow that reflects the governance, reliability, auditability, and communication skills expected in applied AI roles.

## Technical Scope

- **Machine learning:** synthetic case data, feature contract, scikit-learn training pipeline, persisted model artifact, evaluation metrics, and model metadata.
- **Backend:** FastAPI service with typed request/response schemas, health checks, prediction endpoint, a grounded `/chat` assistant endpoint, monitoring summary endpoint, and automated API tests.
- **Frontend:** a React app with three surfaces — a public service portal, an OpenAI-style operator console, and a docked AI assistant rail — for reviewing recommendations, confidence, explanation factors, and monitoring signals.
- **MLOps:** Azure ML pipeline, environment, online endpoint, batch endpoint, deployment notes, CI validation, and reproducible local commands.
- **Governance:** Responsible AI assessment, DPIA-lite, model card, monitoring strategy, acceptance criteria, and clear human accountability boundaries.

## Dashboard Screenshots

These screenshots show real responses from the running FastAPI model service, captured through the React dashboard with different case profiles.

### High Priority

![High priority triage dashboard](docs/screenshots/high-priority-triage.png)

### Medium Priority

![Medium priority triage dashboard](docs/screenshots/medium-priority-triage.png)

### Low Priority

![Low priority triage dashboard](docs/screenshots/low-priority-triage.png)

## Project Structure

```text
.
├── backend/          # FastAPI app (predict, chat, metrics) and tests
├── frontend/         # React app: portal + console dashboard + chatbot rail
├── ml/               # synthetic data, training, artifacts
├── monitoring/       # monitoring metric definitions and generated summaries
├── azure/            # Azure ML starter configs and deployment notes
├── docs/             # governance, architecture, and portfolio documentation
├── vault/            # Obsidian project vault (open as a vault in Obsidian)
└── PLAN.md           # detailed build plan
```

## Frontend Surfaces

The frontend (`frontend/src`) is a React 19 + Vite + TypeScript single-page app with a lightweight hash router and three surfaces:

- **Public service portal** (`#/`) — a civic landing page (hero + search, popular services, illustrative priority queue, value props, testimonials, news, CTA). All copy and imagery are original (CSS gradients / Lucide icons); no third-party assets.
- **Operator console** (`#/dashboard`) — an OpenAI-platform-inspired dashboard with a section sidebar and live panels: KPIs, live triage, operations metrics, MLOps pipeline, model registry, monitoring, fairness, SHAP, batch scoring, and governance.
- **AI assistant rail** — a docked right-hand chatbot, present on both surfaces, backed by `POST /chat`. It is a deterministic, offline, grounded assistant (no external LLM) that explains scoring, fairness, and governance, and can triage the current case.

## Project Vault

`vault/` is an [Obsidian](https://obsidian.md) vault documenting the project end-to-end (architecture, frontend, dashboard, chatbot, model, responsible AI, Azure, decision log, glossary). Open Obsidian → **Open folder as vault** → select `vault/`, and start at `vault/Home.md`.

## Local Setup

Create a Python environment and install the backend/ML dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Generate synthetic data and train the baseline model:

```bash
python ml/generate_data.py
python ml/train_model.py
python ml/evaluate_model.py
python ml/prepare_responsible_ai_inputs.py
```

Run the API:

```bash
uvicorn backend.app.main:app --reload --port 8010
```

Run the frontend in another terminal:

```bash
cd frontend
npm install
VITE_API_BASE=http://localhost:8010 npm run dev
```

Open the dashboard at the Vite URL, usually `http://localhost:5173`.

## Azure ML Implementation Path

The repo includes concrete Azure ML starter assets, not only notes:

- `AZURE_IMPLEMENTATION_PLAN.md` explains the upgrade plan and acceptance criteria.
- `azure/ml-pipeline.yml` runs generation, training, evaluation, and registry candidate packaging.
- `azure/environments/*.yml` defines training, serving, and batch environments.
- `azure/online-endpoint.yml` and `azure/online-deployment.yml` define managed online deployment.
- `azure/batch-endpoint.yml` and `azure/batch-deployment.yml` define batch scoring.
- `azure/score_online.py` is the Azure ML online scoring entrypoint.
- `ml/batch_score.py` is the Azure ML batch scoring entrypoint.
- `azure/responsible-ai/README.md` explains the Responsible AI dashboard and scorecard review.
- `azure/deploy-azureml.sh` and `azure/deploy-endpoints.sh` automate the Azure CLI deployment sequence once credentials are available.
- `monitoring/export_powerbi.py` creates Power BI-ready CSV tables.

Local checks for Azure scoring code:

```bash
python azure/score_online.py
python ml/batch_score.py
python ml/generate_shap_report.py
python monitoring/export_powerbi.py
```

Actual Azure deployment requires an Azure ML workspace, compute target, registered environments, registered model, and authenticated Azure CLI. See `azure/README.md` for the command sequence.

## API Example

```bash
curl -X POST http://localhost:8010/predict \
  -H "Content-Type: application/json" \
  -d '{
    "service_type": "housing",
    "service_subtype": "fire_risk",
    "days_open": 5,
    "previous_contacts": 1,
    "vulnerability_flag": true,
    "deprivation_band": "high",
    "channel": "phone",
    "urgency_text": "Fire risk and also children in house"
  }'
```

Ask the grounded assistant (optionally pass a `case_context` to triage it):

```bash
curl -X POST http://localhost:8010/chat \
  -H "Content-Type: application/json" \
  -d '{ "message": "How does the scoring work and is it fair?" }'
```

## Responsible AI Position

This demo uses synthetic data. It is not suitable for real residents or live services without formal data governance, DPIA, equality impact assessment, security review, user testing, human override design, and operational monitoring.

The intended design is advisory. A human officer remains accountable for decisions and can override the model.

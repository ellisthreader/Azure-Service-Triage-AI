# Service Priority AI

Portfolio project for an AI / ML Engineer role focused on Azure MLOps, Responsible AI, and public-sector machine learning delivery.

The system predicts a fictional service request priority of `low`, `medium`, or `high`. It is designed as a human decision-support tool: the model recommends a priority, explains the main factors, and exposes monitoring signals that help decide whether the model is still safe to use.

## Why This Project Fits the Role

- Demonstrates end-to-end ML delivery rather than notebook-only modelling.
- Uses production-style Python, FastAPI, testing, and API contracts.
- Includes monitoring for performance, drift, fairness, and operational health.
- Includes Responsible AI, DPIA-lite, model card, and human oversight documentation.
- Provides an Azure-ready structure for Azure Machine Learning pipelines, registries, managed endpoints, and batch scoring.

## Project Structure

```text
.
├── backend/          # FastAPI app and API tests
├── frontend/         # React dashboard
├── ml/               # synthetic data, training, artifacts
├── monitoring/       # monitoring metric definitions and generated summaries
├── azure/            # Azure ML starter configs and deployment notes
├── docs/             # governance, architecture, and portfolio documentation
└── PLAN.md           # detailed build plan
```

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

## API Example

```bash
curl -X POST http://localhost:8010/predict \
  -H "Content-Type: application/json" \
  -d '{
    "service_type": "housing",
    "days_open": 5,
    "previous_contacts": 4,
    "vulnerability_flag": true,
    "deprivation_band": "high",
    "channel": "phone",
    "urgency_text": "Customer has no heating and there are young children in the property"
  }'
```

## Responsible AI Position

This demo uses synthetic data. It is not suitable for real residents or live services without formal data governance, DPIA, equality impact assessment, security review, user testing, human override design, and operational monitoring.

The intended design is advisory. A human officer remains accountable for decisions and can override the model.

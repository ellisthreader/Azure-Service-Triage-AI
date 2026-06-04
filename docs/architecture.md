# Architecture

## Purpose

Azure Council is a portfolio-ready public-sector AI project for fictional council case prioritisation. The system predicts whether a service case should be treated as `low`, `medium`, or `high` priority, while making clear that the prediction is advisory and must remain subject to human review.

The architecture is designed to demonstrate production-minded ML engineering on Azure without requiring Azure credentials for local development. The local application can be run end to end on a developer machine, while the repository structure maps cleanly to Azure ML, managed API hosting, monitoring, and CI/CD.

## System Components

### React Dashboard

The frontend is a Vite, React, and TypeScript dashboard for council officers and reviewers. It provides:

- a case submission form for structured case details and urgency notes
- a prediction result panel with priority, confidence, and explanation factors
- monitoring summaries for model quality, drift, fairness, and operational health
- responsible AI documentation views for human oversight, limitations, and governance notes

The dashboard should not contain model logic. It is responsible for validation that improves user experience, presentation of API responses, and clear communication that the model is decision support rather than automated decision-making.

### FastAPI Backend

The backend is the integration point between the dashboard, model artifact, monitoring store, and deployment runtime. It provides:

- Pydantic request and response schemas
- `/health` for runtime and model-load checks
- `/predict` for case prioritisation
- `/metrics/summary` for monitoring summaries
- `/explainability/sample` for representative explanation output

The API owns input validation, feature transformation, model invocation, response shaping, operational logging, and error handling. It should expose stable contracts even if the underlying model pipeline changes.

### ML Layer

The ML layer contains the reproducible training workflow for a synthetic council case dataset. It should include:

- synthetic data generation for fictional service cases
- structured features such as service type, case age, previous contacts, vulnerability flag, and deprivation band
- text features from free-text urgency notes, using TF-IDF or a similarly explainable baseline
- a scikit-learn multiclass classifier
- saved model artifacts, metadata, metrics, and model card outputs

The first model should favour transparency and repeatability over maximum predictive performance. That makes the project easier to explain in an interview and better aligned with public-sector governance expectations.

### Monitoring Layer

Monitoring is split into local demonstration code and Azure-ready concepts. It should track:

- prediction volume, recent predictions, request count, and error rate
- model performance against labelled validation data
- data drift for important structured and text-derived features
- fairness summaries across selected synthetic groups
- explanation coverage and confidence distribution

For the local project, monitoring can be backed by JSON, CSV, SQLite, or lightweight application logs. In Azure, the same concepts can map to Application Insights, Azure Monitor, Azure ML data/model monitoring, storage accounts, and scheduled evaluation jobs.

### Azure MLOps Layer

The Azure layer documents and demonstrates how the local project would become a cloud-hosted ML service:

- Azure ML environment definitions for training and inference dependencies
- pipeline examples for data generation, training, evaluation, registration, and validation
- model registry notes for versioned promotion between dev, test, and production
- managed online endpoint guidance for real-time API serving
- batch scoring outline for retrospective service-case analysis
- CI/CD guidance for tests, linting, artifact validation, and deployment gates

Azure-specific files should be examples and deployment assets, not mandatory requirements for local development.

## Data Flow

### Local Prediction Flow

1. A user enters a fictional council case in the React dashboard.
2. The dashboard sends a typed JSON request to the FastAPI `/predict` endpoint.
3. FastAPI validates the request with Pydantic schemas.
4. The API converts user input into the feature format expected by the trained model pipeline.
5. The model returns class probabilities for `low`, `medium`, and `high`.
6. The API selects the priority, calculates confidence, and derives explanation factors.
7. The prediction request and response metadata are logged for monitoring.
8. The dashboard displays the recommendation, confidence, and reasons in plain English.
9. A human officer reviews the output and can apply their own judgement outside the model.

### Training Flow

1. The data generator creates synthetic fictional council cases and labels.
2. The training script splits data into train and validation sets.
3. A scikit-learn pipeline transforms structured and text fields.
4. The classifier is trained and evaluated.
5. The workflow saves the model artifact, feature metadata, evaluation metrics, and model card inputs.
6. The API loads the approved local artifact, or an Azure deployment loads a registered model version.

### Monitoring Flow

1. Each prediction writes operational metadata and non-sensitive feature summaries.
2. Scheduled or on-demand monitoring jobs compare recent inputs with a baseline dataset.
3. Performance summaries use labelled validation data or post-event labels where available.
4. Fairness summaries compare outcomes and errors across selected synthetic groups.
5. The API exposes summary metrics for the dashboard.
6. Governance documents explain limitations, escalation routes, and review expectations.

## Local vs Azure Deployment Boundaries

| Concern | Local development | Azure-ready deployment |
| --- | --- | --- |
| Frontend | Vite dev server or static build | Static Web Apps, App Service, or Storage plus CDN |
| API runtime | Uvicorn running FastAPI locally | App Service, Container Apps, AKS, or Azure ML managed online endpoint wrapper |
| Model artifact | Local file loaded from repository output path | Versioned artifact from Azure ML model registry |
| Training | Local Python script | Azure ML pipeline job with tracked inputs, outputs, metrics, and environment |
| Data | Synthetic CSV or generated fixture data | Storage account or Azure ML data asset containing synthetic or approved non-production data |
| Monitoring | Local logs, JSON, CSV, or SQLite summaries | Application Insights, Azure Monitor, Azure ML monitoring, scheduled evaluation jobs |
| Secrets | `.env` for local non-production settings | Managed identity, Key Vault, and environment-scoped configuration |
| CI/CD | Local commands and GitHub Actions-ready scripts | GitHub Actions or Azure DevOps deploying through gated environments |

The important boundary is that local development must not depend on cloud services, while cloud deployment should reuse the same contracts, schemas, tests, model artifact shape, and monitoring definitions.

## Responsible AI and Public-Sector Fit

This structure fits a public-sector AI portfolio project because it separates the model from the decision process. The model produces a recommendation with confidence and explanation, but the dashboard and documentation reinforce human review.

The use of synthetic data avoids exposing personal information while still demonstrating realistic service-delivery concerns such as vulnerability, contact history, deprivation bands, urgency notes, and service type. These fields are useful for showing feature engineering, fairness analysis, and governance tradeoffs, but the project should document that they are demonstration features rather than a production data policy.

The architecture also supports auditability. Inputs are validated, predictions are logged, artifacts are versioned, metrics are generated, and model limitations are documented. These are the practical controls expected in an Azure MLOps setting and are directly relevant to responsible deployment of AI in local government.

## Design Rationale

The project uses a conventional frontend, API, ML, monitoring, and Azure documentation split because each area has a clear integration contract:

- frontend developers can build against typed API responses
- API developers can load any model that preserves the artifact contract
- ML engineers can improve the pipeline without changing the dashboard
- monitoring work can evolve from local summaries to Azure-native telemetry
- responsible AI documentation can refer to concrete model behaviour and system controls

This keeps the first implementation small enough to complete, while leaving a credible path to production-style Azure MLOps practices.

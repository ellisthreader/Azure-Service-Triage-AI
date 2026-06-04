# Azure Council - Project Plan

## Project Goal

Build a portfolio-ready public-sector AI/ML engineering project for a fictional council case-prioritisation system. The project should demonstrate the skills most relevant to the Essex County Council AI / ML Engineer role:

- Azure-native MLOps concepts
- production Python ML engineering
- model deployment through an API
- monitoring for model quality, drift, fairness, and operational health
- Responsible AI, explainability, auditability, and GDPR-aware documentation
- a simple dashboard that helps non-technical stakeholders understand predictions and risks

## Product Concept

The application predicts the priority of fictional council service cases as `low`, `medium`, or `high`.

Example use cases:

- housing repair triage
- highways issue routing
- waste service escalation
- benefits or council tax enquiry prioritisation
- adult social care contact triage

The model does not automate decisions. It provides a recommendation with confidence and explanation so a human officer can review and override it.

## Core User Journey

1. A user opens the web dashboard.
2. They enter a fictional council case with service type, case age, previous contacts, vulnerability flag, postcode deprivation band, and free-text urgency notes.
3. The frontend sends the case to a FastAPI backend.
4. The backend transforms the input into model features.
5. The model returns a priority, confidence score, and explanation factors.
6. The dashboard displays the result in plain English.
7. Monitoring pages show model performance, drift indicators, fairness summary, and recent prediction activity.

## Technical Architecture

### Frontend

- React
- TypeScript
- Vite
- dashboard-first interface
- case submission form
- prediction results panel
- monitoring summary view
- responsible AI documentation view

### Backend API

- Python
- FastAPI
- Pydantic request and response schemas
- model loading service
- `/predict` endpoint
- `/health` endpoint
- `/metrics/summary` endpoint
- `/explainability/sample` endpoint

### ML Layer

- synthetic council case dataset
- scikit-learn pipeline
- text features through TF-IDF
- structured categorical and numeric features
- multiclass classifier
- saved model artifact
- reproducible training script
- model evaluation report
- model card output

### Monitoring Layer

- prediction logging
- sample drift calculation
- performance summary against labelled validation data
- fairness summary across selected synthetic groups
- operational health fields such as request count and error rate

### Azure MLOps Layer

This repository should be runnable locally while including Azure-ready structure:

- Azure ML pipeline specification examples
- environment definition
- endpoint deployment notes
- model registry documentation
- batch scoring outline
- GitHub Actions / Azure DevOps-ready CI structure

## Responsible AI Principles

The system must make clear that:

- predictions support human review rather than replace it
- synthetic data is used for demonstration
- protected characteristics should not be used for service denial
- vulnerability and urgency indicators need careful governance
- explanations must be available for each prediction
- monitoring must check fairness, drift, and service impact
- model limitations are documented before deployment

## Initial Build Scope

The first working base should include:

- project documentation
- synthetic data generator
- local model training script
- saved model artifact
- FastAPI backend
- React dashboard
- basic monitoring summaries
- Responsible AI and model card docs
- developer setup instructions

## Subagent Workstreams

Eight subagents are assigned to help shape and validate the core base:

1. Architecture reviewer: validate folder structure and integration boundaries.
2. ML engineer: define dataset features, model pipeline, evaluation metrics, and model artifact format.
3. API engineer: define FastAPI endpoints, schemas, error handling, and local serving contract.
4. Frontend engineer: define dashboard layout, forms, states, and API interaction.
5. Responsible AI reviewer: define governance docs, model card, DPIA-style summary, and fairness risks.
6. Azure MLOps engineer: define Azure ML pipeline, endpoint, registry, environment, and CI/CD guidance.
7. Monitoring engineer: define drift, fairness, performance, and operational metrics.
8. QA engineer: define tests, smoke checks, setup validation, and acceptance criteria.

## Implementation Phases

### Phase 1 - Scaffold

- create repository folders
- add root README
- add backend, frontend, ml, docs, azure, and monitoring directories
- add environment examples

### Phase 2 - Synthetic Data and Model

- generate fictional council case records
- create labels using transparent rules plus noise
- train a baseline classifier
- save model and metadata
- output evaluation JSON

### Phase 3 - API

- implement FastAPI app
- expose health, prediction, monitoring, and metadata endpoints
- load model artifact
- return confidence and explanation factors

### Phase 4 - Frontend

- build case-prioritisation dashboard
- submit cases to API
- display priority, confidence, and reasons
- show monitoring summaries and governance notes

### Phase 5 - Responsible AI and Azure Readiness

- add model card
- add responsible AI assessment
- add DPIA-style notes
- add Azure ML pipeline and endpoint documentation
- add CI/test guidance

### Phase 6 - Verification

- run backend syntax checks/tests where possible
- run frontend build/checks where dependencies are available
- verify documentation is complete enough to explain at interview

## Acceptance Criteria

- A reviewer can understand the public-sector AI use case from the README.
- A developer can generate data, train a model, run the API, and open the dashboard.
- The API can return a priority prediction with confidence and explanation.
- The project clearly addresses Responsible AI, fairness, explainability, GDPR, and human oversight.
- Azure ML deployment and MLOps concepts are explicit even if the local demo is runnable without Azure credentials.
- The base is clean enough to expand before interview.

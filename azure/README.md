# Azure ML and MLOps Guide

This folder contains Azure-ready assets for Service Priority AI. The project remains runnable locally, but the files here show how the same model lifecycle can move into Azure Machine Learning with reproducible training, model registration, managed serving, batch scoring, Responsible AI review, monitoring, and CI checks.

The examples assume Azure ML CLI v2 and a workspace already exists. Update resource group, workspace, compute, and model versions for your Azure subscription.

## Current Azure ML Status

As of 2026-06-14, the Azure ML path is deployed in:

- Resource group: `rg-service-priority-ai-demo`
- Workspace: `mlw-service-priority-ai-v2`
- Registered model: `service-priority-ai:1`
- Online endpoint: `ep-service-priority-ai`, deployment `blue`, traffic `blue=100`
- Batch endpoint: `be-service-priority-ai`, deployment `default`, compute `cpu-cluster`
- Browser API wrapper: Azure Functions app `func-service-priority-ai-api`, HTTPS-only enabled
- Public frontend: Azure Storage static website `stspaisite154550` in `rg-service-priority-ai-demo`, deployed from the Vite `dist` output and configured with `VITE_API_BASE=https://func-service-priority-ai-api.azurewebsites.net`
- Static Web Apps resource: `service-priority-ai-site` in `rg-essex-mlops-demo`; keep for follow-up investigation because it accepted successful deployments but served Azure 404 content on 2026-06-14.
- Monthly subscription budget: `service-priority-ai-monthly-10`, amount `10`, email alerts at 80% and 100%

The serving environment is `service-priority-serving:2`; it includes `azureml-inference-server-http` and pins pandas, NumPy, scikit-learn, and joblib to the local model-training versions. The batch environment is `service-priority-batch:2` with the same model-compatible pins.

## Website Hosting Path

For a public website demo, use Azure App Service for the FastAPI backend and Azure Static Web Apps for the React frontend. See `azure/web-app-deployment.md`. The Azure ML managed online endpoint is now available for model scoring, but the React app should still call a governed API wrapper rather than exposing direct Azure ML endpoint auth in the browser.

In this subscription, Linux App Service plan creation in UK South returned a VM quota limit of zero. The working browser API path therefore uses Azure Functions Flex Consumption with `function_app.py` wrapping the existing FastAPI app.

## Target Azure Architecture

- Source control: GitHub repository with pull request checks in `.github/workflows/ci.yml`.
- Training orchestration: Azure ML pipeline job defined in `azure/ml-pipeline.yml`.
- Environments: reusable Azure ML environment assets in `azure/environments/`.
- Compute: CPU cluster for training/evaluation, small managed online endpoint instance for real-time scoring, and separate batch scoring compute for scheduled workloads.
- Model registry: Azure ML workspace model registry with versioned model assets, tags, metrics, and model-card metadata.
- Serving: managed online endpoint using `azure/score_online.py` and batch endpoint using `ml/batch_score.py`.
- Secrets: GitHub OIDC or service principal for CI, Azure Key Vault for runtime secrets, and managed identity for workspace resources.
- Monitoring: prediction logs, endpoint metrics, drift checks, fairness summaries, and model performance reports.

## Environment Setup

Install the Azure CLI and Azure ML extension:

```bash
az extension add --name ml
az extension update --name ml
az login
az account set --subscription "<subscription-id>"
```

Set common variables locally or in CI:

```bash
export AZURE_RESOURCE_GROUP="rg-service-priority-ai"
export AZURE_ML_WORKSPACE="mlw-service-priority-ai"
export AZURE_LOCATION="uksouth"
export AZURE_ML_COMPUTE="cpu-cluster"
export AZURE_ML_EXPERIMENT="service-priority-ai"
```

Scripted deployment path:

```bash
bash azure/deploy-azureml.sh
```

After model review and registration, create endpoints with:

```bash
bash azure/deploy-endpoints.sh
```

Run all local validation checks with:

```bash
bash azure/local-validation.sh
```

See `azure/azure-deployment-boundary.md` for the exact local/cloud boundary.

Recommended Azure resources:

- Azure Machine Learning workspace with system-assigned managed identity.
- Azure Storage Account attached as the default workspace datastore.
- Azure Container Registry attached to the workspace.
- Azure Key Vault attached to the workspace.
- Application Insights or Azure Monitor workspace for endpoint telemetry.

## Create Azure ML Environments

Create the reusable environments before submitting jobs or deployments:

```bash
az ml environment create \
  --file azure/environments/training.yml \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE"

az ml environment create \
  --file azure/environments/serving.yml \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE"

az ml environment create \
  --file azure/environments/batch.yml \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE"
```

## Training Pipeline

`azure/ml-pipeline.yml` is a CLI v2 pipeline job. It separates the lifecycle into clear steps:

- Generate synthetic service request data.
- Train a scikit-learn model using text, categorical, and numeric features.
- Evaluate accuracy, macro F1, high-priority recall, fairness slices, and deployment gates.
- Produce model outputs, evaluation JSON, gate summary, model-card metadata, and registry candidate assets.

The pipeline calls the existing `ml/generate_data.py`, `ml/train_model.py`, and `ml/evaluate_model.py` scripts, then packages their joblib artifacts as an Azure ML custom model candidate.

Submit the pipeline:

```bash
az ml job create \
  --file azure/ml-pipeline.yml \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE" \
  --set settings.default_compute="azureml:$AZURE_ML_COMPUTE"
```

After the job completes, inspect metrics and outputs in Azure ML Studio before registration. For a public-sector decision-support model, do not promote a model based only on aggregate accuracy; review class balance, high-priority recall, fairness slices, and explanation quality.

## Model Registry

Register a model only after the evaluation report and model card have been reviewed:

```bash
az ml model create \
  --name service-priority-ai \
  --type custom_model \
  --path "azureml://jobs/<job-name>/outputs/artifacts/paths/trained_model" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE" \
  --tags \
      project=service-priority-ai \
      use_case=service-request-prioritisation \
      data=synthetic \
      human_review_required=true \
      responsible_ai_review=pending
```

Registry expectations:

- Use semantic tags for `data_version`, `training_code_commit`, `evaluation_status`, `fairness_review`, and `model_card_path`.
- Keep every candidate version. Promote by deployment label or endpoint traffic rules rather than overwriting models.
- Store evaluation artifacts with the model version so reviewers can reconstruct the decision to deploy.
- Treat model registration as a governance checkpoint, not just a packaging step.

## Managed Online Endpoint

Use a managed online endpoint for interactive dashboard predictions. The endpoint returns priority, confidence, class probabilities, explanation factors, model version, and whether human review is required.

Endpoint creation outline:

```bash
az ml online-endpoint create \
  --file azure/online-endpoint.yml \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE"

az ml online-deployment create \
  --file azure/online-deployment.yml \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE"

az ml online-endpoint update \
  --name ep-service-priority-ai \
  --traffic "blue=100" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE"
```

Smoke test:

```bash
az ml online-endpoint invoke \
  --name ep-service-priority-ai \
  --request-file azure/samples/online-request.json \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE"
```

Deployment controls:

- Use Azure AD authentication for internal/test environments.
- Restrict network access where feasible.
- Enable request/response logging only for fields approved by the DPIA-style review.
- Never log raw free-text urgency notes unless they are synthetic or properly redacted.
- Add safe rollout rules before replacing a live deployment: shadow traffic, small traffic percentage, rollback command, and review gates.

More detail is in `azure/endpoint-deployment.md`.

## Batch Scoring Outline

Batch scoring is useful for scheduled review queues, monitoring backfills, and retrospective evaluation.

Recommended flow:

1. Register a batch input data asset such as a folder of request records in CSV or Parquet.
2. Create a batch endpoint named `be-service-priority-ai`.
3. Deploy a batch scoring component that loads the registered model and writes predictions with confidence and explanation fields.
4. Schedule batch invocations for synthetic demo data or approved operational extracts.
5. Store outputs in a governed datastore path partitioned by run date and model version.
6. Feed labelled outcomes back into evaluation and monitoring once human review labels exist.

Example invocation shape:

```bash
az ml batch-endpoint invoke \
  --name "be-service-priority-ai" \
  --input "azureml:synthetic-service-requests@latest" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE"
```

Endpoint creation:

```bash
az ml batch-endpoint create \
  --file azure/batch-endpoint.yml \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE"

az ml batch-deployment create \
  --file azure/batch-deployment.yml \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE"
```

## Responsible AI Dashboard

Prepare dashboard input files:

```bash
python ml/prepare_responsible_ai_inputs.py
```

Then follow `azure/responsible-ai/README.md` to create Azure ML Responsible AI dashboard assets for model performance, fairness cohorts, error analysis, and interpretability. Export the scorecard PDF and keep it with the model review package.

## Secrets and Identity

Use GitHub Actions secrets or environment variables only for CI bootstrap values:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_RESOURCE_GROUP`
- `AZURE_ML_WORKSPACE`

Prefer GitHub OpenID Connect federation over storing a client secret. If a client secret is unavoidable for a short-lived demo, store it as `AZURE_CLIENT_SECRET`, rotate it after use, and do not commit it.

Runtime secrets should live in Azure Key Vault and be accessed through managed identity. The model scoring service should not require database credentials for the first demo; if later added, read them from Key Vault and log only secret names, never values.

## Monitoring and Responsible AI

Minimum monitoring checks:

- Operational: endpoint availability, latency, error rate, request volume, CPU/memory pressure, and deployment restarts.
- Data drift: categorical distribution shifts, numeric feature ranges, text length and vocabulary drift, missing values, and postcode deprivation band distribution.
- Model quality: validation accuracy, macro F1, high-priority recall, calibration, and confusion matrix.
- Fairness: priority distribution and error rates across synthetic vulnerability flag, service type, and deprivation band.
- Explainability: top factors for each prediction and aggregate explanation stability across model versions.
- Governance: model card, review date, reviewer, approved use, limitations, and rollback plan.

For this public-sector scenario, monitoring should be reviewed by a human owner. Drift or fairness alerts should trigger investigation before automated retraining or deployment.

## CI Checks

The starter workflow at `.github/workflows/ci.yml` runs on pushes and pull requests. It checks:

- YAML syntax for Azure and GitHub workflow files.
- Required Azure MLOps documentation topics.
- Placeholder script paths referenced by `azure/ml-pipeline.yml`.
- Optional Python syntax and tests when backend/ML files are added.

The workflow does not deploy to Azure by default. Deployment should be a separate protected workflow or environment requiring reviewer approval.

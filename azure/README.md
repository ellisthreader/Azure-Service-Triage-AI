# Azure ML and MLOps Starter Guide

This folder documents an Azure-ready path for the Azure Council case-prioritisation demo. The project remains runnable locally, but the structure below shows how the same model lifecycle can move into Azure Machine Learning with reproducible training, model registration, managed serving, batch scoring, monitoring, and CI checks.

The examples assume Azure ML CLI v2 and a workspace already exists. They are intentionally starter templates: update names, compute sizes, storage paths, and script paths once the `ml/` and `backend/` implementation lands.

## Target Azure Architecture

- Source control: GitHub repository with pull request checks in `.github/workflows/ci.yml`.
- Training orchestration: Azure ML pipeline job defined in `azure/ml-pipeline.yml`.
- Compute: CPU cluster for training/evaluation, small managed online endpoint instance for real-time scoring, and separate batch scoring compute for scheduled workloads.
- Model registry: Azure ML workspace model registry with versioned model assets, tags, metrics, and model-card metadata.
- Serving: Managed online endpoint for FastAPI-compatible real-time scoring and batch endpoint for offline case scoring.
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
export AZURE_RESOURCE_GROUP="rg-azure-council-ml"
export AZURE_ML_WORKSPACE="mlw-azure-council"
export AZURE_LOCATION="uksouth"
export AZURE_ML_COMPUTE="cpu-cluster"
export AZURE_ML_EXPERIMENT="case-priority-training"
```

Recommended Azure resources:

- Azure Machine Learning workspace with system-assigned managed identity.
- Azure Storage Account attached as the default workspace datastore.
- Azure Container Registry attached to the workspace.
- Azure Key Vault attached to the workspace.
- Application Insights or Azure Monitor workspace for endpoint telemetry.

## Training Pipeline

`azure/ml-pipeline.yml` is a CLI v2 pipeline-job starter. It separates the lifecycle into clear steps:

- Generate synthetic council case data.
- Train a scikit-learn model using text, categorical, and numeric features.
- Evaluate accuracy, macro F1, class-level metrics, fairness slices, and calibration.
- Produce model outputs, evaluation JSON, model-card metadata, and deployment candidate assets.

The current starter calls the existing `ml/generate_data.py` and `ml/train_model.py` scripts, then packages their joblib artifacts as an Azure ML custom model. As the project matures, the inline evaluation and registry-preparation commands can move into dedicated scripts.

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
  --name azure-council-case-priority \
  --type custom_model \
  --path "azureml://jobs/<job-name>/outputs/artifacts/paths/trained_model" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE" \
  --tags \
      project=azure-council \
      use_case=case-prioritisation \
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

Use a managed online endpoint for interactive dashboard predictions. The endpoint should return priority, confidence, and explanation factors; the frontend should still state that a human officer makes the final decision.

Suggested files once serving code exists:

```text
azure/online-endpoint.yml
azure/online-deployment.yml
backend/score.py
backend/requirements-serving.txt
```

Endpoint creation outline:

```bash
az ml online-endpoint create \
  --name "ep-azure-council-priority" \
  --auth-mode aad_token \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE"

az ml online-deployment create \
  --name "blue" \
  --endpoint-name "ep-azure-council-priority" \
  --model "azure-council-case-priority:<version>" \
  --instance-type "Standard_DS3_v2" \
  --instance-count 1 \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE"

az ml online-endpoint update \
  --name "ep-azure-council-priority" \
  --traffic "blue=100" \
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

1. Register a batch input data asset such as a folder of case records in CSV or Parquet.
2. Create a batch endpoint named `be-azure-council-priority`.
3. Deploy a batch scoring component that loads the registered model and writes predictions with confidence and explanation fields.
4. Schedule batch invocations for synthetic demo data or approved operational extracts.
5. Store outputs in a governed datastore path partitioned by run date and model version.
6. Feed labelled outcomes back into evaluation and monitoring once human review labels exist.

Example invocation shape:

```bash
az ml batch-endpoint invoke \
  --name "be-azure-council-priority" \
  --input "azureml:synthetic-council-cases@latest" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE"
```

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

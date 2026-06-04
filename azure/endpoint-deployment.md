# Azure Endpoint Deployment Notes

This guide describes how to promote the Azure Council case-prioritisation model from a reviewed model registry candidate to managed online and batch endpoints. It is a deployment outline, not a promise that the current scaffold can already deploy.

## Deployment Prerequisites

- Azure ML workspace, resource group, storage account, container registry, and key vault.
- Azure ML CLI v2 installed and authenticated.
- A registered model named `azure-council-case-priority`.
- A scoring script that accepts the same schema as the FastAPI `/predict` endpoint.
- An inference environment with pinned Python and package dependencies.
- A reviewed model card, evaluation report, fairness summary, and rollback plan.

## Online Endpoint Contract

The managed online endpoint should preserve the local API behaviour:

- Input: one council case with service type, case age, previous contacts, vulnerability flag, deprivation band, and urgency notes.
- Output: `priority`, `confidence`, `explanation_factors`, `model_version`, and `human_review_required`.
- Failure behaviour: return clear validation errors for malformed input and avoid leaking stack traces or raw request text in logs.
- Governance wording: consumers must understand the model supports human review and must not be used for automatic denial of service.

Example request payload:

```json
{
  "service_type": "housing_repair",
  "case_age_days": 12,
  "previous_contacts": 3,
  "vulnerability_flag": true,
  "postcode_deprivation_band": "high",
  "urgency_notes": "Tenant reports damp near electrical fittings and worsening symptoms."
}
```

Example response payload:

```json
{
  "priority": "high",
  "confidence": 0.82,
  "explanation_factors": [
    "vulnerability flag present",
    "high deprivation band",
    "urgent safety terms in notes"
  ],
  "model_version": "azure-council-case-priority:3",
  "human_review_required": true
}
```

## Managed Online Endpoint YAML Shape

Create `azure/online-endpoint.yml` when deployment is ready:

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/managedOnlineEndpoint.schema.json
name: ep-azure-council-priority
auth_mode: aad_token
description: Real-time council case-priority recommendations for human review.
tags:
  project: azure-council
  data: synthetic
  human_review_required: "true"
```

Create `azure/online-deployment.yml` when scoring code is available:

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/managedOnlineDeployment.schema.json
name: blue
endpoint_name: ep-azure-council-priority
model: azureml:azure-council-case-priority:1
code_configuration:
  code: ../backend
  scoring_script: score.py
environment:
  image: mcr.microsoft.com/azureml/openmpi4.1.0-ubuntu22.04:latest
  conda_file:
    channels:
      - conda-forge
    dependencies:
      - python=3.11
      - pip
      - pip:
          - fastapi>=0.111,<1
          - pydantic>=2.7,<3
          - scikit-learn>=1.4,<2
          - pandas>=2.2,<3
          - numpy>=1.26,<3
          - joblib>=1.3,<2
          - mlflow>=2.12,<3
instance_type: Standard_DS3_v2
instance_count: 1
request_settings:
  request_timeout_ms: 5000
  max_concurrent_requests_per_instance: 4
liveness_probe:
  initial_delay: 30
  period: 10
readiness_probe:
  initial_delay: 30
  period: 10
tags:
  project: azure-council
  deployment_stage: demo
```

Deployment commands:

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
  --name ep-azure-council-priority \
  --traffic blue=100 \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE"
```

Smoke test:

```bash
az ml online-endpoint invoke \
  --name ep-azure-council-priority \
  --request-file sample-request.json \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE"
```

## Safe Rollout

Use blue/green deployment names such as `blue` and `green`.

Recommended promotion gates:

- Registered model has a model card and evaluation report.
- High-priority recall meets the agreed floor.
- Fairness warning gaps are reviewed and documented.
- Endpoint smoke test passes with schema-compatible inputs.
- Logs do not include raw urgency notes or avoidable personal data.
- Rollback command has been tested.

Traffic rollout:

```bash
az ml online-deployment create --file azure/online-deployment-green.yml
az ml online-endpoint update --name ep-azure-council-priority --traffic blue=90 green=10
az ml online-endpoint update --name ep-azure-council-priority --traffic blue=0 green=100
```

Rollback:

```bash
az ml online-endpoint update \
  --name ep-azure-council-priority \
  --traffic blue=100 green=0 \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE"
```

## Batch Scoring Deployment Shape

Batch scoring should use a separate endpoint so long-running offline predictions do not compete with dashboard traffic.

Create `azure/batch-endpoint.yml` when ready:

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/batchEndpoint.schema.json
name: be-azure-council-priority
description: Offline council case-priority scoring for scheduled review queues.
auth_mode: aad_token
tags:
  project: azure-council
  workload: batch-scoring
```

Create `azure/batch-deployment.yml` when scoring code is available:

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/modelBatchDeployment.schema.json
name: default
endpoint_name: be-azure-council-priority
model: azureml:azure-council-case-priority:1
code_configuration:
  code: ../ml
  scoring_script: batch_score.py
environment:
  image: mcr.microsoft.com/azureml/openmpi4.1.0-ubuntu22.04:latest
  conda_file:
    channels:
      - conda-forge
    dependencies:
      - python=3.11
      - pip
      - pip:
          - pandas>=2.2,<3
          - numpy>=1.26,<3
          - scikit-learn>=1.4,<2
          - joblib>=1.3,<2
          - mlflow>=2.12,<3
compute: azureml:cpu-cluster
resources:
  instance_count: 1
max_concurrency_per_instance: 2
mini_batch_size: 100
output_action: append_row
retry_settings:
  max_retries: 3
  timeout: 300
logging_level: info
```

Batch output should include the source case identifier, prediction, confidence, explanation factors, model version, scoring timestamp, and a clear marker that the data is synthetic for the demo.

## Environment Strategy

Use three environments as the project matures:

- Training environment: pandas, numpy, scikit-learn, MLflow, evaluation/reporting libraries.
- Serving environment: smallest possible set needed for scoring and schema validation.
- CI environment: linting, YAML parsing, test dependencies, and optional Azure CLI validation.

Pin dependency ranges and publish Azure ML environments by version. Avoid using `latest` for production deployments even though it is acceptable in these starter examples.

## Security Notes

- Use Azure AD endpoint auth for internal demos and managed identity for Azure resource access.
- Prefer GitHub OIDC federation over long-lived service principal secrets.
- Keep free-text notes out of logs unless using explicitly synthetic data.
- Apply private networking and managed identity before using non-synthetic data.
- Document DPIA-style considerations before any real council data is introduced.

## Operational Monitoring

Track these fields for every online or batch scoring run:

- Model name and version.
- Request or batch run identifier.
- Prediction and confidence.
- Explanation factors.
- Input feature summary with redaction for free text.
- Latency, status code, and errors.
- Human override outcome once available.

Review dashboards should show model quality and fairness alongside operational metrics so the project demonstrates responsible MLOps, not only deployment mechanics.


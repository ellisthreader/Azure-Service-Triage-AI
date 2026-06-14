# Azure Endpoint Deployment Notes

This guide describes how to promote the Service Priority AI model from a reviewed model registry candidate to managed online and batch endpoints.

## Deployment Prerequisites

- Azure ML workspace, resource group, storage account, container registry, and key vault.
- Azure ML CLI v2 installed and authenticated.
- A registered model named `service-priority-ai`.
- The online scoring script at `azure/score_online.py`.
- The batch scoring script at `ml/batch_score.py`.
- An inference environment with pinned Python and package dependencies.
- A reviewed model card, evaluation report, fairness summary, and rollback plan.

## Online Endpoint Contract

The managed online endpoint should preserve the local API behaviour:

- Input: one service request with service type, age, previous contacts, vulnerability flag, area risk band, channel, and urgency notes.
- Output: `priority`, `confidence`, `explanation_factors`, `model_version`, and `human_review_required`.
- Failure behaviour: return clear validation errors for malformed input and avoid leaking stack traces or raw request text in logs.
- Governance wording: consumers must understand the model supports human review and must not be used for automatic denial of service.

Example request payload:

```json
{
  "service_type": "housing",
  "days_open": 12,
  "previous_contacts": 3,
  "vulnerability_flag": true,
  "deprivation_band": "high",
  "channel": "phone",
  "urgency_text": "Customer reports no heating and worsening health symptoms."
}
```

Example response payload:

```json
{
  "priority": "high",
  "confidence": 0.82,
  "main_reasons": [
    {
      "factor": "Vulnerability flag",
      "impact": "Raises priority because extra care is needed."
    }
  ],
  "model_version": "0.1.0",
  "human_review_required": true
}
```

## Managed Online Endpoint YAML Shape

The deployable YAML files now exist:

- `azure/online-endpoint.yml`
- `azure/online-deployment.yml`
- `azure/samples/online-request.json`

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
  --name ep-service-priority-ai \
  --traffic blue=100 \
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
az ml online-endpoint update --name ep-service-priority-ai --traffic blue=90 green=10
az ml online-endpoint update --name ep-service-priority-ai --traffic blue=90 green=10
az ml online-endpoint update --name ep-service-priority-ai --traffic blue=0 green=100
```

Rollback:

```bash
az ml online-endpoint update \
  --name ep-service-priority-ai \
  --traffic blue=100 green=0 \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE"
```

## Batch Scoring Deployment Shape

Batch scoring should use a separate endpoint so long-running offline predictions do not compete with dashboard traffic.

The deployable batch YAML files now exist:

- `azure/batch-endpoint.yml`
- `azure/batch-deployment.yml`
- `azure/samples/batch-input.csv`

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

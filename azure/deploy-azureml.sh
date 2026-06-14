#!/usr/bin/env bash
set -euo pipefail

required_vars=(
  AZURE_RESOURCE_GROUP
  AZURE_ML_WORKSPACE
  AZURE_ML_COMPUTE
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing required environment variable: ${var_name}" >&2
    exit 1
  fi
done

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI is not installed. Install Azure CLI and the ml extension first." >&2
  exit 1
fi

az extension add --name ml --upgrade

echo "Creating Azure ML environments..."
az ml environment create --file azure/environments/training.yml --resource-group "$AZURE_RESOURCE_GROUP" --workspace-name "$AZURE_ML_WORKSPACE"
az ml environment create --file azure/environments/serving.yml --resource-group "$AZURE_RESOURCE_GROUP" --workspace-name "$AZURE_ML_WORKSPACE"
az ml environment create --file azure/environments/batch.yml --resource-group "$AZURE_RESOURCE_GROUP" --workspace-name "$AZURE_ML_WORKSPACE"

echo "Submitting training pipeline..."
job_name=$(az ml job create \
  --file azure/ml-pipeline.yml \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_ML_WORKSPACE" \
  --set settings.default_compute="azureml:$AZURE_ML_COMPUTE" \
  --query name \
  --output tsv)

echo "Pipeline submitted: ${job_name}"
echo "Review outputs in Azure ML Studio, then register the model:"
echo "az ml model create --name service-priority-ai --type custom_model --path azureml://jobs/${job_name}/outputs/artifacts/paths/trained_model --resource-group \"$AZURE_RESOURCE_GROUP\" --workspace-name \"$AZURE_ML_WORKSPACE\" --tags project=service-priority-ai data=synthetic human_review_required=true responsible_ai_review=pending"

#!/usr/bin/env bash
set -euo pipefail

required_vars=(
  AZURE_RESOURCE_GROUP
  AZURE_ML_WORKSPACE
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

echo "Creating managed online endpoint and blue deployment..."
az ml online-endpoint create --file azure/online-endpoint.yml --resource-group "$AZURE_RESOURCE_GROUP" --workspace-name "$AZURE_ML_WORKSPACE"
az ml online-deployment create --file azure/online-deployment.yml --resource-group "$AZURE_RESOURCE_GROUP" --workspace-name "$AZURE_ML_WORKSPACE"
az ml online-endpoint update --name ep-service-priority-ai --traffic "blue=100" --resource-group "$AZURE_RESOURCE_GROUP" --workspace-name "$AZURE_ML_WORKSPACE"

echo "Creating batch endpoint and default deployment..."
az ml batch-endpoint create --file azure/batch-endpoint.yml --resource-group "$AZURE_RESOURCE_GROUP" --workspace-name "$AZURE_ML_WORKSPACE"
az ml batch-deployment create --file azure/batch-deployment.yml --resource-group "$AZURE_RESOURCE_GROUP" --workspace-name "$AZURE_ML_WORKSPACE"

echo "Smoke-test the online endpoint with:"
echo "az ml online-endpoint invoke --name ep-service-priority-ai --request-file azure/samples/online-request.json --resource-group \"$AZURE_RESOURCE_GROUP\" --workspace-name \"$AZURE_ML_WORKSPACE\""

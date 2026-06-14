# Azure Deployment Boundary

The project includes the code and configuration needed for an Azure ML deployment path, but this local workspace cannot complete final cloud deployment without:

- Azure CLI installed.
- Azure ML CLI extension installed.
- Authenticated Azure account.
- Azure subscription access.
- Azure ML workspace.
- Compute cluster named by `AZURE_ML_COMPUTE`.
- Permission to create endpoints, deployments, environments, and model assets.

## Implemented Locally

- Training and evaluation scripts.
- SHAP summary generation.
- FastAPI prediction service.
- React dashboard.
- Azure ML pipeline YAML.
- Azure ML environment YAML.
- Managed online endpoint and deployment YAML.
- Batch endpoint and deployment YAML.
- Azure ML online scoring script.
- Azure ML batch scoring script.
- Responsible AI dashboard input export.
- Power BI-ready monitoring exports.

## Requires Cloud Access

- Submitting `azure/ml-pipeline.yml` to Azure ML.
- Registering the trained model in the Azure ML model registry.
- Creating managed online and batch endpoints.
- Generating an Azure ML Responsible AI dashboard and scorecard inside the workspace.
- Publishing a Power BI report to a Power BI workspace.
- Connecting Application Insights or Azure Monitor to live endpoint telemetry.

## Command Order

```bash
export AZURE_RESOURCE_GROUP="rg-service-priority-ai"
export AZURE_ML_WORKSPACE="mlw-service-priority-ai"
export AZURE_ML_COMPUTE="cpu-cluster"

bash azure/deploy-azureml.sh
```

After model review and registration:

```bash
bash azure/deploy-endpoints.sh
```

Run local validation:

```bash
bash azure/local-validation.sh
```

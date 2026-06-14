# Azure Website Deployment

This path uses Azure web hosting for the user-facing app/API layer. The Azure ML managed online endpoint is available for model scoring, but the browser-facing React app should call a governed FastAPI wrapper rather than handling Azure ML endpoint auth directly.

## Working Backend: FastAPI on Azure Functions

The deployed browser API currently uses Azure Functions Flex Consumption because Linux App Service plan creation was blocked by subscription VM quota in UK South.

- Resource group: `rg-service-priority-ai-demo`
- App name: `func-service-priority-ai-api`
- Runtime: Python 3.12
- Region: UK South
- Public base URL: `https://func-service-priority-ai-api.azurewebsites.net`
- HTTPS-only: enabled

The Function App uses `function_app.py` to expose `backend.app.main:app` as an ASGI app. The deployment package should include:

- `function_app.py`
- `host.json`
- `backend/`
- `ml/artifacts/`
- a slim runtime `requirements.txt` with `azure-functions`, `azure-data-tables`, FastAPI, pandas, NumPy, scikit-learn, joblib, and Pydantic

## Durable audit and feedback loop

The Function App records officer decisions and ad-hoc prediction audit events through `backend/app/audit_store.py`.

- In Azure, the API uses the Function App storage account via `AzureWebJobsStorage` and writes to Azure Table Storage.
- Locally, or if Table Storage cannot be reached, the API falls back to an in-memory store so development still works.
- The default table name is `ServicePriorityAudit`; set `AUDIT_TABLE_NAME` if a different table is needed.
- The dashboard reads `/audit/summary` and shows whether durable audit storage is active.

Useful checks:

```text
https://func-service-priority-ai-api.azurewebsites.net/audit/summary
https://func-service-priority-ai-api.azurewebsites.net/audit/decisions
https://func-service-priority-ai-api.azurewebsites.net/monitoring/feedback-report
https://func-service-priority-ai-api.azurewebsites.net/monitoring/drift-report
```

This is still synthetic portfolio telemetry, but the pattern is production-shaped: predictions, human decisions, overrides, model version, confidence, and review metadata are separated from the browser and persisted server-side.

After deployment, check:

```text
https://func-service-priority-ai-api.azurewebsites.net/health
```

Expected result:

```json
{"status":"ok","model_loaded":true,"model_version":"0.1.0"}
```

## Alternate Backend: FastAPI on Azure App Service

If App Service quota is approved later, create a Linux Python App Service in the same resource group, for example:

- App name: `app-service-priority-ai-api`
- Runtime: Python 3.12 or Python 3.11
- Region: UK South
- Plan: Free/Basic if available for your subscription

Deploy this repository to the App Service. Set the startup command to:

```bash
bash azure/startup-appservice.sh
```

Then check:

```text
https://app-service-priority-ai-api.azurewebsites.net/health
```

Expected result:

```json
{"status":"ok","model_loaded":true,"model_version":"0.1.0"}
```

## Frontend: React on Azure Static Web Apps

The deployed React frontend uses Azure Static Web Apps:

- Resource group: `rg-essex-mlops-demo`
- App name: `service-priority-ai-site`
- Branch: `main`
- Public URL: `https://blue-plant-0b724eb03.7.azurestaticapps.net`

As of 2026-06-14, the verified working public frontend is hosted with Azure Storage static website hosting while the Static Web App resource is investigated:

- Resource group: `rg-service-priority-ai-demo`
- Storage account: `stspaisite154550`
- Public URL: `https://stspaisite154550.z33.web.core.windows.net/`
- Dashboard URL: `https://stspaisite154550.z33.web.core.windows.net/#/dashboard`

Recommended build settings:

- App location: `frontend`
- Output location: `dist`
- Build command: `npm run build`
- API location: leave blank

Set this Static Web Apps app setting and pass the same value into the GitHub Actions build environment. Vite reads `VITE_*` values at build time, so changing the Azure app setting without rebuilding can leave an old API URL in the deployed JavaScript bundle.

```text
VITE_API_BASE=https://func-service-priority-ai-api.azurewebsites.net
```

Azure CLI:

```bash
az staticwebapp appsettings set \
  --name service-priority-ai-site \
  --resource-group rg-essex-mlops-demo \
  --setting-names VITE_API_BASE=https://func-service-priority-ai-api.azurewebsites.net
```

The file `frontend/staticwebapp.config.json` keeps React routes working after refresh.

## Monitoring

The Function App has an `APPLICATIONINSIGHTS_CONNECTION_STRING` app setting. Use Application Insights and Azure Monitor to show API requests, failures, response times, and availability checks for `https://func-service-priority-ai-api.azurewebsites.net/health`.

For an interview or production readiness review, pair the platform telemetry with the application telemetry:

- `/metrics/summary` for model and operational summary metrics.
- `/audit/summary` for durable audit status and record counts.
- `/monitoring/feedback-report` for officer override and labelled-outcome signals.
- `/monitoring/drift-report` for a synthetic service-mix drift comparison against the demo queue baseline.

Hardening still required before real resident data: APIM or equivalent gateway controls, Entra-authenticated staff access, Key Vault-managed secrets, retention policy, DPIA approval, and service-owner monitoring thresholds.

## Cost control

Keep App Service and Static Web Apps on free/low-cost tiers while this is a portfolio demo. For Azure ML, keep `cpu-cluster` at `min_instances=0`, and delete unused failed endpoints in older workspaces once they are no longer needed for comparison.

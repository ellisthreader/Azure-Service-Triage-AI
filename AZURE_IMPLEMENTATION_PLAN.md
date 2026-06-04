# Azure Implementation Plan

## Goal

Move Service Priority AI from a local portfolio demo toward a credible Azure ML implementation while keeping it simple enough to explain and run locally.

The project should demonstrate:

- Azure Machine Learning pipeline jobs for reproducible training and evaluation.
- Azure ML model registry discipline with metadata, tags, and governance gates.
- Managed online endpoint assets for real-time scoring.
- Batch endpoint assets for scheduled/offline scoring.
- Responsible AI dashboard preparation and scorecard documentation.
- Monitoring outputs that can feed Azure Monitor, Application Insights, or Power BI.

## Constraints

- No Azure subscription credentials are assumed in the local workspace.
- Local development must continue to work without Azure.
- Azure files should be CLI v2 starter assets that can be adapted with real workspace names, model versions, and compute targets.
- The frontend should stay simple; the Azure work should live mainly in `azure/`, `ml/`, and backend scoring entrypoints.

## Implementation Review

The existing project already has a trained local scikit-learn model, FastAPI endpoint, React frontend, monitoring summary endpoint, and documentation. The missing Azure pieces are deployable YAML assets, scoring scripts compatible with Azure ML endpoints, batch scoring code, stronger evaluation artifacts, and clearer commands for model registration and deployment.

## Work Items

1. Add Azure environment definitions:
   - training environment
   - serving environment
   - batch scoring environment

2. Add managed online endpoint files:
   - endpoint YAML
   - blue deployment YAML
   - sample request JSON
   - Azure ML scoring script

3. Add batch endpoint files:
   - endpoint YAML
   - deployment YAML
   - batch scoring script
   - sample batch input

4. Improve model evaluation:
   - local/Azure-compatible evaluation script
   - gate summary
   - fairness slice metrics
   - model registry tag metadata

5. Add Responsible AI preparation:
   - train/test export script for dashboard work
   - Responsible AI runbook
   - scorecard expectations

6. Update CI:
   - validate all Azure YAML files
   - install project requirements before tests
   - run Python syntax checks and tests

7. Update documentation:
   - make the Azure deployment path explicit
   - keep commands copy/paste friendly
   - clearly state what is implemented locally vs what requires Azure credentials

## Acceptance Criteria

- Local tests pass.
- Frontend build passes.
- Azure YAML files parse successfully.
- Online scoring script can be exercised locally against the trained model artifact.
- Batch scoring script can score a sample CSV locally.
- README and Azure docs explain how to submit the pipeline, register the model, deploy online, deploy batch, and prepare Responsible AI dashboard inputs.

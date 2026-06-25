# Essex AI / ML Engineer Presentation Speaker Notes

Target: 8 slides in 10 minutes. The updated deck uses screenshots captured from the currently running local website on 2026-06-22.

## 1. Responsible Azure MLOps
Open by setting the boundary clearly: this is a real cloud-oriented deployment pattern using synthetic public-sector data. The model is advisory and supports human review. The point is safe delivery: reproducibility, governed serving, monitoring, audit, and responsible AI documentation.

## 2. Context And My Role
Explain the operational problem: urgent service requests can sit inside mixed queues, and managers need evidence of how decisions are being supported. State your contribution directly: model lifecycle, API boundary, Azure deployment assets, monitoring outputs, and governance documentation.

## 3. Data And Real-World Limitations
Mention 20,000 training rows and 5,000 validation rows. Then focus on the data risks: synthetic data does not prove live performance, vulnerability fields can be incomplete, deprivation bands can be proxy-risk fields, and free text can encode access and language bias. Your mitigation is governance and human review, not pretending the data is perfect.

## 4. Model And Evaluation
Describe the transparent baseline: a scikit-learn LogisticRegression pipeline over structured and TF-IDF text features. Call out the metrics: 90.2% accuracy, 90.35% macro F1, and 94.08% high-priority recall. Explain that high-priority recall matters because missed urgent cases are a higher service risk.

## 5. Azure Architecture And Service Choices
Walk left to right. Azure ML handles training, environments, registry, online endpoint, and batch endpoint. The browser calls a FastAPI wrapper rather than Azure ML directly. The wrapper centralises validation, logging, audit, and auth boundaries. Batch scoring supports review queues and monitoring backfills.

## 6. Production Safety Controls
Tie this slide to the job description. Engineering controls provide repeatability. Governance controls provide explainability, auditability, and UK GDPR-aware delivery. Operational controls make the system supportable: audit store, Azure Monitor/Application Insights, rollback, small compute, scale-to-zero, and budget alerts.

## 7. Monitoring, Incident And Learning
Start with what you monitor: health, latency, errors, class mix, confidence, drift, fairness, explanation coverage, audit completeness, and overrides. Then describe the rollout issue: UK South Linux App Service quota blocked App Service plan creation. Mitigation was Azure Functions Flex Consumption for the browser API wrapper while keeping Azure ML behind a governed layer.

## 8. What I Would Bring To ECC
Close by mapping to ECC: Azure ML pipelines, managed online endpoints, batch endpoints, responsible AI, Information Governance, Power BI reporting, and coaching colleagues. Include the LLM disclosure exactly as requested in the interview email.

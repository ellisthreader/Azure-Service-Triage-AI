# DPIA Lite

## Purpose

This is a portfolio-ready, DPIA-style summary for the fictional Azure Council case prioritisation system. It is not a substitute for a formal Data Protection Impact Assessment. A real council deployment would require the council's approved DPIA template, Data Protection Officer review, information governance input, security assessment, and service owner sign-off.

## Processing Summary

**System:** Azure Council case prioritisation system  
**Controller in a real deployment:** The council operating the service  
**Processor in a real deployment:** To be confirmed based on hosting, support, and cloud arrangements  
**Data subjects:** Residents, service users, staff mentioned in case notes, and staff using the system  
**Purpose:** Support human officers by recommending case priority for review  
**Decision status:** Advisory only. Final decision remains with a human officer  
**Data environment in this portfolio:** Synthetic data only

## Why A DPIA Would Be Needed

A real deployment would likely require a DPIA because the system could involve:

- AI-assisted profiling or prioritisation of individuals.
- Potentially vulnerable residents.
- Free-text notes containing sensitive personal data.
- Area-level deprivation information that may act as a proxy for protected characteristics or socioeconomic disadvantage.
- Operational decisions that may affect how quickly a resident receives a service response.
- Systematic monitoring of predictions, outcomes, and staff overrides.

## Nature, Scope, Context, And Purpose

### Nature

The system receives case details through an internal dashboard or API, transforms them into model features, and returns a priority recommendation with confidence and explanation factors. The output is shown to a council officer before action is taken.

### Scope

The portfolio version covers fictional case types including housing repairs, highways, waste services, benefits enquiries, council tax enquiries, and adult social care contacts.

A real deployment should start with a narrow service area and a controlled pilot rather than immediate council-wide use.

### Context

Council services involve residents with different levels of digital access, literacy, language confidence, disability, health needs, financial hardship, and housing insecurity. An apparently simple prioritisation model can affect public trust if it is inaccurate, unfair, or poorly explained.

### Purpose

The purpose is to help officers manage workload consistently and identify cases that may need earlier attention. The purpose is not to reduce service entitlement, replace statutory duties, or automate final decisions.

## Data Categories

| Data category | Example fields | Privacy risk | Notes |
| --- | --- | --- | --- |
| Case metadata | Case ID, creation date, service type | Low to medium | Can become identifying when linked to other records. |
| Resident contact history | Previous contact count, channel | Medium | May reflect persistence, accessibility, or barriers to communication. |
| Location-derived data | Postcode or deprivation band | Medium to high | Can act as a proxy for socioeconomic status or protected characteristics. |
| Vulnerability information | Vulnerability flag or support need | High | May reveal health, disability, age-related need, safeguarding, or social care context. |
| Free-text notes | Urgency notes and officer notes | High | May include special category data, third-party data, allegations, or sensitive circumstances. |
| Prediction records | Priority, confidence, explanation, model version | Medium | Could influence future service treatment if reused without context. |
| Staff actions | Review outcome, override reason, user ID | Medium | Needed for audit but should be proportionate and access-controlled. |

## Lawful Basis And Conditions

For a real deployment, the council would need to confirm:

- Lawful basis under UK GDPR, likely public task where processing is necessary for exercising official authority or public functions.
- Additional condition for special category data if vulnerability or health-related information is processed.
- Whether any criminal offence data could appear in free text and how it would be handled.
- Transparency wording in privacy notices.
- Records of processing activities.
- Data sharing and processor terms for any cloud or supplier arrangement.

This portfolio does not make a legal determination. It identifies the issues a council governance process would need to resolve.

## Automated Decision-Making Assessment

The intended design is human-in-the-loop decision support.

Controls required to avoid de facto solely automated decision-making:

- The dashboard labels the output as a recommendation.
- Officers must review case details before action.
- Officers can override the recommendation.
- Overrides are not discouraged through performance targets.
- Final decision, reviewer, and override reason can be audited where proportionate.
- Staff training explains automation bias and accountability.
- Residents can challenge service outcomes through normal routes.

If a real implementation allowed model outputs to automatically determine service timing, queue position, eligibility, refusal, escalation, or safeguarding outcomes without meaningful human influence, the Article 22 risk profile would change and the DPIA would need full legal review.

## Necessity And Proportionality

### Necessity

The system may be necessary only if the council can evidence a real operational problem such as inconsistent triage, delayed urgent cases, or lack of visibility across service queues. The model should be compared against simpler alternatives, such as rule-based triage, workflow redesign, staffing changes, or improved case management reporting.

### Proportionality

Proportionality controls:

- Start with the minimum features needed.
- Prefer derived bands over raw postcode where possible.
- Avoid storing raw free text in prediction logs unless needed and approved.
- Keep the model advisory.
- Use explanations and override workflows.
- Limit access to predictions and monitoring dashboards.
- Review whether the benefit justifies privacy and fairness risks.

## Risks And Mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Incorrect low priority for urgent case | Medium | High | Monitor `high` recall, require officer review, show low-confidence warnings, audit complaints and overrides. |
| Automation bias by officers | Medium | High | Training, UI wording, mandatory review, easy override, manager review of override patterns. |
| Proxy discrimination through deprivation or text | Medium | High | Fairness testing, feature review, service expert challenge, remove or constrain features if unjustified. |
| Excessive use of sensitive free text | High | High | Minimise logging, redact where possible, restrict access, retention policy, text feature review. |
| Vulnerability flag is incomplete or stale | High | Medium | Treat as one factor only, allow officer correction, monitor missingness and overrides. |
| Lack of resident transparency | Medium | High | Privacy notice updates, plain-English explanation, route to challenge decisions. |
| Model drift after policy or demand change | Medium | Medium | Drift monitoring, retraining governance, model versioning, rollback plan. |
| Data breach through logs or dashboards | Low to medium | High | Role-based access, encryption, secure logging, retention limits, incident response. |
| Reuse for broader decisions without approval | Medium | High | Document out-of-scope uses, access controls, change approval, governance review. |
| Unclear accountability | Medium | High | Named service owner, technical owner, DPO involvement, support runbook. |

## Data Minimisation

The project should minimise data by:

- Using synthetic data for development and demos.
- Avoiding names, full addresses, phone numbers, email addresses, and full case narratives in model features unless approved.
- Converting postcode to a broader deprivation band where appropriate.
- Logging prediction metadata instead of full raw inputs where possible.
- Redacting or summarising free text before storage when feasible.
- Separating audit logs from analytics datasets.
- Deleting training and prediction data according to an approved retention schedule.

## Transparency And Rights

A real deployment should explain:

- That AI-assisted prioritisation is used.
- What data categories are used.
- The purpose of prioritisation.
- That an officer makes the final decision.
- How residents can request review, correction, or challenge through normal council processes.
- How long relevant records are kept.
- Who to contact for data protection queries.

Privacy notices should avoid vague claims such as "we use AI to improve services" without explaining the practical effect on case handling.

## Security And Access

Required controls:

- Role-based access for dashboard users.
- Least-privilege access to monitoring and audit logs.
- Encryption in transit and at rest.
- Separation of development, test, and production data.
- No real resident data in public portfolio environments.
- Secrets stored in managed secret storage, not code or config files.
- Audit logging for access to sensitive prediction records.
- Supplier and cloud hosting review before deployment.

## Retention

Retention should be defined separately for:

- Source case records.
- Prediction request metadata.
- Prediction outputs and explanations.
- Officer overrides.
- Training datasets.
- Model artifacts and evaluation reports.
- Monitoring aggregates.

The council should keep enough information to audit decisions and investigate harm, but not retain raw inputs or sensitive text longer than necessary.

## Monitoring And Review

Minimum review obligations:

- Weekly operational review of request volume, errors, confidence, and overrides.
- Monthly fairness and drift review.
- Quarterly service owner review of whether the system is improving triage.
- DPIA review after any material change in features, model, data source, service area, or decision impact.
- Immediate incident review for harmful prioritisation errors, suspected bias, security incidents, or inappropriate reuse.

## Residual Risk

Even with mitigations, residual risk remains because case prioritisation can affect response times for residents who may be vulnerable or in urgent need. The residual risk is only acceptable if:

- The model remains advisory.
- Staff can and do override it.
- The council monitors impact and fairness.
- Residents have routes to challenge outcomes.
- The service owner can evidence that benefits outweigh risks.
- Governance owners can pause or roll back the system.

## Approval Checklist For A Real Deployment

- DPIA completed and approved.
- Lawful basis and special category condition confirmed.
- Privacy notice updated.
- Data processing agreements completed if suppliers are involved.
- Security review completed.
- Service policy rules checked.
- Staff training completed.
- Model card reviewed.
- Fairness report reviewed.
- Monitoring dashboard live.
- Override and challenge process tested.
- Rollback plan documented.

## Interview Talking Points

- I would treat the DPIA as a design input, not a paperwork exercise at the end.
- The Article 22 question is not solved by saying "human in the loop"; I would check whether the human can genuinely influence the outcome.
- Free text is one of the highest privacy risks because it can contain unexpected special category or third-party information.
- Data minimisation can improve model governance by forcing the team to justify each feature.
- I would pilot on one service area, compare against existing triage, and only expand with evidence.
- I would make monitoring actionable by assigning named owners and review cadences.

## Reference Guidance

- ICO, data protection impact assessments: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/
- ICO, automated decision-making and profiling: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/automated-decision-making-and-profiling/
- ICO, AI and data protection: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/guidance-on-ai-and-data-protection/
- ICO, explaining decisions made with AI: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/explaining-decisions-made-with-artificial-intelligence/


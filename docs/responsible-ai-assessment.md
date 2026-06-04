# Responsible AI Assessment

## System Summary

**Project:** Azure Council case prioritisation system  
**Status:** Portfolio demonstration using fictional council services and synthetic data  
**Owner in a real deployment:** Council service owner, Data Protection Officer, information governance lead, and accountable operational manager  
**Decision type:** AI-assisted prioritisation recommendation for council service cases  
**Output:** `low`, `medium`, or `high` priority, confidence score, and plain-English explanation factors  
**Human role:** A council officer reviews the recommendation, checks case context, and makes the operational decision.

This system is designed to support triage, not to automate access to services. It helps officers identify cases that may need earlier attention, but it must not be used as the only basis for allocating, delaying, refusing, or escalating a service.

## Intended Public-Sector Use Case

The fictional council receives service cases across areas such as housing repairs, highways issues, waste services, benefits enquiries, council tax enquiries, and adult social care contacts. Officers need a consistent way to surface potentially urgent cases while still applying professional judgement.

The system takes structured case information and urgency notes, then returns:

- Recommended priority level.
- Confidence score.
- Explanation factors such as high case age, repeated contacts, vulnerability flag, service type, urgency wording, and deprivation band.
- Monitoring metadata for audit, drift, and fairness review.

## Responsible AI Position

The project follows these operating principles:

- **Human-centred:** the model supports officer review and does not replace caseworker responsibility.
- **Contestable:** residents and staff should be able to challenge a prioritisation outcome through normal council service channels.
- **Explainable:** every prediction should include a concise rationale understandable to non-technical staff.
- **Fairness-aware:** the council must test whether error rates or priority recommendations differ materially across relevant groups.
- **Privacy-aware:** only necessary data should be processed, retained, logged, and exposed.
- **Auditable:** predictions, overrides, explanations, model versions, and monitoring results should be recorded.
- **Limited by design:** the system must not be used for service denial, eligibility decisions, safeguarding decisions, or fully automated legally significant decisions.

## Human Oversight Model

### Required Human Review

An officer must review the full case before acting on the recommendation. Review should include:

- Whether the model explanation matches the visible case facts.
- Whether important context is missing from the submitted data.
- Whether urgency notes suggest safeguarding, legal, housing, accessibility, or welfare concerns.
- Whether the resident has vulnerabilities not captured accurately in the structured fields.
- Whether the recommendation conflicts with policy, professional judgement, or statutory duties.

### Meaningful Human Involvement

Human oversight is meaningful only if officers can change the outcome and are expected to apply judgement. A real deployment should therefore include:

- A visible override action with required reason codes.
- Clear wording that the model is advisory.
- Training on automation bias and over-reliance.
- Escalation routes for high-impact, ambiguous, or sensitive cases.
- Periodic review of override patterns by service leads.

### Override Categories

Suggested override reason categories:

- `missing_context`
- `resident_vulnerability`
- `safeguarding_or_welfare_concern`
- `policy_requirement`
- `service_backlog_context`
- `duplicate_or_linked_case`
- `model_recommendation_unclear`
- `other`

Override reasons should be monitored. A high override rate may indicate drift, poor explanations, data quality problems, or a mismatch between the model and operational reality.

## Fairness Risks

The project uses synthetic data, but the same risk patterns would apply to a real council setting.

| Risk | Why it matters | Example harm | Mitigation |
| --- | --- | --- | --- |
| Postcode deprivation as a proxy | Deprivation bands can correlate with protected characteristics and socioeconomic disadvantage. | Residents in some areas may be over-prioritised, under-prioritised, or treated through stereotypes. | Use only with a clear purpose, test group-level outcomes, and review whether it improves service equity. |
| Vulnerability flag misuse | Vulnerability data may be incomplete, sensitive, stale, or inconsistently recorded. | People without recorded vulnerability may be deprioritised despite real need. | Treat as one factor, not a gate. Allow staff to add context and override. |
| Free-text urgency notes | Text may encode language, literacy, disability, first-language, or digital access differences. | More articulate residents may receive higher priority than equally urgent residents. | Use text explanations carefully, monitor text feature influence, and provide non-digital access routes. |
| Historical label bias | If training labels reflect past service delays or inconsistent officer decisions, the model may reproduce them. | Existing unequal service patterns become automated recommendations. | Validate labels, involve service experts, test by group, and document known label limitations. |
| Service-type imbalance | Some service areas may have more training examples than others. | Poorer performance for low-volume services such as specialist social care contacts. | Report metrics by service type and set minimum evidence thresholds. |
| Automation bias | Staff may follow the model even when context suggests otherwise. | Incorrect priority becomes operational reality. | Training, interface design, mandatory review prompts, and override audit. |
| Feedback loops | Cases prioritised by the model may receive faster outcomes, changing future data. | The model may appear more accurate for groups it already favours. | Separate monitoring data from training data and review feedback-loop effects before retraining. |

## Explainability Requirements

The dashboard and API should provide both outcome-level and process-level explanations.

### Outcome-Level Explanation

Each prediction should explain:

- Top factors increasing priority.
- Top factors reducing priority.
- Confidence level and what low confidence means.
- Any missing fields that reduce reliability.
- A reminder that the recommendation is advisory.

Good explanation example:

> Recommended priority: high. Main factors: the case has been open for 18 days, the resident has contacted the council four times, vulnerability is recorded, and the notes contain urgent repair language. Confidence is moderate, so an officer should check the case history before action.

### Process-Level Explanation

The project should document:

- What data was used for model training.
- How labels were generated or collected.
- What features are included and excluded.
- What fairness checks are performed.
- Who owns model approval, monitoring, and retirement.
- How residents or officers can request review or correction.

The ICO explains that AI explanations can include rationale, responsibility, data, fairness, safety and performance, and impact explanations. This project maps its explanation design to those categories so that technical outputs can be discussed in plain English.

## UK GDPR And Data Protection Considerations

This document is not legal advice. A real council deployment would require review by the Data Protection Officer and information governance team.

### Personal Data

Likely personal data in a real deployment:

- Case reference and resident identifiers.
- Address or postcode-derived information.
- Service history and previous contacts.
- Free-text notes that may include health, disability, family, financial, housing, or welfare details.
- Staff actions, decisions, and override notes.

### Special Category And Sensitive Context

The synthetic demo includes a vulnerability flag. In real systems, vulnerability information may reveal or imply health, disability, age-related needs, social care status, financial hardship, or safeguarding concerns. The council would need a lawful basis, a condition for special category data where applicable, strict access control, and clear retention rules.

### Article 22 And Automated Decision-Making

The system is designed to avoid solely automated decisions with legal or similarly significant effects. It should not make final decisions without meaningful human involvement.

Even when Article 22 is not triggered because an officer makes the decision, UK GDPR principles still apply. The council must document the lawful basis, explain the processing to residents where required, limit the data used, support individual rights, and maintain accountability records.

### DPIA Trigger

A Data Protection Impact Assessment would be expected before any real deployment because the system involves AI-assisted profiling or prioritisation of service cases, potentially vulnerable residents, free-text personal data, and decisions that may affect access speed or service response.

## Limitations

Known limitations for the portfolio system:

- Uses synthetic data, so measured performance does not prove real-world suitability.
- Simplifies complex public-sector duties into three priority classes.
- Does not model legal eligibility, safeguarding thresholds, statutory deadlines, or local policy rules.
- May underrepresent rare but high-impact cases.
- Free-text features may be brittle, especially with short notes, misspellings, dialect, or non-English language.
- Confidence scores from common classifiers may not be well-calibrated without calibration and validation.
- Fairness metrics require meaningful group definitions and real operational context.
- Explanations may describe model influence but do not prove causal reasons.

## Monitoring Obligations

A real deployment should monitor model, fairness, operational, and governance signals.

### Model Quality

- Accuracy, macro F1, and class-specific recall.
- Recall for `high` priority cases.
- Calibration by confidence band.
- Confusion matrix by service type.
- Low-confidence prediction rate.

### Fairness

- Prediction distribution by service type, deprivation band, vulnerability flag, and channel where available.
- False negative rate for high-priority cases by monitored group.
- Override rate by group.
- Complaint or challenge rate by group.
- Missing data rate by group.

Fairness monitoring must be interpreted carefully. Equal outcomes across groups are not always the goal in public services, because some groups may have different levels of need. The governance question is whether differences are justified, evidenced, proportionate, and reviewed.

### Drift

- Feature drift for case age, service type mix, previous contacts, vulnerability flag, deprivation band, and text terms.
- Prediction drift across priority classes.
- Seasonal or incident-driven changes such as storms, service outages, or policy changes.
- Label drift when operational policies change.

### Operational Health

- Request count and latency.
- Error rate.
- Model version in use.
- Failed explanation generation.
- Missing or malformed input rate.
- Logging and audit completeness.

### Governance Review Cadence

| Review | Suggested cadence | Owner |
| --- | --- | --- |
| Operational dashboard review | Weekly | Service manager |
| Fairness and drift review | Monthly | Product owner and data scientist |
| DPIA and privacy risk review | At launch, material change, then at least annually | DPO or information governance lead |
| Model retraining approval | As needed, with documented evidence | Model governance board or equivalent |
| Incident review | Within agreed SLA | Service owner and information governance |

## Deployment Guardrails

Do not move beyond demonstration without:

- Approved DPIA.
- Confirmed lawful basis and privacy notice wording.
- Role-based access control.
- Secure logging and retention policy.
- Human override workflow.
- Staff training and operating procedure.
- Model card signed off by technical and service owners.
- Fairness test report using representative data.
- Incident process for incorrect prioritisation or data breach.

## Interview Talking Points

- The model is advisory by design. I would never present this as an automated decision-maker for public services.
- I separated the Responsible AI assessment, model card, and DPIA-style review because they answer different governance questions: ethical operation, model evidence, and privacy risk.
- The highest-risk features are not obviously protected characteristics. Postcode deprivation, vulnerability flags, and free text can all act as proxies or encode sensitive information.
- Meaningful human oversight requires interface and process design, not just a sentence in the documentation.
- Monitoring is not only accuracy. For a council system I would track drift, fairness, overrides, complaints, explanation failures, and operational health.
- Synthetic data is useful for demonstrating the MLOps pattern, but it cannot validate real public-sector impact.
- A real deployment would need service-specific policy rules, DPIA approval, privacy notices, retention rules, security review, and staff training before live use.

## Reference Guidance

- ICO, explaining decisions made with AI: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/explaining-decisions-made-with-artificial-intelligence/
- ICO, AI and data protection: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/guidance-on-ai-and-data-protection/
- ICO, automated decision-making and profiling: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/automated-decision-making-and-profiling/
- ICO, DPIAs: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/


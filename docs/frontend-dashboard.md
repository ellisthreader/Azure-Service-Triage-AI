# Frontend Dashboard Specification

## Purpose

This document defines the dashboard-first React interface for the Azure Council portfolio project. The dashboard demonstrates how a public-sector case-prioritisation model can be presented to non-technical users with human oversight, monitoring, explainability, and Responsible AI safeguards.

The UI must support a local demo while remaining credible as the foundation for a council operational tool.

## Screen Map

| View | Purpose | Primary Components |
| --- | --- | --- |
| Dashboard | Submit a case and review the recommendation | Case form, result panel, explanation factors, human review controls, monitoring snapshot, recent predictions |
| Monitoring | Inspect model and service health | Quality metrics, drift indicators, fairness summary, operational health, activity table |
| Responsible AI | Explain governance and limitations | Human oversight, synthetic data notice, fairness notes, audit requirements, deployment caveats |
| About Model | Show model and API metadata | Model version, training summary, endpoint status, links to model card |

## Dashboard First Screen

The first viewport should show useful working controls immediately:

- page title: "Council case prioritisation";
- short subtitle: "AI-assisted recommendation for human review";
- left-side case form;
- right-side recommendation panel;
- compact monitoring strip;
- recent predictions table below the fold or partly visible.

Do not introduce the product with a marketing hero. The dashboard is the product.

## Case Form Field Contract

| Field | Type | Required | UI Control | Notes |
| --- | --- | --- | --- | --- |
| `service_type` | string enum | Yes | Select | Housing repair, highways issue, waste service, benefits enquiry, council tax enquiry, adult social care contact |
| `case_age_days` | integer | Yes | Number input | Minimum 0; describe as days open |
| `previous_contacts` | integer | Yes | Number input | Minimum 0; prior contacts about the issue |
| `vulnerability_flag` | boolean | Yes | Toggle or segmented control | Decision-support context only |
| `postcode_deprivation_band` | string or integer enum | Yes | Select | Use bands 1 to 5 plus unknown for synthetic demo |
| `urgency_notes` | string | Yes | Textarea | Minimum useful length; do not request personal identifiers |
| `case_reference` | string | No | Text input | Optional fictional local reference |
| `officer_final_priority` | string enum | No | Segmented control | Low, medium, high |
| `override_reason` | string | Conditional | Textarea | Required in production if officer final priority differs from model recommendation |

## Prediction Response Display

The result panel should render these values from the prediction response:

- recommended priority;
- confidence score;
- explanation factors;
- model version;
- prediction timestamp;
- any backend warning or monitoring status if provided.

Recommended presentation:

| Result Element | UI Treatment |
| --- | --- |
| Priority | Large text label with semantic colour and icon |
| Confidence | Percentage plus plain-English band |
| Explanation factors | Ordered list with factor name, direction, and short value |
| Human oversight | Persistent notice near final decision controls |
| Model metadata | Compact footer row |

Priority labels should never be colour-only. Use visible text and icons for low, medium, and high recommendations.

## Interaction States

| State | Expected Behaviour |
| --- | --- |
| Initial | Empty form, "No prediction yet" result panel, monitoring placeholders |
| Editing | Validate required fields on blur and submit |
| Submitting | Disable submit, show loading state, keep layout stable |
| Success | Show result, update recent predictions, announce update to screen readers |
| Validation error | Show field errors and move focus to first invalid field after submit |
| API error | Preserve form data, show retry action, hide raw exception details |
| No monitoring data | Keep dashboard usable and explain that no predictions have been logged |
| Degraded monitoring | Show warning and link to Monitoring view |

## Monitoring Specification

Monitoring must cover four areas: model quality, drift, fairness, and operational health.

### Summary Metrics

| Metric | Description |
| --- | --- |
| Prediction count | Number of predictions in the current log window |
| High priority share | Share of predictions recommended as high |
| Average confidence | Mean model confidence |
| API health | Healthy, degraded, or unavailable |
| Error rate | Failed API requests divided by total requests |
| Last evaluation | Most recent model evaluation timestamp |

### Model Quality

Show synthetic validation metrics:

- accuracy or macro F1;
- per-class precision and recall;
- confusion matrix summary;
- model version;
- evaluation dataset note.

Use plain English alongside metrics. Example: "High-priority recall indicates how often known high-priority cases were identified in validation data."

### Drift

Track distribution changes against the synthetic training baseline:

- service type mix;
- case age;
- previous contacts;
- vulnerability flag;
- postcode deprivation band;
- urgency text signal where available.

Each drift row should show status, current value, baseline value, and an explanation of why the change matters.

### Fairness

Fairness monitoring should be explicitly labelled as a synthetic demonstration. Candidate comparison groups:

- vulnerability flag;
- deprivation band;
- service type.

Show high-priority recommendation rate, confidence, and performance where labelled data exists. Flag large disparities for review, but avoid claiming real-world fairness from synthetic data.

### Operational Health

Show:

- `/health` result;
- model loaded status;
- request count;
- error count;
- latency if available;
- last successful prediction;
- backend or model artifact version.

## Responsible AI Requirements

The UI must reinforce these principles:

- The model recommends a priority; it does not make a final decision.
- Officers must apply policy, professional judgement, and safeguarding processes.
- The project uses fictional synthetic data.
- Real personal data should not be entered into the demo.
- Protected characteristics must not be used to deny access to services.
- Vulnerability and deprivation indicators require clear governance in any real deployment.
- Explanation factors are model signals, not causal proof.
- Monitoring should be checked for drift, fairness, quality, and operational reliability.

## Audit Trail Design

For a production-ready extension, the dashboard should be capable of recording:

- submitted feature values, minimised to what is necessary;
- prediction result;
- confidence score;
- explanation factors;
- model version;
- timestamp;
- officer final priority;
- override reason;
- monitoring status at the time of decision.

The portfolio demo can display this as a documented design requirement without persisting real audit records.

## Accessibility

The implementation should meet these baseline requirements:

- semantic page structure;
- visible labels for every input;
- keyboard access for all controls;
- focus states with strong contrast;
- field errors connected to inputs;
- live region for prediction results;
- status indicators that combine colour, text, and icon;
- table headers for all monitoring and recent prediction tables;
- WCAG AA colour contrast;
- reduced-motion support;
- responsive layout that remains usable on mobile.

## Visual Direction

The dashboard should look like a serious public-sector operations product:

- quiet interface with clear hierarchy;
- neutral background and restrained semantic colours;
- compact metric tiles;
- readable tables;
- consistent spacing;
- minimal decoration;
- no marketing hero, gradient-heavy brand treatment, or oversized feature cards;
- clear distinction between model recommendation and human decision.

Suggested component style:

- app shell with compact navigation;
- 8px maximum border radius for cards and controls unless overridden by a design system;
- status chips for health, drift, fairness, and priority;
- icon buttons only where icons are familiar and labelled by tooltip or accessible name;
- practical typography sized for scanning operational data.

## Implementation Notes

- Use TypeScript types for request and response contracts.
- Keep API client functions separate from React components.
- Normalise backend errors before rendering them.
- Use mock data only when the backend is unavailable during frontend development, and label it as sample data.
- Avoid storing real personal data in local storage.
- Make monitoring cards resilient to missing fields.
- Preserve layout dimensions during loading to prevent distracting jumps.

## Done Criteria

- Dashboard opens directly into the working case-prioritisation experience.
- Form fields match the planned model feature set.
- Prediction result communicates recommendation, confidence, explanation, and human oversight.
- Monitoring includes quality, drift, fairness, health, and activity.
- Responsible AI guidance is present in the active workflow.
- Accessibility requirements are explicit enough to guide implementation.
- Visual principles fit a council operational dashboard.

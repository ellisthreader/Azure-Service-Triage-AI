# Frontend UX Plan

## Product Intent

The React frontend is a dashboard-first operational tool for fictional council officers reviewing AI-assisted case priority recommendations. It must make the recommendation useful without implying automation: the interface should help an officer understand the model output, review the stated reasons, compare the case against monitoring signals, and record when human judgement overrides the suggested priority.

The first screen should be the working dashboard, not a landing page. It should immediately show the case intake form, latest prediction result, and monitoring snapshot so the user can submit a case and understand the operational context without navigating elsewhere.

## Primary Users

- **Case officer:** submits fictional council cases, reviews recommendations, and records a final human priority.
- **Service manager:** checks trends, high-priority volume, error rate, drift, fairness indicators, and override patterns.
- **AI/ML reviewer:** inspects model confidence, explanation factors, monitoring signals, and Responsible AI notes.
- **Interview reviewer or developer:** needs to see a clear end-to-end local demo of API integration, monitoring, and governance.

## Information Architecture

Use a persistent app shell with a compact left navigation on desktop and a top navigation or drawer on small screens.

### Navigation

1. **Dashboard**
   - Case submission form.
   - Prediction result panel.
   - Recent predictions table.
   - Monitoring summary tiles.
   - Human review reminder.

2. **Monitoring**
   - Model quality summary.
   - Drift indicators.
   - Fairness summary.
   - Operational health.
   - Recent prediction activity.

3. **Responsible AI**
   - Human oversight statement.
   - Synthetic data notice.
   - Model limitations.
   - Fairness and protected characteristic guidance.
   - Explanation and audit requirements.

4. **About Model**
   - Model version.
   - Training data summary.
   - Last evaluation date.
   - API endpoint status.
   - Links or references to model card documentation.

### Dashboard Layout

Desktop layout should use a two-column operational workspace:

- Left column: case intake form and submit controls.
- Right column: prediction result, explanation factors, and human review action.
- Full-width lower area: monitoring snapshot and recent predictions table.

Small screens should stack sections in this order:

1. Submit case.
2. Prediction result.
3. Explanation factors.
4. Human review outcome.
5. Monitoring snapshot.
6. Recent predictions.

## Case Submission Form

The form should map cleanly to the backend `/predict` request schema. Field labels must be written in plain council-service language, with any ML-specific wording reserved for developer docs.

### Required Fields

- **Service type**
  - Control: select.
  - Example options: Housing repair, Highways issue, Waste service, Benefits enquiry, Council tax enquiry, Adult social care contact.
  - Validation: required.

- **Case age in days**
  - Control: number input or stepper.
  - Validation: required, integer, minimum `0`, recommended maximum display hint of `365`.
  - Help text: "How long the case has been open."

- **Previous contacts**
  - Control: number input or stepper.
  - Validation: required, integer, minimum `0`.
  - Help text: "Number of earlier contacts about this issue."

- **Vulnerability flag**
  - Control: toggle or segmented control with `No` and `Yes`.
  - Validation: required.
  - Responsible AI note near the field: "Used to support review and safeguarding context, not to deny access to a service."

- **Postcode deprivation band**
  - Control: select.
  - Example values: `1 - most deprived`, `2`, `3`, `4`, `5 - least deprived`, `Unknown`.
  - Validation: required.
  - Responsible AI note near the field: "Synthetic demonstration field. In a real deployment, use only with clear lawful basis and fairness monitoring."

- **Urgency notes**
  - Control: textarea.
  - Validation: required, minimum useful length such as `10` characters, maximum such as `1,000` characters.
  - Help text: "Briefly describe the issue, urgency, risks, access needs, or repeated impact."

### Optional Review Fields

These fields can be stored client-side for the demo or submitted later if an audit endpoint is added.

- **Officer final priority**
  - Control: segmented control with `Low`, `Medium`, `High`.
  - Purpose: records the human decision after reviewing the recommendation.

- **Override reason**
  - Control: textarea shown when officer final priority differs from model recommendation.
  - Example prompts: new evidence, safeguarding concern, duplicate case, incorrect data, service policy exception.

- **Case reference**
  - Control: text input.
  - Purpose: optional fictional identifier for recent prediction rows.
  - Do not require real personal data in the demo.

### Form Behaviour

- Disable submit while required fields are invalid or a request is in progress.
- Preserve entered form data after a failed API call.
- Show inline field errors after blur and on submit.
- Provide a clear reset action that asks for confirmation only if there is unsent data.
- Include example-fill action for demos, labelled as synthetic sample data.
- Never ask for names, phone numbers, full addresses, NHS numbers, or other unnecessary personal data.

## Prediction Result Panel

The result panel should be visually prominent but restrained. It should show the recommendation as decision support, not as a final decision.

### Result Content

- **Recommended priority:** `Low`, `Medium`, or `High`.
- **Confidence:** percentage and plain-English confidence band.
- **Recommendation summary:** one sentence explaining what the model suggests.
- **Explanation factors:** ordered list of the top contributing factors returned by the API.
- **Human oversight notice:** "This is a recommendation for review. The officer remains responsible for the final priority."
- **Model version and timestamp:** visible in compact metadata.
- **Next action:** officer final priority and optional override reason.

### Priority Styling

- Low: calm neutral or blue treatment.
- Medium: amber treatment.
- High: red treatment used sparingly and with accessible contrast.

Do not rely on colour alone. Include text labels and icons for status. Avoid alarming animation, oversized banners, or language that implies certainty.

## UI States

### Initial State

- Show empty form with monitoring snapshot placeholders.
- Result panel should say "No prediction yet" and explain that the result appears after submitting a synthetic case.

### Loading State

- Submit button shows loading label.
- Result panel uses a compact skeleton or progress indicator.
- Form remains visible and read-only or submit-disabled while the request is in progress.

### Success State

- Show recommendation, confidence, explanation factors, model metadata, and review controls.
- Add the prediction to the recent predictions table.
- Announce result update for screen readers.

### Validation Error State

- Field-level errors should appear next to the relevant controls.
- Summary error should be shown above the form when submit fails due to invalid input.
- Focus should move to the first invalid field after submit.

### API Error State

- Show clear recovery text: "The prediction service could not be reached. Check the backend is running and try again."
- Keep form data intact.
- Include a retry action.
- Do not show stack traces or raw exception text in the UI.

### Empty Monitoring State

- If `/metrics/summary` has no prediction history, show "No predictions logged yet" and keep the monitoring layout stable.
- Dashboard should still be usable for submitting a case.

### Degraded Model State

If monitoring indicates high drift, fairness alert, high error rate, or stale evaluation data:

- Add a visible warning in the monitoring snapshot.
- Keep prediction available for local demo, but clearly state that review is required.
- Link the warning to the Monitoring or Responsible AI view.

## Monitoring Views

Monitoring should be designed for non-technical stakeholders first, with drill-down detail available for technical reviewers.

### Monitoring Summary Tiles

- **Prediction count:** total predictions in the current run or logging window.
- **High priority share:** percentage of predictions recommended as high priority.
- **Average confidence:** mean confidence score.
- **API health:** healthy, degraded, or unavailable.
- **Error rate:** percentage of failed requests.
- **Last model evaluation:** timestamp or "not available".

### Model Quality

- Validation accuracy or macro F1.
- Per-class precision and recall for low, medium, and high priorities.
- Confusion matrix summary, described in plain English.
- Note that metrics come from synthetic validation data.

### Drift Indicators

- Case age distribution shift.
- Previous contact count shift.
- Service type mix shift.
- Urgency text feature shift where available.
- Postcode deprivation band distribution shift.

Each drift indicator should show:

- status: normal, watch, alert;
- current value;
- baseline value;
- short explanation of what changed;
- timestamp of calculation.

### Fairness Summary

The demo can compare synthetic groups where appropriate, such as vulnerability flag, service type, and deprivation band. Do not present these as real-world equality conclusions.

Show:

- recommendation rate by group;
- high-priority rate by group;
- confidence by group;
- error or performance by group where labels are available;
- highest disparity flag;
- explanation that synthetic data cannot validate production fairness.

### Operational Health

- API status from `/health`.
- Model loaded status.
- Request count.
- Error count and error rate.
- Median or average latency if available.
- Last successful prediction.
- Backend version or model artifact version.

### Recent Prediction Activity

Use a dense table suitable for repeated operational review:

- timestamp;
- case reference or generated local row id;
- service type;
- recommended priority;
- confidence;
- vulnerability flag;
- deprivation band;
- top explanation factor;
- final officer priority if recorded;
- override indicator.

Rows should be sortable by timestamp, priority, confidence, and service type. For the local demo, pagination can be replaced by a fixed recent list such as the latest 10 or 20 predictions.

## Responsible AI Notes In The UI

Responsible AI content should be part of the workflow, not hidden in a separate document only.

### Required Notices

- The system provides decision support and does not automate council decisions.
- The project uses synthetic demonstration data.
- Predictions should never be used to deny access to services.
- Officers must review context, policy, and safeguarding concerns before finalising priority.
- Explanation factors are indicative model signals, not proof of cause.
- Monitoring must be reviewed for drift, fairness, and operational reliability.
- Real deployment would require DPIA-style review, data governance, equality impact assessment, and operational policy approval.

### Auditability

The UI should make it clear what would need to be logged in a production system:

- input feature snapshot, excluding unnecessary personal data;
- model version;
- prediction result and confidence;
- explanation factors;
- timestamp;
- officer final priority;
- override reason;
- monitoring status at time of recommendation.

For this portfolio demo, avoid collecting real personal data and label sample entries as fictional.

## Accessibility Requirements

- Use semantic HTML landmarks: header, nav, main, section, form, table.
- Every form field must have a visible label.
- Inputs must expose validation errors using accessible descriptions.
- Result updates must be announced using an ARIA live region.
- Keyboard users must be able to complete the full workflow.
- Focus order must follow the visual order.
- Focus states must be visible and high contrast.
- Do not rely on colour alone for priority, drift, fairness, or health status.
- Tables need clear column headings and captions or surrounding headings.
- Text contrast must meet WCAG AA.
- Touch targets should be at least 44 by 44 CSS pixels on mobile.
- Motion should be minimal and respect reduced-motion preferences.

## Visual Principles

This is a public-sector operational tool. The UI should feel calm, trustworthy, clear, and built for repeated use.

- Prefer dense but readable layouts over marketing-style sections.
- Use restrained colour with strong semantic status treatment.
- Avoid decorative illustrations, gradient-heavy backgrounds, and oversized hero content.
- Keep cards compact and purposeful: forms, result summaries, repeated metric tiles, and tables.
- Use 8px or smaller border radii unless a design system later specifies otherwise.
- Use consistent spacing and alignment so officers can scan values quickly.
- Use plain English headings such as "Submit case", "Recommendation", "Monitoring", and "Human review".
- Keep typography practical: clear hierarchy, no viewport-scaled type, no negative letter spacing.
- Make priority and alert states obvious through label, icon, colour, and position.
- Treat red as an alert colour, not a general brand colour.
- Ensure dashboard content does not jump when loading, validating, or receiving results.

## API Integration Expectations

The frontend should be written so endpoint contracts are explicit and easy to update.

- `GET /health`: display API and model readiness.
- `POST /predict`: submit form values and display recommendation.
- `GET /metrics/summary`: populate dashboard and monitoring views.
- `GET /explainability/sample`: optionally populate example explanations or Responsible AI demo content.

API errors should be normalised into user-facing messages. Raw backend responses can be logged to the browser console during development, but should not be shown directly in the UI.

## Acceptance Checklist

- The dashboard is the first screen.
- A user can submit a synthetic case without reading documentation.
- Required fields match the planned backend feature set.
- Prediction output includes priority, confidence, explanation factors, model metadata, and human review controls.
- Monitoring covers quality, drift, fairness, activity, and operational health.
- Responsible AI guidance is visible in the workflow.
- Accessibility basics are built into the component plan.
- The visual design matches a serious public-sector operational setting.

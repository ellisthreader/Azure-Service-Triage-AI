---
tags: [frontend, dashboard, monitoring]
created: 2026-06-04
---

# 04 — Dashboard

The operator console (`pages/Dashboard.tsx`) uses a dedicated **employee action workspace**: Essex logo sidebar, simple left navigation, and one focused casework area. All live data comes from the backend with a static fallback so it renders offline.

## Panels and their data sources
| Panel | Component | Source |
|---|---|---|
| Today's priority list | `pages/Dashboard.tsx` | `GET /cases/queue` |
| **Case details** (plain record view: summary, ownership, variables, evidence, notes, next action, add-update form, recent activity) | `dashboard/TriageForm.tsx` | `GET /cases/queue` |
| Azure audit status | `pages/Dashboard.tsx` sidebar status card | `GET /audit/summary` |

## Behaviour notes
- The dashboard route owns its full-height shell. `main.tsx` renders the public Essex top nav only on the home route, so the dashboard does not have two competing navigation systems.
- Desktop uses one employee sidebar as primary navigation. Mobile hides the sidebar and shows a compact tab block.
- Tabs: Case details and Today. The employee dashboard opens on the selected case details by default; the priority list remains available from Today. Detailed monitoring, platform, governance evidence, and the system-flag panel are kept out of the officer flow, but the sidebar shows the current API/audit readiness state.
- The case details page should stay visually simple: one record surface, section dividers, plain variable rows, simple evidence/notes lists, and a local add-update form. Avoid reintroducing multiple card styles or model/system-flag panels into this workflow.
- Microsoft 365 is incorporated as case context, not app navigation: the queue summarizes linked Outlook/Teams/SharePoint items, and the case review opens case notes and previous contacts in an in-page source preview drawer. The drawer also offers an optional “Open in Microsoft 365” app-shell launch; true record deep-links would require tenant auth, Graph permissions, and real item IDs. Housing fire-risk evidence uses generated project assets in `frontend/public/case-evidence/`.
- Staff ownership is synthetic: `GET /cases/queue` includes fake employees, generated avatar assets in `frontend/public/staff/`, usernames under `@essex.example`, case status, assigned officer, and recent activity so the UI shows who is working on what without representing real council staff.
- `caseInput` / `prediction` are **lifted to `main.tsx`** so the chatbot's "triage my current case" scores the exact case shown in the form.
- `Badge` auto-colours by status text (`pass/ready/complete` → green, `requires` → amber).
- Fallback case queue lives in `api.ts` (`fallbackCaseQueue`) — keeps the case UI usable when the API is down.
- The dashboard polls `/health`, `/audit/summary`, and `/cases/queue` every 15 seconds so it recovers when the FastAPI backend starts after the frontend and shows whether Azure durable audit is active.
- The first dashboard viewport is only today's priority list.
- The employee workflow is backend-shaped rather than frontend-only: `GET /cases/queue` returns synthetic cases with pre-attached system flags, selecting a case opens a read-only review view, and `POST /cases/{case_id}/decision` returns an audit receipt for the officer's final priority and override state. After a decision is saved, the dashboard refreshes `/audit/summary` so the visible audit counts update.
- Today's queue supports unassigned work: `CaseRecord.assigned_to` may be `null`, the dashboard shows unassigned counts, and `POST /cases/{case_id}/assign-to-self` assigns the selected item to the signed-in staff profile. Relevant files: `backend/app/schemas.py`, `backend/app/main.py`, `frontend/src/pages/Dashboard.tsx`, `frontend/src/dashboard/TriageForm.tsx`.
- The demo has a lightweight local sign-in profile. The frontend stores the active staff profile in `localStorage`, shows the signed-in user in the sidebar/top bar, and sends that `StaffMember` as the body to `POST /cases/{case_id}/assign-to-self`; the backend records that exact profile on the case. The professional avatar asset lives at `frontend/public/staff/demo-officer-profile.png`.
- The dashboard must have no extra assistant surfaces. `main.tsx` renders `ChatWidget` on the home route only; the dashboard route has no floating chat, assistant rail, or top-nav assistant button.

See [[05 - Chatbot]] and [[03 - Frontend]].

#servicePriorityAI #dashboard

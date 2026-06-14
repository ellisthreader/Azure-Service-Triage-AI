---
tags: [moc, home]
created: 2026-06-04
---

# 🧭 Home — Map of Content

The single entry point for the **Service Priority AI** project vault.

## Start here
- [[01 - Overview]] — the one-paragraph version, goals, audience
- [[02 - Architecture]] — how data flows from synthetic generation to dashboard

## Build it
- [[03 - Frontend]] — React app: public portal + console + chatbot rail
- [[04 - Dashboard]] — OpenAI-style model console, panel by panel
- [[05 - Chatbot]] — grounded `/chat` assistant
- [[06 - Model]] — the scikit-learn pipeline, features, and metrics

## Ship it responsibly
- [[07 - Responsible-AI]] — advisory stance, fairness, human review
- [[08 - Azure-Deployment]] — online + batch managed endpoints

## Reference
- [[09 - Decisions]] — why things are the way they are
- [[10 - Glossary]] — terminology
- [[11 - Interview Prep]] — Essex AI / ML Engineer presentation plan

## Quick facts
- Model: `service-priority-ai-baseline` **v0.1.0** — see [[06 - Model]]
- Validation accuracy ≈ **90%**, high-priority recall ≈ **94%**
- Decision mode: **advisory** + human-in-the-loop — see [[07 - Responsible-AI]]
- Backend routes: `/predict`, `/chat`, `/metrics/summary`, `/dashboard/summary`

#servicePriorityAI #moc

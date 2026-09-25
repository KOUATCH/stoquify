# Compliance and assurance

[Guide home](../README.md) · [Shared controls](../shared-controls.md) · [Detailed control notes](../control-notes.md) · [Metric dictionary](../metric-dictionary.md)

Evidence: source reviewed 2026-09-06. Dashboard interaction is blocked by sign-in. Instructions below describe implementation, not a completed live walkthrough.

These workspaces show evidence, exceptions and governed review decisions. Adapter status, acknowledgement, suppression, waiver and authority acceptance have different meanings.

## Pages in this chapter

- [Assurance incident detail](#assurance-incident-detail)
- [Assurance control tower](#assurance-control-tower)
- [Compliance center](#compliance-center)

## Assurance incident detail

**Open:** `/en/dashboard/assurance/control-tower/incidents/[incidentId]`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Compliance operators, control owners, independent reviewers and authorized managers.

**Prerequisites and access.** controls.audit.read. Country/module/incident scope, permitted evidence access and action-specific authority. Submission readiness depends on actual adapter credentials, reviewed capability and source evidence. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** One incident's source, severity, status, ownership, timeline, waivers and redacted evidence.

**How to use it.**

1. Inspect the source and timeline, choose the applicable action, supply owner/role/due date, reason/note/evidence or suppression/expiry dates as required, then Apply action.
2. Verify the new timeline entry and status.

**Confirm the outcome.** Inspect the resulting incident timeline or the documented preparation/execution/response state. Only an actual authority/provider response can establish external acceptance.

**Get value from it.** Maintain an accountable history of how an exception was handled.

**Limits and recovery.** A user who can see a summary may not be allowed to see all proof or approve a waiver. Use Retry for failed reads and follow the indicated blocker to its source. Acknowledging or suppressing an incident does not fix its underlying transaction. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/assurance/control-tower/incidents/[incidentId]/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/assurance/assurance-route-data-access.ts:34>).

## Assurance control tower

**Open:** [/en/dashboard/assurance/control-tower](http://localhost:3000/en/dashboard/assurance/control-tower). **Reach it:** Assurance Control Tower. **Evidence state:** source-only; runtime blocked.

**Audience.** Compliance operators, control owners, independent reviewers and authorized managers.

**Prerequisites and access.** controls.audit.read. Country/module/incident scope, permitted evidence access and action-specific authority. Submission readiness depends on actual adapter credentials, reviewed capability and source evidence. 

**What it shows.** Open/blocking/overdue/hidden incidents, severity/workflow queues, engine runs, pending alerts and failures.

**How to use it.**

1. Open an incident's Detail or Source.
2. Acknowledge records review; use Assign, Resolve, Suppress, Request waiver, Approve waiver or Reopen only when the action is allowed and its required reason/evidence is ready.

**Confirm the outcome.** Inspect the resulting incident timeline or the documented preparation/execution/response state. Only an actual authority/provider response can establish external acceptance.

**Get value from it.** Assign control failures to named owners and distinguish silence/acknowledgement from actual resolution.

**Limits and recovery.** Suppression and waiver are controlled state changes, not correction of the underlying financial or operational record. Use Retry for failed reads and follow the indicated blocker to its source. Acknowledging or suppressing an incident does not fix its underlying transaction. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/assurance/control-tower/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/assurance/assurance-route-data-access.ts:27>).

## Compliance center

**Open:** [/en/dashboard/compliance](http://localhost:3000/en/dashboard/compliance). **Reach it:** Compliance. **Evidence state:** source-only; runtime blocked.

**Audience.** Compliance operators, control owners, independent reviewers and authorized managers.

**Prerequisites and access.** compliance.documents.read. Country/module/incident scope, permitted evidence access and action-specific authority. Submission readiness depends on actual adapter credentials, reviewed capability and source evidence. 

**What it shows.** Country/status views of fiscal documents, certification state, open submissions, exceptions, active adapters and source/credential/review readiness.

**How to use it.**

1. Filter All countries/status, search the relevant document/submission queue and Refresh or Retry.
2. Inspect the required country-pack/capability/credential/specification/reviewer evidence before assuming an adapter can submit.

**Confirm the outcome.** Inspect the resulting incident timeline or the documented preparation/execution/response state. Only an actual authority/provider response can establish external acceptance.

**Get value from it.** Identify why a document is still waiting and send that precise gap to the responsible team.

**Limits and recovery.** The current dashboard principally monitors queues. It is not a universal tax-filing form; an active adapter badge is not proof of production authorization or authority acceptance. Use Retry for failed reads and follow the indicated blocker to its source. Acknowledging or suppressing an incident does not fix its underlying transaction. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/compliance/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/compliance/compliance-route-data-access.ts:20>).


# P10 — Support runbook draft

18 October 2026 · **PROPOSED / UNSTAFFED / NOT AN SLA**. Supports the bounded P01 pilot and [lifecycle proposal](LIFECYCLE_POLICY_PROPOSAL.md). No person, mailbox, phone line, helpdesk, on-call rota, external notification or customer contact was activated. Operational approval/rehearsal belongs to P17.

## Current tooling evidence and unknowns

| Capability | Source evidence | What remains unknown |
|---|---|---|
| Workflow incidents | `services/assurance/assurance-incident.service.ts:217–295` acknowledge/assign/resolve/suppress/reopen; `:702` requires active same-tenant assignee; `:242` resolution note/current source hash. | Deployment, incident volume, operator assignment, actual response times and platform-wide customer case ownership. Tenant incident assignee is not automatically a SaaS support agent. |
| Guarded actions | `actions/assurance/workflow-assurance-incident.actions.ts:67–110`: controls.audit.read / controls.manage and fresh resolution authority; server-derived tenant/actor. | Production RBAC/UI and actual support staff authority. Do not grant support wildcard access or cross-tenant credentials by policy prose. |
| In-app alert evidence | `assurance-incident.service.ts:730`: upsert pending IN_APP delivery with dedupe key, recipient role, safe message and source hash. | A pending row is not acknowledged/delivered email/SMS or a staffed escalation. Email/webhook enum values do not prove dispatch. |
| Other notifications/email | `services/signals/signal-notification.service.ts:16` respects tenant/preferences; Resend dependency in package.json; `services/communication/customer-statement-delivery.provider.ts:76` and `services/users/user-identity.service.ts:34` use Resend. | These are business-document/identity communications, not proof of an operating customer-support inbox or incident pager. Configuration/credentials/production delivery not inspected. |
| Public contact/intake | `components/Forms/WaitList.tsx:31` currently simulates an API delay and logs form data. Pricing page routes to `components/landing/public-pages.tsx:113`, which describes tailored scope/quote. | Waitlist success is not a saved support request/cancellation receipt. No real contact was submitted. This unrelated component was preserved; its simulated handling and personal-data logging need separate owner review before relying on it. |
| Platform subscription/service desk | Targeted paths/searches in app/actions/services/lib/prisma/package did not establish a platform subscription checkout, billing portal, cancellation handler or helpdesk integration. | External/manual billing, support CRM, channels, terms and staffing may exist outside the repository. Commercial owner must supply the actual inventory. No assertion that the company has no process. |

## Proposed staffed envelope and roles

Candidate hours: **Monday–Friday 09:00–17:00 Africa/Douala**, excluding an agreed published holiday calendar. FR primary with EN support. This is a planning proposal, not current availability. Support owner must assign named primary/backup and confirm workload/coverage before any promise. Retail evenings/weekends are a material mismatch: either narrow pilot operating times, fund extended staffed coverage, or defer admission. Do not market 24/7 support while relying on an unstaffed queue.

| Responsibility | Proposed accountable role / boundary |
|---|---|
| Intake/communications | Support lead and named backup; verify organization/contact through approved process; maintain case clock and next update. No access to credentials. |
| Incident command | Platform/engineering lead for outages/security; nominate an incident commander and deputy per material case. |
| Financial correctness | Domain lead plus independent accountant/finance reviewer for money, stock-to-ledger, close or recovery discrepancies; support cannot “fix” ledger rows. |
| Privacy/access | Security lead plus qualified privacy reviewer; least-privilege identity recovery, containment, retention/notification decisions. |
| Billing/cancellation | Commercial/finance owner; reconcile platform invoices and record effective cancellation without requiring feedback or clearing merchant obligations. |
| Archive/recovery | Data/export + platform owner; deliver scoped bytes through approved path, prove integrity/omissions and restored authority; P09/P16/P17 constraints apply. |

Roles may share a person only where permitted; independent review must remain independent. No support operator gains tenant incident ownership merely from this document. Use approved delegated access or a sanitized, tenant-bound customer case; never share a customer's login.

## Proposed severity and response targets

Targets count **staffed time**, not elapsed 24-hour time. No resolution-time guarantee is proposed; update cadence and next responsible owner are explicit. Measure real elapsed wait separately, especially outside hours.

| Support level (not an automatic code enum mapping) | Examples | Candidate acknowledgement / update | Escalation |
|---|---|---|---|
| S0 critical | Suspected cross-tenant exposure; duplicate/missing committed money; widespread checkout outage without safe continuation | Within 1 staffed hour; updates every 2 staffed hours while actively investigating | Support immediately routes upon receipt to incident commander + security/domain lead. Outside staffed hours: no human-response promise; admission/coverage gap must be disclosed beforehand. |
| S1 high | One business blocked from core trade or archive access; uncertain recovery; accounting close blocker | Within 2 staffed hours; update by end of staffed day or sooner if changed | Domain/platform owner; escalate to incident commander if spreading or integrity risk emerges. |
| S2 normal | Billing discrepancy, cancellation processing, scoped export question, recoverable workflow defect | Within 1 staffed business day; next update within 2 staffed business days | Commercial/data/domain owner as appropriate. Integrity/security signals override queue priority. Cancellation timestamp remains original receipt. |
| S3 guidance | Training, setup clarification, improvement request | Within 2 staffed business days; agree next action/date | Product/support. No production feature/date commitment without authorization. |

Approval D7 must confirm feasibility, holiday calendar, channels, handoff and backup; if unavailable, label targets uncommitted and do not activate a pilot that requires them. Any legal incident-reporting obligations need qualified review; these proposed internal times are not legal deadlines.

## Intake → containment → resolution

1. **Record:** case ID, tenant ID, verified contact/role, locale/timezone, received timestamp/channel, workflow/source IDs, last known good state, expected/observed behavior, business impact, correlation ID, safe screenshot/log reference and permission for scoped inspection. Do not collect passwords/tokens/full card/bank/payroll data. Restrict attachment access and retention. Unknown identity permits general guidance/intake only, no private records.
2. **Triage:** distinguish platform commercial billing from merchant sales/AP/customer payments; classify uncertainty, security/financial impact and severity. Record named owner, backup, next update and reproducible scope. Link current incident/source hash where a genuine workflow incident exists; ordinary commercial cancellation is not a fabricated assurance incident.
3. **Contain within authority:** preserve original commit/request/evidence IDs, stop unsafe repeats and retain local queues. Never instruct customer to clear browser storage, delete history, force a new payment or bypass period/approval guards to conceal uncertainty. No production configuration/data change without the applicable authority and reviewed procedure.
4. **Investigate:** reproduce with synthetic data first; correlate trusted server result with customer-visible state; treat missing observations as unknown. For invoice mismatch compare accepted scope, invoice/due date, settlement evidence and current access, not a caller-supplied “paid” flag. Keep original cancellation receipt/date independent of technical investigation.
5. **Review recovery:** domain/security owner defines reversible recovery and evidence. Financial corrections use existing approved domain commands and independent review, not direct DB edits. Restore needs P04/P17 object/key/worker/revocation protocol; archive needs P09/P16 scope and independent reconstruction. This draft authorizes none of those operations.
6. **Validate and close:** record tested source/artifact, current source hash, owner/reviewer, verification class, residual limitations, customer-visible result and next action. Existing assurance resolution requires a note and matching current source hash; it does not prove customer recovery. Customer acknowledgement may be requested for incident outcome but must not condition cancellation or data rights.
7. **Reopen and learn:** reopen on changed source/recurrence or failed recovery; retain linked history. Review repeated defects, false alerts, missed handoffs and support load. Optional cancellation feedback is stored separately with consent and may remain unanswered.

## Departure and security exception routes

- **Cancellation:** verified owner request is sufficient without feedback. Issue a receipt/effective-date record through the actual approved channel once established. If a tool fails, preserve original request time in the controlled case process; commercial owner follows through. Do not make technical POS/reconciliation stop support or archive completeness a condition for accepting cancellation.
- **Archive unavailable/incomplete:** data owner records scope, missing links/files, next remediation and a safe authorized retrieval route. No public links or raw database dump. Propose an access-window extension when the platform caused the failure, subject to D2/D3 approval; never claim a reference-only report delivers its attachments.
- **Revoked/locked user:** keep denial; verify an alternate owner/recovery path under security review. Commercial cancellation does not revive a revoked session or accountant grant. Capture the request without exposing tenant data; identity uncertainty and billing dispute are different cases.
- **Pending/offline work:** record server-accepted, uncertain and browser-local queues separately, with IDs/device/cashier/cutoff. Keep original bytes where authorized. Do not erase local work or equate zero server rows with no local records. Current unsupported stop/replay capabilities remain blockers, not a reason to keep charging.
- **Deletion/hold:** register the request, route to privacy/data owner, preserve reviewed holds and transparent scope. No hard delete, encryption-key destruction or backup expiry change through this runbook alone.

## Rehearsal packet for P17 (not performed)

Assign real staff/channels, then use synthetic owner/tenant A and foreign tenant B. Rehearse S0 financial uncertainty with no retry duplication, outage during staffed/un-staffed time, stale source-hash resolution, foreign assignee denial, primary-unavailable handoff, billing mismatch, reason-free cancellation, revoked owner recovery, expired/missing archive and local offline work. Capture intake/acknowledge/assignment/update/recovery timestamps and actual delivered receipts, permissions, evidence and escalation. A tabletop cannot prove delivery; a pending alert row cannot pass this exercise. No customer/provider messages are sent by P10.

Metrics to define/collect after authorization: acknowledgement time (received → first meaningful human response, elapsed and staffed variants), unowned case count/age, time to safe restoration, update-cadence adherence, recurrence/reopen rate, cancellation receipt/completion time, archive delivery/reconstruction success and support effort per business. Report denominator/window/severity and outside-hours waits; no current baseline, satisfaction or staffing claim exists.

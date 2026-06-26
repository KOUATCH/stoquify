# Kontava Assurance Incident Spine Run Report - 2026-06-21

## Scope

Implemented the durable Workflow Assurance Incident Spine on top of the assurance registry foundation. This pass turns non-passing assurance check outcomes into tenant-scoped incident history with dedupe, reopen, transition events, alert delivery history, waivers, and guarded server actions.

## Implemented

- Added Prisma models and enums for:
  - `WorkflowAssuranceIncident`
  - `WorkflowAssuranceIncidentEvent`
  - `WorkflowAssuranceAlertDelivery`
  - `WorkflowAssuranceWaiver`
- Added migration `20260621113000_workflow_assurance_incident_spine`.
- Added incident contracts and service logic for:
  - create from failed, warning, blocked, or errored check outcomes
  - dedupe unchanged failures by organization, check, source, fingerprint, and source hash
  - reopen resolved or waived incidents when the source hash changes
  - assign, acknowledge, resolve, suppress, reopen
  - request and approve waivers with maker-checker enforcement
  - in-app alert delivery history with dedupe keys
  - audit log entries for incident and waiver transitions
- Integrated the assurance registry runner so persisted non-passing check runs create or update incidents.
- Added protected server actions for incident transitions and waivers.

## State Machine

- New anomaly: `open`
- Human review: `acknowledged`, `assigned`, `in_progress`
- Successful handling: `resolved`, `waived`, `suppressed`, `closed`
- Failed again after resolution with changed source hash: `reopened`
- Duplicate unchanged anomaly: existing incident updated with occurrence count and event history

## Security Controls

- Tenant is derived from `protect` context using `tenantGuard: "handler-derived"`.
- Assignment and management actions require `controls.manage`.
- Acknowledge uses `controls.audit.read`.
- Resolve, suppress, request waiver, and approve waiver require fresh auth with a 300-second max age.
- Waiver approval blocks same actor requester/approver.
- Incident metadata sanitizes sensitive keys such as raw payloads, tokens, credentials, account, bank, salary, phone, and related fields.

## Verification

- `npm run prisma:validate` passed.
- `npx prisma generate --no-engine` passed.
- Focused Jest tests passed: 5 suites, 16 tests.
- `npm run typecheck` passed.
- `git diff --check -- prisma\schema.prisma services\assurance actions\assurance` passed.

## Remaining Gaps

- Manager-facing incident list/detail UI is not yet built.
- Alert delivery is persisted for in-app/future channels but not yet dispatched through the notification provider.
- Waiver rejection/revocation actions are modeled but not exposed yet.
- Incident-to-Manager Action Center projection can be added after the UI and notification routing rules are finalized.

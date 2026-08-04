# Referral War Room Phase 4 Slice 428 Selection Report

Generated: 2026-08-02
Phase: Phase 4, Accountant Portal And Close Pack
Orchestrator: `stoquify-referral-war-room-orchestrator`
Selected skill: `stoquify-daily-truth-command-center`
Source skills: `stoquify-accountant-close-portal`, `013-aqstoqflow-data-trust-accountant-portal`
Communication control: `/caveman full`

## Decision

Select Slice 428: **Client Missing-Proof Manager Action Center Composition Foundation**.

Slice 426 created typed request truth. Slice 427 created a tenant-safe client-recipient queue. Next direct roadmap dependency: compose that source-owned queue into existing tenant manager action center without adding a second source of truth or speculative UI.

## Evidence

- Roadmap acceptance requires missing-evidence requests to flow to client's action center.
- Existing tenant manager action center already composes source-owned action descriptors and renders generic link actions.
- Slice 427 queue is not consumed outside accounting service tests.
- Existing manager action public boundary supplies authenticated organization, actor, permissions, tenant-wide access, and dashboard module control.
- `close_assurance` is an existing commercial module with `accounting.close.read` and an accounting dependency.
- Location-responsibility action center has no tenant-wide close authority and must remain unchanged.

## Candidate Comparison

1. Queue-to-action-center composition: direct roadmap dependency, existing UI-compatible, no schema, bounded scope. Selected.
2. Missing-proof response/resolution command: valuable but needs lifecycle, evidence attachment, and close-state policy decisions. Deferred.
3. PostgreSQL JSON-path integration harness: useful release evidence, but does not create user-visible workflow value alone. Deferred.
4. Accountant identity/retention constraints: high integrity value but migration and deletion-policy scope is broader. Deferred.
5. Accountant portfolio pagination: useful scale work, lower immediate workflow value. Deferred.
6. Organization-timezone policy: cross-platform policy work, unnecessary for absolute urgency composition. Deferred.

## Scope

- Extend manager action-center contracts with typed missing-proof source state.
- Read Slice 427 queue only for tenant-wide actors holding `accounting.close.read`.
- Enforce `close_assurance` module entitlement before queue read.
- Pass only server-resolved organization, actor, and permission evidence to queue service.
- Represent source state as available, hidden, or unavailable without exposing raw errors.
- Map valid requests to assigned generic link actions.
- Map queue evidence blockers to generic blocked actions.
- Map source failure to one generic availability blocker instead of silently claiming an empty queue.
- Preserve raw-metadata redaction and existing action sorting, summary, run-sheet, command-brief, and generic UI contracts.
- Add focused runtime tests and a report-trust release ratchet.

## Failure And Privacy Policy

- Missing RBAC: hidden source; no entitlement lookup, queue read, or existence count.
- Denied module entitlement: hidden source; no queue read.
- Queue read failure after authorization: unavailable source plus one generic blocked action; raw exception text withheld.
- Invalid stored request evidence: preserve Slice 427 generic blocker and source-table provenance; no raw metadata.
- Location-scoped manager access: no tenant missing-proof queue composition.

## Expected Files

- `services/manager-action-center/manager-action-center-contracts.ts`
- `services/manager-action-center/manager-action-center.service.ts`
- `services/manager-action-center/__tests__/manager-action-center.service.test.ts`
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`
- generated readiness evidence and Slice 428 reports/status.

## Acceptance Gates

- Tenant-wide resolved access remains mandatory.
- RBAC fails before module or queue reads.
- `close_assurance` module entitlement uses enforce mode and audit evidence.
- Queue input contains only server-resolved organization, actor, and permissions.
- Caller time or recipient override cannot reach queue.
- Valid requests retain request text, finding severity, due date, close action path, and permission.
- Corrupt evidence becomes blocked action with generic detail and redacted metadata.
- Authorized source failure becomes generic blocked action, not false empty state.
- Existing signal, assurance, reconciliation, inventory-loss, summary, sorting, and UI contracts remain green.
- Static gate rejects permission, entitlement, tenant/actor, source-state, redaction, blocker, or composition regressions.

## Non-Goals

- No new public action, route, page, component, hook, or translation.
- No response, upload, completion, dismissal, reassignment, or resolution command.
- No schema, migration, cursor pagination, or timezone policy.
- No external sharing, email, WhatsApp, AI, or POS activation.
- No location-scoped close-request projection.

## Baseline

- Queue plus manager service: 2 suites / 22 tests passed.
- Live report-trust gate: 22/22 ready, zero blockers.

## Next Step

Run `stoquify-daily-truth-command-center` for Slice 428 under war-room control, consulting `stoquify-accountant-close-portal` and `013-aqstoqflow-data-trust-accountant-portal`.

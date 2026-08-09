# Client Missing-Proof Response Command Slice 429 Report

Date: 2026-08-08

Phase: Phase 4, Accountant Portal And Close Pack

Primary skill: `stoquify-accountant-close-portal`

Control path: `/caveman full` -> `/stoquify-referral-war-room` -> `/stoquify-accountant-close`

Supporting controls: `013-aqstoqflow-data-trust-accountant-portal`, `004-aqstoqflow-business-event-gateway`, `aqstoqflow-release-verification-foundation`, `stoquify-release-evidence-ratchet`

## Decision

Phase 4 / Slice 429, **Client Missing-Proof Recipient Response Command Foundation**, is certified for the current worktree.

Repository integration and production deployment remain NO-GO. This certification covers the narrow response command and its current-worktree evidence only.

## Before

- Slice 426 owned typed missing-proof request creation.
- Slice 427 owned the tenant-safe recipient queue.
- Slice 428 projected those requests into the tenant manager action center.
- No request-bound command proved that a response came from the original active recipient and current finding owner.
- Generic comments did not provide response-specific authority, lifecycle, audit, event, or replay evidence.
- Report-trust readiness was 23/23.

## After

- The protected action accepts only `requestId`, response text, and an optional correlation ID.
- Organization, actor, permissions, recipient, request author, finding, period, close run, and request correlation are resolved from protected or stored server evidence.
- The service requires an active tenant actor, typed request evidence, original recipient identity, allowed finding state, and current finding ownership.
- Exact replay returns the existing typed response; conflicting correlation reuse fails safely.
- One serializable transaction moves the finding only to `IN_REVIEW`, creates the typed response comment, writes audit evidence, and emits the business event/outbox evidence.
- Audit and event payloads contain identifiers and status, not response text or raw request metadata.
- Report-trust readiness is 24/24 with zero blockers.

## Files

- `services/accounting/missing-close-evidence-request-queue-contracts.ts`
- `services/accounting/close-assurance.schemas.ts`
- `services/accounting/close-assurance.service.ts`
- `actions/accounting/close-assurance.actions.ts`
- `services/accounting/__tests__/close-assurance.service.test.ts`
- `actions/accounting/__tests__/close-assurance.actions.test.ts`
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`
- `what-next/report-trust-export-readiness.md`
- `what-next/report-trust-export-readiness.json`

## Authority And Evidence

- Permission: `accounting.close.finding.comment` through the protected action.
- Active membership: server lookup by authenticated actor and protected organization before request lookup.
- Request scope: exact request ID, protected organization, `CLIENT_ACTION_REQUIRED`, and `MISSING_CLOSE_EVIDENCE`.
- Recipient authority: stored `requestedFromId` must equal the authenticated actor.
- Finding authority: exact organization, period, close run, allowed lifecycle state, and current owner.
- Transition: only `CloseFindingStatus.IN_REVIEW` plus correlation ID.
- Response evidence: `MISSING_CLOSE_EVIDENCE_RESPONSE` and `CLIENT_RESPONSE_SUBMITTED`.
- Audit action: `CLOSE_MISSING_EVIDENCE_RESPONSE_SUBMITTED`.
- Business event: `close.assurance.missing_evidence.response_submitted`.
- Notification owner: the requesting accountant from stored request evidence.

## Verification

| Check | Result |
| --- | --- |
| Action and service suites | 2 suites / 71 tests passed |
| Full focused boundary regression | 5 suites / 204 tests passed |
| Report-trust mutation suite | 1 suite / 107 tests passed |
| TypeScript | `npm run typecheck` passed |
| Scoped ESLint | Passed with zero errors |
| Live report-trust gate | 24/24 ready, zero blockers |
| Scoped diff hygiene | `git diff --check` passed |
| Conflict-marker scan | No matches |

The final verification was run after formatter churn was removed and the semantic changes were reapplied to the original file style.

## Non-Goals Preserved

- No UI, hook, page, route, translation, or browser workflow.
- No evidence upload or attachment policy.
- No queue or action-center response-state projection.
- No accountant acceptance, finding resolution, waiver, approval, certification, or close completion.
- No schema or migration.
- No external delivery, AI authority, WhatsApp authority, or POS activation.

## Residual Risk

- The recipient queue and manager action center do not yet project submitted response state; a follow-up source-owned read-model slice is required.
- PostgreSQL JSON-path integration evidence remains open.
- Accountant identity foreign keys, retention/deletion policy, lifecycle constraints, pagination, organization-timezone policy, repository ownership, and exact deployment evidence remain open.

## Handoff

Return to `stoquify-referral-war-room-orchestrator` under `/caveman full` for a fresh Phase 4 audit. The leading candidate is a narrow response-state projection into the source-owned queue and existing manager action center, but it must be selected from current evidence before product code changes.

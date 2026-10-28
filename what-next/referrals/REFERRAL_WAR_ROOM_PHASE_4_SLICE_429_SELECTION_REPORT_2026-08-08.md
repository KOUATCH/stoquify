# Referral War Room Phase 4 Slice 429 Selection Report

Generated: 2026-08-08
Phase: Phase 4, Accountant Portal And Close Pack
Run mode: `/caveman full` orchestration and selection
Orchestrator: `stoquify-referral-war-room-orchestrator`
Selected skill: `stoquify-accountant-close-portal`
Supporting skills: `013-aqstoqflow-data-trust-accountant-portal`, `004-aqstoqflow-business-event-gateway`, `aqstoqflow-release-verification-foundation`, `stoquify-release-evidence-ratchet`

## Decision

Select Slice 429: **Client Missing-Proof Recipient Response Command Foundation**.

This is a selected implementation slice, not a completed implementation. The `/caveman full` pass changed no product code.

## Why This Slice Is Next

- Slice 426 created the durable, typed accountant request command.
- Slice 427 created the tenant-safe, recipient-owned missing-proof queue.
- Slice 428 projected that queue into the existing tenant manager action center.
- The roadmap requires the client recipient to respond from the controlled close workflow.
- Live code has only `commentOnCloseFinding`, a generic comment command. It is not bound to a missing-proof request, does not prove the caller is the requested recipient, and does not create response-specific audit or business-event evidence.
- Existing `AccountantComment` and `CloseAssuranceFinding` fields can support a narrow response command without a schema migration.

## Candidate Comparison

1. Recipient response command foundation: closes the next direct workflow dependency with existing persistence and bounded authority. Selected.
2. Full response, evidence upload, accountant acceptance, and finding resolution: too broad; evidence attachment, close-state, segregation-of-duties, and certification invalidation policy must be decided first. Deferred.
3. Response-state projection into the queue and manager action center: depends on the response contract selected here. Deferred to the immediate follow-up slice.
4. PostgreSQL JSON-path queue integration evidence: important release evidence but does not close the missing user command. Deferred.
5. Accountant identity, retention, organization deletion, pagination, timezone, and repository ownership work: still important but broader than this workflow command. Deferred.

## Selected Contract

Add one server-owned command that lets the authenticated client recipient submit a response to one typed missing-proof request.

The command should accept only:

- `requestId`
- response text
- optional caller correlation ID

Organization, actor, recipient, finding, period, close run, request author, and request correlation must be resolved on the server.

## Required Authority And State Checks

- Require an authenticated, active user in the request organization.
- Use a protected action with the existing high-risk `accounting.close.finding.comment` permission unless implementation evidence proves a dedicated permission is necessary.
- Load the original `AccountantComment` by server-resolved organization and request ID.
- Require visibility `CLIENT_ACTION_REQUIRED` and request type `MISSING_CLOSE_EVIDENCE`.
- Require complete typed metadata, including `requestedById`, `requestedFromId`, due date, and correlation ID.
- Require `requestedFromId` to equal the authenticated actor.
- Require the linked finding to belong to the same organization and to remain in an allowed open lifecycle state.
- Require the authenticated actor to remain the finding owner when the response is submitted.
- Reject cross-tenant, non-recipient, inactive-recipient, malformed-evidence, resolved, and waived cases with safe errors.

## Required Mutation And Evidence

- Create a typed response `AccountantComment` linked to the original request and finding.
- Use a distinct response type such as `MISSING_CLOSE_EVIDENCE_RESPONSE` and a distinct visibility such as `CLIENT_RESPONSE_SUBMITTED`.
- Store only identifiers and lifecycle metadata needed to prove the relationship; do not copy raw request metadata into events or audit payloads.
- Move the finding to `IN_REVIEW` without setting `resolvedAt`, `resolvedById`, `resolutionNotes`, waiver, review approval, certification, or close completion fields.
- Write audit action `CLOSE_MISSING_EVIDENCE_RESPONSE_SUBMITTED`.
- Emit business event `close.assurance.missing_evidence.response_submitted` atomically with the response comment and finding update.
- Use the existing serializable transaction and replay-safe retry pattern.
- Treat `requestId` plus correlation ID as the response replay boundary: matching replay returns the existing response; conflicting replay fails safely.

## Expected Files

- `services/accounting/close-assurance.schemas.ts`
- `services/accounting/close-assurance.service.ts`
- `actions/accounting/close-assurance.actions.ts`
- `services/accounting/__tests__/close-assurance.service.test.ts`
- `actions/accounting/__tests__/close-assurance.actions.test.ts`
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`
- generated report-trust readiness evidence after the gate passes

Touch `services/accounting/missing-close-evidence-request-queue.service.ts` only if the implementation cannot preserve truthful queue behavior without doing so. Queue completion/projection is otherwise a separate follow-up slice.

## Acceptance Gates

- The action accepts no caller-owned tenant, actor, recipient, finding, or accountant authority.
- RBAC and active tenant membership are verified before mutation.
- The service proves the caller is the original request recipient and current finding owner.
- Request evidence and finding state are validated before creating a response.
- Response comment, finding transition, audit record, and business event commit atomically.
- Business-event, outbox, and audit payloads contain identifiers and status only; response text and raw metadata remain out of those payloads.
- Matching idempotent replay returns the existing response; conflicting replay returns a safe conflict.
- The finding moves only to `IN_REVIEW`; response submission cannot resolve, waive, approve, certify, or close.
- Existing request creation, recipient queue, and manager action-center behavior remains green.
- Report-trust readiness gains one focused response-command check and remains blocker-free.

## Focused Verification Plan

```powershell
npm test -- --runInBand actions/accounting/__tests__/close-assurance.actions.test.ts services/accounting/__tests__/close-assurance.service.test.ts services/accounting/__tests__/missing-close-evidence-request-queue.service.test.ts lib/security/__tests__/rbac-permissions.test.ts scripts/__tests__/report-trust-export-gate.test.js
npm run typecheck
npx eslint services/accounting/close-assurance.schemas.ts services/accounting/close-assurance.service.ts actions/accounting/close-assurance.actions.ts services/accounting/__tests__/close-assurance.service.test.ts actions/accounting/__tests__/close-assurance.actions.test.ts scripts/report-trust-export-gate.js scripts/__tests__/report-trust-export-gate.test.js
npm run report:trust:export:gate
git diff --check -- <touched-files>
```

## Baseline Evidence

- Earlier completed focused baseline in this goal run: 5 suites / 169 tests passed.
- A 2026-08-08 rerun of the same command timed out after 124.1 seconds before Jest returned a result. This attempt is recorded as timed out, not passed or failed.
- Current generated report-trust readiness remains 23/23 ready with zero blockers, dated 2026-08-02.
- The current worktree has no modifications in the selected close-assurance service, action, schema, queue, RBAC, or report-trust files.

## Non-Goals

- No UI, component, hook, page, route, translation, or browser workflow.
- No evidence upload or attachment policy.
- No queue/action-center response-state projection.
- No accountant acceptance, finding resolution, waiver, certification, or close completion.
- No schema or migration.
- No external link, email, WhatsApp, AI authority, or autonomous action.
- No POS cash-shortage activation.

## Blockers And Residual Risk

- Slice 429 is not implemented or certified.
- A response submitted through the new command will need a follow-up service-owned projection before it becomes a complete user-facing action-center workflow.
- PostgreSQL JSON-path queue integration evidence remains open.
- Accountant identity foreign keys, retention and deletion policy, database lifecycle constraints, repository ownership, pagination, timezone policy, and exact deployment evidence remain unresolved.
- Current-worktree evidence does not certify repository integration or production deployment.

## Next Step

Run `/stoquify-accountant-close` for Slice 429 under referral war-room control. Do not advance to UI or response-state projection until this command contract passes its focused gates.

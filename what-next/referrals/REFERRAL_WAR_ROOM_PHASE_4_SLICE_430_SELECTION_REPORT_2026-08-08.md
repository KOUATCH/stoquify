# Referral War Room Phase 4 Slice 430 Selection Report

Generated: 2026-08-08

Phase: Phase 4, Accountant Portal And Close Pack

Run mode: `/caveman full` orchestration and selection

Orchestrator: `stoquify-referral-war-room-orchestrator`

Selected skill: `stoquify-accountant-close-portal`

Supporting skills: `stoquify-daily-truth-command-center`, `013-aqstoqflow-data-trust-accountant-portal`, `aqstoqflow-release-verification-foundation`, `stoquify-release-evidence-ratchet`

## Decision

Select Slice 430: **Client Missing-Proof Response-State Queue And Action-Center Projection Foundation**.

This pass selects and defines the slice. It does not implement Slice 430 product code.

## Evidence

- Slice 429 is certified and creates one typed `CLIENT_RESPONSE_SUBMITTED` comment while moving the finding to `IN_REVIEW`.
- The live recipient queue still includes `IN_REVIEW` in its open finding set.
- The queue reads only `CLIENT_ACTION_REQUIRED` request comments and has no response-state contract.
- A valid response can therefore continue to appear as assigned or overdue client work after submission.
- The manager action center maps every queue request to an assigned `ACCOUNTANT_REQUEST` action and cannot distinguish submitted response state.
- The roadmap requires an owner to respond from one action center and requires action-center tasks to carry truthful status and resolution lifecycle.
- The available code graph predates the Slice 427-429 queue files, so live service imports and tests are the authoritative dependency evidence.

## Candidate Comparison

1. Response-state queue and action-center projection: closes the immediate truth gap created by the certified response command using existing persistence. Selected.
2. Accountant acceptance and finding resolution command: depends on a truthful response projection and requires additional review/segregation/certification policy. Deferred.
3. Evidence upload: requires storage, file validation, redaction, retention, and evidence-attachment ownership. Deferred.
4. PostgreSQL JSON-path integration evidence: important for deployment confidence but does not repair the false actionable state. Deferred.
5. Identity, retention, pagination, timezone, repository, and deployment controls: remain important broader gates. Deferred.

## Selected Contract

Extend the source-owned recipient queue so each valid request has one explicit workflow state:

- `AWAITING_RECIPIENT_RESPONSE`
- `RESPONSE_SUBMITTED`

For a submitted response, expose only relationship and lifecycle evidence needed by downstream composition:

- response ID
- response correlation ID
- responding actor ID
- response submission timestamp
- status `SUBMITTED`

Do not expose response text or raw response metadata through the queue or action-center contract.

## Required Read-Model Checks

- Preserve protected organization, authenticated actor, active membership, RBAC, owner, and request-recipient scoping before reads.
- Read typed response comments only by protected organization, `CLIENT_RESPONSE_SUBMITTED`, and `MISSING_CLOSE_EVIDENCE_RESPONSE`.
- Require response metadata to match the selected request ID, request correlation, request author, request recipient, response author, finding, period, and close run.
- Require a valid submitted response to pair with finding status `IN_REVIEW` and the authenticated actor as current owner.
- Keep open/assigned/reopened findings without response evidence in `AWAITING_RECIPIENT_RESPONSE`.
- Treat `IN_REVIEW` without valid response evidence, response evidence on an incompatible finding state, duplicate response evidence, and malformed relationship metadata as generic `INVALID_RESPONSE_EVIDENCE` blockers.
- Preserve bounded reads, deterministic ordering, service-owned time, truncation disclosure, and raw-metadata redaction.

## Required Action-Center Projection

- `AWAITING_RECIPIENT_RESPONSE` remains an assigned actionable accountant request using the existing close path.
- `RESPONSE_SUBMITTED` becomes waiting work with source-owned text such as “Response submitted; awaiting accountant review.”
- Submitted work must not remain overdue or assigned to the client as an unanswered request.
- Invalid response evidence becomes one generic blocked action without response text, raw metadata, or raw source errors.
- Existing tenant-wide access, `accounting.close.read`, enforced audited `close_assurance` entitlement, hidden-state behavior, and generic source-failure behavior remain unchanged.
- Existing generic UI rendering should consume the revised action state; no speculative component or route work is selected.

## Expected Files

- `services/accounting/missing-close-evidence-request-queue-contracts.ts`
- `services/accounting/missing-close-evidence-request-queue.service.ts`
- `services/accounting/__tests__/missing-close-evidence-request-queue.service.test.ts`
- `services/manager-action-center/manager-action-center.service.ts`
- `services/manager-action-center/__tests__/manager-action-center.service.test.ts`
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`
- generated report-trust readiness evidence
- dated implementation and release-evidence reports

Touch other files only if live evidence proves they are required for this exact projection.

## Acceptance Gates

- The queue never infers response state from finding status alone.
- Typed request and response evidence are relationship-validated and tenant/recipient-scoped.
- Response body and raw metadata remain redacted from queue, blockers, action-center actions, logs, and gate output.
- A valid response no longer appears as unanswered, assigned, or overdue recipient work.
- Corrupt response evidence fails closed as a generic blocker.
- Hidden RBAC or module states do not enumerate request/response existence.
- Authorized source failures remain generic.
- Existing request command, response command, queue authority, and manager action-center access controls remain green.
- Report-trust gains one focused response-state projection check and remains blocker-free.

## Focused Verification Plan

```powershell
npm test -- --runInBand services/accounting/__tests__/missing-close-evidence-request-queue.service.test.ts services/manager-action-center/__tests__/manager-action-center.service.test.ts services/accounting/__tests__/close-assurance.service.test.ts scripts/__tests__/report-trust-export-gate.test.js
npm run typecheck
npx eslint services/accounting/missing-close-evidence-request-queue-contracts.ts services/accounting/missing-close-evidence-request-queue.service.ts services/accounting/__tests__/missing-close-evidence-request-queue.service.test.ts services/manager-action-center/manager-action-center.service.ts services/manager-action-center/__tests__/manager-action-center.service.test.ts scripts/report-trust-export-gate.js scripts/__tests__/report-trust-export-gate.test.js
npm run report:trust:export:gate
git diff --check -- <touched-files>
```

## Baseline

- Queue and manager action-center baseline: 2 suites / 27 tests passed on 2026-08-08.
- Slice 429 combined boundary regression: 5 suites / 204 tests passed.
- Live report-trust readiness: 24/24, zero blockers.
- No Slice 430 product-code edit was made by this orchestration pass.

## Non-Goals

- No response command changes.
- No accountant acceptance, finding resolution, waiver, certification, or close completion.
- No upload or attachment workflow.
- No UI, route, page, component, hook, translation, or browser workflow.
- No schema or migration.
- No external delivery, AI authority, WhatsApp authority, or POS activation.

## Residual Risk

- PostgreSQL JSON-path integration evidence remains open.
- Identity foreign keys, retention/deletion policy, database lifecycle constraints, pagination, organization-timezone policy, repository ownership, and exact deployment evidence remain unresolved.
- Current-worktree selection does not certify repository integration or production deployment.

## Next

Run `/stoquify-accountant-close` for Slice 430 under referral war-room control, consulting `stoquify-daily-truth-command-center`. Stop after the service-owned response-state queue and existing manager action-center composition are green; do not advance to acceptance/resolution or UI.

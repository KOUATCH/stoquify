# Accountant Missing-Proof Response Review Queue Slice 431 Report

Date: 2026-08-08
Phase: 4
Slice: 431
Primary skill: `stoquify-accountant-close-portal`

## Outcome

Slice 431 is certified for the current worktree as a bounded, service-owned accountant review read model.

The slice closes the visibility gap between the client response command and a future accountant acceptance command. An authorized tenant accountant or delegated accountant with `REVIEW` capability can now read one request-bound response queue without relying on the broad close dashboard or weakening the client and manager redaction boundaries.

Repository integration and production deployment are not certified.

## Implemented Boundary

- `services/accounting/missing-close-evidence-accountant-review-queue-contracts.ts` defines the versioned queue, `accounting.close.accountant.review` permission, bounded reads, authorized response-text exposure, redaction policy, generic blocker vocabulary, and explicit controls.
- `services/accounting/missing-close-evidence-accountant-review-queue.service.ts` validates nonblank authority inputs and RBAC before database work.
- The service verifies an active actor in the home tenant before resolving tenant-member or delegated client access.
- Delegated scope is resolved by `resolveAccountantClientAccess` with `REVIEW`; `READ_ONLY`, missing, expired, revoked, wrong-accountant, and wrong-client grants fail before client evidence is returned.
- The target organization comes only from the resolved access result. Caller-owned organization or clock inputs cannot replace service authority.
- One repeatable-read transaction loads only `IN_REVIEW` findings with typed missing-proof request evidence.
- Finding candidates are capped at 101; each request and response candidate query is capped at 201; both finding and comment truncation paths return no queue items and one generic truncation blocker.
- Each finding requires exactly one typed request and exactly one typed response.
- Organization, period, close run, finding, request ID, request correlation, response correlation, requester, recipient, response author, and finding owner relationships are revalidated before text is exposed.
- Valid items are ordered by oldest response submission time, then request ID.

## Redaction And Truth

- Request and response text are exposed only in this accountant-authorized review queue.
- Raw request and response metadata are never returned.
- Unrelated comments, contact data, authentication data, and broad tenant ledger data are excluded.
- Corrupt, missing, duplicate, state-inconsistent, or truncated evidence fails closed with generic blocker detail.
- The queue is a read model. It does not accept evidence, resolve findings, certify close, or become a source of accounting truth.

## Focused Evidence

- Contract anchor: `services/accounting/missing-close-evidence-accountant-review-queue-contracts.ts:6`.
- Service entry point: `services/accounting/missing-close-evidence-accountant-review-queue.service.ts:172`.
- Bounded finding query: `services/accounting/missing-close-evidence-accountant-review-queue.service.ts:238`.
- Deterministic ordering: `services/accounting/missing-close-evidence-accountant-review-queue.service.ts:502`.
- Focused service suite: `services/accounting/__tests__/missing-close-evidence-accountant-review-queue.service.test.ts:168`.
- Report-trust classifier: `scripts/report-trust-export-gate.js:2034`.
- Report-trust check registration: `scripts/report-trust-export-gate.js:2414`.
- Mutation matrix: `scripts/__tests__/report-trust-export-gate.test.js:1970`.

## Verification

- New service suite: 1 suite / 20 tests passed.
- Report-trust gate suite: 1 suite / 159 tests passed, including 31 Slice 431 mutations.
- Combined Slice 429-431 regression: 6 suites / 284 tests passed.
- TypeScript: `npm run typecheck` passed.
- Scoped ESLint passed for the new contracts, service, service tests, gate, and gate tests.
- Live report-trust gate: 26/26 ready, zero blockers.
- Scoped conflict-marker, trailing-whitespace, and `git diff --check` verification passed.

The live gate initially reported 25/26 because a broad static predicate treated the trusted internal `queueResult` field `input.organizationId` as caller authority. The predicate was narrowed to reject only `const organizationId = input.organizationId`; the certified service continues to derive the target from `access.organizationId`. The ratchet also now requires both bounded comment reads, both fail-closed truncation paths, the bounded visible-finding slice, and the request-ID ordering tie breaker.

## Non-Goals Preserved

- No accountant acceptance or rejection command.
- No `CloseFindingStatus.RESOLVED` transition.
- No action, route, hook, UI, dashboard, schema, or migration.
- No evidence upload, signed statement network, public link, external delivery, AI, copilot, WhatsApp, or POS production activation.
- No PostgreSQL integration, repository ownership, deployment, or production-readiness claim.

## Next Decision

No Slice 432 is selected by this implementation pass. The next war-room audit may evaluate a narrow accountant acceptance/resolution command that consumes this queue, preserves immutable request/response evidence, enforces fresh authority and idempotency, and writes audit/business-event evidence. Statement Proof Network work remains behind completion of the accountant close loop.

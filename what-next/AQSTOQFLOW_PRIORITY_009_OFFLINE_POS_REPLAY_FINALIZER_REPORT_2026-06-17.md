# AqStoqFlow Priority 009 Offline POS Replay Finalizer Report

Generated: 2026-06-17

## Skills Run

- `aqstoqflow-offline-pos-replay-finalizer`
- `priority-009-offline-pos-replay-finalizer`
- `exam-011-aqstoqflow-offline-pos-replay-finalizer`

Companion guidance applied from the offline POS sync, enterprise POS, ledger-first business events, OHADA compliance, enterprise error handling, fraud/controls, and OHADA SaaS backbone skills.

## Outcome

Status: complete and verified for the current implementation slice.

No additional source patch was required in this run. The repository already contains the service-owned offline POS replay implementation required by the selected skills, and the focused tests plus structural gates pass.

## Implementation Evidence

- `services/pos/offline-sync.service.ts`
  - Owns `replayPendingOfflineSaleEnvelope`.
  - Loads offline events by organization scope.
  - Accepts only `OFFLINE_SALE_CAPTURED` events.
  - Allows replay only from `PENDING_REPLAY`, with idempotent handling for `REPLAYED`, `DUPLICATE_REPLAY`, and `BLOCKED`.
  - Recomputes and validates payload hash evidence before finalization.
  - Validates replay scope against accepted terminal, location, and session evidence.
  - Sends the sale through `commitPOSSale` instead of mutating sale, stock, ledger, payment, or fiscal truth directly.
  - Detects interrupted replay by checking for a completed sale and posted sale journal entry before retrying or blocking.
  - Marks successful replay with business-event evidence, audit logs, posting batch, fiscal document metadata, document hash, and refreshed close-blocker certificate state.
  - Blocks failed replay with a `POSOfflineSyncConflict`, safe blocker code/message, business event, audit log, and refreshed certificate state.

- `actions/pos/sync.actions.ts`
  - Keeps offline replay as a thin protected server action.
  - Uses `protect` with `pos.use`.
  - Derives `organizationId` and `userId` from the trusted session/RBAC context, not client input.
  - Revalidates POS/offline sync/accountant portal surfaces after replay.

- `services/pos/pos.service.ts`
  - Provides the canonical `commitPOSSale` path used by replay.
  - Handles transactional POS finalization, inventory issue events, payment/accounting postings, audit logs, business event emission, receipt payload generation, and fiscal document creation through the compliance service.

- `prisma/schema.prisma`
  - Contains durable offline POS replay states and evidence fields, including `PENDING_REPLAY`, `DUPLICATE_REPLAY`, `REPLAYED`, `BLOCKED`, payload hash, entry hash, document hash, posting batch, blocker code, and blocker message.

## Regression Coverage Verified

- Accepted pending offline sale replays through POS finalization.
- Duplicate already-replayed envelopes do not finalize twice.
- POS finalization rollback creates a blocked replay conflict.
- Payload hash mismatch blocks replay before POS finalization.
- Terminal/location/session scope mismatch blocks replay before POS finalization.
- Low-level infrastructure errors are redacted into safe blocker messages.
- Interrupted replay recognizes an already completed sale and marks the event idempotently.
- Fiscal-document ineligible replay preserves `NOT_CREATED` certification metadata.
- Fiscal eligible replay preserves queued fiscal metadata and legal delivery blockers.
- Protected action tests verify RBAC wiring, tenant/actor derivation, and safe forbidden responses.

## Verification

- `npm test -- services/pos/__tests__/offline-sync.service.test.ts actions/pos/__tests__/sync.actions.test.ts --runInBand`
  - Passed: 2 suites, 22 tests.

- `npm test -- services/pos/__tests__/pos.service.test.ts --runInBand`
  - Passed: 1 suite, 10 tests.

- `npm run prisma:validate`
  - Passed. Prisma schema is valid.
  - Note: Prisma emitted the existing package.json Prisma config deprecation warning for future Prisma 7 migration.

- `npm run service:boundary:ratchet`
  - Passed.
  - Current active findings: 165.
  - Baseline active findings: 283.
  - New active findings: 0.
  - Ratchet status: passed.

- `npm run error:boundary:fail`
  - Passed.
  - Active unsafe raw-error findings: 0.

- `npm run typecheck`
  - Passed.

- `npm run inventory:boundary:fail`
  - Passed.
  - Active inventory boundary violations: 0.

## Remaining Risks

- The offline POS replay finalizer slice is complete.
- System-wide service-boundary debt remains outside this slice: 165 active findings, mostly legacy action/App Router/UI Prisma coupling and action-owned mutation paths. The ratchet confirms this slice did not add new debt.
- Prisma package configuration should later move to a Prisma config file before Prisma 7.

## Recommended Next Slice

Continue the priority suite with certification and compliance hardening:

1. Run `priority-010-certification-assurance-hardener` for deeper certification assurance.
2. Follow with country adapter hardening where offline POS fiscal authority delivery requires real provider integration.

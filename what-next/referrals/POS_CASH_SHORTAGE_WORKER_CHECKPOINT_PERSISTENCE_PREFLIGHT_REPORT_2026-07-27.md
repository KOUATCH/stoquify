# POS Cash-Shortage Worker Checkpoint Persistence Preflight Report - 2026-07-27

## Scope

Phase 3 / Slice 25 adds a read-only preflight that describes the durable checkpoint persistence contract required before the dormant POS cash-shortage worker can ever be considered for production activation.

This slice does not add a Prisma model, migration, worker execution, scheduler, route, action, incident command integration, dashboard, notification, inventory-loss behavior, AI authority, or WhatsApp authority.

## Before State

- Slice 24 certified only the scheduler-policy preflight shape.
- The production activation preflight still treated worker checkpoint persistence as a blocking activation requirement.
- The live Prisma schema did not contain a dedicated `PosCashShortageWorkerCheckpoint` model.
- No durable checkpoint persistence readiness evidence existed beyond the earlier worker checkpoint contract.

## After State

- `services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts` now evaluates the expected future checkpoint schema shape without importing Prisma or writing data.
- The preflight requires a dedicated checkpoint model with tenant/check identity, window bounds, cursor payload, lease fields, retry and dead-letter fields, idempotent window identity, ready-work indexing, and lease-recovery indexing.
- The current live schema remains `blocked` because no `PosCashShortageWorkerCheckpoint` model exists.
- A future valid schema fixture is classified as `certified`, and incomplete future fixtures remain `blocked`.
- `activationAuthorized` remains `false` in every result.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
  - Passed: 1 suite, 4 tests.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-contract.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
  - Passed: 3 suites, 15 tests.
- `npm run typecheck`
  - Passed.
- `npx eslint services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
  - Passed.
- Source-only activation scan:
  - `rg -n "CHECK_RUNNERS|scheduleWorkflow|cron|workerId|leaseToken\s*=|router|createSafeAction|recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident|db\.|prisma|migrate|migration" services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts`
  - No matches.
- Broad activation scan:
  - `rg -n "POS_CASH_SHORTAGE_CHECK_RUNNERS\s*\.set|scheduleWorkflow|cash-shortage.*cron|recordWorkflowAssuranceIncident\(|transitionWorkflowAssuranceIncident\(|createSafeAction\(|router\(" app actions config prisma scripts services/leakage`
  - Matches only existing test assertions.
- `git diff --check -- services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
  - Passed with the existing CRLF normalization warning for `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`.

## Certification Decision

Slice 25 is certified as a read-only checkpoint persistence preflight. The required future durable checkpoint persistence shape is now explicit and tested, while the live product remains blocked from POS cash-shortage worker activation until a separately selected slice creates and migrates the actual persistence model and all downstream production gates are satisfied.

No Slice 26 is selected by this report.

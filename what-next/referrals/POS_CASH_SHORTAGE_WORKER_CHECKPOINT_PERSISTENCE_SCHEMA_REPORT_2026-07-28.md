# POS Cash-Shortage Worker Checkpoint Persistence Schema Report - 2026-07-28

## Scope

Phase 3 / Slice 26 adds the durable schema foundation required by the previously certified POS cash-shortage worker checkpoint persistence preflight.

This slice adds persistence shape only. It does not add worker execution, scheduler activation, incident command integration, service write commands, routes, actions, dashboards, notifications, inventory-loss behavior, AI authority, or WhatsApp authority.

## Before State

- Slice 25 defined a read-only checkpoint persistence preflight.
- The live Prisma schema remained blocked because `PosCashShortageWorkerCheckpoint` did not exist.
- Worker activation stayed unauthorized because durable checkpoint persistence had no schema foundation.

## After State

- `prisma/schema.prisma` now defines `PosCashShortageWorkerCheckpoint`.
- The model is tenant-owned through `organizationId` and the `Organization` relation.
- The model persists `checkKey`, `workerKey`, status, recorded-time window bounds, cursor payload, last processed cursor, lease fields, retry fields, completion/dead-letter fields, correlation metadata, and timestamps.
- The model declares the idempotent tenant/check/worker/window identity key, ready-work index, lease-recovery index, check-status index, and lease-token index.
- `prisma/migrations/20260728100000_pos_cash_shortage_checkpoint_persistence/migration.sql` creates the backing table with foreign key, window, attempt, and status check constraints.
- The current schema now certifies through the Slice 25 preflight, while `activationAuthorized` remains `false`.

## Verification

- `npx prisma validate`
  - Passed.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts scripts/__tests__/pos-cash-shortage-checkpoint-persistence-migration.test.js`
  - Passed: 2 suites, 8 tests.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts scripts/__tests__/pos-cash-shortage-checkpoint-persistence-migration.test.js services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-contract.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts`
  - Passed: 5 suites, 24 tests.
- `npm run typecheck`
  - Passed.
- `npx eslint services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts`
  - Passed.
- Source-only activation scan:
  - `rg -n "CHECK_RUNNERS|scheduleWorkflow|cron|workerId|leaseToken\s*=|router|createSafeAction|recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident|db\.|prisma\.|migrate\(|migration\(" services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts prisma/migrations/20260728100000_pos_cash_shortage_checkpoint_persistence/migration.sql`
  - No matches.
- Broad activation scan:
  - `rg -n "POS_CASH_SHORTAGE_CHECK_RUNNERS\s*\.set|scheduleWorkflow|cash-shortage.*cron|recordWorkflowAssuranceIncident\(|transitionWorkflowAssuranceIncident\(|createSafeAction\(|router\(" app actions config prisma scripts services/leakage`
  - Matches only guardrail assertions in tests.
- `git diff --check -- prisma/schema.prisma prisma/migrations/20260728100000_pos_cash_shortage_checkpoint_persistence/migration.sql services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts scripts/__tests__/pos-cash-shortage-checkpoint-persistence-migration.test.js what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_26_SELECTION_REPORT_2026-07-28.md`
  - Passed with the existing CRLF normalization warning for `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`.

## Certification Decision

Slice 26 is certified as a schema foundation for POS cash-shortage worker checkpoint persistence. The durable table shape now exists and the preflight certifies the current schema.

Production activation remains blocked and unauthorized. A later slice must separately select and certify service-owned persistence commands, worker leasing behavior, scheduler integration, incident command integration, alert delivery, observability, rollback, owner/security approval, and release gates.

No Slice 27 is selected by this report.

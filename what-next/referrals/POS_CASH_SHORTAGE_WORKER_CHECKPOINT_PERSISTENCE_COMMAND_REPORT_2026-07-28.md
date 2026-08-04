# POS Cash-Shortage Worker Checkpoint Persistence Command Report - 2026-07-28

## Scope

Phase 3 / Slice 27 adds the service-owned persistence command contract for the durable POS cash-shortage worker checkpoint table.

This slice only persists checkpoint lifecycle state. It does not add worker execution, scheduler activation, detector activation, Workflow Assurance incident command invocation, routes, actions, dashboards, notifications, inventory-loss behavior, AI authority, or WhatsApp authority.

## Before State

- Slice 15 provided pure checkpoint transition rules for preparing, advancing, completing, retrying, and dead-lettering future checkpoint batches.
- Slice 25 provided a read-only persistence preflight.
- Slice 26 added the durable `PosCashShortageWorkerCheckpoint` schema and migration.
- No service-owned persistence command existed to safely claim, advance, retry, or dead-letter checkpoint rows.

## After State

- `services/leakage/pos-cash-shortage-worker-checkpoint-persistence.service.ts` now provides service-owned checkpoint persistence commands.
- `ensurePosCashShortageWorkerCheckpoint` creates or reuses a tenant/check/worker/window checkpoint with idempotent identity.
- `leaseNextPosCashShortageWorkerCheckpoint` claims the next due pending or retry-scheduled checkpoint through a compare-and-set update.
- `advancePersistedPosCashShortageWorkerCheckpoint` persists pure checkpoint transitions for partial-page advancement and final-page completion.
- `recordPersistedPosCashShortageWorkerCheckpointFailure` persists retry and dead-letter outcomes with durable error and dead-letter evidence.
- The service maps pure checkpoint statuses to durable statuses:
  - `ready` -> `PENDING` or `RETRY_SCHEDULED`
  - `leased` -> `LEASED`
  - `completed` -> `COMPLETED`
  - `dead_letter` -> `DEAD_LETTERED`
- Mutations of leased checkpoints require tenant, check, worker, checkpoint id, lease owner, lease token, and non-expired lease evidence.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence.service.test.ts`
  - Passed: 1 suite, 9 tests.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence.service.test.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-contract.test.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
  - Passed: 4 suites, 25 tests.
- `npm run typecheck`
  - Passed.
- `npx eslint services/leakage/pos-cash-shortage-worker-checkpoint-persistence.service.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence.service.test.ts`
  - Passed.
- Source-only activation scan:
  - `rg -n "CHECK_RUNNERS|scheduleWorkflow|cron|router|createSafeAction|recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident|loadPosShiftCashShortageBatch|runDormantPosShiftCashShortage" services/leakage/pos-cash-shortage-worker-checkpoint-persistence.service.ts`
  - No matches.
- Broad activation scan:
  - `rg -n "POS_CASH_SHORTAGE_CHECK_RUNNERS\s*\.set|scheduleWorkflow|cash-shortage.*cron|recordWorkflowAssuranceIncident\(|transitionWorkflowAssuranceIncident\(|createSafeAction\(|router\(" app actions config prisma scripts services/leakage`
  - Matches only guardrail assertions in tests.
- Scoped diff hygiene:
  - `git diff --check -- services/leakage/pos-cash-shortage-worker-checkpoint-persistence.service.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence.service.test.ts services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md what-next/referrals/POS_CASH_SHORTAGE_WORKER_CHECKPOINT_PERSISTENCE_PREFLIGHT_REFINEMENT_REPORT_2026-07-28.md what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_27_SELECTION_REPORT_2026-07-28.md`
  - Passed with the existing CRLF normalization warning for `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`.

## Certification Decision

Slice 27 is certified as a service-owned checkpoint persistence command contract.

Production activation remains blocked and unauthorized. A later slice must separately select and certify worker execution behavior, scheduler integration, incident command integration, alert delivery, observability, rollback, owner/security approval, and release gates.

No Slice 28 is selected by this report.

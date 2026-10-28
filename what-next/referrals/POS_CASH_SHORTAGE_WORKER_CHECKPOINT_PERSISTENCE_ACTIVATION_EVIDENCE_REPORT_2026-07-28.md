# POS Cash-Shortage Worker Checkpoint Persistence Activation Evidence Report - 2026-07-28

## Scope

Phase 3 / Slice 28 adds a read-only activation-evidence contract for POS cash-shortage worker checkpoint persistence.

This slice does not execute a worker, schedule a job, activate the detector, invoke Workflow Assurance incident commands, expose routes or actions, create dashboards, send notifications, or grant AI/WhatsApp authority.

## Before State

- Slice 25 certified the checkpoint persistence schema preflight.
- Slice 26 added the durable checkpoint schema and migration.
- Slice 27 added service-owned checkpoint persistence commands.
- The production activation preflight still accepted one coarse `workerCheckpointPersistenceCertified` evidence boolean.

## After State

- `services/leakage/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.ts` now evaluates the checkpoint persistence command source without writing data.
- The command preflight requires:
  - a service-owned checkpoint command module,
  - an ensure checkpoint command,
  - a lease checkpoint command,
  - an advance checkpoint command,
  - a failure checkpoint command,
  - durable status mapping,
  - compare-and-set lease persistence,
  - no runtime activation behavior.
- `composePosCashShortageCheckpointPersistenceActivationEvidence` now defines the production evidence meaning for checkpoint persistence: the production preflight may treat checkpoint persistence as certified only when both schema preflight and command preflight are certified.
- The composed evidence still returns `activationAuthorized: false`.
- Production activation remains blocked until every other requirement is separately certified.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.test.ts`
  - Passed: 1 suite, 6 tests.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence.service.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
  - Passed: 4 suites, 25 tests.
- `npm run typecheck`
  - Passed.
- `npx eslint services/leakage/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.test.ts`
  - Passed.
- Source-only activation scan:
  - `rg -n "CHECK_RUNNERS|scheduleWorkflow|router|createSafeAction|recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident|loadPosShiftCashShortageBatch|runDormantPosShiftCashShortage" services/leakage/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.ts`
  - No matches.
- Broad activation scan:
  - `rg -n "POS_CASH_SHORTAGE_CHECK_RUNNERS\s*\.set|scheduleWorkflow|cash-shortage.*cron|recordWorkflowAssuranceIncident\(|transitionWorkflowAssuranceIncident\(|createSafeAction\(|router\(" app actions config prisma scripts services/leakage`
  - Matches only guardrail assertions in tests.
- Scoped diff hygiene:
  - `git diff --check -- services/leakage/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.test.ts what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_28_SELECTION_REPORT_2026-07-28.md`
  - Passed with the existing CRLF normalization warning for `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`.

## Certification Decision

Slice 28 is certified as a read-only checkpoint persistence activation-evidence contract.

Production activation remains blocked and unauthorized. A later slice must separately select and certify worker execution behavior, scheduler integration, incident command integration, alert delivery, observability, rollback, owner/security approval, and release gates.

No Slice 29 is selected by this report.

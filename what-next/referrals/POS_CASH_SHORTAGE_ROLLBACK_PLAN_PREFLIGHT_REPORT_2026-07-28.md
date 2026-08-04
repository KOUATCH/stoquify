# POS Cash-Shortage Rollback Plan Preflight Report - 2026-07-28

## Scope

Phase 3 / Slice 31 added a POS cash-shortage rollback runbook and a read-only rollback-plan preflight. The slice certifies rollback representation for the production activation checklist without executing rollback, changing activation metadata, scheduling work, running the detector, mutating checkpoints, resolving incidents, sending alerts, or adding product surfaces.

## Before

- The production activation preflight listed `rollback_plan` as unresolved.
- Prior activation-hold and release-gate ratchets blocked accidental enablement.
- Scheduler and checkpoint persistence contracts existed, but no rollback runbook tied those controls together.
- There was no narrow preflight to certify rollback evidence while keeping production activation blocked.

## After

- Added `what-next/referrals/POS_CASH_SHORTAGE_ROLLBACK_RUNBOOK_2026-07-28.md`.
- Added `services/leakage/pos-cash-shortage-rollback-plan-preflight.ts`.
- Added `services/leakage/__tests__/pos-cash-shortage-rollback-plan-preflight.test.ts`.
- The rollback runbook requires:
  - Activation hold restoration with `enabled: false`, `enforceMode: false`, `productionActivationCertified: false`, and non-empty `activationHold`.
  - Scheduler and worker stop path without creating new checkpoints or running the dormant detector.
  - Checkpoint evidence preservation for pending, leased, retry, completed, and dead-letter states.
  - No deletion or rewriting of events, incidents, alert deliveries, audit logs, POS sessions, source hashes, or close evidence.
  - Incident and alert preservation with no silent resolution.
  - Product owner, security owner, and operations owner rollback evidence.
  - Verification commands and activation scans before any future rollback completion claim.
- `composePosCashShortageRollbackPlanActivationEvidence` emits `rollbackPlanCertified: true` only when the preflight certifies and always keeps `activationAuthorized: false`.
- Production activation can now satisfy only `rollback_plan`; it remains blocked by service activation marker, release gate, worker checkpoint persistence, scheduler policy, incident command integration, alert delivery integration, observability runbook, and owner/security approval requirements when those are absent.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-rollback-plan-preflight.test.ts`
  - Passed: 1 suite, 8 tests.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-rollback-plan-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-worker-checkpoint-persistence-command-preflight.test.ts`
  - Passed: 4 suites, 24 tests.
- `npm run typecheck`
  - Passed.
- `npx eslint services/leakage/pos-cash-shortage-rollback-plan-preflight.ts services/leakage/__tests__/pos-cash-shortage-rollback-plan-preflight.test.ts`
  - Passed.
- Source-only activation scan over the new preflight source
  - No matches.
- Broad activation scan over POS cash-shortage surfaces
  - Matched existing generic assurance route/action/script surfaces and test guardrails; no POS cash-shortage runtime rollback or activation wiring was added.
- Non-test leakage runtime scan excluding read-only preflight marker sources
  - No matches.
- `git diff --check -- services/leakage/pos-cash-shortage-rollback-plan-preflight.ts services/leakage/__tests__/pos-cash-shortage-rollback-plan-preflight.test.ts what-next/referrals/POS_CASH_SHORTAGE_ROLLBACK_RUNBOOK_2026-07-28.md what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_31_SELECTION_REPORT_2026-07-28.md`
  - Passed with the known CRLF notice on `REFERRAL_WAR_ROOM_STATUS.md`.

## Decision

Slice 31 is certified as a read-only rollback-plan evidence preflight. It does not authorize production activation, rollback execution, detector execution, worker or scheduler activation, checkpoint mutation, notification delivery, incident command invocation, route/action/UI release, AI authority, or WhatsApp authority. No Slice 32 is selected; return to the war-room orchestrator before choosing the next bounded contract.

# POS Cash-Shortage Resolution Readiness Preflight Report - 2026-07-28

## Scope

Phase 3 / Slice 36 adds a fail-closed readiness preflight for POS cash-shortage terminal resolution safety.

This slice validates readiness evidence only. It does not invoke generic incident commands, mutate incidents, expose routes/actions/UI, start a scheduler or worker, send alerts, or grant AI/WhatsApp authority.

## Before State

- The generic Workflow Assurance incident command and POS cash-shortage lifecycle policy were already certified as representable activation evidence.
- The lifecycle policy checks POS cash-shortage identity, current source hash, triggered evidence metadata, independent reviewer, and resolution evidence hash.
- The war-room status still correctly listed source-owned recheck and maker-checker closure as blockers before production Leakage Radar resolution.
- No source-owned recheck contract existed to prove the POS close source and approved-policy evaluation were re-read immediately before terminal resolution.

## After State

- `services/leakage/pos-cash-shortage-resolution-readiness-preflight.ts` defines a versioned resolution-readiness preflight.
- The current POS lifecycle policy remains blocked because `source_owned_recheck_contract` is absent.
- A fixture can certify only when it declares explicit `recheckPosCashShortageResolutionSource` semantics for:
  - `POSSession` source identity;
  - `currentSourceHash`;
  - `approvedPolicyHash`;
  - `evaluationHash`.
- The preflight also requires current source-hash guard, POS session identity, triggered shortage evidence, independent reviewer guard, resolution evidence hash, and no direct terminal incident command invocation.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts`
  - Passed: 1 suite, 8 tests.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-incident-lifecycle-policy.test.ts services/leakage/__tests__/pos-cash-shortage-incident-command-integration-preflight.test.ts`
  - Passed: 3 suites, 21 tests.
- `npm run typecheck`
  - Passed.
- `npm run lint -- --file services/leakage/pos-cash-shortage-resolution-readiness-preflight.ts --file services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts`
  - Passed with 0 errors; reported 4 existing warnings outside the touched Slice 36 files.
- Source-only activation scan:
  - `rg -n "CHECK_RUNNERS|scheduleWorkflow|router|createSafeAction|loadPosShiftCashShortageBatch|runDormantPosShiftCashShortage|queueWorkflowAssuranceWebhookDelivery\(|dispatchWorkflowAssuranceWebhookAlerts\(|resolveWorkflowAssuranceIncident\(|transitionWorkflowAssuranceIncident\(|recordWorkflowAssuranceIncident\(|upsertWorkflowAssuranceIncidentFromResult\(|db\.|prisma\." services/leakage/pos-cash-shortage-resolution-readiness-preflight.ts`
  - No matches.
- `git diff --check -- services/leakage/pos-cash-shortage-resolution-readiness-preflight.ts services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_36_SELECTION_REPORT_2026-07-28.md what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
  - Passed with the known CRLF notice on the status register.

## Certification Decision

Slice 36 is certified as a fail-closed source-owned resolution readiness preflight.

This certification does not mean live terminal resolution is ready. Current live resolution readiness remains blocked until a real source-owned recheck contract exists and is separately selected, implemented, and verified. Production activation remains blocked and unauthorized.

## Next Handoff

Return to `stoquify-referral-war-room-orchestrator` before selecting Slice 37. No detector, scheduler, worker, route/action/UI, notification, incident command, rollback execution, AI, or WhatsApp behavior is authorized by this slice.
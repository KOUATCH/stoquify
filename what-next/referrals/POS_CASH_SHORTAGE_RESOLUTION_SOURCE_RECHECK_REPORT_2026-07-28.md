# POS Cash-Shortage Resolution Source Recheck Report - 2026-07-28

## Scope

Phase 3 / Slice 37 adds a pure source-owned recheck contract for future POS cash-shortage terminal resolution safety.

The contract is implemented in `services/leakage/pos-cash-shortage-resolution-source-recheck.ts`. It recomputes source evidence from the POS shift-close event and approved cash-shortage policy immediately before a future resolution workflow can rely on the evidence.

This slice does not resolve incidents, transition incidents, write data, start workers, schedule jobs, send alerts, expose routes/actions/UI, execute rollback, or grant AI/WhatsApp authority.

## Before State

- Slice 36 certified a fail-closed resolution readiness preflight.
- Live resolution readiness remained blocked because no real source-owned recheck contract existed.
- The readiness preflight could certify only with a fixture source that declared current source hash, approved policy hash, and evaluation hash semantics.

## After State

- `recheckPosCashShortageResolutionSource` recomputes the existing POS cash-shortage evaluator against supplied source evidence and approved policy.
- Certification requires:
  - POSSession organization/source identity match.
  - Current source hash match.
  - Approved policy hash match.
  - Recomputed evaluation.
  - Triggered shortage outcome.
  - Evaluation hash match.
  - Resolution metadata match for amount at risk, currency, and policy id.
  - No terminal command authority.
- The result always returns `activationAuthorized: false`.
- Slice 36 readiness now certifies when pointed at the real source-owned recheck contract source text.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-resolution-source-recheck.test.ts`
  - Passed: 1 suite, 8 tests.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-resolution-source-recheck.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts services/leakage/__tests__/pos-shift-cash-shortage-evaluator.test.ts services/leakage/__tests__/pos-cash-shortage-incident-lifecycle-policy.test.ts`
  - Passed: 4 suites, 63 tests.
- `npm run typecheck`
  - Passed.
- `npx eslint services/leakage/pos-cash-shortage-resolution-source-recheck.ts services/leakage/__tests__/pos-cash-shortage-resolution-source-recheck.test.ts`
  - Passed.
- Source-only activation scan:
  - `rg -n "CHECK_RUNNERS|scheduleWorkflow|router|createSafeAction|loadPosShiftCashShortageBatch|runDormantPosShiftCashShortage|queueWorkflowAssuranceWebhookDelivery\(|dispatchWorkflowAssuranceWebhookAlerts\(|resolveWorkflowAssuranceIncident\(|transitionWorkflowAssuranceIncident\(|recordWorkflowAssuranceIncident\(|upsertWorkflowAssuranceIncidentFromResult\(|db\.|prisma\." services/leakage/pos-cash-shortage-resolution-source-recheck.ts`
  - No matches.
- `git diff --check -- services/leakage/pos-cash-shortage-resolution-source-recheck.ts services/leakage/__tests__/pos-cash-shortage-resolution-source-recheck.test.ts what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_37_SELECTION_REPORT_2026-07-28.md`
  - Passed with the known CRLF warning on `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`.

## Certification Decision

Slice 37 is certified as a pure source-owned resolution recheck contract.

This certification does not authorize live terminal resolution. A future terminal command still requires a separately selected and verified integration slice with maker-checker controls, RBAC, audit history, and incident command wiring. Production activation remains blocked and unauthorized.

## Handoff

Return to `stoquify-referral-war-room-orchestrator` before selecting Slice 38. No detector, scheduler, worker, route/action/UI, notification, incident command, rollback execution, AI, or WhatsApp behavior is authorized by this slice.

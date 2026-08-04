# POS Cash-Shortage Production Policy Readiness Preflight Report - 2026-07-28

## Scope

Phase 3 / Slice 35 adds a fail-closed readiness preflight for real approved POS cash-shortage policy evidence.

This slice validates approved-policy evidence shape only. It does not seed policy rows, configure live production thresholds, activate event scanning, create incidents, expose routes/actions/UI, start a scheduler or worker, or grant AI/WhatsApp authority.

## Before State

- The cash-shortage policy governance foundation can create, approve, hash, and resolve observe-only tenant/currency policies.
- The runner-input contract requires the code-level `productionThresholdConfigured` marker and `production_policy_entry` prerequisite.
- The live product state remains honest: no effective approved production policy row is supplied by this slice, and test fixtures are not configuration.
- A future detector could confuse code-level readiness with live tenant/currency threshold truth unless policy-readiness evidence is explicit.

## After State

- `services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts` defines a versioned policy-readiness preflight.
- Certification requires:
  - approved policy evidence present;
  - valid POS cash-shortage policy contract;
  - observe-only mode;
  - effective window covering the requested check time;
  - positive review threshold and high threshold greater than or equal to review threshold;
  - policy hash matching the policy payload;
  - approval event bound to the policy, checker, document hash, and payload hash;
  - resolver source still verifying policy hash;
  - resolver source still verifying approval-event evidence;
  - batch source still resolving policy before evaluation;
  - runner input still requiring the policy prerequisite;
  - no default-policy or activation behavior.
- Missing live approved-policy evidence remains blocked.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`
  - Passed: 1 suite, 9 tests.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts services/leakage/__tests__/cash-shortage-policy.service.test.ts services/leakage/__tests__/pos-shift-cash-shortage-batch.service.test.ts services/leakage/__tests__/pos-shift-cash-shortage-runner-input.test.ts`
  - Passed: 4 suites, 53 tests.
- `npm run typecheck`
  - Passed.
- `npm run lint -- --file services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts --file services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`
  - Passed with 0 errors; reported 4 existing warnings outside the touched Slice 35 files.
- Source-only activation/default-policy scan:
  - `rg -n "CHECK_RUNNERS|scheduleWorkflow|router|createSafeAction|loadPosShiftCashShortageBatch|runDormantPosShiftCashShortage|queueWorkflowAssuranceWebhookDelivery\(|dispatchWorkflowAssuranceWebhookAlerts\(|resolveWorkflowAssuranceIncident\(|db\.|prisma|createMany|upsert|seed" services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts`
  - No matches.
- `git diff --check -- services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_35_SELECTION_REPORT_2026-07-28.md what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
  - Passed with the known CRLF notice on the status register.

## Certification Decision

Slice 35 is certified as a fail-closed production policy readiness preflight.

This certification does not mean a live tenant/currency approved policy exists. Current live approved policy evidence remains absent unless real approved policy rows are supplied through the service-owned policy workflow. Production activation remains blocked and unauthorized.

## Next Handoff

Return to `stoquify-referral-war-room-orchestrator` before selecting Slice 36. No detector, scheduler, worker, route/action/UI, notification, incident command, rollback execution, AI, or WhatsApp behavior is authorized by this slice.
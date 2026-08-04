# Referral War Room Phase 3 Slice 35 Selection Report - 2026-07-28

Selected slice: POS cash-shortage production policy readiness preflight  
Selected pillar skill: `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar`  
Program control: `stoquify-referral-war-room-orchestrator`

## Decision

Slice 35 is selected to define a fail-closed readiness preflight for real approved POS cash-shortage policy evidence.

This slice may validate a deterministic approved-policy fixture and verify that the resolver, batch evaluator, and runner-input gates still require policy truth. It must not seed policy rows, configure live production thresholds, activate event scanning, create incidents, expose routes/actions/UI, start a scheduler or worker, or grant AI/WhatsApp authority.

## Why This Slice

The code-level registry metadata already records `productionThresholdConfigured: true` and `production_policy_entry` as a certified prerequisite, but the live product state remains honest: there is no effective approved production policy row. A future detector must not confuse code-level readiness with live tenant/currency threshold truth.

## Expected Files

- `services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_POLICY_READINESS_PREFLIGHT_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Acceptance Criteria

- Missing live approved-policy evidence remains blocked.
- A fixture certifies only when policy evidence is approved, observe-only, hash-bound, event-bound, effective for the requested time, threshold-valid, and consistent with the POS cash-shortage policy contract.
- Source inspection proves `resolveApprovedCashShortagePolicy` verifies approved policy hash and approval-event evidence, the batch service resolves policy before evaluation, and runner input still requires the code-level production policy prerequisite.
- The preflight and tests add no DB writes, route/action/UI surface, incident command invocation, worker/scheduler activation, seeded policy, AI authority, or WhatsApp authority.

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts services/leakage/__tests__/cash-shortage-policy.service.test.ts services/leakage/__tests__/pos-shift-cash-shortage-batch.service.test.ts services/leakage/__tests__/pos-shift-cash-shortage-runner-input.test.ts`
- `npm run typecheck`
- Focused ESLint for touched TypeScript files.
- Source-only activation scan for forbidden runtime wiring terms.
- Scoped diff hygiene.
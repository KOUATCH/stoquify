# AqStoqFlow HR/Payroll Wave 1 SMB Ops Payroll Forecast Proof Surfaces Report

Date: 2026-06-29
Skill: aqstoqflow-payroll-smb-ops
Phase: Phase 8 - SMB operating integration
Slice: Payroll-owned forecast proof consumption in Cash Command and Owner War Room

## Decision

READY FOR NEXT SLICE after focused verification.

This slice tightened payroll forecast consumption in the broader SMB operating layer. Cash planning and owner decision surfaces now treat aggregate payroll obligations as payroll-owned evidence, not generic tenant snapshot state. When payroll forecast proof is incomplete, the surfaces show blocked payroll cards and risks with payroll-specific blockers, redacted person-level values, and direct payroll operator actions.

## What Changed

- Cash Command payroll forecast cards now receive the payroll forecast envelope and derive state, evidence grade, trust state, detail text, blockers, and redactions from payroll forecast authority.
- Cash Command filters payroll forecast blockers to `payroll_finance_forecast`, so unrelated tenant blockers do not contaminate upcoming net-pay or statutory-liability cards.
- Cash Command adds a payroll forecast proof change event and high-priority risk when register, ledger, payment, or declaration evidence is incomplete.
- Owner War Room payroll exposure now carries only payroll forecast blockers when forecast proof is blocked.
- Owner Morning Brief now ranks payroll forecast proof as a blocked owner risk when payroll-owned proof is incomplete.
- Focused tests cover blocked payroll forecast proof in both Cash Command and Owner War Room, including redaction and unrelated-blocker isolation.

## Files Changed

- `services/cash-command/cash-command.service.ts`
- `services/cash-command/__tests__/cash-command.service.test.ts`
- `services/owner-war-room/owner-war-room.service.ts`
- `services/owner-war-room/__tests__/owner-war-room.service.test.ts`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_WAVE_1_SMB_OPS_PAYROLL_FORECAST_PROOF_SURFACES_REPORT_2026-06-29.md`

## Gates

- Passed: `npm test -- --runTestsByPath services/cash-command/__tests__/cash-command.service.test.ts services/owner-war-room/__tests__/owner-war-room.service.test.ts --runInBand`
- Passed: `npm run typecheck`
- Passed: `npm run service:boundary:fail`
- Passed: `git diff --check`

`git diff --check` emitted line-ending warnings already present across the dirty working tree, but no whitespace errors.

## Residual Risk

- This slice hardens Cash Command and Owner War Room. Additional SMB surfaces, especially manager action center, compliance radar, and BI profitability dashboards, still need the same payroll-owned proof consumption pattern.
- The broader worktree remains dirty with unrelated payroll roadmap changes; this report only certifies the touched Phase 8 slice.

## Next Recommended Slice

Continue Phase 8 by applying the same payroll-owned forecast evidence contract to manager action center, compliance radar, and profitability/BI views. Those surfaces should consume payroll register, ledger, payment, and declaration facts without accepting POS, sales, or generic tenant state as payroll truth.

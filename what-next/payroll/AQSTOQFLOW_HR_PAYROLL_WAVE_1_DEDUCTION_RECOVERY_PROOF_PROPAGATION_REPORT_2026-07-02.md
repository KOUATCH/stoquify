# AqStoqFlow HR/Payroll Wave 1 Deduction/Recovery Proof Propagation Report - 2026-07-02

## Decision

Status: PASSED for this follow-on implementation slice.

The deduction/recovery proof added to payroll calculation is now propagated through downstream payroll evidence surfaces instead of remaining isolated in calculation snapshots.

## Implemented Scope

- Added optional deduction/recovery proof extraction from payroll run metadata.
- Extended payment-release proof metadata so payment evidence, payment metadata, outbound reconciliation payloads, and payment audit paths inherit deduction/recovery proof when present.
- Extended approve/post metadata so payroll ledger posting metadata includes deduction/recovery proof when present.
- Extended declaration preparation so declaration payloads, declaration metadata, declaration business events, and declaration audit metadata include deduction/recovery proof when present.
- Kept the metadata optional so payroll runs without recovery rubriques are not blocked or inflated.

## Files Changed In This Slice

- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`

## Regression Coverage

- Posting metadata assertions now prove deduction/recovery proof propagation into the payroll posting metadata bundle.
- Declaration metadata, declaration payload, and declaration prepared event assertions now prove deduction/recovery proof propagation into statutory declaration evidence.
- Existing payment-release path uses the same `payrollRunProofMetadata` extractor, so the proof is included in payment evidence when present.

## Validation Evidence

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts --runInBand` - 27 tests passed.
- `npm run typecheck` - passed.
- `npm run regulatory:hardcode:fail` - passed, 0 active findings.
- `npm run prisma:validate` - passed.
- `npm run lint -- --quiet` - passed with 0 errors and 4 pre-existing warnings.
- `npm run policy:gates` - passed.

## Remaining Roadmap Work

The next payroll-engine hardening slice should move from proof propagation to service-owned recovery policy controls:

1. Model approved recovery caps and outstanding-balance proof for loan/advance/garnishment style cases without hardcoding legal logic.
2. Tie recovery deductions to employee balance/case lifecycle where applicable.
3. Add operator proof drawers and denied states after the recovery truth model is stable.
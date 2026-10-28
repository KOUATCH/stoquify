# AqStoqFlow HR/Payroll Wave 1 Deduction/Recovery Lifecycle Hardening Report - 2026-07-02

## Decision

Status: PASSED for this implementation slice.

This slice hardens payroll deduction/recovery calculation truth without introducing statutory hardcoding or new schema bloat. It keeps POS/sales/finance as consumers of payroll truth, while payroll remains the source of record for employee deduction assignments, recovery proof, and net-pay safety.

## Implemented Scope

- Required evidence document proof for deduction/recovery payroll rubriques before calculation.
- Preserved existing approval-history enforcement and bound it into the deduction/recovery proof payload.
- Added deterministic assignment-level deduction/recovery proof hashes for deduction rubriques.
- Added line-level deduction/recovery proof hashes, proof hash arrays, and rubrique-only deduction/recovery amounts to calculation snapshots.
- Added run-level deduction/recovery proof hashes and aggregate recovery amount to the calculated run document hash, metadata, and calculated business-event payload.
- Added employee-line net-pay floor enforcement for ordinary payroll runs so one employee cannot go negative and be hidden by other employees.
- Kept correction runs eligible for negative net-pay deltas so the existing employee balance receivable/refund workflow remains the recovery path.

## Files Changed In This Slice

- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`

## Regression Coverage

- Approved loan deduction snapshots now assert evidence hash presence, approval event binding, deduction/recovery proof hash, proof hash array, and rubrique-only deduction/recovery amount.
- Missing deduction/recovery evidence proof blocks payroll calculation before register creation.
- Ordinary payroll runs that would produce negative employee net payable are blocked before register creation.
- Employee-balance correction workflow remains covered by its existing focused suite.

## Validation Evidence

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts --runInBand` - 27 tests passed.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-employee-balance.service.test.ts --runInBand` - 5 tests passed.
- `npm run typecheck` - passed.
- `npm run regulatory:hardcode:fail` - passed, 0 active findings.
- `npm run prisma:validate` - passed.
- `npm run lint -- --quiet` - passed with 0 errors and 4 pre-existing warnings.
- `npm run policy:gates` - passed.
- `git diff --check -- services/payroll/payroll-control.service.ts services/payroll/__tests__/payroll-control.service.test.ts` - passed, with only Git's line-ending warning for the already-modified payroll service.

## Remaining Roadmap Work

This does not complete the full HR/payroll roadmap. Next execution should continue with payroll engine hardening in one of these areas:

1. Effective-dated recovery caps and outstanding-balance references for service-owned loan/advance/garnishment cases.
2. Immutable correction event replay tied to deduction/recovery adjustments and employee balance settlement proof.
3. Accounting posting detail for deduction/recovery liabilities beyond the aggregate employee deduction bucket.
4. Operator proof drawers and denied states for recovery evidence review after the calculation/register truth is stable.
# AqStoqFlow HR/Payroll Phase 0 - Register Statutory Review Evidence Chain Report

Date: 2026-07-01
Selected skill: aqstoqflow-payroll-kernel-hardener
Selected phase: Phase 0
Executable slice: Carry statutory scenario review evidence from calculated payroll run metadata into payroll register proof/readiness.

## What Changed

This slice connects the statutory country-pack fixture review proof to the payroll register proof surface.

- Payroll calculation now snapshots statutory scenario coverage from the resolved country pack version.
- The calculated run metadata now carries:
  - `statutoryScenarioCoverage`
  - `statutoryScenarioCoverageHash`
- Payroll run document and correction evidence hashes now include the statutory scenario coverage hash.
- Payroll register read model now exposes `payrollRun.statutoryScenarioCoverage` with status, coverage hash, review counts, reviewers, review dates, legal refs, and source evidence hashes.
- Payroll register hash payload now includes `statutoryScenarioCoverageHash` and was versioned from 4 to 5.
- Payroll register readiness now blocks when statutory review evidence is missing or blocked.

## Files Changed

- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-register.service.ts`
- `services/payroll/__tests__/payroll-register.service.test.ts`

## Why This Matters

The payroll register is the financial spine used by ledger posting, payslips, declarations, payments, and close readiness. Before this slice, register proof carried calculation and component hashes but not the reviewed statutory scenario evidence that proves the formulas were executable and reviewed. Now the register can show and hash the statutory evidence chain instead of relying on an operator to inspect country-pack fixtures separately.

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts --runInBand`
  - 2 suites passed, 33 tests passed.
- `npm run typecheck`
- `npm run service:boundary:fail`
  - Pass, 0 active runtime violations.
- `npm run policy:gates`
  - Pass, including payroll immutability runtime.

Policy-gate highlights:

- Payroll immutability runtime check: ready.
- Required immutability triggers present: 9/9.
- Forbidden mutation checks blocked: 14/14.
- Allowed lifecycle checks passed: 3/3.
- Regulatory hardcode gate: pass, 0 active findings.
- Demo/report trust gate: pass, 0 active findings.
- Raw error boundary gate: pass, 0 active unsafe findings.

## Residual Risks

- Active country-pack coverage may still be blocked until all statutory families are reviewed/certified; the register now surfaces that state rather than hiding it.
- Older payroll runs without this metadata will be blocked by the register readiness gate until migrated/backfilled or recalculated through the hardened path.
- Operator UI can now consume the read-model field, but this slice did not change UI rendering.
- Full production remains blocked until statutory breadth, authority/payment adapters, pilot-cycle reconciliation, close signoff, and authenticated browser smoke gates are complete.

## Next Recommended Slice

Continue with production migration/backfill readiness: add a dry-run backfill/audit path for legacy payroll runs missing statutory scenario coverage metadata, so historical registers can be classified as backfillable, correction-required, or blocked with redacted evidence.
# AqStoqFlow HR/Payroll Wave 1 IRPP Adjustment And Correction Engine Report

Date: 2026-06-28
Selected skill: `aqstoqflow-payroll-country-pack-engine`
Selected phase: Phase 3 - statutory country-pack calculation capability
Executable slice: extend the IRPP evaluator and production country-pack gates for deductions, caps, reliefs, YTD regularization, and correction replay without promoting Cameroon IRPP to production legal truth.

## Outcome

The payroll tax evaluator now supports reviewed, country-pack-driven adjustment primitives for IRPP-style income-tax calculations:

- taxable-base additions/deductions with reviewed input keys and caps;
- tax-amount additions/deductions for reliefs and correction replay;
- minimum/maximum tax amount bounds;
- adjusted taxable-base output and richer calculation trace evidence;
- existing fail-closed production gating remains intact.

The country-pack fixture runner now passes scenario `adjustmentValues` into the evaluator and can compare adjusted-base, pre-adjustment tax, and adjustment totals in golden outputs.

The Cameroon country pack remains correctly blocked for IRPP production because it still declares `payroll.irpp` as `REQUIRES_EXPERT_REVIEW`. No statutory IRPP legal values were added. The regulatory production gate was strengthened so any future Cameroon IRPP production claim must include reviewed calculation scenarios for period withholding, YTD regularization, period adjustments, and YTD correction replay.

## Files Changed

- `services/payroll/payroll-tax-rule-evaluator.ts`
  - Added `PayrollTaxAdjustmentRule` primitives.
  - Added taxable-base adjustments, tax-amount adjustments, min/max tax bounds, adjusted taxable-base output, and adjustment trace fields.
  - Preserved fail-closed behavior unless capability is `SUPPORTED` or `SUPPORTED_CERTIFIED` and `productionCalculationSupported === true`.
- `services/payroll/payroll-country-pack-fixture-runner.ts`
  - Passes fixture `adjustmentValues` into IRPP evaluation.
  - Supports comparing adjusted taxable base, taxable-base adjustment total, pre-adjustment tax, and tax-amount adjustment total.
- `services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts`
  - Added capped deduction/relief coverage.
  - Added YTD correction replay coverage.
- `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts`
  - Added synthetic reviewed IRPP fixtures for period adjustments and YTD correction replay.
  - Kept active Cameroon IRPP review-blocked.
- `services/regulatory/country-packs/validation.ts`
  - Required production-supported Cameroon IRPP packs to include four reviewed calculation fixture purposes: period calculation, YTD regularization, period adjustments, and YTD correction replay.
- `services/regulatory/__tests__/country-pack.service.test.ts`
  - Updated production-claim rejection and acceptance tests for the expanded IRPP fixture gate.

## Gates Passed

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts --runInBand`
  - Passed: 2 suites, 12 tests.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand`
  - Passed: 3 suites, 28 tests.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/regulatory/__tests__/country-pack.service.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts components/payroll/__tests__/PayrollSetupControlPlane.test.tsx services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts --runInBand`
  - Passed: 7 suites, 55 tests.
- `npm run typecheck`
  - Passed.
- `npm run prisma:validate`
  - Passed.
- `npm run regulatory:hardcode:fail`
  - Passed: 0 active findings.
- `npm run service:boundary:fail`
  - Passed: 0 active violations.
- `npm run policy:gates`
  - Passed all policy gates, including inventory boundary, service boundary, workflow assurance runtime, payroll immutability runtime, hard-delete, regulatory hardcode, demo/report trust, and raw error boundary.

## Gates Blocked

None for this slice.

## Residual Risks

- This slice adds formula-engine breadth and production fixture gates; it does not provide legally reviewed Cameroon IRPP rates, deductions, dependent treatment, or statutory formula values.
- Full production remains blocked until a qualified legal/payroll reviewer supplies official Cameroon IRPP country-pack values and golden expected outputs.
- End-to-end employee payroll fixtures still need to tie contracts, attendance, statutory calculations, payslips, register tie-out, ledger postings, payment proof, and declaration proof together.

## Next Recommended Slice

Add a release-readiness scenario coverage summary that enumerates executable fixture coverage by payroll statutory family (`CNPS`, `IRPP`, allowances/benefits, overtime/leave, corrections), then block final production readiness when required scenario families are missing. In parallel, obtain reviewed Cameroon IRPP legal inputs before promoting `payroll.irpp` beyond `REQUIRES_EXPERT_REVIEW`.
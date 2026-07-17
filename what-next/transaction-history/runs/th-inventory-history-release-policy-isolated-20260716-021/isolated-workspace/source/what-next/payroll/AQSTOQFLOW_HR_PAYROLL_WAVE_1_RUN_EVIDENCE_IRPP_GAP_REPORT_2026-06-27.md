# AqStoqFlow HR/Payroll Wave 1 Run Evidence IRPP Gap Report

Date: 2026-06-27

## Decision

Payroll run evidence now carries the Cameroon IRPP income-tax capability gap. A calculated run can support the current CNPS pilot slice, but it can no longer look like a complete statutory payroll run when income-tax rules remain under expert review.

## Completed Scope

- Resolved `payroll.irpp.incomeTaxRules` inside the existing payroll country-pack status helper.
- Added IRPP legal provenance to payroll calculation rule provenance, run metadata, calculation snapshots, and payroll run calculated events.
- Aggregated payroll country-pack capability status across CNPS and IRPP paths, so a review-required IRPP path marks the run as `REQUIRES_EXPERT_REVIEW`.
- Added calculation snapshot fields that explicitly show income-tax withholding is not applied while IRPP remains review-blocked.
- Preserved CNPS calculation behavior and did not invent or hardcode IRPP legal formulas.

## Evidence

Commands run:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts --runInBand
npm test -- --runTestsByPath services/regulatory/__tests__/country-pack.service.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts --runInBand
npm run regulatory:hardcode:fail
npm run typecheck
```

Results:

- Payroll-control suite passed: 1 suite, 8 tests.
- Regulatory, setup-readiness, and payroll-control suites passed: 3 suites, 28 tests.
- Regulatory hardcode gate passed with 0 active findings.
- Typecheck completed without errors.

## Files Advanced

- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`

## Residual Production Blockers

- IRPP calculation remains intentionally blocked until reviewed country-pack formulas, fixtures, and legal-owner signoff exist.
- Net pay still reflects the current CNPS proof slice only; full production must add income-tax withholding before unrestricted rollout.
- Declaration and accounting payloads must later split CNPS liabilities from income-tax payable once reviewed IRPP calculation is enabled.

## Next Slice

Add a generic, country-pack-fed payroll tax evaluator with fixture tests, but keep Cameroon IRPP disabled until reviewed formula data exists. The evaluator should support brackets, taxable base derivation, rounding policy, YTD regularization hooks, and correction-mode replay without putting legal values in application code.

# AqStoqFlow HR/Payroll Wave 1 Tax Evaluator Report

Date: 2026-06-27

## Decision

A generic country-pack-fed payroll tax evaluator now exists and is wired into payroll calculation evidence. It can calculate reviewed progressive tax rules, but Cameroon IRPP remains blocked because the country pack still declares `payroll.irpp` as `REQUIRES_EXPERT_REVIEW`.

This advances the payroll engine without hardcoding legal tax rates.

## Completed Scope

- Added a pure payroll tax rule evaluator for country-pack-provided progressive period and YTD rules.
- Added synthetic evaluator fixtures for blocked review-required rules, progressive period calculation, and YTD replay.
- Wired payroll calculation lines through the evaluator.
- Preserved current CNPS pilot math while recording `incomeTaxApplied: false`, `incomeTaxWithholdingAmount: null`, and `BLOCKED_REQUIRES_EXPERT_REVIEW` for the Cameroon IRPP placeholder.
- Kept statutory values out of application code; tax brackets in tests are synthetic fixtures only.

## Evidence

Commands run:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-control.service.test.ts --runInBand
npm run typecheck
npm test -- --runTestsByPath services/regulatory/__tests__/country-pack.service.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-control.service.test.ts --runInBand
npm run regulatory:hardcode:fail
```

Results:

- Evaluator and payroll-control suites passed: 2 suites, 11 tests.
- Combined regulatory/setup/evaluator/payroll-control suites passed: 4 suites, 31 tests.
- Regulatory hardcode gate passed with 0 active findings.
- Typecheck completed without errors.

## Files Advanced

- `services/payroll/payroll-tax-rule-evaluator.ts`
- `services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`

## Residual Production Blockers

- Real Cameroon IRPP formulas, brackets, bases, rounding, exemptions, and regularization fixtures are not loaded yet.
- Once reviewed IRPP fixtures exist, payroll calculation must assert expected tax amounts against golden country-pack outputs before enabling production withholding.
- Accounting and declaration payloads still need component-level split for CNPS versus income-tax liabilities.

## Next Slice

Add reviewed payroll component mapping and register tie-out for tax components: taxable base, income-tax withheld, employee deductions, statutory payable, net pay, declaration liability, and ledger posting lines. Keep release gates blocked until reviewed Cameroon IRPP fixtures exist.

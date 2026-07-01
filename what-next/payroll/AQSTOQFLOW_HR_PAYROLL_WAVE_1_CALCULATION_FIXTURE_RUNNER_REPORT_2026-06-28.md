# AqStoqFlow HR/Payroll Wave 1 Calculation Fixture Runner Report

Date: 2026-06-28
Selected skill: `aqstoqflow-payroll-country-pack-engine`
Status: PASS for this focused Wave 1 hardening slice
Production decision: still NOT full-production ready; the runner executes reviewed scenarios, but real Cameroon IRPP formulas and outputs are still not loaded.

## Selected Phase And Executable Slice

Roadmap lane: Wave 1, statutory country-pack breadth and payroll engine hardening.

Executable slice: add a payroll calculation fixture runner that executes reviewed country-pack calculation scenarios against `evaluatePayrollTaxRule`. This makes future Cameroon IRPP fixture evidence executable instead of only manually inspected.

## Source Context

Inspected:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FULL_PRODUCTION_ROADMAP_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_WAVE_1_IRPP_FIXTURE_READINESS_GATE_REPORT_2026-06-28.md`
- `services/regulatory/country-packs/schemas.ts`
- `services/regulatory/country-packs/validation.ts`
- `services/regulatory/country-packs/cameroon.ts`
- `services/payroll/payroll-tax-rule-evaluator.ts`
- country-pack, payroll setup-readiness, payroll-control, payroll-register, and fixture-runner tests

## What Changed

- `services/payroll/payroll-country-pack-fixture-runner.ts`
  - Added `validatePayrollCountryPackCalculationFixtures`.
  - Reads reviewed `calculationScenario` fixtures from a country pack.
  - Resolves the effective country-pack rule for each fixture date.
  - Derives the matching capability status from the country-pack capability matrix.
  - Executes supported Cameroon IRPP scenarios through `evaluatePayrollTaxRule`.
  - Compares expected outputs against evaluator outputs for status, applied flag, withholding amount, taxable base, cumulative taxable base, and currency.
  - Returns structured run evidence and issue codes for drift, unsupported output fields, missing inputs, unresolved parameters, and execution failures.

- `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts`
  - Proves the current expert-review Cameroon IRPP placeholder pack has no executable scenarios and remains valid for blocked publication.
  - Proves a simulated reviewed IRPP pack executes period and YTD scenario fixtures successfully.
  - Proves expected-output drift fails validation.
  - Proves unsupported expected output fields fail validation.

## Controls Preserved

- No statutory legal values were introduced into runtime application logic.
- No expert-review-only IRPP placeholder was promoted to production truth.
- No payroll runs, payslips, registers, payment batches, declarations, or close evidence were mutated.
- The runner lives in payroll service logic and consumes country-pack fixtures without making the generic regulatory validator depend on payroll services.
- Regulatory hardcode gate remains clean.

## Gates Passed

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts --runInBand
```

Result: 1 suite passed, 4 tests passed.

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/regulatory/__tests__/country-pack.service.test.ts services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts --runInBand
```

Result: 6 suites passed, 48 tests passed.

```powershell
npm run typecheck
npm run prisma:validate
npm run regulatory:hardcode:fail
npm run service:boundary:fail
npm run policy:gates
```

Results:

- Typecheck passed.
- Prisma schema validation passed.
- Regulatory hardcode gate passed with 0 active findings.
- Service boundary gate passed with 0 active violations.
- Policy gates passed, including inventory boundary, service boundary, workflow assurance runtime, payroll immutability runtime, hard-delete, regulatory hardcode, demo trust, and raw-error boundary gates.

## Gates Blocked Or Not Run

- `npm run prisma:generate`: not run because no Prisma schema/client change was made.
- `npm run ui:smoke:payroll`: not run because this was a service/test fixture runner slice and no UI route changed.
- IRPP production calculation: still blocked until reviewed formulas, brackets, caps, reliefs, exemptions, rounding, and YTD regularization outputs are loaded from statutory review.

## Residual Risks

- The runner validates executable scenario evidence only when reviewed scenario fixtures exist. The live Cameroon pack still intentionally contains an IRPP expert-review blocker, not production formulas.
- Full production remains blocked until actual statutory breadth, correction/YTD scenarios, operator routes, authority/payment adapters, backfill execution, finance/BI integration, browser validation, and pilot reconciliation complete.

## Next Recommended Slice

Continue Wave 1 by connecting the calculation fixture runner to setup/readiness or release evidence so payroll operators and release gates can see whether executable statutory scenario coverage is present for the active country pack before any production payroll claim is made.
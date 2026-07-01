# AqStoqFlow HR/Payroll Wave 1 IRPP Fixture Readiness Gate Report

Date: 2026-06-28
Selected skill: `aqstoqflow-payroll-country-pack-engine`
Status: PASS for this focused Wave 1 hardening slice
Production decision: still NOT full-production ready; Cameroon IRPP remains blocked until reviewed statutory formulas and calculation-output fixtures are loaded.

## Selected Phase And Executable Slice

Roadmap lane: Wave 1, statutory country-pack breadth and payroll engine hardening.

Executable slice: add a country-pack validation gate for Cameroon IRPP production support. The live Cameroon pack can continue to publish with `payroll.irpp` marked `REQUIRES_EXPERT_REVIEW`, but if a future pack changes IRPP to `SUPPORTED` or `SUPPORTED_CERTIFIED`, validation now requires:

- `productionCalculationSupported: true` on `payroll.irpp.incomeTaxRules`;
- a payroll-tax-evaluator-supported calculation mode, currently `PROGRESSIVE_PERIOD` or `PROGRESSIVE_YTD`;
- a reviewed `PAYROLL_IRPP_PERIOD_CALCULATION` fixture with inputs and expected outputs;
- a reviewed `PAYROLL_IRPP_YTD_REGULARIZATION` fixture with inputs and expected outputs.

This does not add legal formula values. It prevents production capability drift before reviewed calculation evidence exists.

## Source Context

Inspected:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FULL_PRODUCTION_ROADMAP_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_WAVE_1_TAX_EVALUATOR_FAIL_CLOSED_REPORT_2026-06-28.md`
- `services/regulatory/country-packs/schemas.ts`
- `services/regulatory/country-packs/validation.ts`
- `services/regulatory/country-packs/cameroon.ts`
- `services/regulatory/__tests__/country-pack.service.test.ts`
- `services/payroll/payroll-tax-rule-evaluator.ts`
- payroll setup/control/register tests

## What Changed

- `services/regulatory/country-packs/schemas.ts`
  - Added optional `calculationScenario` metadata to golden fixtures.
  - Scenario fixtures can now carry reviewed calculation inputs, expected outputs, and `EXPERT_REVIEWED` or `REGULATOR_CONFIRMED` review status.

- `services/regulatory/country-packs/validation.ts`
  - Added a Cameroon IRPP production-readiness gate.
  - Preserves the current `REQUIRES_EXPERT_REVIEW` IRPP blocker.
  - Blocks future `SUPPORTED` or `SUPPORTED_CERTIFIED` IRPP claims unless production support and calculation scenario fixtures are present.

- `services/regulatory/__tests__/country-pack.service.test.ts`
  - Added a failing simulation for a supported IRPP claim missing reviewed calculation scenario fixtures.
  - Added a passing simulation for a supported IRPP pack with period and YTD reviewed calculation scenario fixtures.

## Controls Preserved

- No legal values were added to production application logic.
- No expert-review-only IRPP placeholder was promoted to production truth.
- No payroll runs, payslips, registers, payments, declarations, or close evidence were mutated.
- Existing Cameroon pack publication still passes because it honestly declares IRPP as expert-review blocked.
- Regulatory hardcode gate remains clean.

## Gates Passed

```powershell
npm test -- --runTestsByPath services/regulatory/__tests__/country-pack.service.test.ts --runInBand
```

Result: 1 suite passed, 16 tests passed.

```powershell
npm test -- --runTestsByPath services/regulatory/__tests__/country-pack.service.test.ts services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts --runInBand
```

Result: 5 suites passed, 44 tests passed.

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
- `npm run ui:smoke:payroll`: not run because this was a backend validation/fixture contract slice and browser auth-state evidence remains a separate release gate.
- IRPP production calculation: intentionally still blocked until reviewed formulas, brackets, caps, reliefs, exemptions, rounding, and YTD regularization outputs are loaded from statutory review.

## Residual Risks

- The system still needs actual reviewed Cameroon IRPP formulas and scenario outputs before IRPP withholding can calculate in production.
- Full production remains blocked until statutory breadth, correction/YTD scenarios, operator routes, authority/payment adapters, backfill execution, BI integration, browser validation, and pilot reconciliation are complete.

## Next Recommended Slice

Continue Wave 1 by adding a payroll calculation fixture runner that can execute reviewed country-pack calculation scenarios against `evaluatePayrollTaxRule` and fail pack validation when expected outputs drift. After that, reviewed IRPP formula data can be loaded without relying on manual fixture inspection.
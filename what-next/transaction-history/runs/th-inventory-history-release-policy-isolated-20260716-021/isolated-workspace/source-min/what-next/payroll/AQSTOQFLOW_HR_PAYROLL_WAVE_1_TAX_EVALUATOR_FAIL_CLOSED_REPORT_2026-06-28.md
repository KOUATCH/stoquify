# AqStoqFlow HR/Payroll Wave 1 Tax Evaluator Fail-Closed Report

Date: 2026-06-28
Selected skill: `aqstoqflow-payroll-country-pack-engine`
Companion safety lens: `aqstoqflow-payroll-kernel-hardener`
Status: PASS for this focused Wave 1 hardening slice
Production decision: still NOT full-production ready; IRPP/income-tax remains blocked until reviewed statutory formulas and golden fixtures exist.

## Selected Phase And Executable Slice

Roadmap lane: Wave 1, statutory country-pack breadth and payroll engine hardening.

Executable slice: harden `evaluatePayrollTaxRule` so payroll income-tax calculation fails closed unless both conditions are true:

1. the country-pack capability status is explicitly `SUPPORTED` or `SUPPORTED_CERTIFIED`; and
2. the rule explicitly declares `productionCalculationSupported: true`.

This closes an accidental-bypass risk where a supported-looking rule with a missing production flag, or a partially supported/non-production capability status with brackets, could calculate synthetic withholding. The change preserves the current Cameroon IRPP blocker and does not introduce statutory legal values.

## Source Context

Inspected:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FULL_PRODUCTION_ROADMAP_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FINAL_PRODUCTION_READINESS_REPORT_2026-06-27.md`
- `services/payroll/payroll-tax-rule-evaluator.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-register.service.ts`
- `services/regulatory/country-packs/schemas.ts`
- `services/regulatory/country-packs/validation.ts`
- `services/regulatory/country-packs/cameroon.ts`
- focused country-pack, payroll-control, payroll-register, and tax-evaluator tests

## What Changed

- `services/payroll/payroll-tax-rule-evaluator.ts`
  - Added an explicit production tax capability allowlist: `SUPPORTED`, `SUPPORTED_CERTIFIED`.
  - Changed support evaluation from permissive `productionCalculationSupported !== false` to fail-closed `productionCalculationSupported === true`.
  - Blocks every non-production capability state from calculation, including `PARTIALLY_SUPPORTED`, `SUPPORTED_DRAFT`, `NOT_SUPPORTED`, `NOT_YET_SUPPORTED`, `OUT_OF_SCOPE`, `REQUIRES_CONFIGURATION`, and `REQUIRES_EXPERT_REVIEW`.
  - Keeps blocked results as `BLOCKED_REQUIRES_EXPERT_REVIEW` so downstream register/control proof continues to block release readiness consistently.

- `services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts`
  - Added coverage for a supported-looking rule missing the explicit production flag.
  - Added coverage for `PARTIALLY_SUPPORTED` capability with brackets and `productionCalculationSupported: true`.
  - Preserved supported/certified synthetic progressive calculation tests for reviewed country-pack-style inputs.

## Controls Preserved

- No statutory values were hardcoded in application logic.
- No expert-review-only IRPP value was promoted to production truth.
- No payroll runs, payslips, payments, declarations, registers, or close evidence were mutated.
- Payroll control/register evidence remains service-owned and downstream blocked statuses still propagate through component proof.
- Regulatory hardcode gate remains clean.

## Gates Passed

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts --runInBand
```

Result: 1 suite passed, 5 tests passed.

```powershell
npm test -- --runTestsByPath services/regulatory/__tests__/country-pack.service.test.ts services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts --runInBand
```

Result: 4 suites passed, 36 tests passed.

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
- Policy gates passed, including inventory boundary, service boundary, workflow assurance runtime check, payroll immutability runtime check, hard-delete gate, regulatory hardcode gate, demo trust gate, and raw-error boundary gate.

## Gates Blocked Or Not Run

- `npm run prisma:generate`: not run because no Prisma schema/client change was made.
- `npm run ui:smoke:payroll`: not run because this slice touched no UI route and browser auth-state prerequisites remain separate release evidence.
- IRPP production calculation: intentionally still blocked because reviewed Cameroon IRPP formulas and golden fixtures are not present.

## Residual Risks

- This slice hardens the evaluator boundary, but it does not supply expert-reviewed IRPP formulas, caps, reliefs, exemptions, rounding rules, or declaration mappings.
- Full production remains blocked until statutory country-pack breadth, calculation fixtures, correction/YTD scenarios, register tie-out, payment/declaration proof, production backfill, operator routes, BI integration, browser validation, pilot reconciliation, and Prompt 19/21 reruns are complete.

## Next Recommended Slice

Continue Wave 1 with a reviewed statutory fixture readiness contract for Cameroon IRPP and payroll engine golden outputs. The next useful implementation should make fixture coverage and capability transitions explicit for production certification without turning on IRPP until reviewed formulas exist.
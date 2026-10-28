# AqStoqFlow HR/Payroll Wave 1 Deduction/Recovery Country-Pack Coverage Report

Date: 2026-07-02
Status: Implemented and locally verified

## Decision

This slice expands the full-production statutory country-pack coverage gate to include payroll deductions and recoveries, such as loan repayments, salary advances, or garnishment-like deductions, without hardcoding legal values in runtime payroll logic.

The payroll engine already supports deduction rubriques through service-owned compensation assignments and country-pack formula references. The missing production-readiness control was executable country-pack evidence. A pack that claims production-supported payroll compensation must now provide reviewed, effective-dated deduction/recovery parameters and golden fixture outputs.

## Implemented Scope

- Added `payroll.compensation.deductions` as a supported executable payroll country-pack calculation path.
- Extended payroll country-pack fixture runner support so deduction/recovery formulas evaluate through the existing compensation component evaluator.
- Added required deduction/recovery fixture output fields:
  - `componentAmount`
  - `employeeDeductionAmount`
  - `payslipLineAmount`
  - `registerEmployeeDeductionAmount`
  - `registerNetPayableAmount`
- Added Cameroon country-pack publish validation requiring reviewed deduction/recovery fixtures when compensation support is claimed.
- Added a `DEDUCTIONS_RECOVERIES` statutory scenario coverage family, required for full production readiness.
- Updated payroll setup readiness required country-pack paths to include deductions and composite register tie-out.
- Added reviewed synthetic test fixtures for a loan recovery style deduction using `PAYROLL_DEDUCTION_RECOVERY_LOAN`.
- Updated statutory coverage and setup readiness expectations from 10 to 11 required families and from 13 to 14 executable scenarios in the fully supported test pack.

## Product Impact

SMB payroll operators can no longer claim full-production compensation coverage while only proving earnings, allowances, and benefits. The readiness gate now also asks: can the payroll country pack prove employee deductions and recoveries flow through payslip, register, and net-pay outputs?

This improves day-to-day payroll reliability for common SMB operations such as:

- salary advance repayment;
- employee loan recovery;
- recurring approved deductions;
- future garnishment-style statutory/private deductions once jurisdiction-specific evidence is loaded.

## Validation

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand`
- `npm run typecheck`
- `npm run regulatory:hardcode:fail`
- `npm run prisma:validate`
- `npm run lint -- --quiet` with 0 errors and 4 pre-existing warnings
- `npm run policy:gates`

## Residual Risk / Next Slice

This is evidence-gate breadth, not a claim that Cameroon production legal deduction/garnishment rules are complete. Real production automation still requires legal-owner reviewed rules per deduction category and tenant approval evidence for each assignment.

Recommended next slice: payroll engine hardening for deduction/recovery lifecycle tie-out, including assignment approval proof, outstanding balance/protection rules, net-pay floor policy, and correction replay evidence.
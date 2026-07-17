# AqStoqFlow HR/Payroll Wave 1 Allowance, Benefit, Leave, and Overtime Fixture Engine Report

Date: 2026-06-28

## Decision

Implemented generic country-pack-backed fixture runner support for allowance, benefit, leave, and overtime calculation scenarios.

This advances the full HR/payroll roadmap by making the missing non-CNPS scenario families executable once reviewed country-pack rules are supplied. It does not add unreviewed Cameroon legal values and does not claim unrestricted production readiness.

## What Changed

- Extended `services/payroll/payroll-country-pack-fixture-runner.ts` with support for:
  - `payroll.compensation.allowances`
  - `payroll.compensation.benefits`
  - `payroll.attendance.leave`
  - `payroll.attendance.overtime`
- Added generic calculation primitives:
  - fixed amount
  - input amount
  - rate in basis points
  - quantity times unit amount
  - paid/unpaid leave time ratio
  - overtime premium rate in basis points
- Added output support for component amount, payroll effect, gross/taxable/social bases, employee deduction, employer charge, net payable, leave paid/deduction, attendance ratio, and overtime premium evidence.
- Added synthetic reviewed fixtures proving allowance, benefit, leave, and overtime scenarios can execute from country-pack envelopes.

## Boundary

No statutory legal rates or Cameroon-specific allowance/overtime laws were added to runtime code.

The runner now supports reviewed formula primitives, but production country packs still need legal owner inputs, reviewed fixtures, and explicit capability declarations before these families can unblock full production.

## Verification

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts --runInBand`
  - 1 suite, 6 tests.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts components/payroll/__tests__/PayrollSetupControlPlane.test.tsx --runInBand`
  - 4 suites, 19 tests.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/regulatory/__tests__/country-pack.service.test.ts components/payroll/__tests__/PayrollSetupControlPlane.test.tsx --runInBand`
  - 6 suites, 42 tests.
- `npm run typecheck`
- `npm run prisma:validate`
- `npm run regulatory:hardcode:fail`
- `npm run service:boundary:fail`
- `npm run policy:gates`

## Remaining Blockers

- Active Cameroon country pack still lacks reviewed allowance, benefit, leave, and overtime production fixtures.
- Active Cameroon IRPP remains blocked by expert review.
- Payroll run calculation still needs final integration of reviewed rubriques and attendance premiums into persisted run lines before claiming full payroll calculation breadth.
- Accounting/register tie-out must then prove those components reconcile into payslips, ledger postings, liabilities, declarations, payments, and close evidence.

## Next Safe Move

Wire service-owned payroll run calculation to consume active, approved employee rubriques and reviewed attendance premium outputs into run-line component snapshots, with ledger mapping proof and tests.

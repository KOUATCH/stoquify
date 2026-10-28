# AqStoqFlow HR/Payroll Wave 1 Effective-Dated Compensation And Attendance Fixture Gate Report

Date: 2026-06-29

## Decision

This slice strengthens the Phase 3 statutory country-pack fixture gate. It does not add new legal formulas or certify full statutory production readiness, but it prevents compensation and attendance calculation fixtures from passing unless they are tied to a payroll period and executed against the effective country-pack envelope.

## Selected Skill

- `aqstoqflow-payroll-country-pack-engine`

## Phase And Executable Slice

- Phase: Wave 1 / Phase 3 statutory country-pack and payroll engine hardening.
- Slice: executable fixture validation for effective-dated taxable allowance, benefit-in-kind, paid leave, unpaid leave, and overtime premium scenarios.

## Implemented

- Compensation and attendance calculation scenarios now require:
  - `periodStart`;
  - `periodEnd`;
  - fixture `date` inside the payroll period.
- The runner continues to resolve the country-pack rule by fixture date, so period-scoped scenarios are executed against effective-dated envelopes.
- The fixture test pack now proves:
  - taxable allowance;
  - benefit in kind / employer charge;
  - paid leave effect;
  - unpaid leave effect;
  - overtime premium base and premium.
- Statutory scenario coverage now requires:
  - `PAYROLL_ALLOWANCE_TAXABLE`;
  - `PAYROLL_BENEFIT_IN_KIND`;
  - `PAYROLL_LEAVE_PAID`;
  - `PAYROLL_LEAVE_UNPAID`;
  - `PAYROLL_OVERTIME`.
- Setup-readiness ready fixtures now include the same granular scenario coverage.

## Files Changed

- `services/payroll/payroll-country-pack-fixture-runner.ts`
- `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts`
- `services/payroll/payroll-statutory-scenario-coverage.service.ts`
- `services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts`
- `services/payroll/__tests__/payroll-setup-readiness.service.test.ts`

## Verification

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts --runInBand`
  - 3 suites passed, 20 tests passed.
- `npm test -- --runTestsByPath services/regulatory/__tests__/country-pack.service.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts --runInBand`
  - 5 suites passed, 43 tests passed.
- `npm run typecheck`
  - Passed.
- `npm run prisma:validate`
  - Passed.
- `npm run lint`
  - Passed with 5 pre-existing warnings unrelated to this slice.
- `npm run policy:gates`
  - Passed.

## Gates Passed

- Fixture tests match executable reviewed outputs.
- Compensation and attendance fixtures are period-scoped.
- Unsupported or incomplete scenario families remain blocked.
- Regulatory hardcode gate remains clean.
- Payroll immutability runtime gate remains clean.

## Gates Still Blocked

- Full statutory payroll production readiness remains blocked until active country packs include reviewed production formulas and fixtures for every legal payroll claim.
- This slice uses reviewed test-pack fixtures to harden gates; it does not insert new regulator-confirmed benefit, leave, overtime, or income-tax law into the active Cameroon pack.

## Next Recommended Slice

Wire effective-dated compensation and attendance fixture evidence into payslip/register tie-out so taxable allowance, benefit-in-kind, paid/unpaid leave, and overtime components are visible in immutable register proof and downstream accounting/declaration readiness.

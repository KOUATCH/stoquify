# AqStoqFlow HR/Payroll Wave 1 Statutory Scenario Coverage Release Gate Report

Date: 2026-06-28

## Decision

Implemented a strict full-production scenario coverage gate for HR/payroll statutory calculation readiness.

Current decision remains: not ready for unrestricted full production. The active Cameroon pack now proves executable CNPS coverage, while full-production coverage stays blocked until reviewed executable evidence exists for IRPP period/YTD/adjustments/corrections plus allowances, benefits, leave, and overtime.

## What Changed

- Added `services/payroll/payroll-statutory-scenario-coverage.service.ts`.
- Added family-level coverage for:
  - CNPS pension
  - CNPS family allowance
  - CNPS occupational risk
  - IRPP period calculation
  - IRPP YTD regularization
  - IRPP period adjustments
  - IRPP correction replay
  - allowances and benefits
  - leave and overtime
- Wired the coverage summary into payroll setup readiness under `countryPack.calculationFixtures.scenarioCoverage`.
- Added one aggregated readiness blocker: `PAYROLL_STATUTORY_SCENARIO_COVERAGE_INCOMPLETE`.
- Added operator-facing coverage evidence to the payroll setup control plane as `Full-production coverage`.
- Added focused tests for current Cameroon blocked state, synthetic full coverage, and missing correction replay.

## Control Behavior

The gate does not introduce legal formulas into runtime code. It classifies and counts reviewed executable scenarios from country-pack fixture evidence.

Full production is blocked when:

- a required family has no executable scenario;
- a required family has failed executable evidence;
- a declared statutory capability is not production-supported.

The active Cameroon state is intentionally truthful:

- CNPS pension/family/risk: executable and ready.
- IRPP: blocked by `REQUIRES_EXPERT_REVIEW`.
- Allowances/benefits and leave/overtime: blocked until reviewed executable scenarios exist.

## Verification

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts components/payroll/__tests__/PayrollSetupControlPlane.test.tsx --runInBand`
  - 4 suites, 18 tests.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/regulatory/__tests__/country-pack.service.test.ts components/payroll/__tests__/PayrollSetupControlPlane.test.tsx --runInBand`
  - 6 suites, 41 tests.
- `npm run typecheck`
- `npm run prisma:validate`
- `npm run regulatory:hardcode:fail`
- `npm run service:boundary:fail`
- `npm run policy:gates`

## Remaining Blockers

- Reviewed Cameroon IRPP legal formulas and golden fixtures are still required.
- Allowance/benefit treatment needs service-owned country-pack-backed scenario coverage.
- Leave and overtime calculation inputs need reviewed executable scenarios.
- This is a release-readiness gate, not completion of those missing product surfaces.

## Next Safe Move

Close the missing scenario families in this order:

1. Expert-reviewed Cameroon IRPP period/YTD/adjustment/correction fixtures.
2. Allowance and benefit calculation model with country-pack-backed fixtures.
3. Leave and overtime calculation model with attendance/contract inputs and reviewed fixtures.
4. Register tie-out proof that all covered families reconcile into payslips, ledger postings, liabilities, and close evidence.

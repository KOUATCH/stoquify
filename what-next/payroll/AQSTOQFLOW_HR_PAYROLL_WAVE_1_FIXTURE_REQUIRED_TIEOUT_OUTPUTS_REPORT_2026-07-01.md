# AqStoqFlow HR/Payroll Wave 1 Fixture Required Tie-Out Outputs Report

Generated: 2026-07-01
Workspace: E:\ohada saas\newStockFlow\aqstoqflow
Selected skill: aqstoqflow-payroll-country-pack-engine
Companion constraints: aqstoqflow-payroll-kernel-hardener
Selected phase: Phase 3 country-pack calculation hardening

## Status

CONTROLLED PROGRESS. This slice strengthens statutory calculation evidence but does not make HR/payroll unrestricted-production ready. It closes a fixture-runner weakness where reviewed component or attendance scenarios could omit material payslip/register output pins and still pass if the supplied expected fields matched.

## Executable Slice

The payroll country-pack fixture runner now requires reviewed executable component scenarios to pin their material payslip/register tie-out outputs before the scenario can pass.

Covered scenario families:

- taxable allowances
- benefit-in-kind employer charges
- paid leave effects
- unpaid leave effects
- overtime premium effects

No statutory legal values were added to application logic. The new rules are evidence-shape requirements only; they ensure country-pack scenarios prove the financial outputs already calculated by the runner.

## Files Changed

- services/payroll/payroll-country-pack-fixture-runner.ts
  - Added SCENARIO_EXPECTED_OUTPUT_MISSING.
  - Added required expected-output field requirements for allowance, benefit, leave, and overtime fixtures.
  - compareOutputs now records missing required payslip/register tie-out outputs before comparing supplied fields.
- services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts
  - Added a regression test proving an omitted required registerNetPayableAmount fails the scenario even though the runner can calculate the value.

## Verification

Passed:

- npx jest services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand
  - 3 suites passed, 34 tests passed.
- npm run regulatory:hardcode:fail
  - pass, 0 active findings.
- npm run typecheck
  - passed.
- npm run policy:gates
  - inventory boundary: 0 active violations.
  - service boundary: 0 active violations.
  - workflow assurance runtime: ready.
  - payroll immutability runtime: ready, 9/9 triggers present, 14/14 forbidden mutation checks blocked, 3/3 allowed lifecycle checks passed.
  - hard-delete gate: 0 active unsafe findings.
  - regulatory hardcode gate: pass, 0 active findings.
  - demo/report trust gate: 0 active production trust findings.
  - raw error boundary gate: 0 active unsafe findings.

Blocked gates: none for this slice.

## Production Readiness Impact

This improves the calculation/register evidence standard for country-pack-backed allowances, benefits, leave, and overtime. A country pack can no longer rely on partial expected outputs for these component scenarios inside the executable runner; missing material tie-out pins are explicit failures.

Remaining full-production blockers still include:

- real expert-reviewed Cameroon IRPP/income-tax formulas and golden fixtures;
- jurisdiction expansion beyond the current reviewed/proven scope;
- end-to-end pilot payroll cycle reconciliation;
- production migration/backfill evidence;
- final accounting/security/operations signoff.

## Next Recommended Slice

Continue with Phase 3 payroll calculation breadth: require component scenario coverage to aggregate into a run-level gross/taxable/social/deduction/employer-charge/net-pay register summary, then tie that aggregate to accounting posting component mappings before any broader release claim.

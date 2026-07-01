# AqStoqFlow HR/Payroll Wave 1 CNPS Executable Fixture Breadth Report

Date: 2026-06-28
Selected skill: `aqstoqflow-payroll-country-pack-engine`
Selected phase: Phase 3 - statutory country-pack calculation capability
Executable slice: add executable Cameroon CNPS calculation scenario coverage for pension, family allowance sectors, and occupational-risk groups.

## Outcome

The payroll country-pack fixture runner now executes regulator-confirmed Cameroon CNPS scenarios in addition to reviewed IRPP scenarios. CNPS pension, family allowance, and occupational-risk calculations are derived from resolved country-pack envelopes and scenario inputs; the runner does not carry statutory rates as application constants.

The Cameroon country pack now includes executable `calculationScenario` fixtures for:

- `payroll.cnps.pensionRatesBps`
  - Pins the monthly ceiling plus employee and employer pension contributions.
- `payroll.cnps.familyAllowanceRatesBps`
  - Pins `GENERAL`, `AGRICULTURE`, and `PRIVATE_EDUCATION` employer family allowance contributions.
- `payroll.cnps.occupationalRiskRatesBps`
  - Pins occupational-risk groups `A`, `B`, and `C` employer contributions.

IRPP remains explicitly `REQUIRES_EXPERT_REVIEW`; this slice improves CNPS statutory evidence breadth without claiming full payroll income-tax production readiness.

## Files Changed

- `services/payroll/payroll-country-pack-fixture-runner.ts`
  - Added supported CNPS parameter paths.
  - Added country-pack-derived evaluators for CNPS pension, family allowance sectors, and occupational risk groups.
  - Extended expected-output comparison fields for CNPS contribution proof.
  - Kept unsupported parameters fail-closed with scenario issue evidence.
- `services/regulatory/country-packs/cameroon.ts`
  - Added regulator-confirmed executable CNPS calculation scenarios to the existing golden fixtures.
  - Added family allowance sector scenarios for `GENERAL`, `AGRICULTURE`, and `PRIVATE_EDUCATION`.
  - Added occupational-risk scenarios for groups `A`, `B`, and `C`.
- `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts`
  - Updated active Cameroon pack coverage to expect passing CNPS executable scenarios while IRPP remains review-blocked.
  - Added a CNPS drift regression test for pension contribution mismatch.

## Gates Passed

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand`
  - Passed: 2 suites, 21 tests.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/regulatory/__tests__/country-pack.service.test.ts services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts components/payroll/__tests__/PayrollSetupControlPlane.test.tsx --runInBand`
  - Passed: 5 suites, 36 tests.
- `npm run typecheck`
  - Passed.
- `npm run prisma:validate`
  - Passed.
- `npm run regulatory:hardcode:fail`
  - Passed: 0 active findings.
- `npm run service:boundary:fail`
  - Passed: 0 active violations.
- `npm run policy:gates`
  - Passed all policy gates, including inventory boundary, service boundary, workflow assurance runtime, payroll immutability runtime, hard-delete, regulatory hardcode, demo/report trust, and raw error boundary.

## Gates Blocked

None for this slice.

## Residual Risks

- CNPS executable fixture breadth is materially stronger, but complete payroll production still requires employee-level end-to-end fixture coverage that ties attendance, contracts, statutory components, register totals, payslips, ledger postings, payment proof, and declarations together.
- IRPP remains the major full-production statutory blocker: reviewed income-tax formulas, family/dependent treatment, deductions, rounding, caps, period and YTD regularization fixtures still need to be loaded and executed.
- Benefits, allowances, loans, garnishments, overtime, leave effects, and corrections still need executable scenarios before claiming complete payroll calculation breadth.

## Next Recommended Slice

Continue Phase 3 with IRPP reviewed formula and golden scenario breadth: period withholding, YTD regularization, taxable-base deductions, caps, rounding, and corrections. After IRPP passes fixture gates, wire a release-gate summary of scenario coverage into final readiness evidence and close-assurance checks.
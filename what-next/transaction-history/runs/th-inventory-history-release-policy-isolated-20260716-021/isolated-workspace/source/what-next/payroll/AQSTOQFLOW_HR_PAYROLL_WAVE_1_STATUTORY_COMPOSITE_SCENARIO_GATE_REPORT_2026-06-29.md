# AqStoqFlow HR/Payroll Wave 1 Statutory Composite Scenario Gate Report

Date: 2026-06-29

## Decision

This slice hardens the Phase 3 statutory country-pack readiness gate. It does not certify full statutory payroll production readiness, but it prevents a false-ready result where a composite statutory family has only partial fixture evidence.

## Selected Skill

- `aqstoqflow-payroll-country-pack-engine`
- Guardrail skill: `aqstoqflow-payroll-kernel-hardener`

## Phase And Executable Slice

- Phase: Wave 1 / Phase 3 statutory country-pack and payroll engine hardening.
- Slice: require every mandatory sub-scenario in composite statutory families before full-production scenario coverage can be marked `READY`.

## Problem Closed

The statutory scenario coverage service already tracked families such as `ALLOWANCES_BENEFITS` and `LEAVE_OVERTIME`, but a family could be marked ready when only one scenario existed:

- allowance without benefit;
- overtime without leave.

That was too weak for a full HR/payroll production claim because the roadmap requires compensation, allowances, benefits, leave, overtime, YTD, corrections, and statutory provenance to be evidence-backed.

## Implementation

- Added family-level `requiredPurposeMatchers`, `coveredPurposeMatchers`, and `missingPurposeMatchers`.
- Composite families now require:
  - `PAYROLL_ALLOWANCE` and `PAYROLL_BENEFIT`;
  - `PAYROLL_LEAVE` and `PAYROLL_OVERTIME`.
- Non-composite families such as CNPS pension remain valid when coverage is parameter-path backed, so existing regulator-confirmed CNPS fixture behavior is preserved.
- Blocker evidence now includes missing purpose matchers, giving setup readiness and reports a clear action path.

## Files Changed

- `services/payroll/payroll-statutory-scenario-coverage.service.ts`
- `services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts`
- `services/payroll/__tests__/payroll-setup-readiness.service.test.ts`

## Verification

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts --runInBand`
  - 1 suite passed, 5 tests passed.
- `npm test -- --runTestsByPath services/regulatory/__tests__/country-pack.service.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts --runInBand`
  - 5 suites passed, 42 tests passed.
- `npm run typecheck`
  - Passed.
- `npm run prisma:validate`
  - Passed.
- `npm run lint`
  - Passed with 5 pre-existing warnings unrelated to this slice.
- `npm run policy:gates`
  - Passed.

## Gates Passed

- Country-pack scenario coverage remains fail-closed.
- Regulatory hardcode gate remains clean.
- Payroll immutability runtime gate remains clean.
- Service boundary, hard-delete, demo trust, workflow assurance runtime, and raw-error gates remain clean.

## Gates Blocked

- Full statutory payroll production readiness remains blocked until reviewed country-pack fixtures and formula inputs exist for all production legal claims, especially active Cameroon IRPP and broader compensation/attendance statutory calculations.

## Residual Risks

- This slice strengthens the release gate. It does not add new legal formulas or regulator-reviewed values.
- Real production support still requires reviewed benefits, leave, overtime, IRPP, YTD, correction, and jurisdiction fixtures in the active country pack before the system can claim full statutory payroll readiness.

## Next Recommended Slice

Add country-pack fixture requirements and executable fixture validation for effective-dated compensation and attendance statutory inputs: taxable allowances, benefits in kind, paid/unpaid leave effects, overtime premium bases, and their payslip/register tie-out.

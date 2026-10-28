# AqStoqFlow HR/Payroll Wave 1 Setup Calculation Fixture Evidence Report

Date: 2026-06-28
Selected skill: `aqstoqflow-payroll-country-pack-engine`
Selected phase: Phase 3 - statutory country-pack calculation capability
Executable slice: surface executable payroll country-pack calculation fixture coverage in setup readiness and the setup control plane.

## Outcome

Setup readiness now carries service-owned calculation fixture evidence for the active payroll country pack. If payroll country-pack capabilities are claimed as production-supported, readiness blocks when executable calculation scenarios are missing or when scenario execution fails. If the active pack is still expert-review-only, the result remains explicit as `BLOCKED_BY_COUNTRY_PACK_REVIEW` instead of being presented as production legal truth.

The setup control plane now displays calculation fixture coverage beside country-pack capability, including scenario count, pass count, pack version, status, and issue codes. This keeps operators and reviewers focused on evidence-backed statutory readiness without moving payroll truth into POS, BI, or UI-only logic.

## Files Changed

- `services/payroll/payroll-setup-readiness.service.ts`
  - Added `PayrollSetupCalculationFixtureEvidence` to the setup readiness DTO.
  - Resolves the active country pack from the registry after regulatory parameter resolution.
  - Runs `validatePayrollCountryPackCalculationFixtures` for the active pack.
  - Adds blockers for missing executable scenarios on production-supported packs and failed executable scenarios.
- `services/payroll/__tests__/payroll-setup-readiness.service.test.ts`
  - Added registry and fixture-runner mocks.
  - Covered ready fixture evidence, missing executable scenarios, and failed scenario drift.
- `components/payroll/PayrollSetupControlPlane.tsx`
  - Added a calculation fixture readiness row.
  - Treats failed/no-scenario/country-pack-unavailable states as blocked badges.
- `components/payroll/__tests__/PayrollSetupControlPlane.test.tsx`
  - Added fixture evidence to the setup mock and verified the new row renders without exposing raw tenant/person identifiers.

## Gates Passed

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-setup-readiness.service.test.ts components/payroll/__tests__/PayrollSetupControlPlane.test.tsx services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts --runInBand`
  - Passed: 3 suites, 14 tests.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/regulatory/__tests__/country-pack.service.test.ts services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts components/payroll/__tests__/PayrollSetupControlPlane.test.tsx --runInBand`
  - Passed: 7 suites, 52 tests.
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

- Cameroon IRPP remains expert-review-only in the current country pack, so full production payroll remains blocked until reviewed IRPP formulas and executable period/YTD golden scenarios are loaded.
- The fixture runner currently supports payroll IRPP income-tax scenarios. CNPS contribution executable scenarios and broader allowance/benefit/overtime/YTD fixtures still need expansion before claiming complete statutory calculation breadth.
- This slice surfaces setup evidence; it does not yet promote any country pack to production-supported legal calculation status.

## Next Recommended Slice

Continue Phase 3 by adding executable CNPS and IRPP statutory scenario coverage breadth: reviewed formulas, golden calculation scenarios, YTD regularization, caps, allowances/benefits, overtime/leave effects, and correction fixtures. Only after those fixtures pass should operator routes, BI, and release gates claim production payroll automation readiness.
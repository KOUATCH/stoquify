# AqStoqFlow HR/Payroll Wave 1 - Statutory Scenario Certification Hardening Report

Date: 2026-06-29
Selected skill: aqstoqflow-payroll-country-pack-engine
Selected phase/slice: Phase 3 statutory country-pack breadth and certification evidence hardening
Decision: Slice complete and verified. Full HR/payroll roadmap remains in progress.

## Scope Implemented

- Hardened statutory scenario coverage so full-production family readiness requires production-ready capability metadata, not only passing fixture rows.
- Added explicit scenario review-level evidence to statutory coverage summaries:
  - `reviewStatuses`
  - `expertReviewedScenarioCount`
  - `regulatorConfirmedScenarioCount`
  - `certificationStatus`
- Added family-level and summary-level certification status values:
  - `NO_EXECUTABLE_SCENARIOS`
  - `EXPERT_REVIEWED`
  - `REGULATOR_CONFIRMED`
  - `MIXED_REVIEW`
- Added a certified-support guard: if a family claims `SUPPORTED_CERTIFIED`, executable scenario evidence must be regulator-confirmed, otherwise the family is blocked with `PAYROLL_STATUTORY_SCENARIO_CERTIFIED_REVIEW_MISSING`.
- Tightened capability semantics while preserving blocker clarity:
  - explicit non-production capability, such as `REQUIRES_EXPERT_REVIEW`, remains a capability blocker;
  - zero executable family coverage remains a family-missing blocker;
  - executable scenarios without capability metadata are now blocked as capability-not-production-ready.
- Updated setup-readiness test country-pack mock to include the production payroll capability matrix required by the hardened coverage contract.
- Added focused tests for missing capability metadata and certified-support review-level insufficiency.

## Files Changed

- `services/payroll/payroll-statutory-scenario-coverage.service.ts`
- `services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts`
- `services/payroll/__tests__/payroll-setup-readiness.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md` (updated by `npm run policy:gates`)
- `what-next/payroll/payroll-immutability-runtime-check.json` (updated by `npm run policy:gates`)

## Verification Gates

- Passed: `npm test -- --runTestsByPath services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts --runInBand`
  - 1 suite passed
  - 7 tests passed
- Passed: `npm test -- --runTestsByPath services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts --runInBand`
  - 4 suites passed
  - 29 tests passed
- Passed: `npm run typecheck`
- Passed: `npx eslint services/payroll/payroll-statutory-scenario-coverage.service.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts`
- Passed: `npm run regulatory:hardcode:fail`
  - Active findings: 0
- Passed: `npm run service:boundary:fail`
  - Active service-boundary violations: 0
- Passed: `npm run policy:gates`
  - inventory boundary: 0 active violations
  - service boundary: 0 active violations
  - workflow assurance runtime tables: ready
  - payroll immutability runtime: ready, 9/9 triggers present, 14/14 forbidden mutation checks blocked
  - hard-delete gate: 0 active unsafe findings
  - regulatory hardcode gate: 0 active findings
  - demo/report trust gate: 0 active findings
  - raw error boundary gate: 0 active unsafe findings
- Passed: `git diff --check -- services/payroll/payroll-statutory-scenario-coverage.service.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts`

## Security And Trust Result

- No statutory values were added to application logic.
- No country-pack formulas were hardcoded outside country-pack fixtures/tests.
- Setup readiness now distinguishes executable scenario presence, production capability metadata, expert-reviewed evidence, regulator-confirmed evidence, and certified-support claims.
- Unsupported or review-blocked country-pack families continue to block production readiness.
- Certified country-pack claims cannot be made from expert-reviewed-only fixtures.
- The change does not mutate payroll runs, payslips, declarations, payments, accounting entries, or evidence archives.

## Residual Risk

- This slice hardens certification evidence semantics; it does not add new legal formulas or reviewed country-pack data.
- Active Cameroon IRPP, allowances, benefits, leave, and overtime production readiness still depends on reviewed country-pack expansion and executable fixture coverage.
- Full HR/payroll production readiness still depends on payroll engine correction lifecycle, accounting close proof, declaration/payment adapters, migration/backfill, authenticated browser smoke, and release certification.

## Worktree Notes

- The repository currently reports some payroll files as untracked even when they are existing working files. This report preserves that state and does not assume ownership from git tracking status alone.
- `npm run policy:gates` updated the standard payroll immutability runtime evidence artifacts under `what-next/payroll/`.

## Next Recommended Slice

Continue with payroll engine hardening for correction/recalculation lifecycle and immutable correction events, or expand reviewed country-pack data for IRPP/allowances/benefits/leave/overtime when expert-reviewed inputs are available.
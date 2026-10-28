# AqStoqFlow HR/Payroll Wave 1 Composite Register Tie-Out Fixture Report

Date: 2026-07-02
Selected skill: `aqstoqflow-payroll-country-pack-engine`
Selected phase and executable slice: Phase 3 / Wave 1 statutory country-pack breadth and payroll engine hardening; composite payroll-period register tie-out fixture support.
Status: PASS for this implementation slice
Production decision: This does not approve unrestricted HR/payroll production rollout.

## Purpose

The full-production roadmap identifies statutory country-pack breadth and payroll engine hardening as the deepest product-claim blocker. Existing country-pack fixtures already covered individual CNPS, IRPP, allowance, benefit, leave, and overtime primitives. This slice adds a reviewed composite payroll-period fixture path so a country pack can prove that component outputs tie together into gross, taxable/social base, employee deductions, employer charges, statutory liability, net pay, and register pins for one payroll period.

## Files Changed

- `services/payroll/payroll-country-pack-fixture-runner.ts`
- `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts`
- `services/regulatory/country-packs/validation.ts`

## Implementation Summary

- Added `payroll.composite.registerTieOut` as a supported payroll country-pack fixture path.
- Added `COMPOSITE_REGISTER_TIE_OUT` execution support in the fixture runner.
- Added supported output pins for `statutoryLiabilityAmount` and `registerStatutoryLiabilityAmount`.
- Added required composite input fields for base gross, taxable allowance, overtime premium, leave deduction, employee pension, IRPP withholding, employer pension, family allowance, occupational risk, and benefit employer charge amounts.
- Added required composite output pins for gross, taxable/social base, employee deductions, employer charges, net pay, statutory liability, and register tie-out outputs.
- Extended Cameroon country-pack validation so production-supported composite register tie-out capability requires an effective-dated country-pack parameter and a reviewed fixture pinned to the pack version.
- Added focused tests for successful composite fixture execution, output-drift failure, and missing-fixture production capability failure.

## Security, Privacy, And Accounting Decisions

- No salary/person data is logged or persisted by this fixture runner change.
- No UI computes payroll truth; this is service-side country-pack validation only.
- No statutory legal constants were added to production application logic.
- Composite tie-out arithmetic is based on reviewed country-pack fixture inputs and is used to validate register/payslip/statutory output pins.
- Unsupported or unpinned composite capability now blocks country-pack publish validation.

## Verification

- PASS: `npm test -- --runTestsByPath services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts --runInBand`
  - 1 suite passed
  - 11 tests passed
- PASS: `npm test -- --runTestsByPath services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts --runInBand`
  - 3 suites passed
  - 28 tests passed
- PASS: `npm run prisma:validate`
- PASS: `npm run regulatory:hardcode:fail`
  - 0 active findings
- PASS: `npm run typecheck`
- PASS: `npm run lint -- --quiet`
  - 0 errors
  - 4 existing warnings outside this slice
- PASS: `git diff --check -- services/payroll/payroll-country-pack-fixture-runner.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/regulatory/country-packs/validation.ts`
- PASS: `npm run policy:gates`
  - inventory boundary: 0 active violations
  - service boundary: 0 active violations
  - workflow assurance runtime: ready
  - payroll immutability runtime: ready, 9/9 triggers, 14/14 forbidden mutations blocked, 3/3 lifecycle checks passed
  - hard delete: 0 active unsafe findings
  - regulatory hardcode: 0 active findings
  - demo/report trust: 0 active findings
  - raw error boundary: 0 active unsafe findings

## Residual Risks

- This does not complete all statutory country-pack breadth for Cameroon or future jurisdictions.
- This does not add live legal filing, authority payload mappings, provider settlement automation, or production migration/backfill mutation.
- This does not prove every real tenant payroll run has a full composite fixture; it adds the fixture contract and validation path.
- Full production remains blocked until reviewed formulas and golden fixtures cover ordinary, correction, retro, leave, overtime, allowance, benefit, deduction, YTD, employer liability, and jurisdiction scenarios end-to-end, followed by one reconciled pilot cycle and accounting/security/operations signoff.

## Handoff

Next recommended slice: continue Wave 1 by binding this composite fixture evidence into final-release statutory coverage and register proof requirements, so production readiness cannot pass unless a reviewed composite register tie-out fixture is present for every supported statutory capability family.
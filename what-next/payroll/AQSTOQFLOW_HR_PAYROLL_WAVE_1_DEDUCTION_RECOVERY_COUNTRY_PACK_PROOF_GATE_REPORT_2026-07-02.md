# AqStoqFlow HR/Payroll Wave 1 Deduction Recovery Country-Pack Proof Gate Report - 2026-07-02

## Decision

Status: PASSED for this implementation slice.

This slice hardens deduction/recovery country-pack production evidence. A Cameroon payroll compensation deduction capability can no longer claim production support with only generic deduction amounts and register fields. Reviewed fixtures must now pin and replay recovery policy proof: recovery case, outstanding balance amount/proof hash, approved recovery cap/proof hash, net-pay floor, and the recovery-policy-applied marker.

## Skill And Slice

- Skill: aqstoqflow-payroll-kernel-hardener
- Roadmap phase: Wave 1 / statutory country-pack breadth plus payroll engine hardening
- Slice: deduction recovery country-pack proof gate

## Changes

- Extended `services/regulatory/country-packs/validation.ts` so Cameroon deduction/recovery production fixtures require recovery policy proof inputs and expected outputs.
- Extended `services/payroll/payroll-country-pack-fixture-runner.ts` so executable country-pack fixtures support recovery proof fields, require sha256 proof-hash prefixes, echo proof fields into actual output, and fail when the fixture amount exceeds the proven outstanding balance or approved recovery cap.
- Updated `services/regulatory/__tests__/country-pack.service.test.ts` with a reviewed deduction recovery fixture and a publish-gate rejection when recovery proof output is missing.
- Updated `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts` with executable recovery proof assertions and a failure case for recovery above approved cap proof.

## Verification

- PASSED: `npm test -- --runTestsByPath services/regulatory/__tests__/country-pack.service.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts --runInBand`
  - 3 test suites passed
  - 44 tests passed
- PASSED: `npm run typecheck`
- PASSED: `npm run regulatory:hardcode:fail`
- PASSED: `npm run prisma:validate`
- PASSED: `npm run lint -- --quiet`
  - 0 errors
  - 4 pre-existing warnings in image/default-export areas
- PASSED: `npm run policy:gates`
  - inventory boundary, service boundary, workflow assurance, payroll immutability runtime, hard-delete, regulatory hardcode, demo trust, and raw-error boundary gates all passed.

## Evidence Notes

- The fixture proof values are synthetic reviewed test evidence only. They are not statutory legal logic and do not encode production law.
- Runtime statutory values remain country-pack/configuration driven.
- Proof hashes are validated as `sha256:` references by the executable fixture runner.
- The runner now blocks recovery fixture replay when requested deduction amount exceeds either the proven outstanding balance or the approved cap proof.

## Remaining Work

Next recommended slice: connect the same deduction recovery proof contract into final release readiness/read-model evidence so release certification can distinguish generic deduction fixtures from proof-backed recovery fixtures across tenant readiness, close assurance, and operator proof drawers.
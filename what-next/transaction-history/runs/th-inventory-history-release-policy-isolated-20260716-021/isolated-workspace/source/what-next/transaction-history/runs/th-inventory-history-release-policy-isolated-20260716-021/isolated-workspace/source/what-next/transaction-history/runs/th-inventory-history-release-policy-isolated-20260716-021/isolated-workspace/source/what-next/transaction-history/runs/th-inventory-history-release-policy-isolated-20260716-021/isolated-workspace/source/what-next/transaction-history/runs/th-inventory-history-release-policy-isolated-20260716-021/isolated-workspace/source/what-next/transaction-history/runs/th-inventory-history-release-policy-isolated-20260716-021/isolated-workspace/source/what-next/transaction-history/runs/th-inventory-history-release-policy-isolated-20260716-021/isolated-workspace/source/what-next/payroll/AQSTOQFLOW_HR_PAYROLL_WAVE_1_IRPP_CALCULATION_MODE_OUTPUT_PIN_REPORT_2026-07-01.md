# AqStoqFlow HR/Payroll Wave 1 IRPP Calculation Mode Output Pin Report - 2026-07-01

## Decision

This slice hardens the Phase 3 payroll country-pack engine by requiring Cameroon IRPP production executable fixtures to pin the reviewed calculation mode in expected outputs.

Full production is still not achieved. This closes one statutory fixture integrity gap inside the broader country-pack blocker.

## Scope Implemented

- Added `calculationMode` to every required Cameroon IRPP production fixture output requirement in `services/regulatory/country-packs/validation.ts`.
- Updated the payroll country-pack fixture runner so actual IRPP tax outputs include `result.trace.calculationMode` from the tax evaluator.
- Updated reviewed IRPP test fixtures to pin `PROGRESSIVE_YTD` in expected outputs.
- Added a regression proving Cameroon IRPP production fixtures without `calculationMode` output pins are rejected by publish validation.

## Files Touched

- `services/regulatory/country-packs/validation.ts`
- `services/payroll/payroll-country-pack-fixture-runner.ts`
- `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts`
- `services/regulatory/__tests__/country-pack.service.test.ts`

## Why This Matters

Before this slice, an executable IRPP fixture could pin amounts, bases, adjustments, and currency without explicitly pinning which reviewed formula mode produced those outputs. That left room for accidental formula-mode drift while golden amounts still looked plausible.

Now production-supported Cameroon IRPP fixtures must prove the calculation mode alongside the money outputs. This strengthens formula provenance without hardcoding legal values in application logic.

## Verification Evidence

Passed:

```text
npx jest services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand
Test Suites: 2 passed, 2 total
Tests: 29 passed, 29 total
```

Passed:

```text
npx jest services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts --runInBand
Test Suites: 2 passed, 2 total
Tests: 16 passed, 16 total
```

Passed:

```text
npm run typecheck
```

Passed:

```text
npm run regulatory:hardcode:fail
Active findings: 0
```

Passed:

```text
npm run service:boundary:fail
Active service-boundary violations: 0
```

Passed:

```text
npm run policy:gates
```

Policy wrapper components passed:

- `inventory:boundary:fail`
- `service:boundary:fail`
- `workflow:assurance:runtime-check`
- `payroll:immutability:runtime`
- `hard-delete:fail`
- `regulatory:hardcode:fail`
- `demo:trust:fail`
- `error:boundary:fail`

Payroll immutability runtime evidence:

- Required triggers present: 9/9
- Forbidden mutation checks blocked: 14/14
- Allowed lifecycle checks passed: 3/3
- Blockers: 0

## Residual Risks

- This does not create new legal formulas or certify Cameroon IRPP for full production.
- Real expert-reviewed or regulator-confirmed IRPP formulas and fixture outputs are still required before unrestricted statutory payroll claims.
- Reviewer identity, review date, and source-evidence hashes for executable payroll scenarios remain a future country-pack provenance hardening target.
- Full production still requires authority adapters, migration/backfill signoff, controlled pilot reconciliation, browser accessibility evidence, and finance/BI fact integration.

## Next Recommended Slice

Continue Phase 3 country-pack hardening by adding reviewer/source evidence metadata requirements for executable payroll calculation scenarios, or move to Phase 5 authority adapter production mappings if statutory source material remains unavailable.
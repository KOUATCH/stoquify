# AqStoqFlow HR/Payroll Wave 1 Executable Fixture Review Evidence Report - 2026-07-01

## Decision

This slice hardens Phase 3 payroll country-pack provenance by requiring executable payroll calculation scenarios to carry explicit review evidence, not only a review status label.

Full production is still not achieved. This closes one statutory provenance gap inside the broader country-pack blocker.

## Scope Implemented

- Added `reviewEvidence` metadata to executable payroll calculation scenarios in `services/regulatory/country-packs/schemas.ts`.
- Added country-pack validation that fails executable payroll fixtures missing review evidence.
- Validation now requires executable scenario review evidence to include:
  - `reviewedBy`;
  - `reviewedOn`;
  - `legalRef` matching the fixture `expectedLegalRef`;
  - `sourceEvidenceHash` with a `sha256:` proof identifier.
- Added regulator-confirmed review evidence to active Cameroon CNPS executable fixtures.
- Added expert-review evidence to statutory test fixtures for IRPP, allowances, benefits, leave, and overtime.
- Propagated review evidence into payroll calculation fixture run records so downstream readiness/reporting can surface it.
- Added a regression proving executable payroll calculation fixtures without review evidence are rejected.

## Files Touched

- `services/regulatory/country-packs/schemas.ts`
- `services/regulatory/country-packs/validation.ts`
- `services/regulatory/country-packs/cameroon.ts`
- `services/payroll/payroll-country-pack-fixture-runner.ts`
- `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts`
- `services/regulatory/__tests__/country-pack.service.test.ts`

## Why This Matters

Before this slice, a calculation scenario could state `EXPERT_REVIEWED` or `REGULATOR_CONFIRMED` without carrying reviewer/date/source proof. That was too weak for full-production statutory payroll claims.

Now executable payroll fixture evidence must bind the scenario to a reviewer, review date, legal reference, and source proof hash. This strengthens legal/statutory provenance while keeping legal values in country packs rather than runtime logic.

## Verification Evidence

Passed:

```text
npx jest services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand
Test Suites: 2 passed, 2 total
Tests: 30 passed, 30 total
```

Passed:

```text
npx jest services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts --runInBand
Test Suites: 3 passed, 3 total
Tests: 21 passed, 21 total
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

- The active Cameroon IRPP capability remains blocked unless real expert-reviewed or regulator-confirmed formulas and executable outputs are provided.
- This does not add new legal formulas or certify unsupported jurisdictions.
- Future UI/reporting work should expose review evidence in statutory provenance surfaces and proof drawers.
- Full production still requires authority adapters, payment provider production adapters, production migration/backfill signoff, controlled pilot cycle reconciliation, browser accessibility evidence, and finance/BI fact integration.

## Next Recommended Slice

Continue Phase 3 by surfacing executable scenario review evidence in statutory readiness/provenance read models, or move to Phase 5 authority adapter production mappings if statutory source material is available.
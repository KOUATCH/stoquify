# AqStoqFlow HR/Payroll Immutability Release Gate Promotion Report

Date: 2026-06-26

## Decision

Decision: promoted with one unrelated aggregate gate blocker.

The payroll immutability runtime proof is now part of the normal release policy path through `npm run policy:gates`. Finalized payroll mutation protection is no longer only a standalone proof command.

## Scope Kept

- Updated release gate wiring only.
- Added focused gate/runtime checker tests only.
- Refreshed the existing runtime proof output files.
- No payroll UI, seed/backfill behavior, or broad workflow work was changed.

## Files Changed

- `package.json`
- `scripts/payroll-immutability-runtime-check.js`
- `scripts/__tests__/payroll-immutability-runtime-check.test.js`
- `scripts/__tests__/policy-gates.test.js`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_IMMUTABILITY_RELEASE_GATE_PROMOTION_REPORT_2026-06-26.md`

## Validation

Passed:

- `node --check scripts/payroll-immutability-runtime-check.js`
- `npm test -- --runTestsByPath scripts/__tests__/payroll-immutability-runtime-check.test.js scripts/__tests__/policy-gates.test.js --runInBand`
  - 2 suites passed.
  - 11 tests passed.
- `npm run prisma:validate`
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-immutability-migration.test.ts --runInBand`
  - 1 suite passed.
  - 9 tests passed.
- `npm run payroll:immutability:runtime` with `PAYROLL_IMMUTABILITY_DATABASE_URL` set to the dedicated local `stockflow_immutability_test` database.
  - Required triggers present: 7/7.
  - Forbidden mutation checks blocked: 9/9.
  - Allowed lifecycle checks passed: 3/3.
  - Blockers: 0.

Partial aggregate result:

- `npm run policy:gates` now invokes `npm run payroll:immutability:runtime`; the payroll immutability proof passed inside the aggregate gate.
- The aggregate command still exited nonzero afterward at `npm run error:boundary:fail` because of three active raw-error findings in existing payroll seed/setup services:
  - `services/payroll/payroll-seed-backfill-plan.service.ts`
  - `services/payroll/payroll-setup-readiness.service.ts`

Those seed/setup raw-error findings were not changed because this slice was constrained to payroll immutability release enforcement and explicitly excluded unrelated seed work.

## Checks Not Run

- `npm run prisma:generate` was skipped because no Prisma schema or generated-client contract changed.
- `npm run typecheck`, `npm run lint`, and full `npm run verify:repo` were skipped because this slice changed JS release tooling, focused tests, and reports only; the aggregate policy gate already reaches a non-scope raw-error blocker after the new payroll immutability proof passes.

## Release Path Effect

`policy:gates` now blocks normal verification unless the payroll immutability runtime proof is ready. The proof requires a dedicated non-production PostgreSQL URL through `PAYROLL_IMMUTABILITY_DATABASE_URL` or `TEST_DATABASE_URL`; secret URL values are not written to the generated reports.

## Handoff

Finalized payroll mutation protection is enforced in the real release path. The remaining aggregate gate blocker is outside this slice and should be handled as a separate seed/setup raw-error boundary cleanup.
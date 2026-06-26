# AqStoqFlow HR/Payroll Prompt 02 Runtime DB Harness Repair Report

Date: 2026-06-25

Requested skill: `aqstoqflow-prompt-architect`

Target blocked skill: `aqstoqflow-hrpayroll-02-immutability-boundary`

## Problem

Prompt 02 was blocked because static payroll immutability checks passed, but runtime DB trigger proof could not be claimed. The workspace had no safe dedicated payroll immutability database URL and no live trigger harness. The normal Jest path cannot prove this because `jest.setup.ts` globally mocks Prisma.

## Repair Implemented

Added a standalone runtime gate:

- `scripts/payroll-immutability-runtime-check.js`

Added package command:

- `npm run payroll:immutability:runtime`

Added non-secret example configuration:

- `.env.example`
- `PAYROLL_IMMUTABILITY_DATABASE_URL="postgresql://username:password@localhost:5432/stockflow_immutability_test?schema=public"`

## Harness Behavior

The script:

1. Requires `PAYROLL_IMMUTABILITY_DATABASE_URL` or `TEST_DATABASE_URL`.
2. Refuses to use the normal `DATABASE_URL` unless explicitly overridden.
3. Requires a PostgreSQL database name containing `test`, `ci`, `local`, `sandbox`, or `immutability`.
4. Runs `prisma migrate deploy` against the selected dedicated database unless `--skip-migrate` is supplied.
5. Verifies the protected payroll immutability triggers in PostgreSQL catalogs.
6. Creates synthetic payroll evidence inside a transaction.
7. Attempts forbidden mutations against finalized payroll run, run line, emitted payslip, payslip line, released payment batch, payment allocation, and declaration payload evidence.
8. Verifies allowed lifecycle metadata changes.
9. Rolls back the synthetic payroll evidence transaction.
10. Writes Markdown and JSON evidence when the runtime check is executed with output paths.

## Validation Run

`npm run prisma:validate`

Result: passed.

`npm test -- --runTestsByPath services/payroll/__tests__/payroll-immutability-migration.test.ts --runInBand`

Result: passed.

`node --check scripts/payroll-immutability-runtime-check.js`

Result: passed.

`npm run payroll:immutability:runtime`

Result: safely failed because no dedicated `PAYROLL_IMMUTABILITY_DATABASE_URL` or `TEST_DATABASE_URL` is configured in this environment.

## Current Gate Status

Decision: partially repaired.

The missing live trigger harness is now implemented. The remaining blocker is environment configuration: Prompt 02 still cannot pass until a dedicated non-production PostgreSQL database URL is supplied and the runtime gate passes.

## Next Safe Action

1. Create or provide a disposable PostgreSQL database such as `stockflow_immutability_test`.
2. Set `PAYROLL_IMMUTABILITY_DATABASE_URL` to that database.
3. Run:

```powershell
npm run payroll:immutability:runtime
```

4. If it passes, rerun:

```powershell
npm run prisma:validate
npm test -- --runTestsByPath services/payroll/__tests__/payroll-immutability-migration.test.ts --runInBand
```

5. Rerun `aqstoqflow-hrpayroll-02-immutability-boundary`.

## Handoff Decision

Do not advance to `aqstoqflow-hrpayroll-03-country-pack-gate` until `npm run payroll:immutability:runtime` passes against a dedicated non-production database.

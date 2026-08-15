# AqStoqFlow HR/Payroll Runtime Immutability Proof Report

Date: 2026-08-12

Prompt name and phase: Prompt 02, Runtime DB Immutability And Correction Boundary.

Expert lenses applied: database architecture, payroll evidence audit, cybersecurity, accounting controls.

Source prerequisite IDs: P0.06, P0.07, P0.08, P0.09, P0.10, P0.11.

## Decision

Decision: passed.

The payroll immutability runtime check was reproduced twice from independently recreated local PostgreSQL databases. Both runs deployed the complete Prisma migration chain, found all nine required triggers, blocked every forbidden mutation, allowed only the three expected lifecycle changes, and reported zero blockers.

## Prerequisite Gate

| Gate | Result | Evidence |
|---|---|---|
| Prompt 01 governance/source-of-truth report | Passed | `docs/domains/hr-payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_0_INVENTORY_AND_OWNERSHIP_REPORT_2026-06-25.md` |
| Payroll core models tenant-scoped | Passed | Current `prisma/schema.prisma` and Prompt 01 inventory |
| Immutability migrations present | Passed | Kernel, declaration-evidence, payment-lifecycle, and employee-balance migrations |
| Safe runtime DB path | Passed | Dedicated local `stockflow_immutability_test`; recreated before each proof run |
| Production configuration untouched | Passed | Empty git diff for `.env`, `.env.example`, `prisma.config.ts`, and `prisma/schema.prisma` |

## Exact Prisma Failure And Cause

The failure was Prisma `P3005`:

```text
Error: P3005

The database schema is not empty. Read more about how to baseline an existing production database: https://pris.ly/d/migrate-baseline
```

The failing sequence created a fresh database, populated it with `prisma db push`, and then ran `prisma migrate deploy`. `db push` created schema objects without a Prisma migration history, so deploy rejected the non-empty, unbaselined schema. A clean empty-database control applied all 62 migrations successfully; therefore no payroll migration SQL was the cause.

Full redacted reproduction diagnostics are preserved in:

- `what-next/payroll/payroll-immutability-migration-deploy-failure-reproduction-2026-08-12.md`
- `what-next/payroll/payroll-immutability-migration-deploy-failure-reproduction-2026-08-12.json`

## Surgical Repair

Only the test-database preparation path was changed:

- `scripts/reset-payroll-immutability-test-db.js` now drops and recreates only the validated local test/immutability database.
- It runs the real `prisma migrate deploy` chain against the empty database.
- It no longer uses `prisma db push` or manually executes selected trigger SQL.
- It writes complete redacted Prisma stdout, stderr, and spawn diagnostics to Markdown and JSON.
- `scripts/__tests__/with-payroll-immutability-test-db.test.js` now proves `P3005` extraction, complete-output preservation, and credential redaction.

No Prisma migration, Prisma schema, service mutation rule, payroll UI, environment file, or production deployment configuration was changed.

## Two Independent Runtime Proof Runs

| Check | Run 1 | Run 2 |
|---|---:|---:|
| Prisma migrations applied | 62/62 | 62/62 |
| Deploy exit code | 0 | 0 |
| Required triggers present | 9/9 | 9/9 |
| Forbidden mutations blocked | 14/14 | 14/14 |
| Allowed lifecycle mutations | 3/3 | 3/3 |
| Runtime blockers | 0 | 0 |

Run 1 evidence:

- `what-next/payroll/payroll-immutability-migration-deploy-diagnostics-run-1.md`
- `what-next/payroll/payroll-immutability-migration-deploy-diagnostics-run-1.json`
- `what-next/payroll/payroll-immutability-runtime-check-run-1.md`
- `what-next/payroll/payroll-immutability-runtime-check-run-1.json`

Run 2 evidence:

- `what-next/payroll/payroll-immutability-migration-deploy-diagnostics-run-2.md`
- `what-next/payroll/payroll-immutability-migration-deploy-diagnostics-run-2.json`
- `what-next/payroll/payroll-immutability-runtime-check-run-2.md`
- `what-next/payroll/payroll-immutability-runtime-check-run-2.json`

## Trigger And Mutation Boundary

The nine runtime triggers protect payroll runs, run lines, payslips, payslip lines, payment batches, payment allocations, declarations, declaration evidence, and employee balance events.

The 14 forbidden checks cover finalized run update/delete, posted run-line update, emitted payslip and line updates, released payment-batch update and status reversal, released allocation update, declaration update/delete, declaration-evidence update/delete, and employee-balance-event update/delete.

The three allowed checks are payroll-run metadata, declaration lifecycle status, and forward payment reconciliation status.

## Validation

- `node --check scripts/reset-payroll-immutability-test-db.js`: passed.
- `npx jest scripts/__tests__/with-payroll-immutability-test-db.test.js scripts/__tests__/payroll-immutability-runtime-check.test.js scripts/__tests__/policy-gates.test.js --runInBand`: 3 suites, 29 tests passed.
- `npm run prisma:validate`: passed.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-immutability-migration.test.ts --runInBand`: 1 suite, 12 tests passed.
- Live run 1: passed.
- Live run 2: passed.
- Evidence validation: 5 JSON artifacts parsed; 10 evidence files scanned; 0 unredacted PostgreSQL credential URL matches.

`prisma:generate` was skipped because neither the Prisma schema nor generated-client contract changed. Payroll service tests, typecheck, broad policy gates, and UI checks were skipped because service semantics, TypeScript, release policy wiring, and UI were outside this database-harness-only repair.

## Security And Privacy Decision

Both runtime runs used synthetic data inside rollback-only transactions. Evidence records only the local host and dedicated database name. Database URL credentials are redacted, and tests assert that known and previously unknown PostgreSQL URL credentials are removed from diagnostics.

The two one-off reproduction databases were removed after diagnostics were preserved. The standard dedicated `stockflow_immutability_test` database remains available for the normal gate.

## Accounting And Correction Boundary

Finalized payroll evidence remains immutable in place. Corrections, reversals, amendments, and voids must create new evidence or use the explicitly allowed lifecycle metadata transitions. The repair did not widen any mutation allowance.

## Files Changed

- `scripts/reset-payroll-immutability-test-db.js`
- `scripts/__tests__/with-payroll-immutability-test-db.test.js`
- This dated proof report and the redacted failure/success evidence files listed above.

## Handoff

Decision: Prompt 02 runtime proof passed. The isolated database deployment path now exercises the actual Prisma migration history, and the nine-trigger immutability boundary is proven twice.

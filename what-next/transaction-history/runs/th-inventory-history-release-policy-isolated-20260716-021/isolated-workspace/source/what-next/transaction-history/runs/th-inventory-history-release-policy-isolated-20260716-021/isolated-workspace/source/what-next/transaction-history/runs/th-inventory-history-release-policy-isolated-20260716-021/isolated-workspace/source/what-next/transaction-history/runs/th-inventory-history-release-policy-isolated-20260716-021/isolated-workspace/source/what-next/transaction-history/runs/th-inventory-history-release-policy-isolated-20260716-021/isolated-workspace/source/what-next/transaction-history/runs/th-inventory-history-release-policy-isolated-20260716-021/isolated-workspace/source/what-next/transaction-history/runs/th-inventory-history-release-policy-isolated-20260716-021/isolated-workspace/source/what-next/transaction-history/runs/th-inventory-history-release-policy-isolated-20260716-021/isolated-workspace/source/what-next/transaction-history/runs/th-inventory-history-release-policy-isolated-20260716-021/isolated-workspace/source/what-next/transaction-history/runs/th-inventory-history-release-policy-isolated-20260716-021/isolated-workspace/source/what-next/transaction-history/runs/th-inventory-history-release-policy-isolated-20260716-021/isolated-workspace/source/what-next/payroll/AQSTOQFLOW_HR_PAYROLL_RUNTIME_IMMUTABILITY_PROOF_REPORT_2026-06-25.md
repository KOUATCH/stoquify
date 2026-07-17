# AqStoqFlow HR/Payroll Runtime Immutability Proof Report

Date: 2026-06-25

Skill executed: `aqstoqflow-hrpayroll-02-immutability-boundary`

Prompt phase: Prompt 02, Runtime DB Immutability And Correction Boundary.

## Decision

Decision: passed.

Prompt 02 runtime DB immutability proof is now complete. A dedicated local non-production PostgreSQL database named `stockflow_immutability_test` was created, baselined from the current Prisma schema, and used for the live trigger proof. Secret URL values were not printed or written to reports.

The runtime gate now proves that finalized payroll evidence is protected by database triggers, not only by static migration text or service-layer discipline.

## Source Documents And Reports Read

- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-hrpayroll-02-immutability-boundary\SKILL.md`
- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `docs/domains/hr-payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_0_INVENTORY_AND_OWNERSHIP_REPORT_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_02_RERUN_BLOCKER_REPORT_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_02_RUNTIME_DB_HARNESS_REPAIR_REPORT_2026-06-25.md`

Note: the installed skill still references the old prompt-suite path under `what-next/payroll/`; the readable source suite in this repo is under `docs/prompts/skills/`.

## Prerequisite Gate Result

| Gate | Result | Evidence |
|---|---|---|
| Prompt 01 governance/source-of-truth report exists | Passed | `docs/domains/hr-payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_0_INVENTORY_AND_OWNERSHIP_REPORT_2026-06-25.md` passed Prompt 01 to Prompt 02. |
| Payroll core models exist and are tenant-scoped | Passed | `prisma/schema.prisma` contains organization-scoped payroll employee, contract, period, attendance snapshot, run, run line, payslip, payslip line, declaration, payment batch, and payment allocation models. |
| Immutability migration exists | Passed | `prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql` exists. |
| Runtime DB test path exists | Passed | Dedicated database `stockflow_immutability_test` exists on localhost and was used by the runtime proof. |
| Runtime trigger proof passes | Passed | `npm run payroll:immutability:runtime` completed with status `ready`. |

## Runtime Database Preparation

The user-provided placeholder command first failed because `username:password` were placeholder credentials. The local `.env` `DATABASE_URL` was then expanded without printing secrets, and a separate database named `stockflow_immutability_test` was created using the same local PostgreSQL role.

Because this repository has only incremental migrations and no full initial baseline migration, the disposable test DB was prepared safely as follows:

1. `npx prisma db push --skip-generate` synced the current Prisma schema to the empty test DB.
2. The four pre-payroll incremental migrations were marked as applied with `npx prisma migrate resolve --applied`.
3. `npx prisma migrate deploy` applied `20260625110000_payroll_kernel_immutability`.
4. `npm run payroll:immutability:runtime` executed the live trigger catalog and mutation checks.

## Harness Repairs Made During This Run

- Fixed Windows child-process execution by running `npx prisma migrate deploy` through the shell instead of `spawnSync("npx.cmd")`, which failed with `EINVAL` on this host.
- Preserved child-process errors in the runtime report instead of collapsing them to `exit 1`.
- Corrected synthetic seed SQL to insert into the mapped physical table `organizations`, not the Prisma model name `Organization`.
- Added a focused regression test that asserts the harness uses `organizations` and not `Organization`.
- Improved blocked-mutation evidence messages so successful database rejections are not rendered as blank lines.

## Runtime Proof Result

Runtime evidence file:

- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

Summary from the successful runtime proof:

| Check | Result |
|---|---:|
| Required triggers present | 7/7 |
| Forbidden mutation checks blocked | 9/9 |
| Allowed lifecycle checks passed | 3/3 |
| Runtime blockers | 0 |

Triggers proven present:

- `payroll_runs.payroll_runs_prevent_finalized_mutation_trigger`
- `payroll_run_lines.payroll_run_lines_prevent_posted_mutation_trigger`
- `payroll_payslips.payroll_payslips_prevent_emitted_mutation_trigger`
- `payroll_payslip_lines.payroll_payslip_lines_prevent_emitted_mutation_trigger`
- `payroll_payment_batches.payroll_payment_batches_prevent_released_mutation_trigger`
- `payroll_payment_allocations.payroll_payment_allocations_prevent_released_mutation_trigger`
- `payroll_declarations.payroll_declarations_prevent_payload_mutation_trigger`

Forbidden mutation checks blocked:

- Finalized payroll run update.
- Finalized payroll run delete.
- Posted payroll run line update.
- Emitted payslip update.
- Emitted payslip line update.
- Released payment batch update.
- Released payment allocation update.
- Declaration content update.
- Declaration delete.

Allowed lifecycle checks passed:

- Payroll run metadata update.
- Declaration status transition.
- Payment batch reconciliation status update.

## Validation Run

`npm run prisma:validate`

Result: passed.

`npm test -- --runTestsByPath services/payroll/__tests__/payroll-immutability-migration.test.ts --runInBand`

Result: passed.

- Test suites: 1 passed, 1 total.
- Tests: 9 passed, 9 total.

`node --check scripts/payroll-immutability-runtime-check.js`

Result: passed.

`npx jest scripts/__tests__/payroll-immutability-runtime-check.test.js --runInBand`

Result: passed.

- Test suites: 1 passed, 1 total.
- Tests: 7 passed, 7 total.

`npm run payroll:immutability:runtime`

Result: passed.

- Status: `ready`.
- Required triggers present: 7/7.
- Forbidden mutations blocked: 9/9.
- Allowed lifecycle checks passed: 3/3.
- Blockers: 0.

## Security And Privacy Decision

Runtime proof used synthetic payroll data only and rolled back the synthetic rows inside a transaction. The generated reports include only database name and host, not secret connection strings.

Database-level immutability now backs the service-layer rule: finalized payroll evidence must not be mutated in place.

## Accounting And Finance Decision

The protected evidence boundary now covers finalized payroll runs, posted run lines, emitted payslips, emitted payslip lines, released payment batches, released payment allocations, and declarations. This is sufficient for Prompt 02 handoff into later accounting, statutory, register, payment, and close-assurance gates.

## UI/UX Decision

No UI work was performed. Future payroll UI may render finalized evidence as audit-backed only through trusted server-provided read models and protected actions.

## Correction And Boundary Notes

- Corrections, reversals, amendments, and voids must create explicit new evidence or use approved lifecycle metadata transitions.
- Finalized run, payslip, payment, declaration, and posting content must not be mutated in place.
- High-risk writes must keep idempotency and concurrency expectations in server-owned services.
- Later UI must not compute payroll truth client-side or bypass these DB boundaries.

## Files Changed

- `scripts/payroll-immutability-runtime-check.js`
- `scripts/__tests__/payroll-immutability-runtime-check.test.js`
- `package.json`
- `.env.example`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_RUNTIME_IMMUTABILITY_PROOF_REPORT_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_02_RUNTIME_DB_HARNESS_REPAIR_REPORT_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_02_RERUN_BLOCKER_REPORT_2026-06-25.md`

## Handoff Decision

Decision: Prompt 02 passed.

`aqstoqflow-hrpayroll-02-immutability-boundary` is complete. The next ordered skill may be `aqstoqflow-hrpayroll-03-country-pack-gate`, subject to its own prerequisite gate.
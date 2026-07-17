# AqStoqFlow HR/Payroll Runtime Immutability Proof Report

Date: 2026-06-25

Prompt name and phase: Prompt 02, Runtime DB Immutability And Correction Boundary.

Expert lenses applied: database architecture, payroll evidence audit, cybersecurity, accounting evidence control.

## Decision

Decision: blocked.

Static migration proof passed, but runtime DB trigger proof is not available in this workspace. Because Prompt 02 requires finalized payroll evidence to be proven immutable at runtime, downstream HR/payroll implementation skills must not run yet.

## Prerequisite Gate

| Gate | Result | Evidence |
|---|---|---|
| Payroll core models exist and are tenant-scoped | Passed | `PayrollEmployee`, `PayrollContract`, `PayrollPeriod`, `PayrollAttendanceSnapshot`, `PayrollRun`, `PayrollRunLine`, `PayrollPayslip`, `PayrollPayslipLine`, `PayrollDeclaration`, `PayrollPaymentBatch`, and `PayrollPaymentAllocation` exist in `prisma/schema.prisma` with `organizationId`. |
| Immutability migration exists | Passed | `prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql` exists and defines trigger functions for finalized payroll evidence. |
| Safe runtime DB test path exists | Blocked | No live test database trigger harness was found. Existing tests inspect migration SQL text only. Prior readiness docs also classify runtime DB trigger tests as missing. |

## Files Inspected

- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-hrpayroll-02-immutability-boundary\SKILL.md`
- `prisma/schema.prisma`
- `prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql`
- `services/payroll/__tests__/payroll-immutability-migration.test.ts`
- `services/payroll/payroll-control.service.ts`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_0_INVENTORY_AND_OWNERSHIP_REPORT_2026-06-25.md`
- `HR-payroll/what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PREREQUISITE_READINESS_ANALYSIS_2026-06-25.md`
- `HR-payroll/what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`

## Validation Run

`npm run prisma:validate`

Result: passed.

`npm test -- --runTestsByPath services/payroll/__tests__/payroll-immutability-migration.test.ts --runInBand`

Result: passed. 1 test suite passed, 9 tests passed.

## What Is Proven

- The Prisma schema is valid.
- The immutability migration file exists.
- The migration contains trigger coverage for:
  - `payroll_runs`
  - `payroll_run_lines`
  - `payroll_payslips`
  - `payroll_payslip_lines`
  - `payroll_payment_batches`
  - `payroll_payment_allocations`
  - `payroll_declarations`
- The migration blocks mutation/delete patterns for finalized statuses in SQL text.
- Declaration payload content is designed to remain immutable while selected lifecycle metadata may progress.

## What Is Not Proven

- The migration has not been applied to a real test database in this execution.
- Trigger existence has not been verified through database catalogs after migration application.
- Forbidden `UPDATE`, `DELETE`, and child-row mutation attempts have not been executed against live tables.
- Allowed lifecycle metadata transitions have not been proven against a live database.

## Security And Privacy Decision

Do not rely on service-layer discipline alone for finalized payroll evidence. Until live DB trigger tests pass, a privileged or accidental direct database mutation could bypass the service and alter salary, payslip, payment, declaration, or posting evidence.

## Accounting And Finance Decision

Do not proceed to payslip self-service, payment reconciliation, declaration lifecycle, payroll register, or close assurance expansion until runtime immutability is proven. Ledger, source-link, declaration, and close evidence depend on immutable payroll facts.

## UI/UX Decision

No UI work is allowed in this slice. UI surfaces must not expose finalized payroll evidence as audit-grade until runtime DB immutability is proven.

## Blocker

Failed prerequisite: safe runtime DB trigger proof.

Why implementation must stop: Prompt 02 requires runtime evidence immutability, not only migration-text validation. Existing static tests are useful but insufficient for enterprise payroll evidence.

Risk if forced: finalized payroll runs, payslips, payment batches, allocations, and declaration payloads could be silently modified in a deployed database even though the application assumes they are immutable.

Exact next safe action:

1. Add or enable a test database harness for Prisma/PostgreSQL migrations.
2. Apply `20260625110000_payroll_kernel_immutability` in that harness.
3. Assert trigger existence for every protected payroll table.
4. Attempt forbidden update/delete/insert operations on finalized payroll evidence.
5. Assert allowed lifecycle metadata transitions still work.
6. Rerun `npm run prisma:validate` and the payroll immutability test suite.

## Handoff Decision

Decision: blocked.

Do not run Prompt 03 or any dependent skill until Prompt 02 is rerun and runtime DB immutability is proven.

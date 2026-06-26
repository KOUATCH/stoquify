# AqStoqFlow HR/Payroll Prompt 02 Rerun Blocker Report

Date: 2026-06-25

Skill executed: `aqstoqflow-hrpayroll-02-immutability-boundary`

Prompt phase: Prompt 02, Runtime DB Immutability And Correction Boundary.

## Decision

Decision: blocked.

Prompt 02 was rerun after the runtime immutability harness was added. Static gates pass and the dedicated harness exists, but runtime DB trigger proof still cannot be claimed because this execution environment does not expose `PAYROLL_IMMUTABILITY_DATABASE_URL` or `TEST_DATABASE_URL`.

Do not proceed to `aqstoqflow-hrpayroll-03-country-pack-gate` until the runtime gate succeeds against a dedicated non-production PostgreSQL database.

## Source Documents And Reports Read

- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-hrpayroll-02-immutability-boundary\SKILL.md`
- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `docs/domains/hr-payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_0_INVENTORY_AND_OWNERSHIP_REPORT_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_RUNTIME_IMMUTABILITY_PROOF_REPORT_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_02_RUNTIME_DB_HARNESS_REPAIR_REPORT_2026-06-25.md`

Note: the skill's embedded source prompt-suite path still points to `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`, but the readable copy found in this repo is `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`.

## Prerequisite Gate Result

| Gate | Result | Evidence |
|---|---|---|
| Prompt 01 governance/source-of-truth report exists | Passed | `docs/domains/hr-payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_0_INVENTORY_AND_OWNERSHIP_REPORT_2026-06-25.md` says Prompt 01 passed to Prompt 02. |
| Payroll core models exist and are tenant-scoped | Passed | `prisma/schema.prisma` contains organization-scoped payroll employee, contract, period, attendance snapshot, run, run line, payslip, payslip line, declaration, payment batch, and payment allocation models. |
| Immutability migration exists | Passed | `prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql` exists and defines the protected trigger functions and triggers. |
| Static immutability migration guard exists | Passed | `services/payroll/__tests__/payroll-immutability-migration.test.ts` exists and passes. |
| Runtime DB trigger harness exists | Passed | `scripts/payroll-immutability-runtime-check.js` exists and is wired through `npm run payroll:immutability:runtime`. |
| Safe dedicated runtime DB URL exists | Blocked | Current process environment has no `PAYROLL_IMMUTABILITY_DATABASE_URL` or `TEST_DATABASE_URL`. Runtime proof cannot safely run. |

## Files Inspected

- `prisma/schema.prisma`
- `prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql`
- `services/payroll/__tests__/payroll-immutability-migration.test.ts`
- `services/payroll/payroll-control.service.ts`
- `actions/payroll/payroll-control.actions.ts`
- `scripts/payroll-immutability-runtime-check.js`
- `scripts/__tests__/payroll-immutability-runtime-check.test.js`
- `package.json`
- `.env.example`
- `jest.config.ts`
- `jest.setup.ts`
- `prisma.config.ts`

Secret-bearing environment values were not printed or copied.

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
- Tests: 6 passed, 6 total.

`npm run payroll:immutability:runtime`

Result: blocked as designed.

Key output:

```text
Set PAYROLL_IMMUTABILITY_DATABASE_URL or TEST_DATABASE_URL to a dedicated non-production PostgreSQL database.
```

## What Is Proven

- The Prisma schema validates.
- The payroll immutability migration exists.
- Static migration tests confirm protected trigger definitions for finalized payroll runs, run lines, emitted payslips, payslip lines, released payment batches, payment allocations, and declarations.
- The runtime harness exists, has focused tests, refuses unsafe DB targets, and does not write secret URL values into generated reports.
- The harness safely stops when no dedicated non-production database URL is present.

## What Is Not Proven

- The immutability migration has not been applied to a live test database in this run.
- PostgreSQL trigger catalog presence has not been verified at runtime.
- Live forbidden `UPDATE`, `DELETE`, or child-row `INSERT` attempts have not been executed against finalized payroll evidence.
- Live allowed lifecycle metadata changes have not been verified.

## Security And Privacy Decision

Static SQL tests and a safe harness are not enough to claim audit-grade payroll evidence immutability. Until the live trigger proof passes, finalized salary, payslip, payment, declaration, and posting evidence must not be treated as protected from direct database mutation.

## Accounting And Finance Decision

Do not advance statutory country-pack expansion, payment reconciliation, declaration lifecycle, payroll register, payslip self-service, or close assurance expansion on the assumption of immutable finalized payroll evidence. Those phases depend on successful live trigger proof.

## UI/UX Decision

No UI work was performed. No payroll UI should present finalized evidence as audit-grade until runtime immutability proof passes.

## Correction And Boundary Notes

- Corrections, reversals, amendments, and voids must create explicit new evidence or allowed lifecycle metadata transitions.
- Do not mutate finalized run, payslip, payment, declaration, or posting content in place.
- High-risk writes must keep idempotency and concurrency expectations server-owned.
- Runtime proof must use synthetic payroll data only.

## Failed Prerequisite

Failed prerequisite: safe dedicated runtime database URL.

Risk if forced: using the normal application database for trigger proof could mutate or migrate an unsafe environment; skipping runtime proof could let later payroll phases rely on evidence that direct database writes can still alter.

## Exact Next Safe Action

Create or provide a disposable PostgreSQL database with a safe test-style name such as `stockflow_immutability_test`, then run:

```powershell
$env:PAYROLL_IMMUTABILITY_DATABASE_URL="postgresql://username:password@localhost:5432/stockflow_immutability_test?schema=public"
npm run payroll:immutability:runtime
```

After it passes, rerun:

```powershell
npm run prisma:validate
npm test -- --runTestsByPath services/payroll/__tests__/payroll-immutability-migration.test.ts --runInBand
```

## Handoff Decision

Decision: blocked at Prompt 02.

Next skill remains `aqstoqflow-hrpayroll-02-immutability-boundary`. Do not proceed to `aqstoqflow-hrpayroll-03-country-pack-gate` until `npm run payroll:immutability:runtime` succeeds against a dedicated non-production PostgreSQL database.

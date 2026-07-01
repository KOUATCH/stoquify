# AqStoqFlow HR/Payroll Wave 1 - Policy Gate Environment Hardening Report

Date: 2026-06-30
Scope: Make the normal `npm run policy:gates` release path pass without manual datasource juggling.

## Decision

READY FOR NEXT SLICE.

While validating correction-proof hardening, the normal policy gate command exposed an environment split: workflow assurance needed `DATABASE_URL`, but preloading dotenv globally interfered with the payroll immutability helper's own local test-database resolver. The workflow assurance runtime checker now resolves `DATABASE_URL` from `.env` for itself when the variable is absent, including `${VAR}` expansion, without printing secrets or mutating downstream gate behavior.

## Implemented

- Added local `.env` parsing to `scripts/workflow-assurance-runtime-table-check.js`.
- Added `${VAR}` expansion for `DATABASE_URL` values.
- Added `applyRuntimeDatabaseEnv()` so the checker fills `process.env.DATABASE_URL` only when missing.
- Preserved existing environment precedence: an already-set `DATABASE_URL` is not overwritten.
- Exported the helper functions for focused tests.
- Added tests proving dotenv expansion and non-overwrite behavior.

## Files Touched

- `scripts/workflow-assurance-runtime-table-check.js`
- `scripts/__tests__/workflow-assurance-runtime-table-check.test.js`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Verification

Passed:

- `npm test -- --runTestsByPath scripts/__tests__/workflow-assurance-runtime-table-check.test.js --runInBand`
  - 1 suite passed
  - 9 tests passed
- `npm run policy:gates`
  - Inventory boundary: pass
  - Service boundary: pass
  - Workflow assurance runtime: ready
  - Payroll immutability runtime: ready
  - Hard delete gate: pass
  - Regulatory hardcode gate: pass
  - Demo/report trust gate: pass
  - Raw error boundary gate: pass
- `npm test -- --runTestsByPath scripts/__tests__/workflow-assurance-runtime-table-check.test.js scripts/__tests__/policy-gates.test.js --runInBand`
  - 2 suites passed
  - 12 tests passed
- `npx eslint scripts/workflow-assurance-runtime-table-check.js scripts/__tests__/workflow-assurance-runtime-table-check.test.js`
- `git diff --check -- scripts/workflow-assurance-runtime-table-check.js scripts/__tests__/workflow-assurance-runtime-table-check.test.js what-next/payroll/payroll-immutability-runtime-check.md what-next/payroll/payroll-immutability-runtime-check.json`
  - Clean, with CRLF notices only on existing/generated files.

## Residual Risks

- This does not replace migration deploy/status validation in real production environments.
- The checker still remains read-only and does not apply missing migrations.
- This hardening supports release evidence reliability; it is not a business feature by itself.

## Recommended Next Slice

Return to HR/payroll product completion:

1. Add permission-aware correction proof redaction/denied states.
2. Add authenticated route smoke for `/dashboard/payroll/runs` proof drawer behavior.
3. Continue payment/declaration adapter proof surfacing after correction-proof authorization is closed.
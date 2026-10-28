# AqStoqFlow Close Assurance Browser Smoke Readiness

Date: 2026-07-20
Scope: authenticated close dashboard route and draft close-pack export/download smoke.

## Status

Prepared but not live-executed. The live seeded Playwright command was requested and rejected by the approval reviewer because it runs migrations and seeds local e2e data, which can mutate the configured database and local auth/artifact state.

## Files Updated By This Pass

- `scripts/seed-payroll-e2e-user.js`
- `tests/e2e/auth.setup.ts`
- `playwright.config.ts`
- `package.json`
- `tests/e2e/close-assurance-authenticated-smoke.spec.ts`

Note: `package.json` and `playwright.config.ts` already contained unrelated uncommitted changes before this smoke pass; this pass only added the close-assurance script/project and tightened the existing auth setup matcher.

## What Was Added

- Added close permissions to the local payroll e2e manager role:
  - `accounting.close.read`
  - `accounting.close.run`
  - `accounting.close.export`
  - `accounting.close.accountant.review`
- Added a demo-only open fiscal year and accounting period fixture for June 2026.
- Added `test:e2e:close-assurance`:

```powershell
npm run prisma:migrate:deploy && npm run seed:e2e:payroll && npm run test:e2e -- --project=close-assurance-authenticated-smoke
```

- Added Playwright project `close-assurance-authenticated-smoke` using `playwright/.auth/payroll.json` and download support.
- Added `tests/e2e/close-assurance-authenticated-smoke.spec.ts` with two browser checks:
  - `/en/dashboard/accounting/close` renders as an authenticated tenant route.
  - `/en/dashboard/accounting/close/payroll_e2e_browser_2026_06_accounting_period` runs close assessment and downloads a draft JSON close pack.
- The download smoke validates:
  - JSON kind is `AQSTOQFLOW_CLOSE_ASSURANCE_PACK`.
  - mode is `DRAFT_NOT_CERTIFIED`.
  - content hash is `sha256:*`.
  - watermark contains `draft-not-certified`.
  - statutory scope remains `STATUTORY_BLOCKED`.
  - obvious raw secret/provider/private payroll terms are not present.
- The smoke writes evidence to:
  - `what-next/accounting/AQSTOQFLOW_CLOSE_ASSURANCE_BROWSER_SMOKE_2026-07-20.json`
  - `what-next/accounting/close-assurance-browser-smoke/`

## Validation Completed

Passed:

```powershell
node --check scripts\seed-payroll-e2e-user.js
```

Passed:

```powershell
npx eslint "tests/e2e/close-assurance-authenticated-smoke.spec.ts" "tests/e2e/auth.setup.ts" "playwright.config.ts"
```

Passed:

```powershell
npm run typecheck
```

Passed non-mutating project/spec registration check:

```powershell
npx playwright test --list --project=close-assurance-authenticated-smoke
```

Result listed:

- `[auth-setup]` creates payroll/HRIS manager auth state.
- `[auth-setup]` creates payroll requester auth state.
- `[close-assurance-authenticated-smoke]` close dashboard renders as authenticated tenant route.
- `[close-assurance-authenticated-smoke]` period dashboard runs assessment and downloads draft close pack.

## Blocked Live Run

The following command was not executed because approval was rejected:

```powershell
npm run test:e2e:close-assurance
```

Reason: it applies Prisma migrations and seeds test data before running Playwright, so it can mutate the configured database and local auth/artifact state.

## Required Explicit Approval

To complete the live authenticated browser smoke, explicitly approve running:

```powershell
npm run test:e2e:close-assurance
```

Only run this against a local/dev database intended for e2e seed data.
## Safe Database Preflight Added And Run

Added a non-mutating preflight command:

```powershell
npm run test:e2e:close-assurance:preflight
```

Validation passed:

```powershell
node --check scripts\close-assurance-e2e-preflight.js
npx jest scripts/__tests__/close-assurance-e2e-preflight.test.js --runInBand --forceExit
npx eslint "scripts/close-assurance-e2e-preflight.js" "scripts/__tests__/close-assurance-e2e-preflight.test.js"
npm run test:e2e:close-assurance:preflight
```

Preflight result: `OK_TO_RUN_LOCAL_E2E`.

Redacted target summary:

- `DATABASE_URL`: `postgresql://postgres:***@localhost:5432/<database>`
- Host class: `local`
- Production environment markers: none
- `DIRECT_URL`: absent

Evidence saved:

- `what-next/accounting/close-assurance-e2e-db-preflight-2026-07-20.md`
- `what-next/accounting/close-assurance-e2e-db-preflight-2026-07-20.json`

The live command still requires explicit approval because it mutates the local/dev database with migrations and e2e seed data:

```powershell
npm run test:e2e:close-assurance
```

## Live Command Self-Gated

Status: COMPLETE

The live close-assurance browser smoke command is now guarded by the non-mutating database preflight before any migration, seed, or Playwright browser step can run.

Guarded script:

```powershell
npm run test:e2e:close-assurance
```

Current command order:

```text
npm run test:e2e:close-assurance:preflight && npm run prisma:migrate:deploy && npm run seed:e2e:payroll && npm run test:e2e -- --project=close-assurance-authenticated-smoke
```

Validation completed on 2026-07-20:

- `npx jest scripts/__tests__/close-assurance-e2e-preflight.test.js scripts/__tests__/close-assurance-e2e-script-guard.test.js --runInBand --forceExit --silent`: 2 suites passed, 4 tests passed.
- `npx eslint "scripts/close-assurance-e2e-preflight.js" "scripts/__tests__/close-assurance-e2e-preflight.test.js" "scripts/__tests__/close-assurance-e2e-script-guard.test.js"`: passed.
- `node -e ...`: confirmed `PREFLIGHT_FIRST`.
- `npx playwright test --list --project=close-assurance-authenticated-smoke`: listed 4 tests across `auth-setup` and `close-assurance-authenticated-smoke`.

The live command remains intentionally approval-gated because it applies migrations and seeds the local database before running the authenticated browser smoke.

## Live Smoke Runbook Added

Status: COMPLETE

Operational runbook:

- `what-next/accounting/AQSTOQFLOW_CLOSE_ASSURANCE_LIVE_SMOKE_RUNBOOK_2026-07-20.md`

The runbook records explicit approval wording, guarded command order, preflight criteria, browser smoke acceptance criteria, evidence paths, failure handling, and rollback posture.

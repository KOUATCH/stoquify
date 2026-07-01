# AqStoqFlow Payroll Browser Validation Gap Closure Evidence

Date: 2026-06-27

Scope closed:

- Added repo-native Playwright setup for authenticated payroll browser smoke.
- Added a local saved auth-state path: `playwright/.auth/payroll.json`.
- Added authenticated route coverage for:
  - `/en/dashboard/payroll`
  - `/en/dashboard/payroll/payslips`
  - `/en/dashboard/payroll/register`
- Added proof-drawer navigation coverage on `/en/dashboard/payroll`.
- Extended `scripts/ui-route-smoke-gate.js --require-screenshots` so payroll payslip/register routes can be selected and screenshots can reuse a saved Playwright storage state.
- The smoke gate now fails protected-route screenshots if a supplied storage state redirects back to login.

## Files Added Or Updated

- `playwright.config.ts`
- `tests/e2e/auth.setup.ts`
- `tests/e2e/payroll-authenticated-smoke.spec.ts`
- `scripts/ui-route-smoke-gate.js`
- `package.json`
- `package-lock.json`
- `.gitignore`

## Auth State Contract

Default auth setup uses the payroll-focused comprehensive seed credential:

```powershell
$env:AQSTOQFLOW_E2E_EMAIL = "hr.manager@stockflow.test"
$env:AQSTOQFLOW_E2E_PASSWORD = "HrManager@2026"
```

Override those values for any payroll-enabled seeded tenant user in the target environment. The generated storage state is local-only and ignored by git:

```text
playwright/.auth/payroll.json
```

No committed file contains a live session token.

## Rerun Instructions

Install dependency and browser binaries after checkout:

```powershell
npm install --legacy-peer-deps
npx playwright install chromium
```

With a seeded payroll-enabled tenant user available, create the auth state and run browser smoke:

```powershell
$env:AQSTOQFLOW_E2E_EMAIL = "hr.manager@stockflow.test"
$env:AQSTOQFLOW_E2E_PASSWORD = "HrManager@2026"
npm run test:e2e -- --project=payroll-authenticated-smoke
```

Then run screenshot enforcement against a running dev server:

```powershell
node scripts\ui-route-smoke-gate.js --mode fail --require-screenshots --base-url http://127.0.0.1:3000 --route payroll --route payroll-payslips --route payroll-register --storage-state playwright\.auth\payroll.json --screenshots-dir what-next\payroll\screenshots\payroll-browser-smoke --out what-next\payroll\AQSTOQFLOW_PAYROLL_UI_ROUTE_SMOKE_BROWSER_2026-06-27.json
```

The package shortcut for the same route set is:

```powershell
npm run ui:smoke:payroll
```

## Verification Run Evidence

Passed:

```powershell
npm install --package-lock-only --ignore-scripts --legacy-peer-deps
npm install --ignore-scripts --legacy-peer-deps
npx playwright install chromium
node --check scripts\ui-route-smoke-gate.js
npx playwright --version
npx playwright test --list
npm test -- --runTestsByPath __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand
npm run typecheck
```

Observed results:

- Playwright resolved locally as `1.61.1`.
- Chromium browser binaries installed under the local Playwright cache.
- Playwright discovered 5 tests:
  - auth setup storage-state creation
  - authenticated command center route smoke
  - authenticated payslips route smoke
  - authenticated register route smoke
  - command center proof drawer open smoke
- Existing payroll Jest route smoke passed: 1 suite, 4 tests.
- Typecheck passed after Next regenerated `.next/types` during the dev-server attempt.

Blocked in this local database:

```powershell
npm run test:e2e -- --project=payroll-authenticated-smoke
```

Result: blocked at `auth-setup` because the local database did not contain either tested seed user:

- `hr.manager@stockflow.test`
- `admin@stockflow-demo.test`

Better Auth returned `INVALID_EMAIL_OR_PASSWORD` and logged `User not found`, so no storage state or authenticated screenshots were generated in this local run. This is an environment/seed blocker, not a Playwright setup failure.

Fail-closed screenshot enforcement check:

```powershell
node scripts\ui-route-smoke-gate.js --mode fail --require-screenshots --route payroll --route payroll-payslips --route payroll-register --storage-state playwright\.auth\payroll.json --screenshots-dir what-next\payroll\screenshots\payroll-browser-smoke --out what-next\payroll\AQSTOQFLOW_PAYROLL_UI_ROUTE_SMOKE_BROWSER_2026-06-27.json
```

Result: failed as expected with:

```text
Storage state file not found: E:\ohada saas\newStockFlow\aqstoqflow\playwright\.auth\payroll.json
```

This confirms the route screenshot gate does not silently certify unauthenticated login-page screenshots when the required saved auth state is missing.

## Remaining Follow-Up

Rerun the two browser commands above in a seeded payroll tenant environment. A passing rerun should produce:

- `playwright/.auth/payroll.json` locally, ignored by git.
- Payroll screenshots under `what-next/payroll/screenshots/payroll-browser-smoke/`.
- `what-next/payroll/AQSTOQFLOW_PAYROLL_UI_ROUTE_SMOKE_BROWSER_2026-06-27.json`.
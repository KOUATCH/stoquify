# AqStoqFlow Payroll Browser Validation: Operator Routes

Date: 2026-06-29
Scope: Authenticated payroll browser validation for implemented operator routes.

## Result

Passed. The authenticated payroll browser smoke now covers the existing payroll routes plus:

- `/dashboard/payroll/runs`
- `/dashboard/payroll/payments`
- `/dashboard/payroll/declarations`

The refreshed screenshot gate passed for all 11 payroll route IDs with saved storage state at `playwright/.auth/payroll.json`.

## Route Coverage

Validated route IDs:

- `payroll`
- `payroll-attendance`
- `payroll-compensation`
- `payroll-contracts`
- `payroll-employees`
- `payroll-declarations`
- `payroll-payments`
- `payroll-runs`
- `payroll-payslips`
- `payroll-register`
- `payroll-setup`

## Fixture Changes

The local payroll E2E bootstrap remains demo-only and tenant-scoped. It now includes the smallest extra route-ready fixtures needed for the new operator screenshots:

- A demo `PayrollEmployeeBalanceCase` linked to the unpaid run and payslip so `/dashboard/payroll/payments` renders an active employee balance recovery row.
- A matching demo `PayrollEmployeeBalanceEvent` for the opened balance case.
- A demo posted `LedgerPostingBatch` before the payment transaction fixture so repeated seed runs do not violate the payment transaction ledger foreign key.
- Idempotent skip logic for already released demo payroll payment batch proof, preserving the immutability trigger instead of rewriting released evidence.
- Removed the stale `ProviderEvent.metadata` seed field to match the current Prisma schema.

## Verification

Passed:

```powershell
node --check scripts/seed-payroll-e2e-user.js
npm test -- --runTestsByPath __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand
npm run seed:e2e:payroll
$env:PLAYWRIGHT_SKIP_WEB_SERVER='1'; npx playwright test tests/e2e/payroll-authenticated-smoke.spec.ts --project=payroll-authenticated-smoke --reporter=line
npm run ui:smoke:payroll
```

Observed results:

- Focused payroll route guard: 5 passed.
- Authenticated Playwright payroll smoke: 13 passed in 8.3 minutes.
- UI route screenshot gate: `ok: true`, 11 routes, 22 screenshots, 0 failed captures.

## Evidence

- JSON report: `what-next/payroll/AQSTOQFLOW_PAYROLL_UI_ROUTE_SMOKE_BROWSER.json`
- Screenshot bundle: `what-next/payroll/screenshots/payroll-browser-smoke/`
- New operator route screenshots:
  - `payroll-declarations-tablet.png`
  - `payroll-declarations-desktop.png`
  - `payroll-payments-tablet.png`
  - `payroll-payments-desktop.png`
  - `payroll-runs-tablet.png`
  - `payroll-runs-desktop.png`

## Notes

- The first Playwright run exposed two local validation issues: a 90 second per-test timeout was too tight for cold payroll route compilation, and an interrupted dev compile left `.next` with a missing vendor chunk. The generated `.next` cache was cleared after stopping the local dev server, then validation passed cleanly.
- The browser smoke timeout is now 180 seconds per route so heavy authenticated payroll pages can compile and render on a cold local Next dev server.
- This is authenticated browser and screenshot proof for implemented operator surfaces; it is not a substitute for statutory authority production adapter certification or pilot payroll-cycle signoff.

## Skill Contract

- selected skill: `aqstoqflow-payroll-command-center`
- selected phase and executable slice: Phase 2, authenticated browser validation expansion for payroll operator routes
- files changed: `tests/e2e/payroll-authenticated-smoke.spec.ts`, `scripts/seed-payroll-e2e-user.js`, `jest.setup.ts`, `what-next/payroll/AQSTOQFLOW_PAYROLL_UI_ROUTE_SMOKE_BROWSER.json`, `what-next/payroll/screenshots/payroll-browser-smoke/*`, this report
- gates passed: seed syntax, focused payroll route guard, seed rerun, authenticated Playwright smoke, authenticated UI screenshot smoke
- gates blocked: none remaining
- verification result: passed with saved evidence
- run report path: `what-next/payroll/AQSTOQFLOW_PAYROLL_BROWSER_VALIDATION_OPERATOR_ROUTES_REPORT_2026-06-29.md`
- next recommended skill or slice: final payroll browser accessibility and pilot-cycle certification once statutory/payment/declaration adapters are production-bound
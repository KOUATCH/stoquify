# Payroll Authenticated Accessibility And Mobile Validation

Date: 2026-06-30

Selected skill: `aqstoqflow-payroll-command-center`
Selected phase and executable slice: Phase 2 browser validation extension for implemented payroll command, runs, payments, declarations, attendance, and payslip surfaces.

## Summary

Extended payroll browser validation beyond route smoke by adding authenticated Playwright checks for:

- command center: `/en/dashboard/payroll`
- runs: `/en/dashboard/payroll/runs`
- payments: `/en/dashboard/payroll/payments`
- declarations: `/en/dashboard/payroll/declarations`
- attendance: `/en/dashboard/payroll/attendance`
- payslips: `/en/dashboard/payroll/payslips`

The new gate reuses `playwright/.auth/payroll.json` from the local payroll E2E bootstrap and the existing tenant-safe demo fixture from `scripts/seed-payroll-e2e-user.js`. It does not add production payroll data, statutory values, or cross-tenant fixture shortcuts.

## Files Changed

- `tests/e2e/payroll-authenticated-smoke.spec.ts`
  - Injects local `axe-core` into authenticated Playwright pages.
  - Checks mobile `390x844` and desktop `1440x1100` viewports.
  - Saves full-page screenshots under `what-next/payroll/screenshots/payroll-authenticated-accessibility-mobile/`.
  - Writes JSON evidence to `what-next/payroll/AQSTOQFLOW_PAYROLL_AUTHENTICATED_ACCESSIBILITY_MOBILE_BROWSER.json`.
  - Records whether a route rendered the full surface or a safe authenticated error state.

## Evidence Saved

- `what-next/payroll/AQSTOQFLOW_PAYROLL_AUTHENTICATED_ACCESSIBILITY_MOBILE_BROWSER.json`
  - 12 checks: 6 routes x 2 viewports.
  - Serious/critical axe violations: 0.
  - Mobile document overflow findings: 0.
  - Render states: 10 `surface`, 2 `safe-error`.
- `what-next/payroll/screenshots/payroll-authenticated-accessibility-mobile/`
  - 12 screenshots saved for command, runs, payments, declarations, attendance, and payslips.
- `what-next/payroll/AQSTOQFLOW_PAYROLL_UI_ROUTE_SMOKE_BROWSER.json`
  - Refreshed route smoke evidence against `http://127.0.0.1:3001`.
  - 11 authenticated payroll routes passed.
  - 22 route-smoke screenshots captured with Playwright.

## Gates Passed

- `node --check scripts/ui-route-smoke-gate.js`
- Focused TypeScript check for `tests/e2e/payroll-authenticated-smoke.spec.ts`
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-command-read-model.service.test.ts --runInBand`
- `npm test -- --runTestsByPath actions/payroll/__tests__/payroll-command-read-model.actions.test.ts --runInBand`
- `npx playwright test --project=payroll-authenticated-smoke --no-deps --grep "authenticated payroll accessibility" --workers=1 --reporter=list`
  - Run against `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001`.
  - Result: 12 passed.
- `node scripts/ui-route-smoke-gate.js ... --base-url http://127.0.0.1:3001 ...`
  - Result: ok, 11 authenticated routes, 22 screenshots.

## Gates Blocked

- `npm run test:e2e:payroll`
  - Local E2E seed/bootstrap succeeded and created the payroll auth state.
  - The strict command-center smoke failed because `/en/dashboard/payroll` rendered `Payroll command unavailable` instead of the full command heading.
  - The new accessibility evidence records this explicitly as `safe-error` for command mobile and desktop.
- Standalone `npm run seed:e2e:payroll` rerun later failed with datasource URL parsing in the current shell.
- Port 3000 was unhealthy for focused browser reruns: `/` and the auth setup POST timed out. A fresh temporary Next server on port 3001 was used for the passing focused gates and then stopped.

## Residual Risk

The route screenshot gate proves authenticated route reachability and screenshot capture, and the new gate proves current rendered states have no serious/critical axe findings or mobile document overflow. It does not certify that the command read model is fully healthy, because the command center currently renders a safe error state in the live browser path.

## Next Slice

Fix the live command read-model safe-error path for the seeded payroll E2E tenant, then rerun the full `npm run test:e2e:payroll` gate without relying on the safe-error fallback.

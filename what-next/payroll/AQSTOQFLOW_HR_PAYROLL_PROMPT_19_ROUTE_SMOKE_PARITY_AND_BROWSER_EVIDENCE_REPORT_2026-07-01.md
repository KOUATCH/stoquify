# AqStoqFlow HR/Payroll Prompt 19 Route Smoke Parity And Browser Evidence Report

Date: 2026-07-01
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`
Prompt: 19 - assurance, chaos, browser smoke, and release gates

## Decision

Status: `PASSED` for the code-level Prompt 19 route, tenant, protected-action, provider-chaos, data-trust, and policy-gate slice.

Status: `PARTIAL / NOT PASSED` for live authenticated browser screenshot smoke. All 11 configured payroll routes were recognized as authenticated protected routes, but the Playwright screenshot matrix did not complete cleanly because the local dev server/browser run timed out or dropped connections during long route renders. This must remain a release validation blocker for unrestricted production, not a claimed browser pass.

## Change Made

File changed:

- `__tests__/payroll-dashboard-routes.smoke.test.tsx`

Added a static release-gate guard that keeps authenticated Playwright smoke coverage aligned with the implemented payroll route surface:

- Verifies every implemented payroll route path appears in `tests/e2e/payroll-authenticated-smoke.spec.ts`.
- Verifies proof-critical routes expose explicit accessibility/browser-smoke IDs:
  - `payroll-declarations`
  - `payroll-payments`
  - `payroll-runs`
- Verifies unsupported presence routes remain absent:
  - `payroll-presence`
  - `/en/dashboard/presence`

This closes the drift risk where `scripts/ui-route-smoke-gate.js`, `package.json` `ui:smoke:payroll`, and the authenticated browser spec could silently disagree after payment, declaration, and run routes became service-backed.

## Validation

Passed:

```text
npm test -- --runTestsByPath __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand
```

Result: 1 suite passed, 9 tests passed.

Passed:

```text
npm test -- --runTestsByPath __tests__/payroll-dashboard-routes.smoke.test.tsx services/payroll/__tests__/payroll-tenant-boundary.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts components/payroll/__tests__/PayrollPaymentReconciliationWorkbench.test.tsx services/payroll/__tests__/payroll-adapter-chaos-release-gate.service.test.ts services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts services/accounting/__tests__/data-trust.service.test.ts --runInBand
```

Result: 11 suites passed, 106 tests passed.

Passed:

```text
npm run typecheck
npm run prisma:validate
npm run service:boundary:fail
npm run lint -- --quiet
npm run policy:gates
```

Gate results:

- Typecheck: passed.
- Prisma schema validation: passed.
- Service boundary: 0 active violations.
- Lint: 0 errors, 4 pre-existing warnings.
- Inventory boundary: 0 active violations.
- Workflow assurance runtime check: ready, 6/6 runtime tables present, 2/2 migration rows present, 0 blockers.
- Payroll immutability runtime: ready, 9/9 triggers present, 14/14 forbidden mutation checks blocked, 3/3 allowed lifecycle checks passed, 0 blockers.
- Hard-delete gate: 0 active unsafe findings.
- Regulatory hardcode gate: pass, 0 active findings.
- Demo/report trust gate: 0 active production trust findings.
- Raw error boundary gate: 0 active unsafe findings.

## Browser Smoke Evidence

Authenticated storage state was present:

- `playwright/.auth/payroll.json`

Attempt 1 used `npm run ui:smoke:payroll` against `http://127.0.0.1:3000`.

- Report: `what-next/payroll/AQSTOQFLOW_PAYROLL_UI_ROUTE_SMOKE_BROWSER.json`
- Routes recognized with saved auth: 11/11.
- Screenshots passed: 16.
- Screenshots failed: 6.
- Failed routes: `payroll-payslips`, `payroll-register`, `payroll-setup`.
- Failure class: `net::ERR_CONNECTION_REFUSED` after the route set had started.
- Finding: port 3000 was held by a different workspace process, so this is not accepted as current-workspace browser evidence.

Attempt 2 used this workspace on `http://127.0.0.1:3001`.

- Report: `what-next/payroll/AQSTOQFLOW_PAYROLL_PROMPT_19_UI_ROUTE_SMOKE_BROWSER_2026-07-01.json`
- Screenshots: `what-next/payroll/screenshots/payroll-prompt19-browser-smoke-2026-07-01/`
- Routes recognized with saved auth: 11/11.
- Screenshots passed: 15.
- Screenshots failed: 7.
- Failed routes: `payroll`, `payroll-payslips`, `payroll-register`, `payroll-setup`.
- Failure class: route timeout, network suspended/changed, and connection refused during the dev-server run.

Attempt 3 reran on `http://127.0.0.1:3001` with longer route timeout.

- Report: `what-next/payroll/AQSTOQFLOW_PAYROLL_PROMPT_19_UI_ROUTE_SMOKE_BROWSER_RERUN_2026-07-01.json`
- Screenshots: `what-next/payroll/screenshots/payroll-prompt19-browser-smoke-rerun-2026-07-01/`
- Routes recognized with saved auth: 11/11.
- Screenshots passed: 13.
- Screenshots failed: 9.
- Failed routes: `payroll-payments`, `payroll-runs`, `payroll-payslips`, `payroll-register`, `payroll-setup`.
- Failure class: long route timeout and connection refusal during the dev-server run.

Cleanup:

- The alternate-port dev server and headless browser processes started for Prompt 19 were stopped.
- The unrelated port-3000 process from another workspace was left untouched.

## Release Interpretation

Prompt 19 code assurance is strengthened and passing for the implemented route surface. The release-gate matrix now proves that payment, declaration, and run routes are not accidental or fake routes: they are included in route smoke, browser-smoke command configuration, and authenticated Playwright route coverage.

The live browser screenshot gate is still not a pass. It produced useful partial evidence and confirmed the protected route/auth contract, but the screenshot matrix did not complete. Full production must continue to require a clean authenticated browser smoke run with all configured payroll routes and viewports passing.

## Required Next Actions

1. Stabilize authenticated browser smoke by running against a production build or a dedicated isolated dev port, not a shared port.
2. Add a health/readiness probe and warmup step before screenshot capture.
3. Investigate slow or unstable route renders for `payroll-payments`, `payroll-runs`, `payroll-payslips`, `payroll-register`, and `payroll-setup`.
4. Rerun `node scripts/ui-route-smoke-gate.js` with saved auth until all 11 route IDs and all configured tablet/desktop screenshots pass.
5. Treat browser smoke as blocking for unrestricted production, while keeping the code-level Prompt 19 gate accepted for the implemented, evidence-backed scope.

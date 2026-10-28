# AqStoqFlow HR/Payroll Prompt 19 Browser Smoke Warmup Gate Report

Date: 2026-07-02
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`
Prompt: 19 - assurance, chaos, browser smoke, and release gates

## Decision

Status: `PASSED` for the Prompt 19 smoke-gate infrastructure hardening and release-gate validation slice.

Status: `STILL BLOCKED` for unrestricted production browser-smoke certification until a live authenticated run completes all configured payroll routes and viewports without timeout, redirect, or connection-refusal failures.

## Change Verified

The UI route smoke gate now has the release-gate mechanics that the 2026-07-01 report identified as missing:

- Authenticated browser warmup is enabled by default before screenshot capture.
- Warmup records route-level evidence, final URL, duration, auth redirect status, and failure details.
- Screenshot capture reuses one browser context per viewport instead of creating a fresh context per route/viewport pair.
- The script can be imported without executing the CLI path, which allows fast Jest coverage over the gate behavior.
- The focused smoke-gate unit test covers warmup defaults, explicit warmup controls, route filtering, URL construction, missing-Playwright evidence, and disabled-warmup evidence.

Files verified in this slice:

- `scripts/ui-route-smoke-gate.js`
- `scripts/__tests__/ui-route-smoke-gate.test.js`
- `__tests__/payroll-dashboard-routes.smoke.test.tsx`

## Validation

Passed:

```text
node --check scripts/ui-route-smoke-gate.js
```

Passed:

```text
npm test -- --runTestsByPath scripts/__tests__/ui-route-smoke-gate.test.js __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand
```

Result: 2 suites passed, 15 tests passed.

Passed:

```text
npm run policy:gates
```

Gate results:

- Inventory boundary: 0 active violations.
- Service boundary: 0 active violations.
- Workflow assurance runtime check: ready, 6/6 runtime tables present, 2/2 migration rows present, 0 blockers.
- Payroll immutability runtime: ready, 9/9 triggers present, 14/14 forbidden mutation checks blocked, 3/3 allowed lifecycle checks passed, 0 blockers.
- Hard-delete gate: 0 active unsafe findings.
- Regulatory hardcode gate: pass, 0 active findings.
- Demo/report trust gate: 0 active production trust findings.
- Raw error boundary gate: 0 active unsafe findings.

Passed:

```text
npm run prisma:validate
npm run typecheck
npm run lint -- --quiet
```

Results:

- Prisma schema validation: passed.
- Typecheck: passed.
- Lint: passed with 0 errors and 4 existing warnings in image/default-export rules.

## Browser Smoke Interpretation

This report does not claim a clean live browser-smoke pass. The previous Prompt 19 evidence from 2026-07-01 showed that all 11 payroll routes were recognized under saved authentication, but the screenshot matrix failed intermittently under local dev-server/browser load.

The current slice closes the main tooling gap from that report: the smoke gate now warms protected routes in an authenticated browser before screenshots and emits explicit warmup evidence. A clean production-readiness pass still requires running the hardened gate against an isolated dev server or production build until every configured payroll route and viewport passes.

## Remaining Release Blocker

Unrestricted HR/payroll production remains blocked until this command, or the equivalent production-build run, completes cleanly with saved auth and no screenshot failures:

```text
node scripts/ui-route-smoke-gate.js --mode fail --base-url <isolated-app-url> --timeout-ms 120000 --warmup-timeout-ms 120000 --require-screenshots --route payroll --route payroll-attendance --route payroll-compensation --route payroll-contracts --route payroll-employees --route payroll-declarations --route payroll-payments --route payroll-runs --route payroll-payslips --route payroll-register --route payroll-setup --storage-state playwright/.auth/payroll.json --screenshots-dir what-next/payroll/screenshots/payroll-prompt19-browser-smoke-final --out what-next/payroll/AQSTOQFLOW_PAYROLL_PROMPT_19_BROWSER_SMOKE_FINAL.json
```

## Next Action

Run the hardened browser smoke against an isolated current-workspace server. If the same routes still fail, treat `payroll-payments`, `payroll-runs`, `payroll-payslips`, `payroll-register`, and `payroll-setup` as route-performance/reliability defects, not evidence tooling defects.
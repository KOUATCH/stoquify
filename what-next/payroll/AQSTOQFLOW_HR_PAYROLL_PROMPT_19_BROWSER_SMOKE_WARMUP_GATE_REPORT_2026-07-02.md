# AqStoqFlow HR/Payroll Prompt 19 Browser Smoke Warmup Gate Report

Date: 2026-07-02
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`
Prompt: 19 - assurance, chaos, browser smoke, and release gates

## Decision

Status: `PASSED` for the Prompt 19 smoke-gate infrastructure hardening, policy-gate validation slice, and live authenticated browser-smoke rerun against an isolated current-workspace dev server.

This does not by itself declare unrestricted HR/payroll production readiness. It closes the browser-smoke tooling/evidence blocker from the 2026-07-01 Prompt 19 report; broader production readiness still depends on the final HR/payroll release blockers, controlled pilot reconciliation, and accounting/security/operations signoff.

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

## Live Browser Smoke Evidence

Temporary current-workspace server:

- Base URL: `http://127.0.0.1:3002`
- Auth storage: `playwright/.auth/payroll.json`
- Server logs:
  - `what-next/payroll/prompt19-dev-server-2026-07-02.out.log`
  - `what-next/payroll/prompt19-dev-server-2026-07-02.err.log`
- Cleanup: temporary PIDs `23060` and `10584` were stopped; port 3002 had only `TIME_WAIT` sockets after cleanup.

Passed:

```text
node scripts/ui-route-smoke-gate.js --mode fail --base-url http://127.0.0.1:3002 --timeout-ms 120000 --warmup-timeout-ms 120000 --require-screenshots --route payroll --route payroll-attendance --route payroll-compensation --route payroll-contracts --route payroll-employees --route payroll-declarations --route payroll-payments --route payroll-runs --route payroll-payslips --route payroll-register --route payroll-setup --storage-state playwright/.auth/payroll.json --screenshots-dir what-next/payroll/screenshots/payroll-prompt19-browser-smoke-warmup-2026-07-02 --out what-next/payroll/AQSTOQFLOW_PAYROLL_PROMPT_19_BROWSER_SMOKE_WARMUP_2026-07-02.json
```

Result summary:

- Report: `what-next/payroll/AQSTOQFLOW_PAYROLL_PROMPT_19_BROWSER_SMOKE_WARMUP_2026-07-02.json`
- Overall status: `ok`
- Routes checked: 11/11
- Warmup routes passed: 11/11
- Warmup failures: 0
- Screenshot captures: 22
- Screenshot failures: 0
- Screenshot directory: `what-next/payroll/screenshots/payroll-prompt19-browser-smoke-warmup-2026-07-02/`

Warmup durations:

- `payroll`: 39381 ms
- `payroll-attendance`: 25530 ms
- `payroll-compensation`: 26703 ms
- `payroll-contracts`: 21418 ms
- `payroll-employees`: 33157 ms
- `payroll-declarations`: 38926 ms
- `payroll-payments`: 30875 ms
- `payroll-runs`: 31858 ms
- `payroll-payslips`: 26378 ms
- `payroll-register`: 17292 ms
- `payroll-setup`: 27318 ms

## Release Interpretation

The 2026-07-01 browser-smoke blocker was not a route-auth or fake-route failure. After adding warmup and reusing browser contexts, the implemented payroll route surface completed a clean authenticated smoke run across all configured tablet/desktop screenshots.

Prompt 19 browser evidence is now acceptable for the implemented scope. The next full-release decision should focus on any remaining final-readiness blockers outside this browser-smoke slice: statutory breadth, register/accounting tie-out, declaration/payment provider evidence, migration/backfill signoff, and controlled pilot reconciliation.

## Next Action

Use this passed browser-smoke run as the Prompt 19 evidence input for the final HR/payroll readiness report, then continue closing the remaining production blockers in the roadmap order. For unrestricted rollout, repeat the same smoke gate against the release build/environment used for pilot signoff.
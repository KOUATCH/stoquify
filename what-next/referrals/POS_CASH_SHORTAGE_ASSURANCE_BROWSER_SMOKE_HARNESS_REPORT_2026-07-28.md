# POS Cash-Shortage Assurance Incident Browser Smoke Harness Report - 2026-07-28

## Scope

Phase 3 / Slice 47 creates the assurance incident-detail browser smoke harness needed before real POS cash-shortage browser certification can be attempted.

This slice adds harness and readiness evidence only. It does not launch Playwright browser certification, create auth state files, create fixture incidents, resolve incidents, call the database, start workers, schedule jobs, send alerts, execute rollback, activate production detection, or grant AI/WhatsApp authority.

## Before

- Slice 46 certified a fail-closed browser-certification readiness preflight.
- The preflight correctly blocked on missing assurance browser smoke wrapper, package script, route id, auth state, screenshots, accessibility/layout evidence, and server-confirmed no-browser-authored-truth evidence.
- No `ui:smoke:assurance` package script existed.
- The shared UI route smoke gate did not expose an `assurance-incident-detail` route id.

## After

- `scripts/workflow-assurance-browser-smoke.js` defines a dedicated assurance smoke wrapper around `scripts/ui-route-smoke-gate.js`.
- The wrapper targets only `assurance-incident-detail`, requires screenshots, records output under `what-next/referrals/`, and emits dry-run evidence with `certificationClaimed: false`.
- Non-dry runs fail before browser execution unless an existing tenant-scoped incident fixture id and assurance manager storage state are supplied.
- `scripts/ui-route-smoke-gate.js` now registers `assurance-incident-detail` as an authenticated mobile/desktop route using `ASSURANCE_SMOKE_INCIDENT_ID` for the fixture id.
- `package.json` now includes `ui:smoke:assurance` and `ui:smoke:assurance:dry-run`.
- The browser-certification readiness preflight now recognizes the smoke wrapper, package script, and route id as current evidence, while still blocking real certification on missing auth state, screenshots, accessibility/layout evidence, and server-confirmed truth evidence.

## Verification

- `npm test -- --runInBand scripts/__tests__/workflow-assurance-browser-smoke.test.js scripts/__tests__/ui-route-smoke-gate.test.js services/leakage/__tests__/pos-cash-shortage-browser-certification-readiness-preflight.test.ts`
  - Passed: 3 suites, 21 tests.
- `node scripts/workflow-assurance-browser-smoke.js --dry-run --incident-id incident_123 --base-url http://127.0.0.1:3023`
  - Passed; emitted non-certifying harness config for `assurance-incident-detail`.
- `npx eslint scripts/workflow-assurance-browser-smoke.js scripts/__tests__/workflow-assurance-browser-smoke.test.js scripts/ui-route-smoke-gate.js scripts/__tests__/ui-route-smoke-gate.test.js services/leakage/pos-cash-shortage-browser-certification-readiness-preflight.ts services/leakage/__tests__/pos-cash-shortage-browser-certification-readiness-preflight.test.ts`
  - Passed.
- `npm run typecheck`
  - Passed.
- Source-only forbidden runtime scan:
  - `rg -n "db\\.|prisma\\.|createSafeAction|recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident|CHECK_RUNNERS|scheduleWorkflow|cron|sendAlert|dispatchAlert|rollback|whatsApp|copilot|chromium\\.launch|newContext|page\\.goto" scripts/workflow-assurance-browser-smoke.js services/leakage/pos-cash-shortage-browser-certification-readiness-preflight.ts`
  - No matches; `rg` exited 1 because the scan was clean.
- Adjacent Slice 44-46 guardrails:
  - `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-browser-certification-readiness-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-product-caller-audit-event-preflight.test.ts components/assurance/__tests__/AssuranceIncidentActions.test.tsx actions/assurance/__tests__/pos-cash-shortage-resolution.actions.test.ts`
  - Passed: 4 suites, 20 tests.
- `npm run ui:smoke:assurance:dry-run`
  - Passed; emitted non-certifying package-script dry-run config.

## Noted Verification Detail

An initial attempt to pass `--incident-id` through `npm run ui:smoke:assurance:dry-run -- --incident-id incident_123 --base-url http://127.0.0.1:3024` was forwarded by the local shell/npm combination without the option names and failed with `Unknown argument: incident_123`. The wrapper itself accepts those flags when run directly, and the package dry-run is valid for no-fixture configuration evidence.

## Certification Decision

Slice 47 is certified as a browser smoke harness and readiness-evidence slice only.

Real browser certification remains blocked until a tenant-scoped assurance manager auth state, an existing incident fixture id, desktop/mobile screenshots, accessibility/layout evidence, and server-confirmed no-browser-authored-truth evidence are produced by a later selected slice.

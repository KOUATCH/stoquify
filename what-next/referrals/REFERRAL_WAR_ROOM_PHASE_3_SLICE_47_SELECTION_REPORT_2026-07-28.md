# Referral War Room Phase 3 Slice 47 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 47: POS cash-shortage assurance incident-detail browser smoke harness.

## Why This Slice

Slice 46 certified only a fail-closed browser-certification readiness preflight. Its handoff identified the next safest prerequisite as an assurance browser smoke harness and auth/fixture plan, without claiming that the browser flow is certified.

## Scope

- Add an assurance incident-detail route id to the shared UI route smoke gate.
- Add a dedicated `workflow-assurance-browser-smoke.js` wrapper that delegates to the shared gate and supports dry-run evidence.
- Add a package script for the assurance browser smoke wrapper.
- Update the Slice 46 readiness classifier only enough to recognize the new harness, package script, and configured route id.
- Add focused tests for the new harness and readiness classification.

## Non-Goals

- Do not run Playwright browser certification.
- Do not create auth state files or fixture incidents.
- Do not resolve incidents, call POS source commands, call the database, start workers, schedule jobs, send alerts, execute rollback, or activate production detection.
- Do not authorize AI or WhatsApp as source of truth.

## Expected Verification

- `npm test -- --runInBand scripts/__tests__/workflow-assurance-browser-smoke.test.js scripts/__tests__/ui-route-smoke-gate.test.js services/leakage/__tests__/pos-cash-shortage-browser-certification-readiness-preflight.test.ts`
- `npx eslint scripts/workflow-assurance-browser-smoke.js scripts/__tests__/workflow-assurance-browser-smoke.test.js scripts/ui-route-smoke-gate.js scripts/__tests__/ui-route-smoke-gate.test.js services/leakage/pos-cash-shortage-browser-certification-readiness-preflight.ts services/leakage/__tests__/pos-cash-shortage-browser-certification-readiness-preflight.test.ts`
- `npm run typecheck`
- Source-only scan for forbidden activation/runtime terms in the new wrapper and readiness source.

## Expected Decision After Slice

Browser certification remains blocked until tenant-scoped assurance auth state, fixture incident id, screenshots, accessibility/layout evidence, and server-confirmed no-browser-authored-truth evidence exist.

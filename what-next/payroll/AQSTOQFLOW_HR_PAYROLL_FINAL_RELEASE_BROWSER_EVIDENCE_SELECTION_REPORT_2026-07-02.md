# AqStoqFlow HR/Payroll Final Release Browser Evidence Selection Report

Date: 2026-07-02
Status: PASSED for this final-readiness evidence-selection slice
Release posture: CONTROLLED PILOT / LIMITED RELEASE remains until all final production blockers and signoffs are closed.

## Decision

The final release-readiness pack now consumes the strongest current full-payroll browser route-smoke evidence instead of being pinned to the stale `AQSTOQFLOW_PAYROLL_UI_ROUTE_SMOKE_BROWSER.json` artifact.

This closes the stale-evidence blocker created after Prompt 19 passed on 2026-07-02 while the final pack still read the older failed route-smoke file from 2026-07-01.

## What Changed

- Added a final-readiness route-smoke evidence resolver that scans `what-next/payroll/` for approved full-payroll route-smoke artifacts and selects the newest valid artifact by `checkedAt` timestamp, with file mtime as fallback.
- Included Prompt 19 hardened browser-smoke artifacts in the accepted full-route evidence set:
  - `AQSTOQFLOW_PAYROLL_PROMPT_19_BROWSER_SMOKE_WARMUP_YYYY-MM-DD.json`
  - prior Prompt 19 route-smoke rerun artifacts
  - the legacy `AQSTOQFLOW_PAYROLL_UI_ROUTE_SMOKE_BROWSER.json`
- Kept evidence fail-closed: malformed/unreadable files are ignored; if no valid full-route evidence remains, the browser gate blocks as missing.
- Added an explicit full-route coverage guard. A route-smoke artifact with `ok: true` but fewer than 11 implemented payroll routes now blocks with `FINAL_BROWSER_ROUTE_SMOKE_INCOMPLETE`.
- Added Prompt 19 browser route-smoke as an explicit final release gate requirement alongside `npm run test:e2e:payroll`.

## Files Changed

- `services/payroll/payroll-final-release-readiness.service.ts`
- `services/payroll/__tests__/payroll-final-release-readiness.service.test.ts`

## Evidence Context

Current local artifacts before this slice:

- Older route-smoke artifact: `what-next/payroll/AQSTOQFLOW_PAYROLL_UI_ROUTE_SMOKE_BROWSER.json`
  - `ok: false`
  - routes: 11
  - checked at: 2026-07-01
- New Prompt 19 hardened artifact: `what-next/payroll/AQSTOQFLOW_PAYROLL_PROMPT_19_BROWSER_SMOKE_WARMUP_2026-07-02.json`
  - `ok: true`
  - routes: 11
  - warmups: 11/11
  - screenshots: 22/22
- Accessibility/mobile artifact: `what-next/payroll/AQSTOQFLOW_PAYROLL_AUTHENTICATED_ACCESSIBILITY_MOBILE_BROWSER.json`
  - checks: 12
  - safe-error states: 0
  - serious/critical axe violations: 0
  - mobile overflow: 0

## Validation

Passed:

```text
npm test -- --runTestsByPath services/payroll/__tests__/payroll-final-release-readiness.service.test.ts --runInBand
```

Result: 1 suite passed, 13 tests passed.

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
git diff --check -- services/payroll/payroll-final-release-readiness.service.ts services/payroll/__tests__/payroll-final-release-readiness.service.test.ts
```

## Readiness Impact

The final release-readiness pack is no longer allowed to lag behind the latest Prompt 19 full-route browser evidence, and it cannot accept a passing partial-route artifact as full browser validation. This makes the release pack more truthful for the current implemented payroll scope.

This does not grant unrestricted production approval. Remaining full-production blockers still include statutory breadth beyond the certified scope, live authority/payment provider credentials and receipts, tenant migration/backfill signoff, controlled pilot reconciliation, and accounting/security/operations approval.

## Next Action

Continue with final production readiness by making the final readiness pack and command center display this updated browser gate state, then move to the remaining adapter/provider and production migration signoff blockers.
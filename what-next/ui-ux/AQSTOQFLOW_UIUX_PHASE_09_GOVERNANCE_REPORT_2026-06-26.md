# AqStoqFlow UI/UX Phase 09 Governance Report

Date: 2026-06-26
Skill: `aqstoqflow-uiux-09-accessibility-visual-regression-governance`

## Outcome

Phase 09 established a lightweight governance loop for accessibility, route maturity, and route smoke evidence.

Implemented:

- Added `scripts/ui-route-smoke-gate.js`, a no-dependency HTTP route smoke gate with optional Playwright screenshot capture when Playwright is installed later.
- Added `docs/UI/UX/AQSTOQFLOW_UI_ROUTE_MATURITY_MATRIX_2026-06-26.md`.
- Added `docs/UI/UX/AQSTOQFLOW_UI_REVIEW_CHECKLIST_2026-06-26.md`.
- Added focused `axe-core` coverage to the shared command-center primitive test.
- Fixed an accessibility issue found by that axe check in `components/dashboard/primitives/command-center-primitives.tsx`.
- Generated final route smoke evidence at `what-next/ui-ux/AQSTOQFLOW_UI_ROUTE_SMOKE_2026-06-26.json`.

## Inspection Summary

Inputs reviewed:

- UI constitution: `docs/UI/UX/AQSTOQFLOW_UI_CONSTITUTION_2026-06-26.md`
- Component registry: `docs/UI/UX/AQSTOQFLOW_UI_COMPONENT_REGISTRY_2026-06-26.md`
- Package scripts and test stack in `package.json`
- Prior UI/UX reports in `what-next/ui-ux/`
- High-value routes and components for public landing, login, dashboard, finance, payroll, inventory items, and POS

Tooling facts:

- Playwright is not installed in `node_modules`.
- `axe-core` is installed and now used in a focused shared-primitives accessibility smoke.
- Existing test stack is Jest plus Testing Library.
- The original dev server on port 3000 began timing out during the final smoke rerun, so an isolated dev server was started on `http://localhost:3001` for final route evidence.

## Route Governance

The maturity matrix classifies the route set as:

- `/en`: `aligned`
- `/en/login`: `aligned`
- `/en/dashboard`: `reference`
- `/en/dashboard/finance`: `aligned`
- `/en/dashboard/payroll`: `partial`
- `/en/dashboard/inventory`: `specialized` redirect
- `/en/dashboard/inventory/items`: `aligned`
- `/en/dashboard/pos`: `specialized`
- Settings company/roles: `partial`

The review checklist now defines acceptance criteria for route anatomy, accessibility, responsive fit, forms, tables, drawers, dialogs, route smoke, and screenshot evidence.

## Accessibility Finding Fixed

The new axe smoke found a serious structural issue in the shared command-center metadata list:

- Rule: invalid description-list structure.
- Cause: `MetaLine` rendered a `span` and nested `div` directly inside a `dl` grouping wrapper.
- Fix: moved the optional icon inside the `dt` and kept each grouped `dl` child as direct `dt`/`dd` content.

This improves the shared command brief and command drawer metadata semantics anywhere `MetaLine` is reused.

## Route Smoke Evidence

Command used:

```powershell
node scripts\ui-route-smoke-gate.js --mode fail --base-url http://localhost:3001 --timeout-ms 60000 --out what-next\ui-ux\AQSTOQFLOW_UI_ROUTE_SMOKE_2026-06-26.json
```

Result:

- Overall: pass
- Routes checked: 7
- Public home: `200`
- Login: `200`
- Dashboard: `200`, final URL redirected to `/en/login?callbackUrl=%2Fen%2Fdashboard`
- Finance: `200`, final URL redirected to login callback
- Payroll: `200`, final URL redirected to login callback
- Inventory items: `200`, final URL redirected to login callback
- POS: `200`, final URL redirected to login callback

Protected route smoke is therefore HTTP/recovery smoke in an unauthenticated context. It proves the routes do not 500 and redirect safely, but it does not replace authenticated visual screenshots.

Screenshot status:

- Skipped because Playwright is not installed.
- The new gate records every intended screenshot target and can enforce screenshots later with `--require-screenshots`.

## Verification

Passed:

```powershell
npm test -- components/dashboard/primitives/__tests__/command-center-primitives.test.tsx components/dashboard/__tests__/DashboardRouteState.test.tsx --runInBand
npm run lint
npm run typecheck
node scripts\ui-route-smoke-gate.js --mode fail --base-url http://localhost:3001 --timeout-ms 60000 --out what-next\ui-ux\AQSTOQFLOW_UI_ROUTE_SMOKE_2026-06-26.json
```

Focused test result:

- 2 suites passed.
- 7 tests passed.
- Includes the new `axe-core` serious-violation smoke for the shared command-center shell.

Lint result:

- 0 errors.
- 5 pre-existing warnings remain:
  - `components/auth/EmailVerificationForm.tsx`
  - `components/dashboard/items/ModernItemFormForEditing.tsx`
  - `components/frontend/custom-carousel.tsx`
  - `components/ui/groups/inventory/ItemManagement.tsx`
  - `config/permissions.ts`

## Remaining Limits

- Playwright screenshots are not enforceable until Playwright is added to the repo and browser binaries are available.
- Authenticated screenshot certification still needs a real authenticated browser session or saved Playwright storage state.
- Payroll remains `partial` because it still uses hard-coded slate/white/violet styling outside the shared dashboard token system.
- POS remains `specialized`; tablet and desktop are the certification targets until phone checkout becomes product scope.

## Recommended Next Step

When the team is ready for true visual regression, add Playwright deliberately, seed or save an authenticated storage state, and turn on `--require-screenshots` for release-candidate UI checks.

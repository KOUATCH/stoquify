# Analytics Reports No-Data State Audit - 2026-06-24

## Scope

Prompt executed for `http://localhost:3000/en/dashboard/analytics/reports`: analyze why the standardized no-data/error page behavior was absent, identify the same correction points, implement the narrow fix, and verify without touching unrelated lint warnings.

## Root cause

`app/[locale]/(dashboard)/dashboard/analytics/reports/ReportsClient.tsx` loaded report data in the client and only rendered report components when data was truthy/non-empty. When a server action failed, the catch block only logged the error. When a selected report returned no rows, the selected report area rendered nothing.

The important data-shape detail was that financial and cash-flow reports can return an object with `provenance.rowCount === 0`, while cashier and item reports return arrays. The fix therefore needed to handle both object-backed and array-backed empty results.

## Implemented

- Added a safe load-error state with redacted UI copy in `ReportsClient.tsx:64` and `ReportsClient.tsx:153`.
- Cleared stale report payloads at the start of each load so a failed or empty reload cannot display old data (`ReportsClient.tsx:162`).
- Added `emptyReportCopy` for all four report tabs: financial, cashier, items, and cashflow (`ReportsClient.tsx:66`).
- Added `hasSelectedReportData` to classify object-backed and array-backed report results consistently (`ReportsClient.tsx:85`).
- Added an embedded report workspace state, preserving the existing filters and report-type controls while showing a clear empty/error panel (`ReportsClient.tsx:111`, `ReportsClient.tsx:362`, `ReportsClient.tsx:383`).
- Added focused component tests for zero-row financial reports, empty cashier arrays, redacted action failures, and successful item rendering (`ReportsClient.test.tsx:89`).

## Systematic audit findings

Already covered:

- `app/[locale]/(dashboard)/dashboard/analytics/error.tsx:12` already uses `DashboardErrorState` for route-level analytics failures.
- `components/reports/item-performance-report.tsx:274` already renders a local filtered empty state with `No items found` at `components/reports/item-performance-report.tsx:278`.
- `components/analytics/BusinessPulseDashboard.tsx` already uses `BIStateSurface` for empty BI cards.
- Sibling dashboard surfaces such as finance stock-to-cash, finance cash-command, payroll, daily digest, owner war room, and manager action center already use `DashboardRouteState` for route-level permission/no-org/empty/error cases.

Corrected now:

- `ReportsClient.tsx` was the parent gate for all four analytics report tabs and was the place where empty arrays, zero-row report objects, and caught errors became blank UI. Fixing this one component covers financial, cashier, item, and cash-flow report selections without changing the report renderers.

Not corrected in this surgical pass:

- A shared `DashboardEmbeddedState` component was not extracted. The local `ReportWorkspaceState` intentionally avoids broad UI churn, but this is a good next consolidation once two or more non-BI dashboard workspaces need the same compact state surface.
- New strings were not wired through i18n because the surrounding analytics reports page already uses hard-coded English copy; introducing message catalogs here would widen the change.
- No authenticated browser/E2E capture was added because the focused unit tests exercise the empty/error/success branches deterministically. A Playwright scenario should be added once the project has a stable seeded no-data org/session fixture for this route.

## Efficient follow-up plan

1. Keep the current parent-gate fix as the release candidate for the reports route.
2. If another dashboard workspace shows the same blank-panel behavior, extract `ReportWorkspaceState` into `components/dashboard/DashboardEmbeddedState.tsx` and migrate both usages together.
3. Add a seeded authenticated E2E test for `/en/dashboard/analytics/reports?report=financial&period=7d` that asserts the no-data panel appears when the selected org has no report rows.
4. After the embedded state is reused, move the empty/error copy into the route's localization layer in one pass with the rest of the analytics page strings.

## Verification

Passed:

- `npx jest --runInBand --runTestsByPath "app/[locale]/(dashboard)/dashboard/analytics/reports/__tests__/ReportsClient.test.tsx"`
- `npx eslint "app/[locale]/(dashboard)/dashboard/analytics/reports/ReportsClient.tsx" "app/[locale]/(dashboard)/dashboard/analytics/reports/__tests__/ReportsClient.test.tsx" --ext .ts,.tsx`
- `npm run typecheck`
- `npx jest --runInBand --runTestsByPath "app/[locale]/(dashboard)/dashboard/analytics/reports/__tests__/ReportsClient.test.tsx" "services/analytics/__tests__/financial-reports.service.test.ts"`

Note: `npm test -- --runInBand "app/[locale]/.../ReportsClient.test.tsx"` did not find the test because Jest treated the bracketed route path as a pattern. The literal-path rerun with `npx jest --runTestsByPath` passed.
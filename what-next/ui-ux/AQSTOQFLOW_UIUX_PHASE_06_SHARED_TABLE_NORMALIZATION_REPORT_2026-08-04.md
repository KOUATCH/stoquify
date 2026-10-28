# AqStoqFlow UI/UX Phase 06 Shared Table Normalization Report

Date: 2026-08-04

## Scope Completed

- Standardized authenticated dashboard table presentation around the active Units and Items reference.
- Added a shared table frame contract to the base Table primitive, including internal horizontal scrolling, dashboard border, surface, header density, row color, hover state, and footer treatment.
- Added a shared dashboard-table-toolbar contract for responsive search and domain-filter rows.
- Applied the toolbar contract to shared DataTable consumers, command-center filter bars, Items, Locations, Terminals, Tax Rates, Organizations, and Purchase Orders.
- Updated the shared TanStack pagination component with the landing variant, compact first/previous/next/last icon buttons, dashboard page-size control, and responsive spacing.
- Migrated every TanStack table in app/ and components/ to the shared pagination component.
- Preserved each table's existing data sources, sorting, selection, filters, permissions, protected actions, and server-owned business truth.
- Kept specialized cursor-based and financial-report pagination semantics intact while applying the shared visual table presentation.

## Files Inspected

- docs/UI/UX/AQSTOQFLOW_UI_UX_HONEST_REVIEW_2026-06-26.md
- docs/UI/UX/AQSTOQFLOW_UI_UX_REVAMP_ROADMAP_2026-06-26.md
- docs/product/user-experience/ui-registry.md
- docs/product/user-experience/INVENTORY_PAGE_UX_REVIEW_2026-05-25.md
- graphify-out/GRAPH_REPORT.md
- components/DataTableComponents/DataTable.tsx
- components/DataTableComponents/DataTablePagination.tsx
- components/ui/table.tsx
- Dashboard table consumers under app/ and components/

## Files Changed

- app/globals.css
- components/DataTableComponents/DataTable.tsx
- components/DataTableComponents/DataTablePagination.tsx
- components/dashboard/primitives/command-center-primitives.tsx
- components/locations/LocationsManagementDashboard.tsx
- components/pos/TerminalManagementDashboard.tsx
- components/settings/OrganizationManagementTable.tsx
- components/tax-rates/TaxRatesManagementDashboard.tsx
- components/ui/groups/inventory/ItemManagement.tsx
- components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx
- components/ui/table.tsx

The pre-existing dirty file services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts was not modified by this UI/UX slice.

## Verification Commands and Results

- npm run typecheck
  - Passed.
  - TypeScript completed with exit code 0.
- git diff --check
  - Passed with exit code 0.
  - Git emitted existing CRLF normalization warnings only.
- TanStack table coverage audit
  - Found 7 useReactTable surfaces.
  - Confirmed 7 of 7 use DataTablePagination.
  - Missing shared pagers: none.

## Screenshot and Route Smoke Notes

No browser server or screenshot capture was started in this slice. Recommended visual smoke routes:

- /en/dashboard/inventory/items
- /en/dashboard/inventory/units
- /en/dashboard/inventory/locations
- /en/dashboard/settings/organizations
- /en/dashboard/pos/terminals
- /en/dashboard/tax-rates
- /en/dashboard/purchase-orders

Check desktop, tablet, and mobile widths for toolbar wrapping, internal table scrolling, and compact pager alignment.

## Remaining Boundaries

- Date range controls remain enabled where the table data has a meaningful date field. They were not added to definition tables where a date filter would be misleading.
- Cursor-based history workbenches retain next-page semantics because they do not have a reliable page count.
- Financial report tables retain sticky totals and report-specific column behavior.
- Page-specific table headers continue to show their domain title, KPI context, and actions; the shared work surface beneath them now uses one visual contract.

## Recommended Next Phase

Run the Phase 09 accessibility and visual-regression pass for the highest-value table routes, capturing desktop and mobile screenshots and checking keyboard access for search, filters, column menus, and pagination.

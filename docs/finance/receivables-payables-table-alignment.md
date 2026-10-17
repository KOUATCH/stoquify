# Receivables/payables shared table alignment

Date: 2026-10-13. Base HEAD: `6f7f6741`, with existing unrelated working-tree changes preserved. Scope: both finance invoice dashboards, following the user's request for the common heading, tabs and pagination structure.

## Implementation

- The invoice heading, shared Radix review tabs, search/filter toolbar, table and pagination now form one section below the balance cards. Queue selection remains URL-driven. Manual keyboard tab activation avoids fetching another queue merely while moving focus.
- `OpenItemsInvoiceTable.tsx` uses the shared `Table` header/body/cell primitives, labelled keyboard-scrollable frame and `DataTablePagination` with 10/25/50 rows and first/previous/next/last controls. Empty results retain table headings and pagination.
- TanStack pagination is manual: server totals determine page count, navigation retains the financial evidence revision, and page-size changes reset page/revision. Pending reads disable pagination. No client-side re-pagination, sorting, export or financial mutation was added.
- Existing invoice drawers, permissioned history links, receipt/payment periods, source warnings and unavailable balances remain intact. Services, permissions, database and shared primitive definitions were not changed.

Owned files: `components/finance/OpenItemsDashboard.tsx`, `OpenItemsExplorer.tsx`, new `OpenItemsInvoiceTable.tsx`, the existing dashboard component test file, and this note. Rollback should remove only this table integration and its new tests, preserving earlier loading recovery, search fixes and status translations.

## Evidence

- Source: inspected current sales records table, shared pagination/search/table/tabs and page contracts. Historical graph node `datatablecomponents_datatablepagination_tsx` (community 215) was used only for discovery; current source determined behavior.
- UI/UX Pro Max focused search: `table pagination keyboard navigation`, UX domain, `ux-guidelines.csv`; keyboard navigation result applies to the web controls. Skip-link result does not require a shell change for this task. No new theme or framework APIs adopted.
- `npm run agent:workflow:check`: passed, 198 unclassified package scripts.
- Mocked component regression: `node node_modules/jest/bin/jest.js --config jest.open-items-dashboard.config.cjs --runInBand --no-cache --runTestsByPath components/finance/__tests__/OpenItemsDashboard.test.tsx`: **1 suite / 20 tests passed**. Covers both page variants, server totals, first/last page revision binding, queue reset, page-size reset preserving location/queue, French empty/pending controls, existing details, access and loading recovery.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.open-items-dashboard.json`: passed.
- Scoped ESLint for the three components and component tests: passed. Owned whitespace check passed.
- Rendered: attempted the existing French Payables Edge tab after the update. DOM and screenshot operations timed out before inspection; no successful post-change screenshot, responsive-layout or keyboard-browser certification is claimed. Previous screenshots predate this change.
- No database test, migration, seed, production build or financial action ran. Database-backed totals and service behavior were unchanged; mocked evidence does not replace the outstanding phase 6 browser/release gates.

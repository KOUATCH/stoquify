# Stage 06 Frontend Delivery Evidence

Run: `th-inventory-history-public-uploadthing-pilot-20260716-014`  
Slice: `foundation-inventory`  
Status: `PASS`  
Generated: `2026-07-16T07:37:24.625Z`

## Decision

Stage 06 was run as a frontend product implementation task using `what-next/transaction-history/runs/th-inventory-history-public-uploadthing-pilot-20260716-014/slices/foundation-inventory/06-frontend-delivery-authorization-request.md` as the exact allowlist source. This is deliberately separate from the Stage 00 control-plane manifest, which still records `orchestratorPolicy.productCodeEdits: false`.

## Exact Edits

- `app/[locale]/(dashboard)/dashboard/inventory/movements/page.tsx`: Replaced the legacy recent stock-movement dashboard route surface with the inventory movement history workbench while preserving inventory.levels.read permission gating.
- `components/dashboard/history/TransactionHistoryWorkbenchShell.tsx`: Added shared transaction-history workbench shell with command header, KPI rail, action queue, filter bar, robust states, responsive table/cards, pagination, export action, and detail drawer.
- `components/inventory/movements/InventoryMovementHistoryWorkbench.tsx`: Added inventory-specific workbench composition, next-intl copy, server-result rendering, partial-source banner, proof-unavailable copy, drawer sections, and org timezone display.
- `components/inventory/movements/inventoryMovementHistoryAdapter.ts`: Added inventory movement adapter for server-owned row formatting, type labels, KPIs, columns, source names, and selected-row lookup without client-side financial totals.
- `hooks/useInventoryMovementHistoryWorkbench.ts`: Added URL/query hook for filters, page size, cursor, selected row, React Query server action calls, and server export action binding.
- `messages/en.json`: Added EN inventoryMovementHistory namespace.
- `messages/fr.json`: Added FR inventoryMovementHistory namespace.
- `components/dashboard/__tests__/TransactionHistoryWorkbenchShell.test.tsx`: Added shared shell focused tests.
- `components/inventory/movements/__tests__/InventoryMovementHistoryWorkbench.test.tsx`: Added inventory workbench focused tests for i18n/timezone/proof copy.
- `hooks/__tests__/useInventoryMovementHistoryWorkbench.test.ts`: Added URL-state hook focused tests for parsing, cursor reset, and export filter normalization.
- `what-next/transaction-history/runs/th-inventory-history-public-uploadthing-pilot-20260716-014/slices/foundation-inventory/06-frontend-delivery.json`: Replaced blocked Stage 06 control-plane evidence with fresh authorized frontend implementation evidence.
- `what-next/transaction-history/runs/th-inventory-history-public-uploadthing-pilot-20260716-014/slices/foundation-inventory/06-frontend-delivery.md`: Added human-readable Stage 06 implementation report.
- `what-next/transaction-history/runs/th-inventory-history-public-uploadthing-pilot-20260716-014/run-state.json`: Updated Stage 06 run-state from BLOCKED to PASS with the fresh input fingerprint.

## Verification

- `PASS`: npm test -- components/dashboard/__tests__/TransactionHistoryWorkbenchShell.test.tsx components/inventory/movements/__tests__/InventoryMovementHistoryWorkbench.test.tsx hooks/__tests__/useInventoryMovementHistoryWorkbench.test.ts --runInBand — 3 test suites passed; 6 tests passed. Covered shell robust states/details/export disabled state, localized inventory workbench copy/timezone/proof language, URL parsing/cursor reset/export filters.
- `PASS`: npm run typecheck — TypeScript typecheck completed successfully after the Stage 06 product edits.
- `PASS`: i18n evidence by focused tests plus messages/en.json and messages/fr.json namespace inventoryMovementHistory — EN/FR message namespaces added and consumed through next-intl in InventoryMovementHistoryWorkbench.
- `PASS`: URL state evidence by hooks/__tests__/useInventoryMovementHistoryWorkbench.test.ts — Filter changes reset cursor and selected row; export filters exclude cursor, selected row, and unsupported search.
- `PASS`: accessibility/mobile structural review by code inspection and focused shell tests — Table region aria-label, explicit detail buttons, disabled states, mobile card rendering branch, and non-row-click selection implemented.
- `NOT_RUN`: authenticated Playwright browser/mobile/axe smoke — No authenticated storage state was available. Kept as Stage 07 residual release-review risk rather than claimed as executed.

## Claims

- `PASS` TH06_AUTHORIZED_PRODUCT_WORKFLOW: Stage 06 was executed as an explicitly authorized frontend product implementation workflow, separate from the Stage 00 control-plane manifest that disallowed product code edits.
- `PASS` TH06_EXACT_ALLOWLIST_ONLY: Observed product edits are limited to the exact route, shared shell, inventory workbench/adapter, hook, EN/FR messages, and focused tests listed in the authorization request.
- `PASS` TH06_STAGE04_STAGE05_DEPENDENCIES: Frontend delivery consumes the Stage 04 service-owned read/export model and Stage 05 workbench UX contract without modifying service, action, schema, migration, authorization, or accounting boundaries.
- `PASS` TH06_SERVER_TRUTH_EXPORT_BOUNDARY: The UI renders server-returned rows, summaries, completeness, pagination, timezone, and export state; exports call exportInventoryMovementHistoryAction with normalized filters rather than exporting client-visible rows.
- `PASS` TH06_URL_STATE_AND_CURSOR_RESET: The hook preserves filter/pageSize/cursor/selected state in the URL, sanitizes pageSize/type, and resets cursor plus selected row when filters change.
- `PASS` TH06_I18N_EN_FR_COPY: Inventory movement history copy, robust states, export labels, enum labels including WRITE_OFF, drawer labels, and proof-unavailable language are sourced from EN/FR messages.
- `PASS` TH06_ACCESSIBILITY_MOBILE_STRUCTURE: The shell includes explicit table region labeling, button-driven row details, disabled export states, desktop table/mobile card layouts, and tests for visible controls and state behavior.
- `NA` TH06_BROWSER_SMOKE_AUTH_ENV: Authenticated browser screenshot/axe validation was not executed in this pass because no seeded authenticated browser storage state was available in the current task context; Stage 07 should treat this as release-review evidence to complete before production promotion.

## Residual Risks

- `high` PUBLIC_UPLOADTHING_PILOT_ONLY: Stage 04 public UploadThing storage remains a pilot-only exception and must be replaced with private/signed storage before go-live.
- `medium` AUTHENTICATED_BROWSER_SMOKE_NOT_RUN: Run authenticated browser/mobile/axe smoke for /dashboard/inventory/movements before production promotion.
- `low` SEARCH_URL_STATE_NOT_SERVER_FILTER: The URL preserves search for future UX continuity, but the current Stage 04 server action does not support search filtering, so search is not sent to the action.

## Stage 07 Eligibility

Stage 07 release review is eligible to inspect this PASS evidence, with the explicit requirement that it close or carry forward the public-storage and authenticated-browser-smoke residual risks before production promotion.

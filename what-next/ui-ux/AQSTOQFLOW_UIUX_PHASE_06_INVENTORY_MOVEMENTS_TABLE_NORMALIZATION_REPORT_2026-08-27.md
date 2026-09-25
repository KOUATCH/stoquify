# AqStoqFlow UI/UX Phase 06 - Inventory Movements Table Normalization

Date: 2026-08-27
Module: Inventory movements
Skill: `aqstoqflow-uiux-06-module-normalization`
Status: Implemented

## Scope

This pass normalizes `/[locale]/dashboard/inventory/movements` to the shared dense table treatment without changing the server-owned movement read model, filters, cursor traversal, permissions, export behavior, or detail drawer contents.

## Changes

- Opted inventory movements into the wide system-table workspace and `dashboard-table-shell` / `dashboard-data-table` presentation.
- Added compact table heading, visible-row context, dense rows, consistent hover and selected states, horizontal overflow protection, and a compact action column.
- Replaced the full desktop Details button with an accessible three-horizontal-dots action that opens the existing detail drawer directly.
- Preserved the full-width mobile detail action for touch clarity.
- Removed the duplicate partial-source action queue from this route while retaining the compact partial-data status and named source evidence.
- Added a scoped shared-shell variant so AP and finance history surfaces remain unchanged until they are explicitly normalized.

## Preserved Contracts

- `inventory.levels.read` permission boundary.
- Server-owned history hook and read model.
- URL-preserved filters and cursor traversal.
- Export from the same applied filters.
- Partial-data and proof-unavailable language.
- Existing detail drawer business identity, source attribution, and control-state content.

## Verification

- PASS - Focused shared-shell and inventory-movement Jest matrix: 2 suites, 4 tests.
- PASS - `npm run typecheck`.
- PASS - Scoped `git diff --check`; line-ending notices only.
- PASS - Authenticated desktop smoke at `/en/dashboard/inventory/movements`: 36 compact row actions rendered, the right-pinned three-dot control remained visible, and the existing detail drawer opened with the selected movement.
- PASS - Authenticated mobile-width smoke: movement cards retained their full-width `Open movement details` action and readable inventory identity, status, and quantity hierarchy.

## Items table parity follow-up

- Moved movement search, type, date range, clear-filter, column visibility, refresh, and export controls into the same cohesive table-card toolbar pattern used by Inventory Items.
- Added localized English and French toolbar copy, including filter, clear-filter, refresh, selection, view, and cursor-page labels.
- Added current-page row selection, select-all behavior, column visibility controls, and the compact three-dot details action.
- Reworked the footer to match the Items pagination layout with selected-row count, rows-per-page control, current cursor page, first, previous, and next controls.
- Preserved the server-owned cursor contract. Previous traversal is available for pages visited in the current session; an unsafe synthetic last-page jump was deliberately not introduced.

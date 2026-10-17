# Inventory workbench contract

Owner: inventory/frontend lead; inventory domain owner reviews quantity/value semantics. Reviewed: 2026-10-07. Read [MASTER](../MASTER.md) first; this contract specializes density and workflow only.

## Scope and references

Inventory search, movement history and corrections use the authenticated shell and dense table/workbench patterns. Inspect [movement workbench](../../../components/inventory/movements/InventoryMovementHistoryWorkbench.tsx), [movement table](../../../components/inventory/movements/InventoryMovementHistoryTable.tsx), [loss workbench](../../../components/inventory/loss/InventoryLossWorkbench.tsx), [shared primitives](../../../components/dashboard/primitives/command-center-primitives.tsx), and the [stock-event service](../../../services/inventory/inventory-stock-event.service.ts).

## Layout and display context

Show a compact title/status summary, one filter area, the workbench/table, and record/evidence details. Reuse `FilterBar`, `.dashboard-control`, `.dashboard-table-shell` and existing row/detail patterns where they fit. Keep organization/location, item and unit, period, currency for values, filter scope and data freshness visible or readily inspectable. Do not combine figures across scopes without an explicit server result and label.

Quantity and value come from protected server results. Distinguish unavailable, zero, partial and stale data. Show negative balances or blocked adjustments truthfully; a visual correction must not hide an integrity exception. Preserve proof links and movement identity across pagination/filtering.

## States and actions

| State | Required behavior / illustrative copy |
|---|---|
| Empty filter result | “No movements match these filters”; allow clearing filters |
| No inventory records | Explain the authorized next action; do not imply a fetch error |
| Partial/stale result | State the affected scope and freshness; allow existing refresh/recovery |
| Permission/module denied | Shared denied/locked state without leaking counts, values or evidence |
| Adjustment pending/conflict | Keep server version/conflict feedback and authorized reload/review action |
| Correction completed | Show the confirmed movement/evidence; refresh affected quantities and values |

Correction controls preserve period checks, tenant scope, permissions, idempotency and stock-event transaction boundaries. Do not add direct client stock calculations or a new writer to simplify a form.

## Keyboard and review evidence

Filters need labels, predictable tab order and accessible clear actions. Sorting and row actions must be keyboard-operable; opening/closing details must preserve a meaningful focus location. Provide an intentional labelled horizontal scroll region for wide data where needed, while keeping key record identity and actions reachable. Test empty/loading/error/denied paths, long EN/FR labels and dense numeric columns.

Inspect [movement table tests](../../../components/inventory/movements/__tests__/InventoryMovementHistoryTable.test.tsx), [movement workbench tests](../../../components/inventory/movements/__tests__/InventoryMovementHistoryWorkbench.test.tsx) and [stock-event service tests](../../../services/inventory/__tests__/inventory-stock-event.service.test.ts). Record current route, role, org/location and filters with screenshots or browser checks. Mocked service tests do not prove database locking or deployed stock integrity.

# Stage 05 Workbench UX Contract - AP Supplier History

Status: PASS

Run: `th-ap-supplier-history-readmodel-implementation-20260717-027`  
Slice: `ap-ar`  
Active lane: `ap`  
Agent: UX Architect

## Product Surface

Create a visible supplier/AP transaction-history workbench at:

- `/[locale]/dashboard/purchases/payables/history`

This is distinct from the current AP operational queue at `/dashboard/purchases/payables`.

## Required UX

- Use the shared `TransactionHistoryWorkbenchShell` already proven by inventory and cash/payment history.
- KPIs: transaction count, open payable, released payments, ledger blockers.
- Filters: lane/type, date from, date to, page size. Advanced AP filters from the backend may remain URL/action-ready for later control additions.
- Table columns: supplier, source/reference, amount, signed AP movement, state, effective time.
- Detail drawer: business identity, supplier/source attribution, accounting/proof fields, bank redaction status.
- Export action: call backend export preparation only; do not export client-visible rows.
- Robust states: loading, empty, filtered empty, error, partial-source banner, mobile cards, and disabled export while loading/error.
- EN/FR copy must be added under an `apHistory` namespace.

## Acceptance Criteria For Stage 06

- Route is protected by the purchasing/AP route boundary and renders only the AP history workbench.
- Hook owns URL state for filters, cursor, selected row, reset, pagination, and export mutation.
- Workbench renders AP-specific labels, KPIs, rows, state badges, drawer sections, and redaction/proof copy.
- Focused tests cover hook URL behavior and visible workbench copy/rows/drawer.
- Stage 06 evidence must list exact edits and verification commands.

## Residual Risk

Authenticated browser/mobile/axe checks and full repo typecheck can remain Stage 07 release evidence if focused Stage 06 tests pass.
# Receivables dashboard contract

Decision date: 2026-10-12. Applies to `/[locale]/dashboard/finance/receivables`.
Follow [MASTER](../MASTER.md) and the [phase 0–1 data/evidence contract](../../../docs/finance/receivables-payables-dashboard-phases-0-1.md).

## Purpose and source

Answer who owes money, how much remains, and which invoices are overdue or approaching their due date. Current balances come from the posted AR lifecycle read model, not customer balance caches or capped sales-order lists. Include only open/partial items; exclude settled, cancelled and voided items. Keep currency groups separate.

## Phase 1 page connection

Use the existing dashboard theme, Card/Button controls and shared recovery states. Structure: heading and current-position explanation; organization, timezone, last checked and location; source/coverage; currency-specific outstanding, overdue, due-today and next-seven-day cards; aging; paginated invoices; Customer AR History link. History intentionally opens its existing organization scope; disclose that the location scope is broader there.

The user explicitly approved connecting the current pages while implementing phases 0–1. This is a minimal bridge; detailed collection queues, receipt-period panels, saved filters and invoice detail interactions remain later-phase work. Do not equate a payment acknowledgement or pending receipt with collection.

## Interaction and states

- Label location controls in EN/FR. Changing location resets pagination and revision.
- Use one h1, meaningful headings, textual status/evidence labels and tabular numbers. Keep the invoice table in a labelled, keyboard-focusable horizontal scroll region on narrow screens.
- Wrap cards and toolbar controls; preserve long French labels and visible focus. Browser evidence is required before claiming responsive/accessibility completion.
- Loading and failed reads use shared route states. Failed refresh, permission refresh failure and workspace changes remove previously displayed figures.
- Unavailable is never zero. Distinguish no source documents from a complete source population with no open invoices. These are source-coverage statements, not accounting completeness certification.
- Follow existing route/action RBAC. Receipt activity requires independent payment-read permission and must not prevent reading otherwise-authorized invoice balances.

No reminder sending, financial mutation, payment execution or new permission grant is introduced.

## Phases 2–3 addition (2026-10-12)

Invoice review now includes overdue, due-in-7/30-days and unknown-due-date queues, search, currency/aging/page-size filters, five largest counterparty balances per complete currency population, and invoice detail drawers. Queues overlap; their counts are not additive. Table filters do not change current-balance cards or rankings; location/currency do. Unverified currency populations have no ranking.

The independent receipt panel applies an explicit receipt period and location only, shows receipts/refunds/reversals/net and methods, and keeps its applied period when invoice filters change. It explicitly includes cash-sale receipts and customer settlements, not only collections against currently open invoices. Missing processing dates keep net unavailable. Restricted or failed receipts do not remove invoice balances. See [phase 2–3 evidence](../../../docs/finance/receivables-payables-dashboard-phases-2-3.md).

## Phases 4–5 addition (2026-10-12)

Invoice filters/revisions and applied receipt periods have URL scope. Exact invoice links open customer-filtered AR History with safe same-locale return navigation; history and controlled exports disclose their broader temporal/retained-record scope. Statement disputes/promises reuse the existing permissioned customer workflow and never reduce balances. Per-currency overdue/largest-party/top-five shares use the complete current location/currency population; table filters do not change denominators. Missing evidence and zero denominators remain unavailable. See [phase 4–5 evidence and explicit deferrals](../../../docs/finance/receivables-payables-dashboard-phases-4-5.md).

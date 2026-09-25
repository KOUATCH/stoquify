# Cash-flow tables: full-width stack

Date: 2026-09-21
Route: `/en/dashboard/finance/cash-flow`

## Change

The receivables and payables aging cards now use a single column at every breakpoint when the selected view is cash flow. The statement and recent-payments tables already occupy full-width sections. All four tables therefore stack vertically within the page content area. Other finance views retain their existing aging-card layout.

The existing shared search and pagination components were confirmed on all four tables: `DataTableSearch` and `DataTablePagination`, with the aging tables using `RenderedDataTable`. No duplicate controls or replacement data services were introduced. Aging searches remain scoped to the top counterparties supplied by the existing read model.

## Verification

- 26 tests passed in FinancePaymentsTable, CashFlowStatementTable, CashFlowStatementContract, and AccountingDataTable.
- Scoped ESLint and `git diff --check` passed.
- Live browser inspection confirmed four tables, each with one search and one shared paginator.
- At the desktop breakpoint, all four card widths and left positions matched; the payables card started below the receivables card.
- Receivables and payables searches independently reduced each eight-record list to one match.
- Recent payments advanced to page 2 of 2 while both aging filters remained applied.
- Cleared both filters, restored payment page one, and reset the temporary viewport override after verification.

No new tests were added for the single layout-class change; existing behavior tests were rerun.

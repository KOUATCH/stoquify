# Cash-flow table follow-up — 2026-09-21

Route: `/[locale]/dashboard/finance/cash-flow`.

The previous finance pass covered the statement and recent-payment tables but left the receivables/payables aging rows as custom lists. This pass closes that gap.

## Changes

- Receivables aging and payables aging now use the shared `RenderedDataTable`, including independent search, clear-search action, page-size selector, pagination, and empty/no-results states.
- All four record tables on the cash-flow page now have shared controls: statement, receivables, payables, and recent payments.
- The statement toolbar groups search, shared column visibility, and density controls on one row. Its frozen identity columns and saved preferences remain intact.
- The statement occupies the available page width, with payment evidence below it.
- Explicit grid sizing and shrinking cards prevent the shared table minimum width from expanding the cards and clipping controls. The three-column aging tables use a compact minimum width; narrow screens scroll the table within its container.
- Aging summary totals, severity badges, payment terms, and existing service data remain unchanged. The tables search/paginate only the top counterparties already returned by the dashboard read model.
- The reused aging card also supplies these controls on other finance command-center views.

## Verification

- 26 focused tests passed across `FinancePaymentsTable`, `CashFlowStatementTable`, `CashFlowStatementContract`, and `AccountingDataTable`.
- New page coverage verifies four tables/four search fields, independent aging pagination, search resetting to page one, no-results behavior, and preservation of the payment table while aging tables are filtered.
- Statement coverage verifies that search, column visibility, and density share the toolbar.
- Scoped ESLint and TypeScript passed. Scoped `git diff --check` passed.
- Browser verification confirmed four search fields and four page-size/pagination controls. Receivables and payables searches each reduced their own table to the matching record.
- Browser layout measurement initially exposed cards extending beyond their grid; the final cards fit their containers. Compact-screen checks retained the paginator and contained horizontal table scrolling. The temporary viewport override was reset.
- Final browser screenshot showed all three payable columns, search, result count, page-size selection, and pagination within the card.

No service, authorization, financial mutation, export, or calculation changes were made.

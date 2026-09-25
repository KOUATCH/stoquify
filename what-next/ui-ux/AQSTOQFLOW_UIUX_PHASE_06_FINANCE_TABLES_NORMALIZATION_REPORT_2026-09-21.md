# Finance table normalization — 2026-09-21

Scope: shared search, page-size, and pagination controls across the finance route tables. Implements the finance follow-up to the accounting table normalization work.

## Route coverage

| Routes below `/[locale]/dashboard/finance` | Table implementation | Result |
| --- | --- | --- |
| Overview, analytics, costs, profit-loss, profitability, retail, sales | `FinanceCommandCenterDashboard` → `PaymentsTable` | Shared payment search and pagination, preserving sorting, columns, density, and domain filters |
| cash-flow | `CashFlowStatementTable` and `PaymentsTable` | Both tables have shared search and pagination |
| payments, receivables, payables | `FinanceSpecializedLedgerSurfaces` | Shared search/pagination; payments toolbar remains one scrolling row |
| reconciliation | Run summaries and suspense failures | Shared `RenderedDataTable`; searches and paginates all returned rows, including failures past the former 25-row cutoff |
| cash-drawer | Sessions and journal | Shared search and pagination; session filters/sorting and expandable details retained |
| cash-payment-history | System variant of `TransactionHistoryWorkbenchShell` | Shared search and cursor pagination; previous/first navigation available for pages visited in this session |
| receivables/history | System variant of `TransactionHistoryWorkbenchShell` | Searches and paginates all loaded receivables, replacing first-page-only display |
| tax-rates/create | `TaxRatesManagementDashboard` | Shared search added alongside its existing shared paginator; toolbar controls aligned |
| cash-command, stock-to-cash | Existing cards and workflow panels | No record tables to migrate |

All 18 finance page routes were inventoried. The 16 routes containing record tables are covered by these shared implementations. Action cards and editing workflows retain their existing behavior.

## Shared implementation and data boundaries

- Promoted the rendered-cell adapter from accounting to `DataTableComponents/RenderedDataTable.tsx`, registering it in the table system registry. Accounting retains its existing import through a compatibility export.
- Search and pagination controls remain available when tables have no rows or no search matches.
- Cash/payment history is cursor-based on the server. Its search is explicitly labeled **Search loaded page** and filters only the loaded page. Export retains its existing server scope; search does not silently narrow the export.
- Receivables history searches the complete `result.items` already returned by its existing query. Totals, financial calculations, exports, service queries, access checks, proof actions, and approval workflows retain their existing scope.
- Shared history changes also apply to other callers already using its system variant. The shared shell regression tests pass.
- English/French shared control labels are retained. Compact screens can scroll the payments toolbar horizontally instead of wrapping its inputs.

## Verification

- TypeScript: `tsc --noEmit --pretty false` passed.
- ESLint: all changed production components, registry, and finance test files passed.
- Focused regression coverage: **83 tests passed** across payment tables, cash flow, reconciliation, both finance histories, shared history shell, accounting adapter, finance/accounting contracts, history contracts, and cash-history URL/cursor/export helpers. This is the union of the final passing runs, excluding superseded failures during implementation.
- Added behavior coverage for off-page receivable search, suspense rows beyond index 25, cash-flow search resetting pagination, loaded-page cash-history filtering, cursor back navigation, and preserving export scope.
- `git diff --check` passed for the touched component scope.
- Broad table governance checks: **8 passed, 2 pre-existing failures**. Both failures identify `components/inventory/transfers/TransferWorkflowPage.tsx` and `components/reports/financial-summary-report.tsx`, the same files observed before this finance change. Those unrelated files were not changed for this request.

## Browser verification

Using the existing local development accountant session:

- Payments: advanced to page two, searched for a record, confirmed page reset to one and filtered results. Screenshot confirmed one-row toolbar with horizontal overflow at a compact desktop width.
- Receivables history: shared controls rendered; searching a specific receivable reduced the table to that record.
- Cash flow: both the statement and recent-payments tables rendered shared search and page-size/navigation controls.
- Cash drawer: controls remained present for an empty journal. Last-30-days scope rendered journal records; expanding a journal entry still displayed its details, and an unmatched search displayed the no-results state while retaining controls.
- Reconciliation: both run summaries and suspense-ready failures rendered the shared search, page-size selector, and navigation controls.

Component tests cover reconciliation interactions and history pagination beyond the available browser fixture sizes. This report does not claim manual browser validation of every route or server-wide cash-history text search.

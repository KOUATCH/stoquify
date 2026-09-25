# Accounting table normalization — 2026-09-21

## Delivered

Accounting record tables now share the system search input, clear-search button, page-size selector, and pagination controls. Search covers all currently loaded rows and resets pagination. Empty tables retain their controls, and empty pagination displays page 1 of 1.

| Surface | Coverage |
| --- | --- |
| Accounting overview | Latest journal entries |
| Chart of accounts | Account list, preserving archive forms |
| Journals | Separate draft and posted/reversed lists, preserving post/reverse forms and suspense restrictions |
| Setup | Journals and all loaded accounting periods; removed the twelve-period display truncation |
| Accountant access | Access grants, preserving revoke controls |
| Control center | Events, account mappings, default journals, posting rules |
| Close assurance | Findings and evidence, including period-specific views and existing inspect/assign actions |
| Trial balance | Shared toolbar search and pagination; full-report totals remain unchanged by filtering |
| Financial statements | Shared search and pagination for account-detail sections in profit-and-loss and balance-sheet reports |
| Accountant portal | Retains the shared DataTable migration completed earlier in this task |

The six-line new-journal form remains an editor with all input rows mounted and visible. Accountant portfolio uses cards rather than tables.

## Implementation

- Added `components/DataTableComponents/DataTableSearch.tsx` and reused it in the existing `SearchBar`, ensuring the same search presentation across the system.
- Added `components/accounting/AccountingDataTable.tsx`, using shared table primitives and `DataTablePagination`. It accepts rendered cells so server action forms retain their original bindings. Filtering uses explicitly supplied text rather than inspecting React elements or action references.
- Existing report sorting, density controls, accounting totals, access checks, data sources, and domain actions remain intact.
- Registered the accounting adapter and financial-statement detail component in the table registry.
- Filtering and pagination operate on the existing loaded datasets; no service, database, or authorization changes were made for this request.

## Validation

- **95 tests passed in 19 suites**: accounting route/component tests, new cross-page search/pagination tests, report-total preservation, existing action and authorization checks, finance/accounting contracts, and payments table regression tests.
- **TypeScript:** `tsc --noEmit --pretty false --incremental false` exited 0.
- **Scoped ESLint:** no errors; one existing `react-hooks/exhaustive-deps` warning for the financial-statement table's `copy` object.
- **Diff whitespace check:** passed for accounting and shared table paths.
- **Browser:** overview filtering and clearing; journal toolbar/pagination rendering; trial-balance next page, page size 10 → 25, cross-page search, and unchanged ledger totals; financial-statement search, no results, and clearing.
- **Narrow viewport:** trial-balance scroll remained inside its table container; document scroll width equaled viewport width. Temporary viewport override was reset.

## Existing limits observed

- The local accountant session was denied chart-of-accounts access by the existing permission layer. That route's component and authorization tests passed; browser verification did not bypass access checks.
- The journal list service returned its existing temporary-error state in the local browser. The new empty-list controls rendered; loaded journal rows and protected actions were verified by route tests.
- Two broader table-governance assertions remain failing on `components/inventory/transfers/TransferWorkflowPage.tsx` and `components/reports/financial-summary-report.tsx`. These files are outside accounting and were already failing before this change. Neither governance check reports an accounting table violation.

No deployment or accounting data mutation was performed.

# Cash-flow page presentation

Date: 2026-09-21
Route: `/en/dashboard/finance/cash-flow`

## Scope and presentation

The cash-flow view now has a dedicated title and introduction, four section links, and a cash-focused summary of cash position, net movement, receivables, and payables. Finance confidence remains visible in the command header. Existing dashboard colors, cards, status, action, and evidence components are reused.

The page follows this sequence:

1. Summary, operating status, and actions.
2. Cash movement chart, period totals, and detailed statement.
3. Full-width receivables and payables aging cards.
4. Recent payments followed by latest payment evidence.
5. Existing payment-method breakdown and workflow footer.

The chart uses the existing trend read model. Its totals cover the supplied period and remain independent of table search and pagination. Signed amounts are supported, empty data shows an explicit empty state, and the chart is described as recorded activity rather than a forecast. Exact amounts remain available in the statement and chart tooltips.

All four tables retain shared search and pagination. The statement defaults to 10 rows, with its shared contract and pagination options aligned. Statement context dates now use locale formatting. English and French text is supplied for every new label.

## Verification

- 30 tests passed across five suites: FinancePaymentsTable, CashFlowStatementTable, CashFlowStatementContract, CashFlowPresentation, and AccountingDataTable.
- Tests cover whole-period totals, negative values, empty data, French labels, section anchors and order, independent table controls, and existing finance footer contracts.
- Scoped ESLint passed. Repository TypeScript checking passed during this pass.
- Live desktop review confirmed four equal-width table cards, each with one search and one shared paginator.
- Statement pagination advanced from page 1 to page 2 of 3. Filtering reduced it to one page without changing period summary totals. The verification filter was cleared afterward.
- Live mobile review at approximately 391 CSS pixels confirmed contained card widths and readable chart labels. The temporary browser viewport override was reset.
- Latest payment evidence was verified below the payment ledger in the payments group. All supplied evidence events remain available.

## Boundaries

No service, permission, posting, or payment workflow was changed. Aging search remains scoped to the counterparties supplied by the existing read model. Existing finance views retain their presentation except for the cash-flow view-specific changes. This report records this presentation pass and is not a release certification.

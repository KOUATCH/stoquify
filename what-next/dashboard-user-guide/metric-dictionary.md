# Metric dictionary: what the numbers actually mean

[Guide home](README.md)

These definitions describe the reviewed implementation. They are especially useful when two pages show different totals for what looks like the same business question. No live organization values were inspected. Examples below are illustrative, not actual accounts.

## Before comparing two amounts

Check organization, location, currency, time range, date basis, included statuses, source, data cap and snapshot freshness. Compare the same basis first. A discrepancy can be a definition difference rather than lost money.

## Company summary

**Gross paid payment total** sums all non-deleted PAID payment amounts for the active organization, covering sales-linked and purchase-linked payments, across all dates and before refund deductions. An illustrative 100 paid customer receipt plus 60 paid supplier payment yields 160 in this metric; it does not mean revenue of 160 or cash of 40. The latest source deliberately replaces the earlier Paid revenue wording.

The directory is only the current organization. Related Users, items, locations, partners, orders and payments are raw relation counts without active/deleted filtering on each relation. Users is therefore not an active-user count. The settings query is cached with five-minute freshness; Refresh before reviewing/exporting. Currency is not editable in the organization profile form.

[Source: services/organization/organization-settings.service.ts:105](<E:/ohada saas/Focused projects/stoquify/services/organization/organization-settings.service.ts:105>); [Source: services/organization/organization-settings.service.ts:125](<E:/ohada saas/Focused projects/stoquify/services/organization/organization-settings.service.ts:125>); [Source: services/organization/organization-directory-export.service.ts:78](<E:/ohada saas/Focused projects/stoquify/services/organization/organization-directory-export.service.ts:78>).

## Landing operations dashboard

| Metric | Definition and important scope |
|---|---|
| Revenue / orders | COMPLETED or DELIVERED sales orders inside the selected period. AOV is revenue divided by the eligible order count. |
| Period comparison | 7/30/90 days including today, or month-to-date; comparison is the immediately preceding equal number of calendar days, using server-local day boundaries. |
| Customers | Current non-deleted organization customers, including inactive records. Not selected-location new customers. Comparison counts customers created before the selected period. |
| Inventory value | Current inventory-level totalValue. The previous value is copied from current, so displayed change is always zero; this is not a measured historical trend. |
| Low stock | Positive on-hand stock at or below the greater of minimum-stock and reorder levels. |
| Out of stock / overstock | On-hand at or below zero; or on-hand at/above a configured positive maximum, respectively. Reorder candidates include out-of-stock items. |
| Cash collected | PAID payment records by creation date. At all locations there is no sales-only predicate, so purchase-linked payments can be included. A selected location restricts to sales-linked payments there. |

The hook marks data stale after 30 seconds and polls every 60 seconds while applicable; it does not refetch solely on window focus. Organization currency comes from settings. These are implemented query policies, not guaranteed delivery timing.

[Source: services/dashboard/dashboard-read-model.service.ts:233](<E:/ohada saas/Focused projects/stoquify/services/dashboard/dashboard-read-model.service.ts:233>); [Source: services/dashboard/dashboard-read-model.service.ts:347](<E:/ohada saas/Focused projects/stoquify/services/dashboard/dashboard-read-model.service.ts:347>); [Source: services/dashboard/dashboard-read-model.service.ts:557](<E:/ohada saas/Focused projects/stoquify/services/dashboard/dashboard-read-model.service.ts:557>); [Source: hooks/useDashboardData.ts:26](<E:/ohada saas/Focused projects/stoquify/hooks/useDashboardData.ts:26>).

## Finance command views

| Metric | Current operational calculation |
|---|---|
| Revenue | Sales-order totals including CONFIRMED, PROCESSING, SHIPPED, DELIVERED and COMPLETED. This is broader than the landing dashboard. |
| Purchases / expenses / refunds | Returned purchase-order totals, expense amounts and refund amounts. Order commitments are not cost of goods sold. |
| Gross profit / gross margin | Revenue minus purchases minus expenses minus refunds; divide that result by revenue for margin. This is an operational estimate, not conventional ledger gross profit. |
| Collected / outbound payments | Sales-linked or purchase-linked payments other than CANCELLED. PENDING can therefore count here and in the separate pending metric. These are not settlement totals. |
| Receivables / payables | Positive current balances of the highest-balance 100 active customers / 100 active suppliers. Organization-wide, not necessarily the selected period/location. |
| Cash position / drawer variance | Current drawer balances; current minus expected drawer balances. Physical drawer cash is not bank cash. |
| Net cash flow | Collected minus outbound minus expenses minus refunds. Subject to the same source/status limitations. |
| Working capital | Receivables minus payables plus current drawer balances. This page-specific measure is not a complete balance-sheet calculation. |
| Aging | Outstanding order total less non-cancelled payments; due date uses order date plus current counterparty terms (30-day fallback), aged against now rather than selected period end. |

**Caps and mixed scopes:** sales, purchase orders, open orders and expenses use at most 250 rows per query; period payments 300; recent payments 80 and independent of selected period. Customer/supplier current balances are capped at 100 each. Selected-location expenses also include unallocated expenses. Refunds remain organization-wide. Payroll forecast is a tenant aggregate rather than allocated to the selected location. Larger datasets can therefore make the summaries incomplete for a whole-organization assertion.

The default period is month-to-date. Finance reads poll every 30 seconds and are stale after 15 seconds. Inspect custom date endpoints and returned currency. Read unavailable/redacted payroll forecasts as unavailable/redacted, not zero.

[Source: services/finance/finance-dashboard.service.ts:555](<E:/ohada saas/Focused projects/stoquify/services/finance/finance-dashboard.service.ts:555>); [Source: services/finance/finance-dashboard.service.ts:742](<E:/ohada saas/Focused projects/stoquify/services/finance/finance-dashboard.service.ts:742>); [Source: services/finance/finance-dashboard.service.ts:798](<E:/ohada saas/Focused projects/stoquify/services/finance/finance-dashboard.service.ts:798>); [Source: hooks/finance/useFinanceDashboard.ts:24](<E:/ohada saas/Focused projects/stoquify/hooks/finance/useFinanceDashboard.ts:24>).

## Analytics reports

| Report | Interpretation |
|---|---|
| Financial Summary | Completed/delivered order revenue; estimated cost uses current item cost price times sold quantity. Later item-cost changes can change that estimate. Payment-method breakdown does not restrict related payment status. |
| Cashier Performance | Sessions selected by session-start date and their eligible sales. Active-session hours use elapsed time. This differs from selecting every individual sale strictly by its timestamp. |
| Item Performance | Period sales mixed with current inventory and cost. Use Revenue/Quantity/Profit/Margin sorting to answer different questions. |
| Cash Flow | Cash-drawer transaction types. Running balance starts at zero for the range; it is accumulated flow, not an independently established opening/bank balance. |

Reports expose source/generation/period/row-count/currency/filter-hash provenance. They are internal management reports, explicitly separate from statutory certified exports or signed close packs. The report page's location comes from URL/context, not a visible location picker. The 7 days shortcut subtracts seven days and includes both endpoints, potentially eight dates; This month includes month-end. Always check the displayed dates.

Charts inherit the report's units and scope. Time-series horizontal axes use the selected date range; value series use displayed currency, and quantity/count series use their named units. Ranked product/category charts compare those groups rather than dates. No unobserved hover, zoom or drill-through behavior is promised.

[Source: services/analytics/financial-reports.service.ts:201](<E:/ohada saas/Focused projects/stoquify/services/analytics/financial-reports.service.ts:201>); [Source: services/analytics/financial-reports.service.ts:281](<E:/ohada saas/Focused projects/stoquify/services/analytics/financial-reports.service.ts:281>); [Source: app/[locale]/(dashboard)/dashboard/analytics/reports/ReportsClient.tsx:143](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/analytics/reports/ReportsClient.tsx:143>).

## Daily sales

Daily Sales prefers a stored daily report and shows its original recording time and draft/finalized status. Saved cash/tender facts come from that stored report. Without one, the service aggregates eligible orders for the organization-local reporting day and selected active or retained historical location. Cash/session/tender facts stay unavailable; they are not invented from order totals. With zero orders, AOV is unavailable. Refresh rereads source; it does not regenerate/finalize a report. The query is stale after 30 seconds, has no explicit polling timer and disables retries.

[Source: services/analytics/daily-sales-read.service.ts:29](<E:/ohada saas/Focused projects/stoquify/services/analytics/daily-sales-read.service.ts:29>); [Source: components/analytics/CompleteIntegratedDailySalesDashboard.tsx:54](<E:/ohada saas/Focused projects/stoquify/components/analytics/CompleteIntegratedDailySalesDashboard.tsx:54>).

## Stock, shifts, history and proof

Transfer list counters describe the currently returned/filtered data; the list requests only the first 50 transfers. Detail lookup searches the first 100. Do not call these all-time totals.

POS Paid, Due and Change are tender previews before Charge succeeds. Currency comes from the selected location's organization, with a USD fallback in this component; verify setup if the currency is unexpected. Network/printer readiness fields are presentation values, not physical-device tests.

Cash/payment history has cash-event and payment-capture lanes. Do not add both as independent revenue receipts. Physical expected cash uses signed cash-event impacts; closing counts have zero cash impact. Variance subtracts expected cash from recorded closing counts for the selected events. Electronic tenders are excluded from physical cash. Dates are parsed as UTC calendar boundaries while displays use organization timezone; inspect midnight-adjacent timestamps. Generation, recorded-through and effective-as-of are separate.

AP readiness counts represented posted invoices, pending-payment invoices, released payments, matching/bank-change exceptions and blockers. A stale indication can appear after 15 minutes using its evaluated timestamp. Ready means no represented blocker, not settled accounts or certified close.

Accounting trial-balance totals remain full-report totals when its local account table is filtered. Financial statements use posted ledger classification. Management EBITDA adds income tax, finance costs, depreciation and amortization to net income and is explicitly not a statutory subtotal.

[Source: components/inventory/transfers/TransferDashboard.tsx:139](<E:/ohada saas/Focused projects/stoquify/components/inventory/transfers/TransferDashboard.tsx:139>); [Source: services/pos/cash-payment-history.service.ts:586](<E:/ohada saas/Focused projects/stoquify/services/pos/cash-payment-history.service.ts:586>); [Source: components/purchasing/APControlWorkbench.tsx:248](<E:/ohada saas/Focused projects/stoquify/components/purchasing/APControlWorkbench.tsx:248>).

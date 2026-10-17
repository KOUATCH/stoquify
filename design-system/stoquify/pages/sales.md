# Sales reporting contract

Date: 2026-10-11. Scope: `/[locale]/dashboard/sales`, phases 0 through 6.
Authority: [design master](../MASTER.md), UI constitution and existing server-owned reporting/permission controls.

## Current daily report

Single organization, location and organization-local calendar day. Keep the existing saved-report precedence: a stored report owns the entire day, even when it records zero transactions. Otherwise aggregate nondeleted CONFIRMED, PROCESSING, SHIPPED, DELIVERED and COMPLETED orders by `orderDate` in the half-open local-day interval. Neither source establishes cash collection or posted revenue.

| Metric | Current source/formula | Missing/zero behavior |
| --- | --- | --- |
| Recorded sales value | Saved `totalRevenue`, otherwise exact decimal sum of eligible `SalesOrder.total` (includes recorded order-level tax/charges/discount effects) | Zero only for a successful empty aggregate; query/invalid amount failures remain failures |
| Transactions | Saved `totalTransactions`, otherwise eligible order count | Saved count is not silently recomputed |
| Quantity | Saved `totalQuantitySold`, otherwise sum of eligible line quantities | May mix units; display this limitation, never describe as normalized volume |
| Average value | Saved `averageTransactionValue`, otherwise order total/count | Empty order population: unavailable; saved value retained as evidence |
| Top items | Up to five saved report items or grouped eligible order lines ranked by recorded value | Line totals may differ from order totals; absent metadata is unavailable |
| Cash | Saved opening/closing/cash-in/cash-out/variance only | Not inferred from orders; not proof of an expected drawer balance or session closure |
| Payment categories | Saved cash/card/mobile-money/bank-transfer/credit categories only | Credit is not collected cash; absent report means unavailable |

Both reads and latest-activity lookup require `reports.read` and `sales.read`, session-derived tenant authority and existing sales module observation. A retained same-tenant location remains usable for historical reporting. `OPERATE_POS` controls presentation of the POS link; the destination still authorizes independently. No finance access is granted.

## Phase 1 interaction and layout

Desktop: title/Refresh → date/location/Today/Yesterday → source/currency/timezone/checked time → short meaning + native calculation disclosure → four existing KPIs → empty-state recovery → cash/top items/payment categories.
Mobile: same reading order, stacked fields/cards, wrapping actions, visible focus. Use current `--dash-*` tokens and primitives, with EN/FR copy. No palette or framework changes.

URL parameters: `view=daily`, `date=YYYY-MM-DD`, `locationId`, and `reportOrg` (scope marker only, never authority). Validate impossible dates, repeated scope keys and unsupported views. Normalize successful default scope with replaceState; explicit filter changes push history. Preserve unrelated query parameters and hash. Bookmarks from another organization discard their old date/location; direct foreign locations still fail server validation. Daily remains the default view; the implemented Performance view is described below.

Today/Yesterday use the organization's timezone, not the browser's timezone. On a new scope hide previous figures while loading. A same-scope refresh may retain figures with their original checked time and an explicit refreshing message. An error hides figures. No active organization sends no query. Empty-state date/location buttons move keyboard focus to the corresponding field.

Latest activity is an explicit read, bounded to today plus the preceding 365 local calendar days. Load at most 366 saved dates, then the latest eligible order outside those saved dates. Choose the later nonempty saved date or eligible order date. A saved zero day masks live orders on that day, matching report precedence. Explain the search horizon, show no-result versus failure distinctly, and ignore replies after scope/actor changes or unmount. No seeding, report generation or mutation.

## Phases 2 and 3: performance and sales records

The route has separate Daily report and Performance controls. Daily saved-report semantics remain unchanged. Performance includes only currently COMPLETED/DELIVERED nondeleted orders, dated by `orderDate` in the organization timezone. Headline sales value includes the recorded total's tax, charges and discounts. It is not posted revenue, collected cash or return-adjusted sales. Historical completeness cannot be established from absence of matching rows; disclose this limitation alongside the calculation.

Presets: Today, Yesterday, Last 7 days (today and six preceding calendar days), This month, or a custom range of at most 366 days ending no later than today. Current-day ranges stop at the server's checked instant. Compare with the immediately preceding equal number of local calendar days through the equivalent local clock time on its final day. Ambiguous or nonexistent prior clock times make comparison unavailable. Full-day windows use actual local boundaries, including 23/25-hour DST days. Display both exclusive-end windows and mark partial days.

Value and count sum the same daily database buckets; average is value/count, null for no orders. Absolute differences use decimal arithmetic; percentages require a strictly positive baseline. Money and counts serialize as strings. JavaScript numbers are used only for normalized chart coordinates. A daily line chart, exact-value table, factual summary and keyboard-operable date selections share the same population. Single-day reports retain a single daily bucket; hourly drill-down is optional follow-up, not a second incompatible aggregation in this slice.

Population filters (location, completed/delivered status, POS/delivery channel) update KPIs, chart and records together. Record-only number/customer search is explicitly labelled and does not change aggregates. Customer search and names require server-derived `customers.read`; only same-tenant names are selected, never contact details or balances. KPI inspection clears record-only search/pagination to expose the matching population.

The list defaults to 25 records and supports 10/25/50 rows through the shared table pagination control. It selects page size plus one and uses the extra record to indicate Next. Stable descending `(orderDate, id)` keyset pagination validates the cursor inside the same tenant and filtered population. Previous uses cursor history visited in the current scope; an unknown bookmarked cursor supports First without inventing a predecessor or total page count. Search or page-size changes reset the cursor. No count query or unbounded line/payment fetch is needed. A removed or changed cursor asks users to restart. Each request uses repeatable-read consistency, but requests/pages are live and not a frozen export. Refresh returns to the first page. Reuse the shared table search, pagination and visual tokens.

Record buttons open a read-only dialog with order identity/date, status/channel, recorded payment status and source monetary fields. The separate detail action repeats reports/sales authorization and tenant checks. It does not infer settlement or outstanding balance. Dialog close restores focus and leaves the URL scope intact.

Performance URL keys: `view=performance`, `preset`, `start`, `end`, optional `locationId`, `status`, `channel`, record-only `search`, `cursor`, `pageSize` (10, 25 or 50), and the non-authoritative `reportOrg` marker. Invalid/duplicate filters get recovery; foreign organization bookmarks discard stale scope. Browser Back restores prior filters. Active view buttons do not reset scope. Source errors hide stale figures; same-scope refresh retains the old checked timestamp until success.

Read-model query budget: organization, locations, two grouped aggregates and one bounded records query; one extra cursor query on later pages and one tenant-scoped customer-name query when permitted and needed. Query count does not grow with the range. Parameterized SQL uses the existing organization/date and organization/location/date indexes as candidates; real plans and load performance still require measurement. No schema or index migration is included.

## Phase 4: collections and current receivables

Three supplementary panels load independently below sales records. They require reports/sales authorization before their own server-derived source permissions. Collections uses the existing finance payments permission alternatives; receivables uses the finance receivables alternatives. Restricted responses contain only a state marker, and no corresponding source service is invoked. Panel failure does not remove the sales overview or other panels. Customer identities, bank/card/contact details and ledger allocations are not returned by these aggregate panels.

Collections uses the selected period's organization-local half-open boundaries through the current instant, and selected location. It deliberately ignores order date/status/channel/search for receipt activity. Sum PAID/REFUNDED nondeleted sale Payment rows by processedAt, excluding purchase-linked rows and CREDIT/STORE_CREDIT/MIXED placeholders. Cash, card, mobile money, bank transfer and cheque form the receipt denominator. Add customer-settlement allocations dated by settlementDate, including originally received amounts of later-reversed settlements. Settlement posting creates allocations/ledger entries, not Payment rows: never sum settlement headers or customer ledger entries again. Attribute each allocation to its same-tenant sale location. Settlement currency must match the organization. Processed refunds use processedAt; settlement reversals use reversalDate. Net recorded collections = receipts - processed refunds - settlement reversals; it is not a reconciled cash flow or bank balance. Cancelled payments/voided receipt activity are outside this population. Missing effective timestamps anywhere in the selected location scope are counted, excluded from period totals and make net unavailable rather than guessed from creation dates.

Credit issued is a separate decimal sum of original, noncancelled CREDIT Payment records attached to orders in the selected sales period/status/channel/location. It is not cash or a current receivable balance, and never enters receipt shares or net collections.

Receivables reuses `getCustomerAROpenItems` at the current checked instant and latest effective/recorded lifecycle version. Optional location joins the posted document's same-tenant source sale. Sales period/status/channel/search do not filter current balances. Only open/partial documents contribute; cancelled/voided/settled documents do not. Keep currencies separate. Overdue follows the existing whole-days-past-due calculation. No documents means no posted coverage, not proof that all sales are posted or all receivables cleared. The evidence link opens the existing AR history route. No new historical as-of claim or financial posting is introduced.

Bounds: collections reads grouped payments/refunds and at most 5,001 settlement allocations (over 5,000 fails without totals). Receivables reads at most 1,001 documents (over 1,000 fails without totals), one latest lifecycle state each, and skips the unneeded allocation ledger query. Counts/aggregates are database-side. The two existing finance dashboard aggregates were inspected but not reused: they cap orders/payments and do not provide these lifecycle/time semantics. Existing unrelated finance changes remain untouched.

## Phase 5: product performance

Require `inventory.items.read` in addition to reports/sales. Derive stock access from `inventory.levels.read` and contribution access from the existing finance profitability permission alternatives. Without those permissions do not query inventory levels or historical inventory transaction costs, and do not return values. Source destinations authorize independently.

Use the same sales population and comparison windows as performance KPIs, excluding record search. Reuse `completedSalesEvidence`, the item report's original stock-issue coverage rules, with explicit line-versus-order reconciliation instead of assuming equality. The older report API's Number conversion and full-day comparison are not inherited. Line totals and quantities retain decimal strings. Display total line value, total order value and their difference; order-level discounts/charges are not allocated speculatively. Show original contribution = line value - line tax - evidenced stock-issue cost. Missing/inconsistent historical cost makes contribution/margin unavailable. Subsequent returns and credits are not deducted. This is not posted profit.

Keep inactive/historically deleted products and comparison-only products. Rank by value or quantity within a single known catalog unit ID; no mixed-unit ranking/conversion. Show current unit metadata explicitly with quantities, without claiming historical unit conversion. Client pagination defaults to 25 rows with shared 10/25/50 controls over the complete bounded result, not a truncated top-items list. Local name/SKU search and unit filters reset pagination and explicitly leave report totals unchanged. Product, trend and payment-method tables reuse the system table visual treatment; small fixed summary tables do not need artificial pagination.

Current stock has its own checked time and the selected location scope. Available quantity uses current inventory projection, validates on-hand minus reserved equals available, and requires a record for every scoped location. Missing/inconsistent records or untracked inventory are unavailable. Low stock follows the item's existing minimum stock threshold. It is never labelled period-end stock.

Bounds per current/comparison window: at most 501 orders, 501 lines per order, 5,000 total lines, 2,000 combined products, and 20,001 cost movements. Crossing a bound fails the panel rather than returning partial totals. Cost query runs only for current activity when authorized. Existing shared report callers retain strict order tie-out and their original defaults.

## Phase 6: attention queue and scoped export

Show the attention queue immediately after the performance KPIs. Reuse the same authorized receivable/product query results as the panels; only saved cash evidence needs an additional action/read. Three findings are initially visible; an accessible disclosure exposes all remaining findings from the complete bounded sources. Order by source (overdue, cash, stock), then currency / report date descending and location-ID / product-ID. Deduplicate by source ID. No urgency, estimated loss or suggested reorder quantities are calculated.

- Overdue: positive current lifecycle overdue amount per currency, same location scope, timestamp from the authoritative AR read. Finance read permission remains independent. Empty AR evidence marks the assessment partial.
- Cash: nonzero recorded variance from saved daily reports for selected calendar dates and location(s), maximum 1,000 reports (fetch 1,001 and reject overflow). Preserve sign, recorded time, exact report day/location and provisional/finalized label. Missing saved days cannot establish zero variance; compare covered reports with days times scoped locations. The permission pair matches Daily report (`reports.read` and `sales.read`). Sales status/channel/search do not filter saved cash evidence.
- Stock: currently available quantity at/below the existing threshold or at/below zero, only products with positive sold quantity in the selected sales population. Requires item and stock access. Unknown stock adds a partial-coverage note. Inactive products link to the authorized product panel; active products link to their existing detail. Current stock time is distinct from sales period.

Any loading, failed or restricted source is distinct from a clean result; no findings means only no findings in available evidence. Failed/revoked data is removed. Cash links preserve exact day/location/org marker and locale. AR links open the broader organization-wide history; product destinations may show other locations. Explain this broader destination and support normal browser Back. Reuse `ActionQueueItem` with localized labels and semantic warning styling; no new token system.

CSV scope is explicitly **sales summary and all daily trend buckets**, never a current record page or finance/product export. Re-read through the existing repeatable-read performance model; validate daily value/count and average against the summary before release. Return that same report to refresh visible totals, cancelling an older in-flight dashboard query before download. Ignore a late download response after scope/organization unmount. The existing records-only search and pagination still apply to refreshed on-screen records and are explicitly excluded from CSV totals.

Export independently requires `reports.export`, `reports.read`, `sales.read`, module observation, strict scope validation and trusted session tenant. Reuse controlled `report.export`, five-minute fresh authentication, server watermark and durable audit. No file is released on audit failure. Include source, organization/location, status/channel, inclusive/exclusive instants, partial-period flag, currency/timezone, checked/generated times and watermark. UTF-8 CSV quotes every field, doubles quotes and neutralizes formula-like prefixes even after whitespace/control characters; serialize money as exact decimal text. CSV excludes customer identities. Audit rows are the only new writes; no schema or business-record mutation.

Real disposable-database, load and restricted-role browser certification remain separate release evidence; phase 6 implementation alone does not certify release.

## Verification fixtures and acceptance

| Fixture | Expected result |
| --- | --- |
| Orders 120.00 + 80.00, count 2 | Value 200.00; average 100.00, not proof of collection |
| No orders | Value/count/quantity zero; average and cash unavailable |
| Saved report 150.00 versus live orders 200.00 | Saved 150.00 retained; no silent reconciliation |
| Saved zero day containing live orders | Latest-activity lookup excludes that day |
| Older saved activity versus newer eligible order | Later qualifying day selected within the horizon |
| Paris spring/autumn change, Douala midnight | Correct half-open organization-local calendar bounds |
| Bad date/view, duplicate scope, foreign location | Invalid-link recovery or server denial, never fabricated empty success |
| Slow previous scope/tenant response | Old data and latest-search navigation ignored |
| Read failure / no locations / no session | Distinct recovery states; no invented location or zero sales |
| EN/FR, mobile/desktop, keyboard | Reachable controls, visible focus, readable wrapped copy |

Report source inspection, mocked tests, real PostgreSQL and browser results separately. See `docs/ecc/test-lanes.md`; broad build includes migration and is not a read-only check. Future phases remain gated by their own verification. Rollback: revert only the phase-owned UI/hook/action/service additions; no schema/data rollback is required.

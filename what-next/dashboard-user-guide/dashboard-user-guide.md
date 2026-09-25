# Stoquify dashboard user guide — complete edition

This guide explains what the current dashboard shows, how to use its controls, and how to turn its signals into completed work. It covers 130 dashboard route patterns, including administrative, hidden, dynamic, shared and legacy entry points. Evidence date: **2026-09-06**.

**Read the verification boundary first:** the inspection browser reached the sign-in page when opening the dashboard. No authenticated dashboard page or business control could be exercised. The instructions are based on current source and focused supporting tests that were read, not run. Partial features and unresolved behavior are identified explicitly.

## Start in ten minutes

1. Open [the dashboard](http://localhost:3000/en/dashboard), sign in through your normal authorized account and confirm the organization and responsibility scope.
2. Read [shared controls](shared-controls.md), especially navigation search, dates, selection/export scope and error recovery.
3. Choose your [role playbook](role-playbooks.md). Follow one daily routine before exploring every module.
4. Use the [metric dictionary](metric-dictionary.md) whenever comparing money, stock or status counts between pages.
5. Follow a [complete workflow](workflows.md). Confirm the resulting record and evidence, rather than stopping at a successful click.

## Important findings for everyday use

- Company **Gross paid payment total** combines paid sales and purchase payments across all dates. It is not revenue or cash balance.
- The current POS offers **Cash** and **No receipt**. Park sale and Override are warning-only controls.
- **Approve Transfer immediately posts stock out and stock in and marks the transfer completed.** There is no separate shipping/receiving sequence here.
- The AP control workbench is read-only. Payroll contract/compensation source workbenches also do not provide full creation/editing flows.
- Invitations are recorded, but email delivery is disabled in this build.
- Cash/payment history Search is not applied; its Export prepares permission/readiness but does not download a CSV.
- Operational finance figures and posted accounting reports have different definitions. Use the metric dictionary before treating a difference as missing money.

## Dashboard map

The sidebar groups work into Command, Operations, Finance & Trust, People and Governance. Links depend on access and module state; the sidebar is not the complete route inventory. Bracketed routes in the chapters represent an existing record opened from its parent page.

- [Accounting, reports and close assurance](modules/accounting.md) ([PDF](modules/accounting.pdf))
- [Analytics, reports and daily sales](modules/analytics-sales.md) ([PDF](modules/analytics-sales.pdf))
- [Command pages and daily management](modules/command-center.md) ([PDF](modules/command-center.pdf))
- [Customers and statements](modules/customers.md) ([PDF](modules/customers.pdf))
- [Finance, cash evidence and reconciliation](modules/finance.md) ([PDF](modules/finance.pdf))
- [Compliance and assurance](modules/governance.md) ([PDF](modules/governance.pdf))
- [Inventory and product setup](modules/inventory.md) ([PDF](modules/inventory.pdf))
- [People, payroll and employee self-service](modules/people-payroll.md) ([PDF](modules/people-payroll.pdf))
- [Point of sale and cash accountability](modules/pos-cash.md) ([PDF](modules/pos-cash.pdf))
- [Suppliers, purchase orders and AP monitoring](modules/purchasing.md) ([PDF](modules/purchasing.pdf))
- [Settings, access and workspace composition](modules/settings.md) ([PDF](modules/settings.pdf))

## Reference and practical guidance

- [Shared navigation, controls and recovery](shared-controls.md)
- [Metric definitions, scope and freshness](metric-dictionary.md)
- [Detailed controls and consequential actions](control-notes.md)
- [Cross-page workflows](workflows.md)
- [Role playbooks: daily, weekly and period end](role-playbooks.md)
- [Limitations and verification blockers](limitations-and-blockers.md)
- [Technical evidence and review method](technical-evidence.md)
- [Coverage register](coverage.csv) and [control register](controls.csv)
- [Complete guide PDF](dashboard-user-guide.pdf) and [complete Markdown edition](dashboard-user-guide.md)

## How to interpret coverage

Source classifications: **108 source-only; 7 redirect; 7 partial; 7 shared implementation; 1 placeholder**. Browser-inspected dashboard pages: **0**. One browser entry attempt was blocked at sign-in; all 130 route patterns remain unverified at runtime. Blocking overlaps the source categories and must not be added to them.

The control register contains **3532 rows**, including reviewed controls and static candidates repeated across routes. This is not a count of unique functioning controls. Unresolved labels, shared exports and dormant branches are marked; the narrative and reviewed-control rows take precedence over raw candidate extraction.

The canonical publication is under docs/dashboard-user-guide with matching Markdown/PDF reports. The requested inspection package is also maintained under what-next/dashboard-user-guide, including the evidence and CSV registers.


---

# Shared navigation, controls and recovery

[Guide home](README.md)

## Organization and navigation

Before viewing balances or making a change, confirm the active organization and permitted location. The top organization banner shows identity/role context; its **Live** badge is a static label, not a successful-refresh signal. The separate account menu currently contains hardcoded **User**, **Stoquify** and **Pro** display text. Do not infer subscription or authority from those labels.

The sidebar exposes permitted destinations by group. Expand a module to find its children; use the mobile navigation drawer where appropriate. Top search searches **navigation destinations**, matching titles, parents, sections and module slugs. It returns up to seven results; Enter opens the first. It does not search customers, orders or stock records. Search inside the relevant directory to find those records.

Open website navigates to the public site. The language switch selects EN/FR routes. Theme and sound controls change presentation/preferences. Sign out terminates the session. Account-menu Profile, Settings and Billing & Plans links currently point to dashboard paths with no page route in this inventory; use the specific working settings links instead. Help & Support is outside this dashboard inspection.

[Source: components/dashboard/Navbar.tsx:107](<E:/ohada saas/Focused projects/stoquify/components/dashboard/Navbar.tsx:107>); [Source: components/UserDropdownMenu.tsx:183](<E:/ohada saas/Focused projects/stoquify/components/UserDropdownMenu.tsx:183>).

## Shared table controls

| Control family | Use it for | Scope and outcome |
|---|---|---|
| Search | Find matching records by the fields advertised on that table. | Search fields differ by page; top navigation search is unrelated. Cash/payment history search is currently incomplete. |
| Date range / period / location | Narrow a query or report to the desired business scope. | Check both endpoints, timezone, date basis and selected location. Some headline balances stay current or organization-wide. |
| Status/type/category filters | Separate work states or classifications. | An empty filtered list is not proof the organization has no records. Clear filters and inspect scope. |
| Column heading / sort menu | Rank by date, amount, name or another supported column. | Usually changes row order, not source records. A report may retain full-report headline totals. |
| Columns / density / Grid / List | Change readability. | Presentation only where implemented. Theme and table settings do not change business permission. |
| Page size / Previous / Next | Inspect another portion of results. | A visible row count, loaded result count and organization total may differ. Some queries cap the entire returned dataset. |
| Row checkbox / Select all | Build a selection for an offered bulk action/export. | Do not assume Select all means every database record across unvisited pages. Check the selection count. |
| Row menu / Details / View | Inspect a record or navigate to its owning page. | Menus vary by permission and current record state. Missing actions may be intentionally blocked. |
| Refresh / Retry | Fetch current evidence or repeat the specific failed request. | A same-request command retry may repeat a protected write; inspect its wording and receipt. Refresh does not repair the source record. |
| Export / Print / Copy ID | Produce/share a file or copy an identifier where implemented. | Export scope is page-specific; Print invokes the browser print dialog where used. Copying an ID does not export the record. |

The inventory/history workbenches and HR/payroll tables reuse presentation components. The guide documents shared patterns once and calls out exceptions at the page level. Not every control in this table exists on every page.

## Forms, drafts and confirmation

Read required-field markers, units and validation feedback before submitting. Monetary amounts must be interpreted in the displayed organization currency. A percentage is not a currency amount. Date ranges and quantities have workflow-specific constraints; receiving, for example, requires positive integer quantities.

Previous/Next inside a wizard usually changes the step, but **Save draft can persist a record**. POS cart additions and quantity edits also persist before Charge. A drawer is a presentation container; its buttons can calculate payroll, approve access or post stock. Opening a view is not authorization to submit its form.

When a review is offered, compare the exact before/after state, reason and evidence revision. Identity confirmation proves the current actor; it does not grant missing permissions or satisfy a required independent reviewer. Some forms require a second explicit submit after confirming the password. Use the specific control notes rather than assuming every page behaves identically.

## Evidence and status language

| Label/concept | Practical interpretation |
|---|---|
| Draft / requested | A proposal or request exists; it may not be active or approved. |
| Approved | The relevant decision was recorded; posting, delivery or settlement may still remain. |
| Posted | The specific accounting/stock effect was recorded through its owning service. Check the source link. |
| Queued / preparing | Work was requested; completion and external response are still separate evidence. |
| Released payment | A controlled release state; inspect settlement/reconciliation proof separately. |
| Ready | The represented readiness checks passed. It is not a guarantee of every omitted domain or professional certification. |
| Unavailable / unknown / redacted | The value cannot be asserted from your evidence. Do not replace it with zero. |
| Zero | A numeric result in its stated source/filter scope; confirm source completeness first. |
| As of / recorded through / generated | Business effective time, latest included recording and snapshot-generation time can differ. |

## Recovery without duplicating work

1. **Sign-in or denied access:** use normal sign-in and ask the organization administrator to check role/module/location authority. A hidden menu does not establish missing business records. Do not bypass the guard with a guessed URL.
2. **Empty results:** inspect period, location, status and search; clear filters. Look for no-setup, no-location or no-mandate states before interpreting zero activity.
3. **Loading or read failure:** wait for the stated loading state; use Retry/Refresh. Preserve a displayed correlation/reference ID for support. Do not keep submitting a business action to solve a read failure.
4. **Stale evidence or conflict:** load the current record for comparison. Preserve the intended draft where offered, resolve differences, and obtain a new review of the latest evidence.
5. **Uncertain write outcome:** inspect current state, history and receipt. Use the explicitly offered Retry same request rather than creating a new request that could duplicate the change.
6. **Pending external work:** inspect the queue, attempts, provider/authority response and blockers. Queued is not delivered, settled or accepted.

## Notifications and language

Settings Notifications tests the current in-app queue: Send test, Security alert and Payment update create synthetic entries. Mark all read, Mark read, Dismiss and Clear queue affect that session-memory list; only sound preference persists in browser storage. The separate legacy sidebar **Mark it Read** handler only emits a success toast because its server update is commented out. These two mechanisms should not be confused.

English is the guide's reference language. French changes route labels, translated names, formatting and some wording; mixed/untranslated technical text remains in several workbenches. No distinct French permission or business-state rule was established. A language switch does not change organization currency. Dates and number separators must be read from the actual locale and the report's source contract.

[Source: components/NotificationMenu.tsx:35](<E:/ohada saas/Focused projects/stoquify/components/NotificationMenu.tsx:35>); [Source: app/[locale]/(dashboard)/dashboard/settings/notifications/NotificationsSettingsClient.tsx:62](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/notifications/NotificationsSettingsClient.tsx:62>).


---

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


---

# Detailed controls and consequential actions

[Guide home](README.md) · [Shared controls](shared-controls.md)

These notes give the exact labels and significant inputs/effects for workflows where a short page description could otherwise be misleading. All are source-reviewed and unexercised. The CSV additionally records individual static candidates and unresolved controls.

## Module control center

Open [Modules](http://localhost:3000/en/dashboard/settings/modules). Read/write requires MANAGE_SYSTEM_SETTINGS; protected writes require identity assurance within ten minutes.

1. **Configure**, **My workspace**, **Change history** change views.
2. **Retailer** puts Inventory, Sales, POS and Cash accountability into the local draft. **Service business** selects Sales, Finance, Accounting and Reports. **Current configuration** restores current server selection to the draft. They do not purchase access.
3. **Find a capability** searches names/descriptions. **Show capabilities** filters All capabilities, Operations, Finance & assurance, People, Insights & content. Checkboxes edit the draft. Required dependencies are included automatically and cannot be removed while dependents need them.
4. Read **Selected in draft**, **Required connection**, grant and setup badges separately. Operating dashboard, Settings and Administration are shared foundations. **Save draft** persists a draft, and unsaved selection is also restored from organization/user-scoped session storage.
5. **Payroll period to verify** and **Authority connection to verify** select existing scoped records, capped at 50 each; they do not create a period or certify an authority connection.
6. **Review configuration** obtains a preview tied to current revision, permissions, grants, dependencies, setup and evidence. Review **Join workspace**, **Stay in workspace**, **Leave workspace**, **Established access kept**, conditions and stop consequences.
7. **Apply configuration** applies the reviewed request. **Verify identity and apply** supplies the current password when needed. Requested revision can differ from Active workspace revision: Requested/Preparing/Failed can leave the previous verified workspace active. Explicitly reviewed stops can remain effective during preparation.
8. Fix named source prerequisites; use **Refresh current state** and **Check inputs and resume preparation** when offered. Refresh preserves the draft but requires another review.
9. **Stop new work in …** has a separate operational meaning. Supported scopes: inventory adjustments/transfers/counts, new purchase orders, new payroll periods/runs, new manual accounting journals. Sales, POS and direct reconciliation stops are unsupported. Existing completion work and mandatory financial effects remain governed.
10. **Prepare reactivation of …** proposes clearing a stop, requiring review. **Open authorized … records** preserves permitted historical access. **Load earlier changes** pages history; **Reopen as new draft** does not undo transactions or grants.

Best use: choose the operating model needed today, review dependencies, then compare requested/active revisions before telling colleagues a module is available. Removing a workspace selection is distinct from revoking permission, cancelling a subscription or stopping all business effects.

[Source: components/modules/ModuleCompositionWorkbench.tsx:453](<E:/ohada saas/Focused projects/stoquify/components/modules/ModuleCompositionWorkbench.tsx:453>); [Source: services/modules/module-composition.service.ts:383](<E:/ohada saas/Focused projects/stoquify/services/modules/module-composition.service.ts:383>); [Source: services/modules/module-stop-policy.service.ts:23](<E:/ohada saas/Focused projects/stoquify/services/modules/module-stop-policy.service.ts:23>).

## Company, role and member changes

Company **Actions → Edit profile** opens the Company DNA form. **Identity**, **Regional**, **Calendar**, **Review**, **Previous**, **Next**, **Save organization** guide name, industry/address, region, language, timezone and fiscal/inventory start dates. Currency is locked. Updates require system.organization.update. On conflict use **Load latest for comparison**, **Keep my edits and review** or **Use the saved version**.

**Set up another organization** opens a handoff: **Open owner registration**, **Sign in to an existing organization**, **Back to this organization**. It does not directly create another tenant. **Export → Prepare reviewed CSV** checks current-organization scope, reports.export and fresh identity; **Confirm identity** may be required. **Retry same export request**, **Download prepared file again**, **Reload and review current data** distinguish replay from a new review.

Role form controls include **Role name (English)**, optional French name, **Purpose and responsibilities**, **Find a permission**, permission categories and risk-labelled checkboxes. **Review changes → Save reviewed role** saves definition and audit together. Every member using the role is affected. Existing out-of-authority grants may be preserved but not freely added. **Confirm identity** does not bypass another explicit review/save. Conflict/retry controls retain the intended draft or retry the same save.

Users supports search, activation/verification filters, **Clear filters**, **Refresh**, **Export matching members**, Users/Invitations tabs. **Deactivate → Review account deactivation** requires a 3–400-character reason; **Confirm deactivation** stops sign-in, revokes sessions and cancels pending invitation links while retaining business history. Self/last-administrator guards apply.

Member access changes role assignments/reactivation, not arbitrary profile fields. Enter **Reason for this change → Review changes → Confirm access change**. **Confirm password** verifies identity; confirm the change explicitly afterward. Successful access changes revoke member sessions. **Reload and compare** preserves selections/reason; **Retry same request** resolves uncertainty. Reactivation has verification and matching deactivation-evidence requirements.

**Invite user → Invite a colleague** requires Email address and an authorized Role. **Record invitation** creates the reviewed request; links expire after seven days. Email transport is disabled in this build. **Replace invitation** invalidates the old link and records a replacement with a reason. **Cancel invitation** invalidates the link, not an already accepted member account. **View history**, **Refresh history**, **Load older decisions** expose request/delivery-attempt evidence. Refresh status as of the displayed check time before reissuing.

[Source: components/settings/OrganizationSettingsForm.tsx:592](<E:/ohada saas/Focused projects/stoquify/components/settings/OrganizationSettingsForm.tsx:592>); [Source: components/settings/OrganizationDirectoryExport.tsx:68](<E:/ohada saas/Focused projects/stoquify/components/settings/OrganizationDirectoryExport.tsx:68>); [Source: components/settings/MemberAccessEditor.tsx:104](<E:/ohada saas/Focused projects/stoquify/components/settings/MemberAccessEditor.tsx:104>); [Source: services/users/user-invitation-history.service.ts:74](<E:/ohada saas/Focused projects/stoquify/services/users/user-invitation-history.service.ts:74>).

## Master-data onboarding

Choose Customers, Suppliers or Items from permitted targets; **Download template**, select a CSV up to 5 MB/1,000 rows, then **Run dry validation**. This records staging evidence but creates no business master records yet. Inspect source hash, mapping version, valid/error/duplicate counts and row issues. Approve the exact reviewed data using the acknowledgement and **Record explicit approval**; only a fully valid run is eligible. **Commit through domain owners** creates approved records and records resulting IDs/counts. **Export evidence manifest** preserves the handoff evidence.

High risk needs a different authorized approver; examples include at least 100 rows, supplier creation, a positive customer credit limit or item price values. Supported scope is new master data. Current balances, opening stock/accounting balances, historical transactions, merges/updates/deletes and automatic rollback are excluded. A paused batch needs its specific conflict resolved and controlled replay, not an invented clean slate.

[Source: services/onboarding/master-data-import.service.ts:32](<E:/ohada saas/Focused projects/stoquify/services/onboarding/master-data-import.service.ts:32>); [Source: components/onboarding/MasterDataOnboardingWorkbench.tsx:364](<E:/ohada saas/Focused projects/stoquify/components/onboarding/MasterDataOnboardingWorkbench.tsx:364>).

## Purchasing and transfer operations

Purchase order detail uses state/permission rules: DRAFT **Submit** requires lines; submitted **Approve** requires a different user with approval authority; eligible approved/partial orders offer **Receive Items**; fully received orders offer **Complete Order**. Short-close is unavailable. **Cancel Order** is state/permission-dependent; its reason currently falls back to “Cancelled by user.” Clone needs create authority. **Print** opens the browser print dialog.

Receiving requires positive integer line quantities. **Receive All Available** fills remaining ordered quantities; **Clear All** resets them. Optional supplier lot/expiry fields depend on item tracking; serial-tracked items indicate generated serials. **Receiving inspection outcome** is required: Passed releases available inventory; Failed/Incomplete holds stock and requires **Hold reason**. Optional notes preserve inspection evidence. Held stock blocks availability and supplier-invoice matching until authorized resolution; this modal does not resolve the hold. Verify the **Receipts**, **Inventory** and **History** tabs after success.

Supplier acknowledgement: approved PO → **Issue invitation** (optional recipient reference defaults to supplier email) → **Copy link**. No email send button is provided. **Revoke**, **Accept proposal**, **Reject proposal** need a 3–500-character reason. Issuance/review require purchase-order update authority and identity verified within five minutes, with no inline password step-up in this workbench. Accepting a proposal records BUYER_ACCEPTED history without changing authoritative order quantities/dates, stock, AP or accounting.

Transfers: **Create Transfer** requires distinct locations and at least one positive quantity no greater than available stock; repeated additions aggregate and recheck stock. **Approve Transfer** appears for a DRAFT and an actor other than the creator. It immediately posts paired TRANSFER_OUT/TRANSFER_IN and sets COMPLETED. There are no separate ship/receive/cancel/reject buttons in this flow. Priority/internal notes are collected but omitted from the service payload. Older records outside the bounded detail lookup can show an indefinite loading presentation.

AP workbench controls are navigation only: **Open AP history**, **Open suppliers**, **Review history** and supplier-profile links. There are no local search/date filters or invoice execution buttons. Reload the page to get a new source snapshot.

[Source: services/purchase-order/purchase-order-capabilities.ts:75](<E:/ohada saas/Focused projects/stoquify/services/purchase-order/purchase-order-capabilities.ts:75>); [Source: components/purchase-orders/ModernPurchaseOrderDetailPage.tsx:621](<E:/ohada saas/Focused projects/stoquify/components/purchase-orders/ModernPurchaseOrderDetailPage.tsx:621>); [Source: services/purchase-order/supplier-po-acknowledgement.service.ts:1185](<E:/ohada saas/Focused projects/stoquify/services/purchase-order/supplier-po-acknowledgement.service.ts:1185>); [Source: services/inventory/inventory-transfer.service.ts:806](<E:/ohada saas/Focused projects/stoquify/services/inventory/inventory-transfer.service.ts:806>).

## POS and physical cash

**Open** creates the shift from selected location/terminal and Opening float. An occupied terminal is blocked. Product add and quantity/remove controls change the persisted cart; quantities commit on blur/keyboard and invalid/rejected input returns to persisted state. Changing location is blocked when the draft contains lines. Customer selection is location-scoped; Walk-in customer clears a named customer.

**Grid**, **List**, **Touch mode**, All/Favorites/Recent, category and favorite controls change local presentation. Favorites/recent are component state. Product details do not supply the promised future supplier/movement/price-history panels.

**Exact cash** and quick amounts fill tender. **Add tender** adds a cash row; the final row cannot be removed. **Charge {amount}** requires an active shift, cart and sufficient positive tender; success gives order number, total/change and posting evidence. Current options are Cash and No receipt. **Park sale** and **Override** show a backend-workflow warning only.

**End shift / Close** requires an explicitly typed nonnegative cash count, up to 12 integer and 2 fractional digits. Empty is not zero. Nonzero variance at currency precision requires an explanation. A failure retains the dialog/input. Receipt history Search/Select sale/Revoke is separately permission-gated; revoking access does not refund or erase the sale. Offline **Retry** refreshes evidence, not enrollment, replay or conflict resolution.

Keyboard controls in source: Ctrl/Cmd+K focuses search, F4 opens customer selection when a location exists, F8 focuses tender, Escape clears searches. These shortcuts were not exercised in a live dashboard session.

[Source: components/pos/ProfessionalPOSSystem.tsx:308](<E:/ohada saas/Focused projects/stoquify/components/pos/ProfessionalPOSSystem.tsx:308>); [Source: components/pos/ProfessionalPOSSystem.tsx:665](<E:/ohada saas/Focused projects/stoquify/components/pos/ProfessionalPOSSystem.tsx:665>); [Source: components/pos/ProfessionalPOSSystem.tsx:955](<E:/ohada saas/Focused projects/stoquify/components/pos/ProfessionalPOSSystem.tsx:955>).

## Statements and payment reconciliation

Customer **Generate immutable statement** requires period start/end, read-only organization currency and current password. Inverted dates are blocked; the end uses UTC end-of-day capped at now. Inspect statement number/version, open-item count, closing balance, As of, Recorded through and hash. A truncation warning limits completeness; this form has no export button. **Queue secure delivery** requires Email/WhatsApp destination, explicit consent, optional Allow disputes/Allow promises to pay and password again. Default access lifetime is 30 days. Inspect queue status/redacted destination/expiry; no dashboard revoke button is wired.

Reconciliation **Import** accepts an active provider account and CSV/JSON file or pasted content. Review currency and file errors. **Run** persists reconciliation; the current button uses today as businessDate, not the displayed dashboard filter's date. Review residual amounts/currencies before **Propose match**. An authorized independent reviewer uses **Approve match** with fresh identity and expected evidence revision. The original preparer can **Replace with current evidence** and review a stale proposal again. Suspense follows Assign → propose reclassification → authorized approval.

**Sign** needs signing permission and identity verified within five minutes. Its button has no equivalent inline password form to the manual-match step. **Export** downloads a signed JSON certificate only for an eligible signed run and with separate export/fresh-identity authority. Changed source after signing can invalidate export; rerun/review the evidence. **Retry access check** and a new-tab sign-in support access recovery; a failed read preserves draft amounts for correction.

[Source: components/customers/CustomerStatementWorkflow.tsx:91](<E:/ohada saas/Focused projects/stoquify/components/customers/CustomerStatementWorkflow.tsx:91>); [Source: components/finance/PaymentReconciliationWorkbench.tsx:479](<E:/ohada saas/Focused projects/stoquify/components/finance/PaymentReconciliationWorkbench.tsx:479>); [Source: services/reconciliation/payment-reconciliation-certification.service.ts:1053](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/payment-reconciliation-certification.service.ts:1053>).

## People, payroll, accounting and assurance

People approvals separate **Approve**, **Reject** and **Apply**. The source can require an independent operator after approval; requesters cannot review their own request. Give the reason and required evidence hash, then confirm the resulting history/state.

Payroll Runs exposes only service-approved next actions: **Open calculation drawer**, **Open review drawer**, **Open approval drawer**, **Open emission drawer**, **Open posting drawer**, **Open declaration drawer**, **Open payment request drawer**, **Open payment approval drawer**, **Open payment release drawer**. Each shows source proof, permission, Fresh auth and Maker-checker where relevant. Supply its requested date/evidence/payment inputs; do not fabricate proof hashes. Requesting, approving and releasing a payment batch use distinct actors as required. Payments records later settlement proof. Declarations queues adapter work and awaits evidence of execution/response.

Accounting **Create draft** saves balanced lines; **Post** produces ledger evidence; **Reverse** creates a retained reversal trail. **Run assessment**, **Assign to me**, comments, waiver requests, accountant review and close exports each create or use separate evidence. **Ready to close** is a review decision, not automatically the period-close action. Draft and certified JSON exports have different gates.

Assurance **Acknowledge**, **Assign**, **Resolve**, **Suppress**, **Request waiver**, **Approve waiver**, **Reopen** are separate state changes. Enter the action-specific owner/due date/reason/evidence/expiry and **Apply action**, then inspect the timeline. A waiver or suppression does not correct the original record.

[Source: components/hris/HrisApprovalInbox.tsx:47](<E:/ohada saas/Focused projects/stoquify/components/hris/HrisApprovalInbox.tsx:47>); [Source: components/payroll/PayrollRunActionPanel.tsx:56](<E:/ohada saas/Focused projects/stoquify/components/payroll/PayrollRunActionPanel.tsx:56>); [Source: components/accounting/CloseAssuranceCenter.tsx:1](<E:/ohada saas/Focused projects/stoquify/components/accounting/CloseAssuranceCenter.tsx:1>); [Source: components/assurance/AssuranceIncidentActions.tsx:1](<E:/ohada saas/Focused projects/stoquify/components/assurance/AssuranceIncidentActions.tsx:1>).


---

# Cross-page workflows

[Guide home](README.md) · [Detailed controls](control-notes.md)

These sequences describe supported handoffs and their limits. Responsible roles below are recommendations for organizing work; actual permissions and independence rules are enforced by the application. Every command remains subject to its current record state and access.

## 1. Establish a usable organization workspace

Company profile → Roles/users → Modules review → Locations/terminals/master data → Domain readiness.

1. The owner verifies identity, region, language, timezone and accounting/inventory start dates in [Company](http://localhost:3000/en/dashboard/settings/company). Currency is fixed for this profile workflow. Save only the reviewed changes and verify the resulting revision.
2. The administrator defines narrowly appropriate roles and assigns them to verified members. Invitations currently record links/requests with disabled mail transport; do not tell colleagues an email was delivered merely because the record exists.
3. In [Modules](http://localhost:3000/en/dashboard/settings/modules), choose the working composition and inspect dependencies, grants, setup and stop consequences. Save draft is optional persistence; Review configuration is the authoritative preview; Apply configuration submits that reviewed request.
4. Compare requested and active revisions. Complete missing source setup and resume preparation when offered. A saved or requested configuration is not automatically the active workspace.
5. Configure locations, terminals, units/categories/tax rates and other needed master data. Use governed data onboarding for supported new master records. Domain specialists verify accounting or payroll readiness before operations begin.

**Completion evidence:** saved profile/access histories, active workspace revision, valid domain setup and records visible to the intended users. **Recovery:** compare stale revisions, preserve drafts and check same-request receipts before retrying. Maximum value comes from the modules actually needed, not selecting everything.

## 2. Buy, inspect and receive inventory

Supplier/item setup → Purchase order draft → Submit → Independent approval → Receive with inspection → Complete order → Movement/AP evidence.

1. Purchasing checks supplier identity/terms and item supplier links. Confirm the destination location, unit, price and quantities.
2. Create and review a [purchase order](http://localhost:3000/en/dashboard/purchase-orders/new). A saved draft is neither a sent order nor stock.
3. Submit an order with lines. A different authorized reviewer approves it. If supplier acknowledgement is needed, Issue invitation and Copy link from the order's acknowledgement page; communication happens through an authorized handoff.
4. The receiving team chooses Receive Items and records only actual positive integer quantities. Passed inspection releases stock; Failed/Incomplete requires a hold reason. A held receipt exists but cannot be treated as freely available stock or fully matchable invoice evidence.
5. Inspect Receipts, Inventory and History. Complete Order becomes available only when fully received; short-close is not available.
6. Finance checks [AP controls](http://localhost:3000/en/dashboard/purchases/payables) and history for invoice/match/payment readiness. That dashboard is read-only; it does not itself provide invoice approval/post/payment execution.

**Completion evidence:** order/receipt IDs, remaining quantities, inspection disposition, inventory movements and separate AP/ledger proof where present. **Recovery:** inspect receipts before repeating an uncertain receive; held inventory requires its authorized resolution process outside the receipt modal. A supplier proposal acceptance records a decision without applying PO changes.

## 3. Transfer stock between locations

Create Transfer → Independent Approve Transfer → Paired stock postings and COMPLETED → Review movement history.

1. Inventory staff inspect source availability and choose distinct source/destination locations.
2. Create the transfer with at least one item and positive available quantities. Requested date/notes are useful context; priority/internal notes are not reliably persisted by the reviewed action.
3. A different authorized actor opens the DRAFT and selects Approve Transfer. **This immediately moves stock and completes the transfer.** Arrange physical handling to match this accounting of stock; do not assume later ship/receive buttons exist.
4. Inspect both location quantities and [movement history](http://localhost:3000/en/dashboard/inventory/movements), including the paired transfer-out and transfer-in.

**Completion evidence:** COMPLETED transfer and paired movements. **Recovery:** reload source quantities after conflicts/insufficient stock. The UI's first-50 list and first-100 detail lookup can hide older records; a persistent spinner is not proof a transfer never existed.

## 4. Sell through the current POS and account for physical cash

Location/terminal → Open shift → Persisted cart → Cash Charge → Review sale → Count and Close shift → Drawer/history review.

1. The cashier selects an authorized location and an available configured terminal, enters the real opening float and opens the shift.
2. Add catalog items, check quantities and select the correct customer or Walk-in customer. Cart additions and quantity changes already persist.
3. Enter cash tender, inspect total/due/change and Charge. Current selectable options are Cash and No receipt. Park/Override do not provide operational workflows.
4. Confirm the returned order number, amount/change and posting evidence. Resolve an uncertain result by reading the current order/session before submitting again.
5. At close, enter the counted amount explicitly—even zero—and explain a nonzero variance. Verify the closed shift in [Cash drawer](http://localhost:3000/en/dashboard/finance/cash-drawer).
6. The manager compares the shift and [cash/payment history](http://localhost:3000/en/dashboard/finance/cash-payment-history), then completes branch daily-close review if used. Electronic/provider settlement belongs to its supported reconciliation flow, not a physical cash count.

**Completion evidence:** committed sale, shift/drawer events, explicit cash count and explained variance, with branch review as a separate record. **Recovery:** a rejected close preserves inputs; address the stated count/variance/session blocker. Network/printer indicators are not connectivity tests.

## 5. Review customer activity and prepare a statement

Customer directory/profile → Orders and receivable evidence → Immutable statement → Consent and secure delivery queue → Delivery evidence/follow-up.

1. Sales/finance staff identify the correct customer and check account/order scope and payment terms.
2. Inspect [Receivables](http://localhost:3000/en/dashboard/finance/receivables) and history for the entries explaining the balance. [Daily sales](http://localhost:3000/en/dashboard/sales) is a report, not a general order-creation/fulfillment workspace.
3. Open the customer's Statement page. Select dates, confirm read-only currency, verify identity and Generate immutable statement. Read its number/version, As of and Recorded through timestamps, balance, open-item count and any truncation warning.
4. Review destination, consent and dispute/promise options before Queue secure delivery. Inspect queued status, expiry and later delivery evidence.

**Completion evidence:** immutable statement version plus distinct delivery status. **Recovery:** correct inverted dates/invalid destination; do not equate a queue receipt with recipient delivery. This dashboard has no wired revoke/export button for the statement despite broader descriptive copy.

## 6. Reconcile payments to external evidence

Provider account/evidence → Import → Run → Match/residual review → Independent approval → Suspense resolution → Sign → Signed certificate export.

1. Finance checks selected location/date scope and current provider account, currency and source timestamps.
2. Import supported CSV/JSON or pasted evidence. Import persists source data; inspect errors and duplicates/outcomes before repeating it.
3. Run reconciliation. The current button uses **today** as its business date; dashboard filters are not a run-date selector.
4. Review candidates and residual amounts by currency. Propose a supported match only within available residual. A different authorized reviewer approves against the same current evidence revision with fresh identity.
5. Assign unresolved suspense and prepare/review reclassification through its protected process. Stale proposals require authorized replacement with current evidence and a new review.
6. Sign an eligible run. Export its signed JSON certificate with the required separate permission/fresh identity. If source evidence changes, the certificate may no longer be eligible; rerun/review.

**Completion evidence:** linked statement/provider transaction and payment, approved match/reclassification, valid signed run/certificate. **Recovery:** use access recheck/normal sign-in and preserve draft amounts during a failed read. Payment capture, matching, release and settlement are distinct states.

## 7. Prepare, post and review accounts

Ledger setup → Accounts/mappings/journals/open period → Balanced draft → Post → Ledger reports → Close assessment/review → Eligible close export and period action.

1. The accounting administrator configures the ledger and resolves [Control center](http://localhost:3000/en/dashboard/accounting/control-center) blockers. Mark ready is a setup decision.
2. An authorized preparer creates a balanced journal draft using valid manual journals/postable leaf accounts and an open-period date. Inspect source/reference evidence.
3. The authorized posting process posts the draft. Reverse a posted entry with a reason and retained trail if a correction is required; do not delete history.
4. Review [Trial balance](http://localhost:3000/en/dashboard/accounting/reports/trial-balance) and [Financial statements](http://localhost:3000/en/dashboard/accounting/reports/financial-statements). Resolve account-classification and balance issues; distinguish management EBITDA from statutory subtotals.
5. In [Close](http://localhost:3000/en/dashboard/accounting/close), run the assessment, resolve findings, assign work, record comments and use independent waiver/review controls where appropriate. Draft export documents unresolved state; certified export requires its gates.
6. Perform the actual permitted period-close operation separately where appropriate; a Ready to close review or exported file alone is not that operation.

**Completion evidence:** posted lines and source links, period reports, current close assessment/review and eligible pack/period status. **Recovery:** changed sources can invalidate old close evidence; reassess instead of relying on an earlier badge.

## 8. Prepare payroll and complete its evidence chain

People identity → Reviewed contract/compensation/time/destination → Frozen inputs → Calculate → Review → Approve → Emit → Post → Payment/declaration evidence → Register/close tie-out.

1. HR checks employee-user mapping and profile blockers. Employees submit time requests; managers review within responsibility scope. People approvals separates review from application when another operator is required.
2. Payroll checks employee, contract, compensation and attendance/payment readiness workbenches. Several are read-only; correct sources through their owning process. Confirm the period and reviewed country-pack evidence; this screen set does not provide every source-authoring workflow.
3. In Runs, open the service-offered calculation/review/approval/emission/posting drawer in order. Satisfy source proof, fresh identity and independent-actor requirements. Verify the resulting run state after each action.
4. Prepare declarations from locked run proof. Request a payment batch from emitted allocations, use independent approval and release, then record actual settlement proof on Payments.
5. Queue supported declaration adapter execution only when ready; inspect execution/authority response separately. Issued payslips appear in employee self-service according to identity scope.
6. Use Register to tie employee count, net payable, payslips, payments and ledger/close evidence together.

**Completion evidence:** frozen-source/register hashes, run state, issued payslips, posted accounting links, actual settlement and declaration-response proof. **Recovery:** do not invent absent authoring UI or evidence hashes; escalate the named source gap to its owner. Released/queued is not settled/accepted.

## 9. Handle control and compliance exceptions

Compliance/Assurance signal → Source evidence → Assigned owner → Corrective source work → Review/waiver as allowed → New state and evidence.

1. The control owner identifies a blocking/overdue incident or document queue item and reads country/workflow/scope/freshness.
2. Open its source, confirm the underlying issue and assign responsibility. Acknowledge only records that the issue was seen.
3. Complete the correction in the source system. If a permitted waiver/suppression is appropriate, record reason, evidence and expiry with independent approval where required.
4. Verify the incident timeline and refreshed evidence. For external compliance work, distinguish preparation, queueing, execution and actual authority acceptance; the dashboard is not a universal submission form.

**Completion evidence:** source correction plus current incident/document state and response evidence when applicable. **Recovery:** unresolved adapter credentials/country review are prerequisites, not failures to fix by pressing Submit repeatedly.


---

# Role playbooks: get practical value from the dashboard

[Guide home](README.md) · [Workflows](workflows.md)

These are suggested operating routines, not newly imposed product requirements. Assign actual responsibilities according to your organization and the permissions already in place. Do not enable every module solely to follow a checklist.

## Business owner

**Daily:** open Owner war room or the Operations dashboard, confirm scope/freshness and choose the largest material risk. If overdue actions increase, open their source records and agree an owner/due date through the supported work process. Use Cash command to follow uncertain cash to its payment or drawer evidence.

**Weekly:** compare equal periods in Analytics/Finance, check the metric definitions, and open the supplier/customer/item behind the largest change. If operational margin falls, separate price, current-cost estimate, purchase commitments, expenses and refunds before concluding the business became less profitable.

**Period end:** review Accounting close blockers and posted reports with the accountant. Request evidence for unresolved settlement/payroll/inventory gaps. A green operating dashboard does not substitute for posted accounts or a current close pack.

**Prerequisites and useful views:** correct currency/timezone, complete location/master data and permitted proof access. Use the location view for operational responsibility, remembering that some financial balances/refunds remain organization-wide.

**Avoid:** calling Company Gross paid payment total revenue; assuming Pro/Live menu labels prove subscription or data freshness; treating an acknowledged brief as resolved work.

## Store manager

**Daily:** open Manager action center and the current location run sheet. If variance appears, open Cash drawer Sessions and the relevant shift before asking the cashier to explain it. Check low/out-of-stock items and decide whether receiving or a transfer is the right supported workflow.

**Weekly:** inspect Inventory loss control by item/location and movement history for repeat causes. Compare daily-sales source status with shift evidence; a stored draft report differs from fallback order aggregation.

**Day/period end:** load Branch daily close for the exact location and business date, inspect unsupported/missing checks and record review/sign-off only when the evidence supports it. Hand accounting issues to finance rather than treating branch sign-off as period closure.

**Useful controls:** location/status/date filters, session sorting by Variance, evidence/source links. Check the transfer list/detail caps if an older transfer appears missing.

**Avoid:** approving a transfer while expecting a later stock-posting step; authority based on location responsibility does not automatically include HR reporting-line or financial approval powers.

## Sales and POS staff

**Daily:** verify location/terminal and opening float, select the correct customer, review stock and cash tender, then confirm the returned sale number/change after Charge. Use the currently supported Cash/No receipt flow.

**Weekly:** a supervisor can review Daily sales and item/cashier reports using matching source/date definitions. If a product's recorded value changes, inspect quantity and pricing before proposing a sales action.

**Shift end:** explicitly count cash, including zero when applicable, explain variance and verify the shift closed. Check current state before repeating a sale or close after a timeout.

**Useful controls:** barcode/SKU search, category/Favorites/Recent, grid/list, Exact cash, customer picker and session detail. Favorites are temporary component state.

**Avoid:** relying on Park sale/Override, assuming a displayed printer/network indicator is a hardware test, or telling a customer that an unavailable receipt channel delivered a message. Customer statement delivery is a separate authorized finance process.

## Inventory and purchasing team

**Daily:** use item availability/reorder signals and open orders to decide what requires receipt, ordering or relocation. If receipt quantity is lower than ordered, preserve the remaining quantity; do not mark fully received without evidence. Record Failed/Incomplete inspection with a hold reason.

**Weekly:** compare supplier lead time/cost relationships and purchase analytics. Review unlinked/no-use master data and consolidate work through deliberate edits, not casual deletions of used records. Use movement history to explain repeated losses or location differences.

**Period end:** provide evidence for held receipts, completed transfers and unresolved AP match issues. Compare physical/operational evidence with the accounting team's valuation/close requirements without assuming a metadata edit fixes stock history.

**Useful controls:** supplier/item search and filters, order status/date views, Receive All Available only after counting goods, paired transfer movement details. Supplier proposals are negotiation evidence; accepting them does not update the PO automatically.

**Avoid:** duplicating opening stock and purchase receipts, treating a PO as a paid invoice, relying on unsaved transfer priority/internal notes, or assuming a filtered first-50 transfer set covers all history.

## Finance and accounting team

**Daily:** use Receivables for collection priorities and Payables/AP controls for obligations/readiness. If unmatched payments or suspense increase, inspect current provider/statement evidence and assign specific cases. Use customer statements for a dated account view and obtain required consent before delivery.

**Weekly:** review aged items using their actual due-date calculation and current terms. Compare operational finance figures to posted ledger evidence with matching statuses/caps. Investigate the record-level reason before describing a difference as an accounting error.

**Period end:** complete eligible reconciliation, resolve/approve source exceptions, review trial balance/classification and run current close assessment. Keep preparation, review, posting, settlement and certified export separate. Retain signed/current proof rather than a stale screenshot.

**Useful controls:** reconciliation residual/currency review, source replacement for stale proposals, independent approval, signed JSON export, trial-balance account filters and statement-line drill-down. Cash/payment history Search/download is unfinished; use implemented type/date filters and authorized source evidence.

**Avoid:** treating finance collected totals as settled receipts, order purchases as cost of goods sold, operational gross profit as the ledger P&L, or a “ready to export” authorization response as an actual downloaded file.

## HR, payroll, employees and managers

**Daily:** employees submit correct time requests; managers review the scoped queue; HR resolves missing identity mapping/contract/payment evidence in the owning process. If a readiness-blocker count grows, open the employee profile and identify the exact missing source.

**Before each run:** payroll compares contract/compensation/attendance/payment readiness with the period's frozen inputs. Review and apply approved People changes through separate actors where required; proposed salary is not effective pay.

**Run/period end:** advance Calculate → Review → Approve → Emit → Post through offered drawers. Independently request/approve/release payment batches, record actual settlement proof and track declaration response. Use Register tie-out and employee payslip availability as evidence of downstream completion.

**Useful controls:** HR search/date/domain/stage filters, profile blockers, source-proof drawers, service-supplied next actions and payment/declaration queues. Read-only workbenches are for diagnosis, not a guarantee of complete source authoring in the UI.

**Avoid:** inventing hashes or reviewer IDs, interpreting Released as settled, Queued as accepted, or an approved time request as already frozen for payroll. Do not export more personal data than the authorized purpose needs.

## Administrator and control owner

**Daily:** resolve access failures by checking organization, role, module state and location responsibility. If a module request remains Preparing, open the named source prerequisite and compare requested/active revision after refresh. Do not simply reapply the same selection.

**Weekly:** review member/role/invitation and configuration history, pending/expired invitations, inactive users and incident ownership. Recorded invitations currently do not send email. Use the specific working Settings pages instead of unresolved account-menu destinations.

**Period end or onboarding:** verify company defaults, controlled import evidence, independent approvals and access mandate expiry. Use supported new master-data imports only; balances, stock opening quantities and historical accounting migration are separate work.

**Useful controls:** reviewed change comparison, same-request retry, invitation history, role risk categories, module conditions and explicit operational stops. Security Sign out other sessions can remove unwanted sessions; MFA enrolment is not implemented on the current page.

**Avoid:** granting broad permissions to resolve a single missing action, assuming theme/notification tests are organization-wide communication configuration, or suppressing an assurance incident in place of correcting its source.


---

# Limitations and verification blockers

[Guide home](README.md) · [Coverage](coverage.csv) · [Control inventory](controls.csv)

## What was and was not verified

The browser entry to the dashboard redirected to /en/login. **Zero authenticated dashboard pages were inspected and zero business controls were exercised.** All 130 route patterns were documented from source, but remain blocked for runtime verification. No authorized representative dynamic record was available. No business-data screenshots were captured, credentials sought, guard bypassed or successful walkthrough invented.

Source coverage is 108 source-only; 7 redirect; 7 partial; 7 shared implementation; 1 placeholder. These classifications concern implementation, while runtime blocking is an overlapping dimension. Source-only means code-backed explanation without a demonstrated runtime outcome; it does not certify the feature.

The control CSV contains static candidates as well as reviewed controls. Unknown translation/icon labels, conditional branches, table configuration and shared barrel exports can inflate candidates or hide runtime-specific controls. Their explicit uncertainties remain open. This package completes the independent documentation work; it does not claim full interactive acceptance testing.

## Material implementation limits

| Area | Current limitation | Practical consequence |
|---|---|---|
| Global account menu | Profile, Settings root and Billing routes have no discovered page; account labels include hardcoded User/Stoquify/Pro. | Use specific working sidebar/settings paths; do not infer commercial/access truth from the menu. |
| Legacy notification drawer | Mark it Read only produces a toast; server update is commented out. | Do not treat it as durable acknowledgement. |
| Notifications settings | Session-memory tests; only sound persists. | Not a production email/push preference center. |
| Users/invitations | Email transport disabled. | Recording or replacing an invite is not emailing a colleague. |
| Security | No finished MFA enrolment/challenge route or toggle. | The account-menu 2FA description exceeds current functionality. |
| Item others route | Placeholder sentence only. | Use actual item/supplier pages. |
| POS | Cash/No receipt only; Park/Override warnings; hardware readiness presentation values. | Do not promise alternate checkout channels, parking or connectivity validation. |
| Transfers | Approval immediately posts both legs; no staged ship/receive; priority/internal notes omitted; bounded lookup. | Follow the current posting model and check movement evidence; older detail can remain loading. |
| AP controls | Read-only with navigation only. | No complete invoice approval/post/payment operation from this dashboard. |
| Supplier acknowledgement | No send-email/inline fresh-auth form; acceptance records decision only. | Share the copied link through an authorized process; separately handle authoritative PO changes. |
| Customer statements | Generate/queue are writes; no wired dashboard revoke/export control. | Queue success is not delivery; descriptive copy does not supply missing actions. |
| Cash/payment history | Search not applied; Export prepares authorization without file; proof drawer unavailable. | Use implemented filters and source evidence; do not expect an export download here. |
| Finance summaries | Bounded datasets, mixed scopes, pending payments and operational profit formulas. | Avoid whole-company/settled/ledger claims from a card. |
| Landing inventory change | Previous inventory value equals current. | Zero displayed change is not an observed historical trend. |
| HR/payroll source pages | Several workbenches are read-only and some source-authoring steps are absent. | Resolve prerequisites through supported owner processes rather than invented buttons. |
| Payroll/Compliance | Preparation/release/queue states need external settlement/authority evidence. | No automatic certification or external acceptance from a readiness label. |
| Module composition | Requested and active revisions can differ; certain stop scopes unsupported. | Inspect preparation/grants/permissions and the precise stop policy. |

These are documentation findings, not a request for application changes. The source references are in page chapters, control notes and the evidence register. Ordinary read-only reporting is not itself a defect; the limit is what users can accomplish from that specific page.

## Runtime checks still outstanding

With authorized sign-in, check actual desktop/mobile labels, navigation, forms, validation copy, keyboard/focus behavior, accessible names, responsive layout and translations. Use approved records to inspect dynamic details. Compare rendered branches with the candidate controls and mark unavailable/dormant rows accordingly. Verify read-only filters and file outputs without submitting consequential commands unless separately authorized.

Live end-to-end transaction, permission-matrix, concurrency, provider, hardware, performance and accessibility testing was outside the completed source inspection. Tests were read for behavioral evidence, not executed. There is no claim of legal, tax, accounting, security, privacy, accessibility or production-release certification.

## Evidence freshness and unresolved questions

The source manifest records file hashes and the final verification compares them to the files present at publication. Graph reports dated 2026-08-09 provide older relationships, not current behavior. Live organizations may have different grants, locations, data volume, country-pack readiness or retained records. Exact conditional labels and every action's runtime success remain unresolved until that access is available.


---

# Accounting, reports and close assurance

[Guide home](README.md) · [Shared controls](shared-controls.md) · [Detailed control notes](control-notes.md) · [Metric dictionary](metric-dictionary.md)

Evidence: source reviewed 2026-09-06. Dashboard interaction is blocked by sign-in. Instructions below describe implementation, not a completed live walkthrough.

Accounting reports derive from posted ledger evidence. Setup readiness, a draft, approval, posting, close review and certified export are different stages. This guide explains application behavior; it makes no professional or statutory certification claim.

## Pages in this chapter

- [Accountant access](#accountant-access)
- [Accountant portal](#accountant-portal)
- [Accountant client portfolio](#accountant-client-portfolio)
- [Accounting accounts](#accounting-accounts)
- [Close and assurance](#close-and-assurance)
- [Close and assurance — selected period](#close-and-assurance--selected-period)
- [Accounting control center](#accounting-control-center)
- [New journal entry](#new-journal-entry)
- [Journal entries](#journal-entries)
- [Accounting ledger](#accounting-ledger)
- [Financial statements](#financial-statements)
- [Trial balance](#trial-balance)
- [Ledger setup](#ledger-setup)

## Accountant access

**Open:** [/en/dashboard/accounting/accountant-access](http://localhost:3000/en/dashboard/accounting/accountant-access). **Reach it:** Accountant Access. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.close.accountant.invite. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Explicit accountant mandates with role, effective dates, expiry, consent evidence and revocation.

**How to use it.**

1. Enter Accountant email, firm identity, read-only/reviewer/preparer role, effective/expiry dates and consent-evidence hash, then review before Invite or grant access.
2. Revoke only the intended mandate and confirm its new state.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Give an external accountant appropriate, time-bounded access to evidence.

**Limits and recovery.** A mandate is sensitive access and may send an invitation. A role title alone does not bypass tenant or command permissions. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accountant-access/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:36>).

## Accountant portal

**Open:** [/en/dashboard/accounting/accountant-portal](http://localhost:3000/en/dashboard/accounting/accountant-portal). **Reach it:** Accountant Portal. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.audit.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Trust level, posted entries, source coverage, blockers, posted figures, evidence modules, recent links and audit trail.

**How to use it.**

1. Refresh evidence, inspect blockers and source links, then use Export trust pack when its gate permits.
2. If figures are withheld, resolve critical data-trust blockers first.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Prepare a reviewable accounting evidence package instead of collecting disconnected screenshots.

**Limits and recovery.** Critical trust blockers can suppress financial figures. No figure is better than treating unavailable evidence as zero. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accountant-portal/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:43>).

## Accountant client portfolio

**Open:** [/en/dashboard/accounting/accountant-portfolio](http://localhost:3000/en/dashboard/accounting/accountant-portfolio). **Reach it:** Accountant Portfolio. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.audit.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Only clients with active, unexpired consent mandates, with links to their ledger evidence.

**How to use it.**

1. Choose a client you are authorized to review and Open ledger evidence.
2. If no clients appear, check mandate scope/expiry with the granting organization.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Navigate client work without mixing organizations or assuming access to every tenant.

**Limits and recovery.** An empty portfolio can reflect access/expiry rather than absence of client accounting records. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accountant-portfolio/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:50>).

## Accounting accounts

**Open:** [/en/dashboard/accounting/accounts](http://localhost:3000/en/dashboard/accounting/accounts). **Reach it:** Accounts. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.accounts.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Account code, bilingual name, SYSCOHADA class/type, normal balance, currency, mapping and manual/control-account properties; active/archived rows.

**How to use it.**

1. For Create account enter code/class/names/type, DEBIT or CREDIT normal balance and currency; review mapping and manual-post/control-account options.
2. Use leaf accounts for manual entries.
3. Archive only the intended account and verify the list afterward.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Keep posting destinations and financial-statement classifications understandable and reviewable.

**Limits and recovery.** An account code or class is not evidence that a country's statutory mapping has been professionally validated. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounts/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:57>).

## Close and assurance

**Open:** [/en/dashboard/accounting/close](http://localhost:3000/en/dashboard/accounting/close). **Reach it:** Close Center. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.close.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Period close readiness, critical blockers/findings, evidence coverage/provenance/graph, accountant review and deterministic close-pack export.

**How to use it.**

1. Choose/confirm the period and Refresh or Run assessment.
2. Inspect each finding; Assign to me, add a source-linked comment or request a justified waiver where permitted.
3. Record Ready to close or Changes requested in the accountant review.
4. Export draft JSON while unresolved; use Export certified JSON only when its independent gates pass.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Keep period-end decisions tied to explicit evidence and unresolved exceptions.

**Limits and recovery.** Assignment, comment, waiver, review and assessment are persisted workflow actions. A waiver is separately reviewed; certified export and actual period closure are separate controls. Missing domains remain unavailable evidence. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/close/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:64>).

## Close and assurance — selected period

**Open:** `/en/dashboard/accounting/close/[periodId]`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.close.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** Period close readiness, critical blockers/findings, evidence coverage/provenance/graph, accountant review and deterministic close-pack export.

**How to use it.**

1. Choose/confirm the period and Refresh or Run assessment.
2. Inspect each finding; Assign to me, add a source-linked comment or request a justified waiver where permitted.
3. Record Ready to close or Changes requested in the accountant review.
4. Export draft JSON while unresolved; use Export certified JSON only when its independent gates pass.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Keep period-end decisions tied to explicit evidence and unresolved exceptions.

**Limits and recovery.** Assignment, comment, waiver, review and assessment are persisted workflow actions. A waiver is separately reviewed; certified export and actual period closure are separate controls. Missing domains remain unavailable evidence. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/close/[periodId]/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:71>).

## Accounting control center

**Open:** [/en/dashboard/accounting/control-center](http://localhost:3000/en/dashboard/accounting/control-center). **Reach it:** Control Center. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.setup.manage. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Setup blockers, account mappings, journals, posting rules, periods, business-event outbox and sensitive-control status.

**How to use it.**

1. Refresh readiness, read each blocker and open the relevant setup/source workflow.
2. Review permission, risk and fresh-auth requirements before Lock accounting setup.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Resolve missing accounting foundations and delivery problems before relying on automated posting.

**Limits and recovery.** A lock is a protected configuration change; it does not retroactively prove every transaction posted correctly. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/control-center/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:78>).

## New journal entry

**Open:** [/en/dashboard/accounting/journals/new](http://localhost:3000/en/dashboard/accounting/journals/new). **Reach it:** New Journal Entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.journal.create AND accounting.journal.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** A manual journal form with postable account lookups, journal, date, currency, reference, memo and debit/credit lines.

**How to use it.**

1. Wait for account/journal lookups to load successfully.
2. Select an open-period date and suitable manual journal, enter balanced lines on postable leaf accounts, review reference/memo and Create draft.
3. Verify the saved draft in Journals before a separate posting action.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Capture a supported manual accounting entry with a review point before posting.

**Limits and recovery.** Lookup failure is a blocker to entry, not an empty valid account list. Stopping new manual journals can block creation while leaving historical entries visible. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/journals/new/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:92>).

## Journal entries

**Open:** [/en/dashboard/accounting/journals](http://localhost:3000/en/dashboard/accounting/journals). **Reach it:** Journals. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.journal.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Draft and posted/reversed entry lists, entry summaries and protected Post and Reverse actions.

**How to use it.**

1. Open a draft and check its journal/date/accounts and balanced debit/credit lines.
2. Post only when ready and allowed.
3. Reverse a posted entry with the required reason and control checks; verify the reversal trail rather than deleting history.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Maintain a clear distinction between prepared entries and ledger evidence.

**Limits and recovery.** Posting and reversal affect the ledger. A reversed entry remains part of the audit trail; read reports using their documented posted/reversal treatment. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:85>).

## Accounting ledger

**Open:** [/en/dashboard/accounting](http://localhost:3000/en/dashboard/accounting). **Reach it:** Overview. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.reports.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Accounting access/setup status, accounts, open periods, draft/posted-entry counts and recent journal activity.

**How to use it.**

1. Check readiness first.
2. Open Setup or Control center for blockers, Journals for drafts/posted entries, and Reports for the posted-accounting view.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Use one consistent entry point for posting discipline and ledger reporting.

**Limits and recovery.** Draft entries and operational reports are not posted financial statements. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:29>).

## Financial statements

**Open:** [/en/dashboard/accounting/reports/financial-statements](http://localhost:3000/en/dashboard/accounting/reports/financial-statements). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.reports.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Posted-ledger profit and loss, management EBITDA bridge, net income, balance sheet, account drill-down and classification-review items.

**How to use it.**

1. Choose period/view and Apply period.
2. Inspect the performance bridge and balance check; expand a statement line to its contributing accounts.
3. Review classification warnings before relying on a subtotal.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Explain performance and position with a traceable account breakdown.

**Limits and recovery.** Management EBITDA is explicitly a management measure, not a statutory subtotal. Its bridge adds income tax, finance costs, depreciation and amortization to net income; unresolved classifications require accounting review. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/reports/financial-statements/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:100>).

## Trial balance

**Open:** [/en/dashboard/accounting/reports/trial-balance](http://localhost:3000/en/dashboard/accounting/reports/trial-balance). **Reach it:** Trial Balance. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.reports.read. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Ledger-derived account debit/credit activity, balances and a balance check, with account code/name/type/normal balance rows.

**How to use it.**

1. Search or filter accounts, sort the table and change page/density as needed.
2. Compare activity debit and credit; clear table filters when checking the complete report.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Find a specific account without losing sight of the full-report balance check.

**Limits and recovery.** Top report totals remain full-report totals when the local account table is filtered. This report is based on posted/reversed journal evidence, not sales-order totals. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/reports/trial-balance/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:107>).

## Ledger setup

**Open:** [/en/dashboard/accounting/setup](http://localhost:3000/en/dashboard/accounting/setup). **Reach it:** Setup. **Evidence state:** source-only; runtime blocked.

**Audience.** Accounting administrators, accountants, reviewers and authorized owners.

**Prerequisites and access.** accounting.setup.manage. Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks. 

**What it shows.** Country pack/base currency/fiscal-year settings, default journals, fiscal years, periods and readiness state.

**How to use it.**

1. Review Country pack, Base currency and fiscal start month/day, then Save settings if authorized.
2. Create fiscal year with name/start/end dates; Ensure defaults prepares default journals.
3. Review blockers before Mark ready.
4. Close period is consequential and must follow the intended close process.

**Confirm the outcome.** Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.

**Get value from it.** Set accounting foundations before posting transactions so dates, journals and currency are consistent.

**Limits and recovery.** Mark ready is setup state, not professional certification. Creating a fiscal year generates periods; closing a period changes posting eligibility. Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/setup/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-data-access.ts:114>).



---

# Analytics, reports and daily sales

[Guide home](README.md) · [Shared controls](shared-controls.md) · [Detailed control notes](control-notes.md) · [Metric dictionary](metric-dictionary.md)

Evidence: source reviewed 2026-09-06. Dashboard interaction is blocked by sign-in. Instructions below describe implementation, not a completed live walkthrough.

These pages help explain activity. Always read source, date range, location and freshness before comparing numbers. Different report families deliberately use different source contracts; see the metric dictionary.

## Pages in this chapter

- [Business pulse](#business-pulse)
- [Referral funnel](#referral-funnel)
- [Reports](#reports)
- [Daily sales](#daily-sales)

## Business pulse

**Open:** [/en/dashboard/analytics](http://localhost:3000/en/dashboard/analytics). **Reach it:** Overview. **Evidence state:** source-only; runtime blocked.

**Audience.** Owners, managers, sales supervisors and finance analysts.

**Prerequisites and access.** reports.read OR dashboard.read. Reporting access and relevant sales/session/inventory evidence must exist. Organization timezone and currency must be valid. 

**What it shows.** Today, week and month sales signals, changes, risks, priorities and links into operational evidence. Command modes alter how the same available information is framed.

**How to use it.**

1. Read the stated period and generation time.
2. Compare the change with the current value, open the source, and decide whether it needs an operational follow-up.

**Confirm the outcome.** Confirm that the selected report/period is displayed and check its source/generated timestamp; opening or refreshing a report does not finalize transactions.

**Get value from it.** Use changes to detect a developing problem early; confirm its size using the appropriate detailed report.

**Limits and recovery.** Operational analytics is distinct from certified accounting-close evidence. Missing or redacted evidence limits the conclusion. Try the offered Retry/Refresh after a failed read; widen filters only after checking the selected dates and access. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/analytics/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/analytics/analytics-route-data-access.ts:27>).

## Referral funnel

**Open:** [/en/dashboard/analytics/referrals](http://localhost:3000/en/dashboard/analytics/referrals). **Reach it:** Referral Funnel. **Evidence state:** source-only; runtime blocked.

**Audience.** Owners, managers, sales supervisors and finance analysts.

**Prerequisites and access.** analytics.read. Reporting access and relevant sales/session/inventory evidence must exist. Organization timezone and currency must be valid. 

**What it shows.** Aggregate issued links, clicks, conversions and invite activations by source and campaign, including supported statement-delivery and accountant-invitation pathways.

**How to use it.**

1. Read the generated timestamp, compare funnel stages and inspect the source/campaign breakdown.
2. This screen is an aggregate report; there is no campaign editor or recipient list here.

**Confirm the outcome.** Confirm that the selected report/period is displayed and check its source/generated timestamp; opening or refreshing a report does not finalize transactions.

**Get value from it.** If issued links increase while activations stay flat, investigate the associated invitation or statement workflow before expanding distribution.

**Limits and recovery.** The reviewed read contract uses all-time aggregates; do not interpret these as a selected monthly campaign cohort. Recipient contacts, raw IP addresses and raw user agents are excluded from this reporting contract. Try the offered Retry/Refresh after a failed read; widen filters only after checking the selected dates and access. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/analytics/referrals/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/analytics/analytics-route-data-access.ts:42>).

## Reports

**Open:** [/en/dashboard/analytics/reports](http://localhost:3000/en/dashboard/analytics/reports). **Reach it:** Reports. **Evidence state:** source-only; runtime blocked.

**Audience.** Owners, managers, sales supervisors and finance analysts.

**Prerequisites and access.** reports.read. Reporting access and relevant sales/session/inventory evidence must exist. Organization timezone and currency must be valid. 

**What it shows.** Financial, cashier, item-performance and cash-flow report families, with provenance/freshness information where supplied. Item reporting includes revenue, quantity, profit and margin comparisons.

**How to use it.**

1. Choose Financial Summary, Cashier Performance, Item Performance or Cash Flow and inspect the selected dates.
2. Changing report/date reloads it; use Retry after failure or reload the page after upstream changes.
3. For Item Performance, search and change Revenue, Quantity, Profit or Margin sorting and use Show all products where offered.
4. Read provenance before making decisions.

**Confirm the outcome.** Confirm that the selected report/period is displayed and check its source/generated timestamp; opening or refreshing a report does not finalize transactions.

**Get value from it.** Compare like periods and scopes, then use the detailed product or cashier rows to identify which change explains the total.

**Limits and recovery.** No export/download control exists on the reviewed report screen. Location comes from URL/context, not a visible picker. Date shortcuts can include different endpoints than their informal names suggest; use the metric dictionary and inspect the actual range. Try the offered Retry/Refresh after a failed read; widen filters only after checking the selected dates and access. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/analytics/reports/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/analytics/analytics-route-data-access.ts:35>).

## Daily sales

**Open:** [/en/dashboard/sales](http://localhost:3000/en/dashboard/sales). **Reach it:** Overview. **Evidence state:** source-only; runtime blocked.

**Audience.** Owners, managers, sales supervisors and finance analysts.

**Prerequisites and access.** sales.read. Reporting access and relevant sales/session/inventory evidence must exist. Organization timezone and currency must be valid. 

**What it shows.** A reporting-day/location summary that prefers a stored daily report, including its recorded cash/tender categories and draft/finalized state. Without a stored report it shows order aggregates and top items while cash/tender facts remain unavailable.

**How to use it.**

1. Set Reporting day and the available location.
2. Use Refresh after transactions change.
3. Read the recorded categories and open POS, customer orders or finance evidence for the underlying workflow.

**Confirm the outcome.** Confirm that the selected report/period is displayed and check its source/generated timestamp; opening or refreshing a report does not finalize transactions.

**Get value from it.** Compare the recorded daily sales with shift and payment evidence before agreeing a day's operating result.

**Limits and recovery.** This route currently renders a reporting screen. It is not a general sales-order creation or fulfillment workbench. Recorded cash and payment categories do not establish bank settlement. Try the offered Retry/Refresh after a failed read; widen filters only after checking the selected dates and access. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/sales/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/sales/sales-route-data-access.ts:29>).



---

# Command pages and daily management

[Guide home](README.md) · [Shared controls](shared-controls.md) · [Detailed control notes](control-notes.md) · [Metric dictionary](metric-dictionary.md)

Evidence: source reviewed 2026-09-06. Dashboard interaction is blocked by sign-in. Instructions below describe implementation, not a completed live walkthrough.

Use these pages to select the next piece of work. They summarize evidence and link to the workspace that owns the transaction. A summary acknowledgement or an AI proposal does not complete the underlying task.

## Pages in this chapter

- [Daily digest](#daily-digest)
- [Branch daily close](#branch-daily-close)
- [Manager action center](#manager-action-center)
- [Owner war room](#owner-war-room)
- [Operations dashboard](#operations-dashboard)

## Daily digest

**Open:** [/en/dashboard/daily-digest](http://localhost:3000/en/dashboard/daily-digest). **Reach it:** Daily Digest. **Evidence state:** source-only; runtime blocked.

**Audience.** Owners and managers.

**Prerequisites and access.** dashboard.read OR finance.read OR accounting.close.read OR inventory.read OR analytics.read. The current organization, permitted location scope and upstream operational evidence determine what appears. 

**What it shows.** A dated brief of business signals, risks, priorities and evidence-linked recommendations for the current organization and accessible workspaces.

**How to use it.**

1. Read the generated time and evidence state.
2. Open the source for a priority before acting.
3. Generate brief or Retry requests a new brief; Prepare proposal opens the governed proposal flow.
4. Accept proposal, Reject proposal and feedback choices record decisions.

**Confirm the outcome.** For presentation changes, check the period/location and update timestamp. For review or proposal commands, inspect their receipt/history and then verify the business outcome at its source.

**Get value from it.** Use a brief to choose a small number of evidence-supported actions for the day, then confirm their outcomes in the source page.

**Limits and recovery.** Generating, accepting, rejecting or rating a brief can persist records. An AI explanation does not itself approve a payment, post a journal or prove that an action is complete. Missing/redacted evidence is a reason to narrow the conclusion or obtain authorized source review. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/daily-digest/daily-digest-route-data-access.ts:17>).

## Branch daily close

**Open:** [/en/dashboard/manager-action-center/daily-close](http://localhost:3000/en/dashboard/manager-action-center/daily-close). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Owners and managers.

**Prerequisites and access.** dashboard.read. The current organization, permitted location scope and upstream operational evidence determine what appears. 

**What it shows.** Evidence coverage and checks for a selected location and business date, including supported, unsupported and incomplete checks and review/sign-off state.

**How to use it.**

1. Select location and business date, then Load close evidence.
2. Inspect missing evidence in the source workspace.
3. Start review records a review; Sign daily close requires the current password and the current evidence to satisfy the command rules.

**Confirm the outcome.** For presentation changes, check the period/location and update timestamp. For review or proposal commands, inspect their receipt/history and then verify the business outcome at its source.

**Get value from it.** Keep one review record for each location/day and resolve differences while the shift evidence is still easy to obtain.

**Limits and recovery.** A branch sign-off does not close the accounting period or automatically reconcile payments. Unsupported checks stay visible and must not be counted as passed. Missing/redacted evidence is a reason to narrow the conclusion or obtain authorized source review. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/manager-action-center/daily-close/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/manager-action-center/manager-action-route-data-access.ts:34>).

## Manager action center

**Open:** [/en/dashboard/manager-action-center](http://localhost:3000/en/dashboard/manager-action-center). **Reach it:** Manager Action Center. **Evidence state:** source-only; runtime blocked.

**Audience.** Owners and managers.

**Prerequisites and access.** dashboard.read. The current organization, permitted location scope and upstream operational evidence determine what appears. 

**What it shows.** A prioritized run sheet, business signals, open/critical/due/overdue work, proof links and scope notices. The implementation selects organization or assigned-location presentations according to access.

**How to use it.**

1. Confirm which locations you are responsible for.
2. Work through Do first today, open source evidence, and route each issue to its owner.
3. Inspect evidence before any reconciliation sign-off and use the required identity confirmation.

**Confirm the outcome.** For presentation changes, check the period/location and update timestamp. For review or proposal commands, inspect their receipt/history and then verify the business outcome at its source.

**Get value from it.** Convert an increasing overdue count into a list of specific records and handoffs instead of treating the summary as the work itself.

**Limits and recovery.** Location responsibility is not HR reporting-line authority. Some proof-only actions need a proof-drawer host; a route link may be available where an embedded drawer is not. Missing/redacted evidence is a reason to narrow the conclusion or obtain authorized source review. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/manager-action-center/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/manager-action-center/manager-action-route-data-access.ts:20>).

## Owner war room

**Open:** [/en/dashboard/owner-war-room](http://localhost:3000/en/dashboard/owner-war-room). **Reach it:** Owner War Room. **Evidence state:** source-only; runtime blocked.

**Audience.** Owners and managers.

**Prerequisites and access.** dashboard.read. The current organization, permitted location scope and upstream operational evidence determine what appears. 

**What it shows.** Changes since yesterday, ranked risks, proof-linked actions, control status, module state, freshness and an acknowledgement trail. Critical, High and Redacted counts concern the returned briefing scope.

**How to use it.**

1. Check freshness and hidden/redacted notices.
2. Open a risk, inspect its source or proof, and assign the real work through the responsible module.
3. Acknowledge brief records that you reviewed the brief.

**Confirm the outcome.** For presentation changes, check the period/location and update timestamp. For review or proposal commands, inspect their receipt/history and then verify the business outcome at its source.

**Get value from it.** Compare unresolved high-impact risks across cash, stock and close evidence before prioritizing staff time.

**Limits and recovery.** Acknowledgement is a review record, not resolution. An upgrade prompt or catalogue badge is not evidence of purchased access or completed provisioning. Missing/redacted evidence is a reason to narrow the conclusion or obtain authorized source review. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/owner-war-room/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/owner-war-room/owner-war-room-route-data-access.ts:17>).

## Operations dashboard

**Open:** [/en/dashboard](http://localhost:3000/en/dashboard). **Reach it:** Dashboard. **Evidence state:** source-only; runtime blocked.

**Audience.** Owners and managers.

**Prerequisites and access.** dashboard.read. The current organization, permitted location scope and upstream operational evidence determine what appears. 

**What it shows.** Sales, orders, customers, inventory value, average order value and collected-cash summaries; sales trends, top products, stock health, location performance, alerts, recent activity and pending actions.

**How to use it.**

1. Confirm the organization, then choose period and location.
2. Read Overview first; open Inventory for stock questions or Operations for outstanding work.
3. Use Refresh to fetch again and follow the relevant quick action or source record.

**Confirm the outcome.** For presentation changes, check the period/location and update timestamp. For review or proposal commands, inspect their receipt/history and then verify the business outcome at its source.

**Get value from it.** Start the day by identifying the largest change and the oldest actionable exception, then finish that workflow in its owning module.

**Limits and recovery.** Live data is a polling/read-model label, not a promise of instantaneous updates. The hook defaults to 30 days, marks data stale after 30 seconds and polls every 60 seconds while applicable; loading, errors and browser suspension can delay it. Read the metric notes before equating a card with a statutory account. Missing/redacted evidence is a reason to narrow the conclusion or obtain authorized source review. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/actions/dashboard/getDashboardData.ts:1>).



---

# Customers and statements

[Guide home](README.md) · [Shared controls](shared-controls.md) · [Detailed control notes](control-notes.md) · [Metric dictionary](metric-dictionary.md)

Evidence: source reviewed 2026-09-06. Dashboard interaction is blocked by sign-in. Instructions below describe implementation, not a completed live walkthrough.

Use the directory for identity and account segmentation, order pages for individual transactions, and statements for a dated, immutable customer-account snapshot. Delivery is a separate controlled action.

## Pages in this chapter

- [Create customer](#create-customer)
- [Customers](#customers)
- [Edit customer](#edit-customer)
- [Customer orders](#customer-orders)
- [Customer profile](#customer-profile)
- [Customer statement](#customer-statement)

## Create customer

**Open:** [/en/dashboard/customers/new](http://localhost:3000/en/dashboard/customers/new). **Reach it:** New Customer. **Evidence state:** source-only; runtime blocked.

**Audience.** Sales, customer-service and finance staff.

**Prerequisites and access.** customers.read AND customers.create. The customer must belong to the active organization. Creating/editing, exporting and delivering statements require their own permissions and, where requested, fresh identity. 

**What it shows.** Customer name/code, email/phone, address, tax identity, payment terms, credit limit, preferred language, active state and notes.

**How to use it.**

1. Complete required identity fields, validate contact details and review terms/credit limit before saving.
2. Check the saved profile and active status afterward.

**Confirm the outcome.** Verify the saved customer or statement number/version. A delivery queue receipt proves a queued request; inspect later delivery evidence before claiming the recipient received it.

**Get value from it.** Accurate terms and contacts improve statements, follow-up and credit decisions.

**Limits and recovery.** Inactive preserves history while restricting future use. Contact fields alone do not authorize sending messages or sharing financial records. Resolve invalid contact/date inputs and refresh the current record after conflicts. Check history before repeating a potentially completed write. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/customers/new/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/customers/customers-route-data-access.ts:41>).

## Customers

**Open:** [/en/dashboard/customers](http://localhost:3000/en/dashboard/customers). **Reach it:** Customers. **Evidence state:** source-only; runtime blocked.

**Audience.** Sales, customer-service and finance staff.

**Prerequisites and access.** customers.read. The customer must belong to the active organization. Creating/editing, exporting and delivering statements require their own permissions and, where requested, fresh identity. 

**What it shows.** Customer identity, activity, order/debt indicators, language and directory summaries with row actions.

**How to use it.**

1. Search and use active/inactive, open-order, unpaid, over-limit or order-history filters.
2. Create a customer or open View analytics, Edit, Create statement or Archive from the chosen row.
3. Export only the scope and fields you intend to share.

**Confirm the outcome.** Verify the saved customer or statement number/version. A delivery queue receipt proves a queued request; inspect later delivery evidence before claiming the recipient received it.

**Get value from it.** Turn the unpaid/over-limit segments into a focused collection queue and keep inactive customers out of new operations.

**Limits and recovery.** Directory balance/order indicators are operational and may differ in scope from a dated statement or the posted ledger. Resolve invalid contact/date inputs and refresh the current record after conflicts. Check history before repeating a potentially completed write. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/customers/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/customers/customers-route-data-access.ts:29>).

## Edit customer

**Open:** `/en/dashboard/customers/[id]/edit`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Sales, customer-service and finance staff.

**Prerequisites and access.** customers.read AND customers.update. The customer must belong to the active organization. Creating/editing, exporting and delivering statements require their own permissions and, where requested, fresh identity. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** Customer name/code, email/phone, address, tax identity, payment terms, credit limit, preferred language, active state and notes.

**How to use it.**

1. Complete required identity fields, validate contact details and review terms/credit limit before saving.
2. Check the saved profile and active status afterward.

**Confirm the outcome.** Verify the saved customer or statement number/version. A delivery queue receipt proves a queued request; inspect later delivery evidence before claiming the recipient received it.

**Get value from it.** Accurate terms and contacts improve statements, follow-up and credit decisions.

**Limits and recovery.** Inactive preserves history while restricting future use. Contact fields alone do not authorize sending messages or sharing financial records. Resolve invalid contact/date inputs and refresh the current record after conflicts. Check history before repeating a potentially completed write. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/customers/[id]/edit/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/customers/customers-route-data-access.ts:65>).

## Customer orders

**Open:** `/en/dashboard/customers/[id]/orders`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Sales, customer-service and finance staff.

**Prerequisites and access.** customers.read AND customers.orders.read. The customer must belong to the active organization. Creating/editing, exporting and delivering statements require their own permissions and, where requested, fresh identity. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** Sales orders associated with the selected customer and customer quick actions.

**How to use it.**

1. Use available table presentation controls to find an order.
2. Open its available details and compare status/payment information; return to View profile or Create statement for the account view.

**Confirm the outcome.** Verify the saved customer or statement number/version. A delivery queue receipt proves a queued request; inspect later delivery evidence before claiming the recipient received it.

**Get value from it.** Separate individual order issues from the customer's total exposure.

**Limits and recovery.** The current /sales destination is a daily-sales report, so an Open sales link should not be described as a complete order editor. Resolve invalid contact/date inputs and refresh the current record after conflicts. Check history before repeating a potentially completed write. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/customers/[id]/orders/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/customers/customers-route-data-access.ts:77>).

## Customer profile

**Open:** `/en/dashboard/customers/[id]`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Sales, customer-service and finance staff.

**Prerequisites and access.** customers.read AND customers.analytics.read. The customer must belong to the active organization. Creating/editing, exporting and delivering statements require their own permissions and, where requested, fresh identity. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** A single customer's identity, commercial activity and order/payment-related summaries with quick actions.

**How to use it.**

1. Verify the customer identity, then choose View orders, Create statement, Edit or Open sales.
2. Send email and Call hand off to the configured communication application where present; Export summary produces the available profile summary.

**Confirm the outcome.** Verify the saved customer or statement number/version. A delivery queue receipt proves a queued request; inspect later delivery evidence before claiming the recipient received it.

**Get value from it.** Understand the relationship before changing terms or chasing a balance.

**Limits and recovery.** This is record-specific information. A profile summary is not necessarily a full date-bounded account statement. Resolve invalid contact/date inputs and refresh the current record after conflicts. Check history before repeating a potentially completed write. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/customers/[id]/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/customers/customers-route-data-access.ts:53>).

## Customer statement

**Open:** `/en/dashboard/customers/[id]/statement`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** partial; runtime blocked.

**Audience.** Sales, customer-service and finance staff.

**Prerequisites and access.** customers.read AND accounting.exports.create. The customer must belong to the active organization. Creating/editing, exporting and delivering statements require their own permissions and, where requested, fresh identity. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** A period-based immutable statement summary and governed delivery controls. There is no statement-entry table on this form.

**How to use it.**

1. Select dates, confirm the read-only organization currency, provide the current password and Generate immutable statement.
2. Inspect statement number/version, closing balance, open-item count, timestamps, hash and any truncation warning.
3. For Queue secure delivery, review channel/destination, consent, dispute/promise options and password confirmation, then inspect returned queue evidence.

**Confirm the outcome.** Verify the saved customer or statement number/version. A delivery queue receipt proves a queued request; inspect later delivery evidence before claiming the recipient received it.

**Get value from it.** Share a consistent statement snapshot and tie collection follow-up to specific supporting entries.

**Limits and recovery.** Both commands require accounting export authority and fresh identity. Generating the snapshot and queuing delivery are separate writes. A queued delivery is not confirmed recipient delivery. Despite descriptive revocation wording, no revoke control is wired on this dashboard form. Resolve invalid contact/date inputs and refresh the current record after conflicts. Check history before repeating a potentially completed write. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/customers/[id]/statement/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/customers/customers-route-data-access.ts:89>).



---

# Finance, cash evidence and reconciliation

[Guide home](README.md) · [Shared controls](shared-controls.md) · [Detailed control notes](control-notes.md) · [Metric dictionary](metric-dictionary.md)

Evidence: source reviewed 2026-09-06. Dashboard interaction is blocked by sign-in. Instructions below describe implementation, not a completed live walkthrough.

Use finance views to locate exceptions and compare operating activity. Several totals are capped, mix time scopes or use unusual operational formulas. Reconciliation is the evidence bridge to provider/statement settlement; accounting reports are the posted-ledger view.

## Pages in this chapter

- [Finance analytics](#finance-analytics)
- [Cash command](#cash-command)
- [Cash flow](#cash-flow)
- [Cash and payment history](#cash-and-payment-history)
- [Costs](#costs)
- [Finance overview](#finance-overview)
- [Payables](#payables)
- [Payments](#payments)
- [Profit and loss overview](#profit-and-loss-overview)
- [Profitability](#profitability)
- [Receivables history](#receivables-history)
- [Receivables](#receivables)
- [Payment reconciliation](#payment-reconciliation)
- [Retail finance](#retail-finance)
- [Sales finance](#sales-finance)
- [Stock-to-cash flow](#stock-to-cash-flow)
- [/en/dashboard/finance/tax-rates/create](#shared-entry-financetax-ratescreate)

## Finance analytics

**Open:** [/en/dashboard/finance/analytics](http://localhost:3000/en/dashboard/finance/analytics). **Reach it:** Analytics. **Evidence state:** source-only; runtime blocked.

**Audience.** Finance staff, owners, cash managers and reconciliation reviewers.

**Prerequisites and access.** finance.analytics.read OR finance.read. Appropriate finance/reconciliation permissions, organization and location context, supported payment/provider evidence and independent reviewer/fresh identity for protected commands. 

**What it shows.** A selected view of the shared Finance command center: operating revenue/purchasing/expense/payment signals and related charts/tables. The route determines the initial view.

**How to use it.**

1. Set location and Today, Yesterday, 7 days, 30 days, month/quarter/year-to-date or Custom period as available.
2. Read period and currency, then Refresh.
3. Open the relevant payments, receivables, payables or source record to explain a change.

**Confirm the outcome.** For reads, confirm filters, currency and freshness. For reconciliation, inspect the persisted run/match/suspense state; signed certificate export requires current valid evidence and its own authority.

**Get value from it.** Compare operating performance on a consistent scope, and use source records or posted-accounting reports to confirm a financial conclusion.

**Limits and recovery.** These are capped operational read models with mixed period/current-balance scopes. The displayed profit calculation subtracts purchases, expenses and refunds from revenue; it is not conventional ledger gross profit. Finance collected payments can include PENDING records. See the metric dictionary. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/analytics/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts:32>).

## Cash command

**Open:** [/en/dashboard/finance/cash-command](http://localhost:3000/en/dashboard/finance/cash-command). **Reach it:** Cash Command. **Evidence state:** source-only; runtime blocked.

**Audience.** Finance staff, owners, cash managers and reconciliation reviewers.

**Prerequisites and access.** finance.read OR dashboard.read. Appropriate finance/reconciliation permissions, organization and location context, supported payment/provider evidence and independent reviewer/fresh identity for protected commands. 

**What it shows.** A cash-trust overview combining payment/reconciliation/suspense/drawer/close signals, changes since yesterday, risks and prioritized evidence-linked actions.

**How to use it.**

1. Read freshness and scope.
2. Open proof on a supported record or navigate to the source workspace.
3. Change command mode only to change presentation; verify actions at the source.

**Confirm the outcome.** For reads, confirm filters, currency and freshness. For reconciliation, inspect the persisted run/match/suspense state; signed certificate export requires current valid evidence and its own authority.

**Get value from it.** Follow the most material cash uncertainty through to its evidence instead of relying on a single total.

**Limits and recovery.** Proof visibility is role-filtered. An unavailable proof drawer or source does not establish that the underlying financial record is absent. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts:163>).

## Cash flow

**Open:** [/en/dashboard/finance/cash-flow](http://localhost:3000/en/dashboard/finance/cash-flow). **Reach it:** Cash Flow. **Evidence state:** source-only; runtime blocked.

**Audience.** Finance staff, owners, cash managers and reconciliation reviewers.

**Prerequisites and access.** finance.cash-flow.read OR finance.read OR finance.analytics.read. Appropriate finance/reconciliation permissions, organization and location context, supported payment/provider evidence and independent reviewer/fresh identity for protected commands. 

**What it shows.** A selected view of the shared Finance command center: operating revenue/purchasing/expense/payment signals and related charts/tables. The route determines the initial view.

**How to use it.**

1. Set location and Today, Yesterday, 7 days, 30 days, month/quarter/year-to-date or Custom period as available.
2. Read period and currency, then Refresh.
3. Open the relevant payments, receivables, payables or source record to explain a change.

**Confirm the outcome.** For reads, confirm filters, currency and freshness. For reconciliation, inspect the persisted run/match/suspense state; signed certificate export requires current valid evidence and its own authority.

**Get value from it.** Compare operating performance on a consistent scope, and use source records or posted-accounting reports to confirm a financial conclusion.

**Limits and recovery.** These are capped operational read models with mixed period/current-balance scopes. The displayed profit calculation subtracts purchases, expenses and refunds from revenue; it is not conventional ledger gross profit. Finance collected payments can include PENDING records. See the metric dictionary. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/cash-flow/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts:67>).

## Cash and payment history

**Open:** [/en/dashboard/finance/cash-payment-history](http://localhost:3000/en/dashboard/finance/cash-payment-history). **Reach it:** Cash Payment History. **Evidence state:** partial; runtime blocked.

**Audience.** Finance staff, owners, cash managers and reconciliation reviewers.

**Prerequisites and access.** finance.cash-drawer.read OR finance.read OR payments.reconciliation.read OR finance.payments.read OR pos.read OR OPERATE_POS. Appropriate finance/reconciliation permissions, organization and location context, supported payment/provider evidence and independent reviewer/fresh identity for protected commands. 

**What it shows.** Cash/payment events with timeline/source context, record details and evidence status.

**How to use it.**

1. Use the type/lane, method/status and date filters; choose page size and open row details.
2. Inspect generation, recorded-through and effective-as-of times and return to the source workspace for permitted corrections.

**Confirm the outcome.** For reads, confirm filters, currency and freshness. For reconciliation, inspect the persisted run/match/suspense state; signed certificate export requires current valid evidence and its own authority.

**Get value from it.** Explain when cash/payment evidence changed and which transaction produced it.

**Limits and recovery.** The visible Search input is not applied by this source path. Export prepares authorization and a ready state but does not generate/download a CSV. The drawer explicitly marks proof unavailable. Use type/date filters and source evidence; do not expect those unfinished controls to complete the task. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/cash-payment-history/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts:81>).

## Costs

**Open:** [/en/dashboard/finance/costs](http://localhost:3000/en/dashboard/finance/costs). **Reach it:** Cost Analysis. **Evidence state:** source-only; runtime blocked.

**Audience.** Finance staff, owners, cash managers and reconciliation reviewers.

**Prerequisites and access.** finance.costs.read OR finance.read OR finance.analytics.read. Appropriate finance/reconciliation permissions, organization and location context, supported payment/provider evidence and independent reviewer/fresh identity for protected commands. 

**What it shows.** A selected view of the shared Finance command center: operating revenue/purchasing/expense/payment signals and related charts/tables. The route determines the initial view.

**How to use it.**

1. Set location and Today, Yesterday, 7 days, 30 days, month/quarter/year-to-date or Custom period as available.
2. Read period and currency, then Refresh.
3. Open the relevant payments, receivables, payables or source record to explain a change.

**Confirm the outcome.** For reads, confirm filters, currency and freshness. For reconciliation, inspect the persisted run/match/suspense state; signed certificate export requires current valid evidence and its own authority.

**Get value from it.** Compare operating performance on a consistent scope, and use source records or posted-accounting reports to confirm a financial conclusion.

**Limits and recovery.** These are capped operational read models with mixed period/current-balance scopes. The displayed profit calculation subtracts purchases, expenses and refunds from revenue; it is not conventional ledger gross profit. Finance collected payments can include PENDING records. See the metric dictionary. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/costs/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts:128>).

## Finance overview

**Open:** [/en/dashboard/finance](http://localhost:3000/en/dashboard/finance). **Reach it:** Overview. **Evidence state:** source-only; runtime blocked.

**Audience.** Finance staff, owners, cash managers and reconciliation reviewers.

**Prerequisites and access.** finance.dashboard.read OR finance.read. Appropriate finance/reconciliation permissions, organization and location context, supported payment/provider evidence and independent reviewer/fresh identity for protected commands. 

**What it shows.** A selected view of the shared Finance command center: operating revenue/purchasing/expense/payment signals and related charts/tables. The route determines the initial view.

**How to use it.**

1. Set location and Today, Yesterday, 7 days, 30 days, month/quarter/year-to-date or Custom period as available.
2. Read period and currency, then Refresh.
3. Open the relevant payments, receivables, payables or source record to explain a change.

**Confirm the outcome.** For reads, confirm filters, currency and freshness. For reconciliation, inspect the persisted run/match/suspense state; signed certificate export requires current valid evidence and its own authority.

**Get value from it.** Compare operating performance on a consistent scope, and use source records or posted-accounting reports to confirm a financial conclusion.

**Limits and recovery.** These are capped operational read models with mixed period/current-balance scopes. The displayed profit calculation subtracts purchases, expenses and refunds from revenue; it is not conventional ledger gross profit. Finance collected payments can include PENDING records. See the metric dictionary. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts:25>).

## Payables

**Open:** [/en/dashboard/finance/payables](http://localhost:3000/en/dashboard/finance/payables). **Reach it:** Payables. **Evidence state:** source-only; runtime blocked.

**Audience.** Finance staff, owners, cash managers and reconciliation reviewers.

**Prerequisites and access.** finance.payables.read OR finance.read OR purchasing.ap.invoice.view. Appropriate finance/reconciliation permissions, organization and location context, supported payment/provider evidence and independent reviewer/fresh identity for protected commands. 

**What it shows.** Supplier payable balances and supporting commercial rows in a specialized finance surface.

**How to use it.**

1. Find the supplier and inspect its outstanding evidence; use the AP workbench and AP history links for matching/readiness information.

**Confirm the outcome.** For reads, confirm filters, currency and freshness. For reconciliation, inspect the persisted run/match/suspense state; signed certificate export requires current valid evidence and its own authority.

**Get value from it.** Identify the largest supplier obligations and avoid confusing an order commitment with an approved invoice.

**Limits and recovery.** This balance view is separate from the read-only AP control workbench. It does not prove a complete invoice-to-payment command UI exists. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/payables/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts:53>).

## Payments

**Open:** [/en/dashboard/finance/payments](http://localhost:3000/en/dashboard/finance/payments). **Reach it:** Payments. **Evidence state:** source-only; runtime blocked.

**Audience.** Finance staff, owners, cash managers and reconciliation reviewers.

**Prerequisites and access.** finance.payments.read OR finance.read OR payments.provider-account.read. Appropriate finance/reconciliation permissions, organization and location context, supported payment/provider evidence and independent reviewer/fresh identity for protected commands. 

**What it shows.** A specialized payment ledger surface with payment status/method/date/search filters, sorting, density, pagination and links to operational evidence.

**How to use it.**

1. Choose the period and available filters; distinguish PENDING, PAID and CANCELLED records.
2. Open the relevant receipt/order/history or reconciliation link and check the source evidence.

**Confirm the outcome.** For reads, confirm filters, currency and freshness. For reconciliation, inspect the persisted run/match/suspense state; signed certificate export requires current valid evidence and its own authority.

**Get value from it.** Separate outstanding payment records from evidence that money actually settled.

**Limits and recovery.** A saved payment status alone does not establish a matched bank/provider transaction. Check whether totals cover the filtered/current page or another server summary. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/payments/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts:60>).

## Profit and loss overview

**Open:** [/en/dashboard/finance/profit-loss](http://localhost:3000/en/dashboard/finance/profit-loss). **Reach it:** Profit & Loss. **Evidence state:** source-only; runtime blocked.

**Audience.** Finance staff, owners, cash managers and reconciliation reviewers.

**Prerequisites and access.** finance.profitability.read OR finance.read OR finance.analytics.read. Appropriate finance/reconciliation permissions, organization and location context, supported payment/provider evidence and independent reviewer/fresh identity for protected commands. 

**What it shows.** A selected view of the shared Finance command center: operating revenue/purchasing/expense/payment signals and related charts/tables. The route determines the initial view.

**How to use it.**

1. Set location and Today, Yesterday, 7 days, 30 days, month/quarter/year-to-date or Custom period as available.
2. Read period and currency, then Refresh.
3. Open the relevant payments, receivables, payables or source record to explain a change.

**Confirm the outcome.** For reads, confirm filters, currency and freshness. For reconciliation, inspect the persisted run/match/suspense state; signed certificate export requires current valid evidence and its own authority.

**Get value from it.** Compare operating performance on a consistent scope, and use source records or posted-accounting reports to confirm a financial conclusion.

**Limits and recovery.** These are capped operational read models with mixed period/current-balance scopes. The displayed profit calculation subtracts purchases, expenses and refunds from revenue; it is not conventional ledger gross profit. Finance collected payments can include PENDING records. See the metric dictionary. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/profit-loss/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts:156>).

## Profitability

**Open:** [/en/dashboard/finance/profitability](http://localhost:3000/en/dashboard/finance/profitability). **Reach it:** Profitability. **Evidence state:** source-only; runtime blocked.

**Audience.** Finance staff, owners, cash managers and reconciliation reviewers.

**Prerequisites and access.** finance.profitability.read OR finance.read OR finance.analytics.read. Appropriate finance/reconciliation permissions, organization and location context, supported payment/provider evidence and independent reviewer/fresh identity for protected commands. 

**What it shows.** A selected view of the shared Finance command center: operating revenue/purchasing/expense/payment signals and related charts/tables. The route determines the initial view.

**How to use it.**

1. Set location and Today, Yesterday, 7 days, 30 days, month/quarter/year-to-date or Custom period as available.
2. Read period and currency, then Refresh.
3. Open the relevant payments, receivables, payables or source record to explain a change.

**Confirm the outcome.** For reads, confirm filters, currency and freshness. For reconciliation, inspect the persisted run/match/suspense state; signed certificate export requires current valid evidence and its own authority.

**Get value from it.** Compare operating performance on a consistent scope, and use source records or posted-accounting reports to confirm a financial conclusion.

**Limits and recovery.** These are capped operational read models with mixed period/current-balance scopes. The displayed profit calculation subtracts purchases, expenses and refunds from revenue; it is not conventional ledger gross profit. Finance collected payments can include PENDING records. See the metric dictionary. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/profitability/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts:149>).

## Receivables history

**Open:** [/en/dashboard/finance/receivables/history](http://localhost:3000/en/dashboard/finance/receivables/history). **Reach it:** Customer AR History. **Evidence state:** source-only; runtime blocked.

**Audience.** Finance staff, owners, cash managers and reconciliation reviewers.

**Prerequisites and access.** finance.receivables.read OR finance.read. Appropriate finance/reconciliation permissions, organization and location context, supported payment/provider evidence and independent reviewer/fresh identity for protected commands. 

**What it shows.** Customer open-item and receivable evidence in a history workbench.

**How to use it.**

1. Find the customer/reference and period, then inspect the selected event, amount, status and source link.
2. Return to the customer/receivables workspace for next steps.

**Confirm the outcome.** For reads, confirm filters, currency and freshness. For reconciliation, inspect the persisted run/match/suspense state; signed certificate export requires current valid evidence and its own authority.

**Get value from it.** Resolve statement questions with specific dated evidence.

**Limits and recovery.** Historical events, outstanding items and current balance are different views and may not share the same totals. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/receivables/history/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts:46>).

## Receivables

**Open:** [/en/dashboard/finance/receivables](http://localhost:3000/en/dashboard/finance/receivables). **Reach it:** Receivables. **Evidence state:** source-only; runtime blocked.

**Audience.** Finance staff, owners, cash managers and reconciliation reviewers.

**Prerequisites and access.** finance.receivables.read OR finance.read. Appropriate finance/reconciliation permissions, organization and location context, supported payment/provider evidence and independent reviewer/fresh identity for protected commands. 

**What it shows.** Customer open-balance and collection-related rows in a specialized ledger view.

**How to use it.**

1. Search and filter the customer/work items, inspect status/age and open history or the customer statement for dated evidence.

**Confirm the outcome.** For reads, confirm filters, currency and freshness. For reconciliation, inspect the persisted run/match/suspense state; signed certificate export requires current valid evidence and its own authority.

**Get value from it.** Prioritize collection by amount, age and supporting documents.

**Limits and recovery.** Current customer balance can differ from a historical statement; finance overview customer summaries also have an active/top-record cap. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/receivables/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts:39>).

## Payment reconciliation

**Open:** [/en/dashboard/finance/reconciliation](http://localhost:3000/en/dashboard/finance/reconciliation). **Reach it:** Reconciliation. **Evidence state:** source-only; runtime blocked.

**Audience.** Finance staff, owners, cash managers and reconciliation reviewers.

**Prerequisites and access.** payments.reconciliation.read. Appropriate finance/reconciliation permissions, organization and location context, supported payment/provider evidence and independent reviewer/fresh identity for protected commands. 

**What it shows.** Statement/provider entries, payment matches, differences and suspense, with location/date controls, run/sign/export and governed matching commands.

**How to use it.**

1. Set location and dates and Refresh.
2. Prepare a supported CSV with amount and date plus any available reference, direction, fee and currency; inspect import errors.
3. Run the offered reconciliation, review proposed matches and suspense, and use the independent approval/identity flow only after checking current evidence.
4. Sign and Export only when the relevant gates permit.

**Confirm the outcome.** For reads, confirm filters, currency and freshness. For reconciliation, inspect the persisted run/match/suspense state; signed certificate export requires current valid evidence and its own authority.

**Get value from it.** Turn unmatched money into assigned, evidenced work and preserve the link between operational payments and external settlement.

**Limits and recovery.** Import, Run, Sign, Assign, Propose match and Approve match can write records. Replacing stale evidence requires a fresh review; a manual reference cannot establish provider payment authority. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/reconciliation/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts:113>).

## Retail finance

**Open:** [/en/dashboard/finance/retail](http://localhost:3000/en/dashboard/finance/retail). **Reach it:** Retail Dashboard. **Evidence state:** source-only; runtime blocked.

**Audience.** Finance staff, owners, cash managers and reconciliation reviewers.

**Prerequisites and access.** finance.dashboard.read OR finance.read. Appropriate finance/reconciliation permissions, organization and location context, supported payment/provider evidence and independent reviewer/fresh identity for protected commands. 

**What it shows.** A selected view of the shared Finance command center: operating revenue/purchasing/expense/payment signals and related charts/tables. The route determines the initial view.

**How to use it.**

1. Set location and Today, Yesterday, 7 days, 30 days, month/quarter/year-to-date or Custom period as available.
2. Read period and currency, then Refresh.
3. Open the relevant payments, receivables, payables or source record to explain a change.

**Confirm the outcome.** For reads, confirm filters, currency and freshness. For reconciliation, inspect the persisted run/match/suspense state; signed certificate export requires current valid evidence and its own authority.

**Get value from it.** Compare operating performance on a consistent scope, and use source records or posted-accounting reports to confirm a financial conclusion.

**Limits and recovery.** These are capped operational read models with mixed period/current-balance scopes. The displayed profit calculation subtracts purchases, expenses and refunds from revenue; it is not conventional ledger gross profit. Finance collected payments can include PENDING records. See the metric dictionary. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/retail/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts:142>).

## Sales finance

**Open:** [/en/dashboard/finance/sales](http://localhost:3000/en/dashboard/finance/sales). **Reach it:** Sales Analytics. **Evidence state:** source-only; runtime blocked.

**Audience.** Finance staff, owners, cash managers and reconciliation reviewers.

**Prerequisites and access.** sales.analytics.read OR finance.read. Appropriate finance/reconciliation permissions, organization and location context, supported payment/provider evidence and independent reviewer/fresh identity for protected commands. 

**What it shows.** A selected view of the shared Finance command center: operating revenue/purchasing/expense/payment signals and related charts/tables. The route determines the initial view.

**How to use it.**

1. Set location and Today, Yesterday, 7 days, 30 days, month/quarter/year-to-date or Custom period as available.
2. Read period and currency, then Refresh.
3. Open the relevant payments, receivables, payables or source record to explain a change.

**Confirm the outcome.** For reads, confirm filters, currency and freshness. For reconciliation, inspect the persisted run/match/suspense state; signed certificate export requires current valid evidence and its own authority.

**Get value from it.** Compare operating performance on a consistent scope, and use source records or posted-accounting reports to confirm a financial conclusion.

**Limits and recovery.** These are capped operational read models with mixed period/current-balance scopes. The displayed profit calculation subtracts purchases, expenses and refunds from revenue; it is not conventional ledger gross profit. Finance collected payments can include PENDING records. See the metric dictionary. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/sales/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts:135>).

## Stock-to-cash flow

**Open:** [/en/dashboard/finance/stock-to-cash](http://localhost:3000/en/dashboard/finance/stock-to-cash). **Reach it:** Stock-to-Cash. **Evidence state:** source-only; runtime blocked.

**Audience.** Finance staff, owners, cash managers and reconciliation reviewers.

**Prerequisites and access.** finance.read OR dashboard.read OR inventory.read. Appropriate finance/reconciliation permissions, organization and location context, supported payment/provider evidence and independent reviewer/fresh identity for protected commands. 

**What it shows.** A chain from purchasing and stock through sales, cash, reconciliation, ledger and close, showing available risks and proof.

**How to use it.**

1. Inspect each stage and follow a flagged source.
2. Use Open proof where supported; purchasing/stock stages may offer route navigation instead.

**Confirm the outcome.** For reads, confirm filters, currency and freshness. For reconciliation, inspect the persisted run/match/suspense state; signed certificate export requires current valid evidence and its own authority.

**Get value from it.** Locate the handoff where evidence stopped progressing—for example goods received but invoice/ledger proof still missing.

**Limits and recovery.** Stock and purchase-order steps remain route-only for some proof interactions. A chain visualization is not proof that every producer is fully integrated. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/stock-to-cash/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts:170>).

## Shared entry: /finance/tax-rates/create

**Open:** [/en/dashboard/finance/tax-rates/create](http://localhost:3000/en/dashboard/finance/tax-rates/create). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** shared implementation; runtime blocked.

This route renders a shared implementation rather than a separate business process. Use [/en/dashboard/settings/tax-rates/create](http://localhost:3000/en/dashboard/settings/tax-rates/create) and [the canonical guide](modules/settings.md#create-tax-rate). 

**Access:** taxes.create. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/finance/tax-rates/create/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/tax-rates/create/page.tsx:1>).



---

# Compliance and assurance

[Guide home](README.md) · [Shared controls](shared-controls.md) · [Detailed control notes](control-notes.md) · [Metric dictionary](metric-dictionary.md)

Evidence: source reviewed 2026-09-06. Dashboard interaction is blocked by sign-in. Instructions below describe implementation, not a completed live walkthrough.

These workspaces show evidence, exceptions and governed review decisions. Adapter status, acknowledgement, suppression, waiver and authority acceptance have different meanings.

## Pages in this chapter

- [Assurance incident detail](#assurance-incident-detail)
- [Assurance control tower](#assurance-control-tower)
- [Compliance center](#compliance-center)

## Assurance incident detail

**Open:** `/en/dashboard/assurance/control-tower/incidents/[incidentId]`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Compliance operators, control owners, independent reviewers and authorized managers.

**Prerequisites and access.** controls.audit.read. Country/module/incident scope, permitted evidence access and action-specific authority. Submission readiness depends on actual adapter credentials, reviewed capability and source evidence. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** One incident's source, severity, status, ownership, timeline, waivers and redacted evidence.

**How to use it.**

1. Inspect the source and timeline, choose the applicable action, supply owner/role/due date, reason/note/evidence or suppression/expiry dates as required, then Apply action.
2. Verify the new timeline entry and status.

**Confirm the outcome.** Inspect the resulting incident timeline or the documented preparation/execution/response state. Only an actual authority/provider response can establish external acceptance.

**Get value from it.** Maintain an accountable history of how an exception was handled.

**Limits and recovery.** A user who can see a summary may not be allowed to see all proof or approve a waiver. Use Retry for failed reads and follow the indicated blocker to its source. Acknowledging or suppressing an incident does not fix its underlying transaction. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/assurance/control-tower/incidents/[incidentId]/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/assurance/assurance-route-data-access.ts:34>).

## Assurance control tower

**Open:** [/en/dashboard/assurance/control-tower](http://localhost:3000/en/dashboard/assurance/control-tower). **Reach it:** Assurance Control Tower. **Evidence state:** source-only; runtime blocked.

**Audience.** Compliance operators, control owners, independent reviewers and authorized managers.

**Prerequisites and access.** controls.audit.read. Country/module/incident scope, permitted evidence access and action-specific authority. Submission readiness depends on actual adapter credentials, reviewed capability and source evidence. 

**What it shows.** Open/blocking/overdue/hidden incidents, severity/workflow queues, engine runs, pending alerts and failures.

**How to use it.**

1. Open an incident's Detail or Source.
2. Acknowledge records review; use Assign, Resolve, Suppress, Request waiver, Approve waiver or Reopen only when the action is allowed and its required reason/evidence is ready.

**Confirm the outcome.** Inspect the resulting incident timeline or the documented preparation/execution/response state. Only an actual authority/provider response can establish external acceptance.

**Get value from it.** Assign control failures to named owners and distinguish silence/acknowledgement from actual resolution.

**Limits and recovery.** Suppression and waiver are controlled state changes, not correction of the underlying financial or operational record. Use Retry for failed reads and follow the indicated blocker to its source. Acknowledging or suppressing an incident does not fix its underlying transaction. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/assurance/control-tower/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/assurance/assurance-route-data-access.ts:27>).

## Compliance center

**Open:** [/en/dashboard/compliance](http://localhost:3000/en/dashboard/compliance). **Reach it:** Compliance. **Evidence state:** source-only; runtime blocked.

**Audience.** Compliance operators, control owners, independent reviewers and authorized managers.

**Prerequisites and access.** compliance.documents.read. Country/module/incident scope, permitted evidence access and action-specific authority. Submission readiness depends on actual adapter credentials, reviewed capability and source evidence. 

**What it shows.** Country/status views of fiscal documents, certification state, open submissions, exceptions, active adapters and source/credential/review readiness.

**How to use it.**

1. Filter All countries/status, search the relevant document/submission queue and Refresh or Retry.
2. Inspect the required country-pack/capability/credential/specification/reviewer evidence before assuming an adapter can submit.

**Confirm the outcome.** Inspect the resulting incident timeline or the documented preparation/execution/response state. Only an actual authority/provider response can establish external acceptance.

**Get value from it.** Identify why a document is still waiting and send that precise gap to the responsible team.

**Limits and recovery.** The current dashboard principally monitors queues. It is not a universal tax-filing form; an active adapter badge is not proof of production authorization or authority acceptance. Use Retry for failed reads and follow the indicated blocker to its source. Acknowledging or suppressing an incident does not fix its underlying transaction. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/compliance/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/compliance/compliance-route-data-access.ts:20>).



---

# Inventory and product setup

[Guide home](README.md) · [Shared controls](shared-controls.md) · [Detailed control notes](control-notes.md) · [Metric dictionary](metric-dictionary.md)

Evidence: source reviewed 2026-09-06. Dashboard interaction is blocked by sign-in. Instructions below describe implementation, not a completed live walkthrough.

Set up product identity and measurement first, then use controlled receipts/transfers to change stock. Item metadata, movement history and loss analysis answer different questions.

## Pages in this chapter

- [Create brand](#create-brand)
- [Brands](#brands)
- [Edit brand](#edit-brand)
- [Create category](#create-category)
- [Categories](#categories)
- [Edit category](#edit-category)
- [Category detail](#category-detail)
- [Create item](#create-item)
- [/en/dashboard/inventory/items/new](#redirect-inventoryitemsnew)
- [Item directory](#item-directory)
- [Edit item](#edit-item)
- [Item other-information placeholder](#item-other-information-placeholder)
- [Item supplier relationships](#item-supplier-relationships)
- [Inventory loss control](#inventory-loss-control)
- [Inventory movement history](#inventory-movement-history)
- [/en/dashboard/inventory](#redirect-inventory)
- [Location transfers](#location-transfers)
- [Create unit](#create-unit)
- [Units](#units)
- [Edit unit](#edit-unit)
- [/en/dashboard/items/new](#redirect-itemsnew)
- [/en/dashboard/items](#shared-entry-items)

## Create brand

**Open:** [/en/dashboard/inventory/brands/create](http://localhost:3000/en/dashboard/inventory/brands/create). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Inventory, purchasing and operations staff.

**Prerequisites and access.** inventory.brands.create. Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access. 

**What it shows.** English/French brand names and a logo URL in the brand form.

**How to use it.**

1. Enter or correct the name fields and optional image reference as indicated.
2. Submit the create form, then verify the saved brand in the directory.

**Confirm the outcome.** For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.

**Get value from it.** Keep product classification consistent across searches and reports.

**Limits and recovery.** This changes brand master data; it does not move stock or change past transactions. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/brands/create/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:43>).

## Brands

**Open:** [/en/dashboard/inventory/brands](http://localhost:3000/en/dashboard/inventory/brands). **Reach it:** Brands. **Evidence state:** source-only; runtime blocked.

**Audience.** Inventory, purchasing and operations staff.

**Prerequisites and access.** inventory.brands.read. Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access. 

**What it shows.** A searchable brand directory with activity and item-usage filters, related-item counts and row actions.

**How to use it.**

1. Filter status and With Items/No Items as needed.
2. Use Add Brand to create, View Items to inspect related products, Refresh to reload and Export for the available dataset.
3. Edit the intended brand from its row.

**Confirm the outcome.** For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.

**Get value from it.** Standardize brand names to avoid splitting product analysis across near-duplicate labels.

**Limits and recovery.** No additional route-specific gap was established in this source review. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/brands/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:36>).

## Edit brand

**Open:** `/en/dashboard/inventory/brands/[id]/edit`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Inventory, purchasing and operations staff.

**Prerequisites and access.** inventory.brands.update. Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** English/French brand names and a logo URL in the brand form.

**How to use it.**

1. Enter or correct the name fields and optional image reference as indicated.
2. Submit the edit form, then verify the saved brand in the directory.

**Confirm the outcome.** For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.

**Get value from it.** Keep product classification consistent across searches and reports.

**Limits and recovery.** This changes brand master data; it does not move stock or change past transactions. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/brands/[id]/edit/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:50>).

## Create category

**Open:** [/en/dashboard/inventory/categories/create](http://localhost:3000/en/dashboard/inventory/categories/create). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Inventory, purchasing and operations staff.

**Prerequisites and access.** inventory.categories.create. Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access. 

**What it shows.** English/French category names, image URL and parent-category selection.

**How to use it.**

1. Choose a clear name and the correct parent, review the hierarchy, then save.
2. Return to the category detail to verify the result.

**Confirm the outcome.** For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.

**Get value from it.** Avoid duplicate or misplaced categories that fragment reports.

**Limits and recovery.** The exact hierarchy validation/error messages require live confirmation; do not assume the UI permits cycles or self-parenting. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/categories/create/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:64>).

## Categories

**Open:** [/en/dashboard/inventory/categories](http://localhost:3000/en/dashboard/inventory/categories). **Reach it:** Categories. **Evidence state:** source-only; runtime blocked.

**Audience.** Inventory, purchasing and operations staff.

**Prerequisites and access.** inventory.categories.read. Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access. 

**What it shows.** A product-category directory and hierarchy, activity filters, related items and category management actions.

**How to use it.**

1. Search and filter the directory.
2. Open a category to inspect its hierarchy and linked items; use create/edit for classification changes.

**Confirm the outcome.** For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.

**Get value from it.** Group inventory in ways that make stock and sales comparisons useful.

**Limits and recovery.** A filtered category list is not a stock valuation report. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/categories/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:57>).

## Edit category

**Open:** `/en/dashboard/inventory/categories/[id]/edit`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Inventory, purchasing and operations staff.

**Prerequisites and access.** inventory.categories.update. Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** English/French category names, image URL and parent-category selection.

**How to use it.**

1. Choose a clear name and the correct parent, review the hierarchy, then save.
2. Return to the category detail to verify the result.

**Confirm the outcome.** For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.

**Get value from it.** Avoid duplicate or misplaced categories that fragment reports.

**Limits and recovery.** The exact hierarchy validation/error messages require live confirmation; do not assume the UI permits cycles or self-parenting. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/categories/[id]/edit/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:78>).

## Category detail

**Open:** `/en/dashboard/inventory/categories/[id]`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Inventory, purchasing and operations staff.

**Prerequisites and access.** inventory.categories.read. Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** The selected category and its related classification information.

**How to use it.**

1. Use Back, View Items and Edit category to move between the category, its items and its form.

**Confirm the outcome.** For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.

**Get value from it.** Inspect the impact of a category change before editing it.

**Limits and recovery.** No additional route-specific gap was established in this source review. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/categories/[id]/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:71>).

## Create item

**Open:** [/en/dashboard/inventory/items/create](http://localhost:3000/en/dashboard/inventory/items/create). **Reach it:** New Item. **Evidence state:** source-only; runtime blocked.

**Audience.** Inventory, purchasing and operations staff.

**Prerequisites and access.** inventory.items.create. Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access. 

**What it shows.** A product setup wizard covering names/descriptions, identity, images, prices, classification, inventory policy and optional opening stock.

**How to use it.**

1. Enter the English name and the required image/product information.
2. Review SKU/barcode, cost/selling/MSRP prices, unit, tax, category and brand; supply optional French text and physical details where useful.
3. If using Add Opening Stock, select a location and enter an integer quantity of at least 1 and a nonnegative unit cost.
4. Review the wizard before saving.

**Confirm the outcome.** For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.

**Get value from it.** Create a usable item and, where appropriate, its evidenced starting quantity in the same controlled workflow.

**Limits and recovery.** Opening stock posts quantity; it is not a harmless form preference. Do not enter opening stock for receipts already recorded through purchasing. Exact live validation messages and upload availability were not exercised. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/items/create/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:92>).

## Redirect: /inventory/items/new

**Open:** [/en/dashboard/inventory/items/new](http://localhost:3000/en/dashboard/inventory/items/new). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** redirect; runtime blocked.

This route redirects after its access checks. Use [/en/dashboard/inventory/items/create](http://localhost:3000/en/dashboard/inventory/items/create) and [the canonical guide](modules/inventory.md#create-item). 

**Access:** inventory.items.create. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/inventory/items/new/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/items/new/page.tsx:1>).

## Item directory

**Open:** [/en/dashboard/inventory/items](http://localhost:3000/en/dashboard/inventory/items). **Reach it:** Items. **Evidence state:** source-only; runtime blocked.

**Audience.** Inventory, purchasing and operations staff.

**Prerequisites and access.** inventory.items.read. Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access. 

**What it shows.** Item identity, SKU, classification, pricing and available inventory indicators, with selection, row actions, search and filters.

**How to use it.**

1. Search by item/SKU and narrow the category/brand filters.
2. Use Add Item to create, Edit for master data, or the row's supplier link for sourcing.
3. Select rows deliberately before a selected export.
4. Read the confirmation before Delete; preserve evidence for items already used in operations.

**Confirm the outcome.** For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.

**Get value from it.** Use consistent SKU, classification and reorder settings to make stock searches and replenishment decisions reliable.

**Limits and recovery.** Metadata edits are not stock adjustments. Export and selection can be limited to loaded/selected rows; the export label and downloaded rows are the authority for scope. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/items/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:85>).

## Edit item

**Open:** `/en/dashboard/inventory/items/[id]/edit`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Inventory, purchasing and operations staff.

**Prerequisites and access.** inventory.items.update. Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** Existing item image, bilingual identity, SKU/barcode, physical details, prices/tax, classification, inventory thresholds and lifecycle/tracking options.

**How to use it.**

1. Open Edit from the directory.
2. Change only the intended master fields; use the replacement-image control if needed.
3. Review Track inventory, Active item, Discontinued, Serial number tracking, Batch tracking and Expiry tracking carefully, then save and reload the item.

**Confirm the outcome.** For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.

**Get value from it.** Keep future transactions consistent while retaining the item's history and identity.

**Limits and recovery.** Tracking options only affect workflows that actually support the corresponding evidence. Editing an item's displayed cost or stock policy does not repair historical ledger quantities. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/items/[id]/edit/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:106>).

## Item other-information placeholder

**Open:** `/en/dashboard/inventory/items/[id]/others`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** placeholder; runtime blocked.

**Audience.** Inventory, purchasing and operations staff.

**Prerequisites and access.** inventory.items.read. Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** A short placeholder sentence referencing the item ID.

**How to use it.**

1. Return to the item directory or use the item Suppliers page for actual supplier relationship management.

**Confirm the outcome.** For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.

**Get value from it.** Avoid spending time looking for controls that are not implemented on this route.

**Limits and recovery.** Placeholder functionality: the source contains no complete other-information workflow. No browser verification was possible. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/items/[id]/others/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:113>).

## Item supplier relationships

**Open:** `/en/dashboard/inventory/items/[id]/suppliers`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Inventory, purchasing and operations staff.

**Prerequisites and access.** inventory.items.read. Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** Suppliers linked to one item, preferred-supplier status, supplier SKU, lead time, minimum order quantity, unit cost, last purchase date and notes.

**How to use it.**

1. Use Add Suppliers to Item, search the available supplier list and select relationships.
2. Choose a linked supplier to Edit Supplier Details.
3. Review Preferred Supplier, Supplier SKU, Lead Time (days), Min Order Quantity and Unit Cost before saving.
4. Discard changes closes an unsaved edit.

**Confirm the outcome.** For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.

**Get value from it.** Compare lead time and supplier-specific cost before preparing a purchase order, especially when a preferred supplier cannot meet demand.

**Limits and recovery.** The available supplier lookup is bounded; an absent supplier may require directory/setup work or a broader lookup. Saved relationship terms are planning data, not a placed order or confirmed receipt. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/items/[id]/suppliers/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:120>).

## Inventory loss control

**Open:** [/en/dashboard/inventory/loss-control](http://localhost:3000/en/dashboard/inventory/loss-control). **Reach it:** Loss Control. **Evidence state:** source-only; runtime blocked.

**Audience.** Inventory, purchasing and operations staff.

**Prerequisites and access.** inventory.levels.read. Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access. 

**What it shows.** Read-only loss summaries, breakdowns and recent-loss rows, with completeness/provenance, filters and a selected-record detail drawer.

**How to use it.**

1. Set dates and relevant filters; reset filters if no results match.
2. Open a loss row, read its source and evidence state, then resolve any underlying process issue in its owning workflow.
3. Retry after a loading failure.

**Confirm the outcome.** For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.

**Get value from it.** Investigate repeated item/location losses and compare their recorded value before changing procedures.

**Limits and recovery.** The screen is analytical: it does not itself approve write-offs or edit valuation. Partial source coverage must remain visible in any conclusion. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/loss-control/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:127>).

## Inventory movement history

**Open:** [/en/dashboard/inventory/movements](http://localhost:3000/en/dashboard/inventory/movements). **Reach it:** Movements. **Evidence state:** source-only; runtime blocked.

**Audience.** Inventory, purchasing and operations staff.

**Prerequisites and access.** inventory.levels.read. Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access. 

**What it shows.** Quantity/value movements with business identity, item, type, source, reference, actor, batch/expiry, corrections, proof and notes.

**How to use it.**

1. Use date/search/source filters to find the affected item and location.
2. Open the movement detail and trace its source record before deciding on a correction.

**Confirm the outcome.** For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.

**Get value from it.** Explain why stock changed and distinguish purchase receipts, sales, transfers and governed corrections.

**Limits and recovery.** History is evidence, not a form for overwriting old stock. A correction should remain linked to its originating workflow. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/movements/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:134>).

## Redirect: /inventory

**Open:** [/en/dashboard/inventory](http://localhost:3000/en/dashboard/inventory). **Reach it:** Overview. **Evidence state:** redirect; runtime blocked.

This route redirects after its access checks. Use [/en/dashboard/inventory/items](http://localhost:3000/en/dashboard/inventory/items) and [the canonical guide](modules/inventory.md#item-directory). 

**Access:** inventory.read. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/inventory/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/page.tsx:1>).

## Location transfers

**Open:** [/en/dashboard/inventory/transfers](http://localhost:3000/en/dashboard/inventory/transfers). **Reach it:** Transfers. **Evidence state:** partial; runtime blocked.

**Audience.** Inventory, purchasing and operations staff.

**Prerequisites and access.** TRANSFERS_READ. Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access. 

**What it shows.** Transfer route, status, priority, items, creator/date, status mix and route summary, plus a create dialog and detail/timeline views.

**How to use it.**

1. Filter status/source/destination and Search transfers.
2. Create Location Transfer records the source, destination and item quantities.
3. A different authorized user opens the DRAFT transfer and chooses Approve Transfer when allowed.
4. In the current implementation that action posts the stock movement and completes the transfer immediately; verify both locations and movement history.

**Confirm the outcome.** For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.

**Get value from it.** Move stock with a documented source, destination and status trail rather than changing item quantities manually.

**Limits and recovery.** There are no separate dispatch/receive buttons in this current workflow. Older status badges do not establish those operations. Priority and internal notes are collected in the form but omitted by the create action's service payload, so do not rely on them being saved. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/transfers/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:141>).

## Create unit

**Open:** [/en/dashboard/inventory/units/create](http://localhost:3000/en/dashboard/inventory/units/create). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Inventory, purchasing and operations staff.

**Prerequisites and access.** inventory.units.create. Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access. 

**What it shows.** The Units dashboard with its create form opened.

**How to use it.**

1. Complete the unit identity and conversion fields described in Units, save, and verify the new row.

**Confirm the outcome.** For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.

**Get value from it.** Create the right measurement unit before creating products.

**Limits and recovery.** No additional route-specific gap was established in this source review. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/units/create/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:155>).

## Units

**Open:** [/en/dashboard/inventory/units](http://localhost:3000/en/dashboard/inventory/units). **Reach it:** Units. **Evidence state:** source-only; runtime blocked.

**Audience.** Inventory, purchasing and operations staff.

**Prerequisites and access.** inventory.units.read. Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access. 

**What it shows.** Unit names/symbols, types, base units, conversion rates and active/usage summaries.

**How to use it.**

1. Search or filter Type and Status.
2. Open Create unit or Edit unit, enter English/French names, Symbol, Type, Base unit and Conversion rate as applicable, then save.
3. Review Remove unit carefully when used by items.

**Confirm the outcome.** For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.

**Get value from it.** Use consistent units and conversions so quantities mean the same thing in purchasing and inventory.

**Limits and recovery.** A conversion rate must be interpreted against the selected base unit. This page does not prove that every downstream workflow automatically converts arbitrary unit combinations. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/units/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:148>).

## Edit unit

**Open:** `/en/dashboard/inventory/units/[id]/edit`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Inventory, purchasing and operations staff.

**Prerequisites and access.** inventory.units.update. Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** The Units dashboard with the selected unit in edit mode.

**How to use it.**

1. Review existing usage and the base-unit relationship before saving changes.

**Confirm the outcome.** For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.

**Get value from it.** Prevent inconsistent quantities caused by casually changing a shared unit.

**Limits and recovery.** No additional route-specific gap was established in this source review. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/units/[id]/edit/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:162>).

## Redirect: /items/new

**Open:** [/en/dashboard/items/new](http://localhost:3000/en/dashboard/items/new). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** redirect; runtime blocked.

This route redirects after its access checks. Use [/en/dashboard/inventory/items/create](http://localhost:3000/en/dashboard/inventory/items/create) and [the canonical guide](modules/inventory.md#create-item). 

**Access:** inventory.items.create. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/items/new/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/items/new/page.tsx:1>).

## Shared entry: /items

**Open:** [/en/dashboard/items](http://localhost:3000/en/dashboard/items). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** shared implementation; runtime blocked.

This route renders a shared implementation rather than a separate business process. Use [/en/dashboard/inventory/items](http://localhost:3000/en/dashboard/inventory/items) and [the canonical guide](modules/inventory.md#item-directory). 

**Access:** inventory.items.read. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/items/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/items/page.tsx:1>).



---

# People, payroll and employee self-service

[Guide home](README.md) · [Shared controls](shared-controls.md) · [Detailed control notes](control-notes.md) · [Metric dictionary](metric-dictionary.md)

Evidence: source reviewed 2026-09-06. Dashboard interaction is blocked by sign-in. Instructions below describe implementation, not a completed live walkthrough.

People pages govern identity and change approvals; payroll pages assess source readiness and advance protected payroll stages. Several source workbenches are read-only. A calculated run is only one step toward issued payslips, payments, declarations and accounting evidence.

## Pages in this chapter

- [Attendance and payment readiness](#attendance-and-payment-readiness)
- [Compensation readiness](#compensation-readiness)
- [Payroll contract readiness](#payroll-contract-readiness)
- [Payroll declarations](#payroll-declarations)
- [Payroll employee sources](#payroll-employee-sources)
- [Payroll command center](#payroll-command-center)
- [Payroll payments and settlement evidence](#payroll-payments-and-settlement-evidence)
- [My payslips](#my-payslips)
- [Payroll register tie-out](#payroll-register-tie-out)
- [Payroll runs](#payroll-runs)
- [Payroll setup and proof controls](#payroll-setup-and-proof-controls)
- [People approvals](#people-approvals)
- [People movement history](#people-movement-history)
- [My employee workspace](#my-employee-workspace)
- [People directory](#people-directory)
- [Team workspace](#team-workspace)
- [Employee profile](#employee-profile)

## Attendance and payment readiness

**Open:** [/en/dashboard/payroll/attendance](http://localhost:3000/en/dashboard/payroll/attendance). **Reach it:** Attendance. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.payment_destination.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Attendance completeness and approved/pending/missing payment destinations, with blockers, redaction and proof controls.

**How to use it.**

1. Find the employee/period, read the blocker and inspect proof.
2. Resolve source requests/approvals and payment-destination evidence through their owning process before payroll advances.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Prevent rejected payments and incomplete time inputs at the end of the run.

**Limits and recovery.** An approved request is distinct from the frozen attendance snapshot consumed by payroll. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/attendance/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:51>).

## Compensation readiness

**Open:** [/en/dashboard/payroll/compensation](http://localhost:3000/en/dashboard/payroll/compensation). **Reach it:** Compensation. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.compensation.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Rubrique catalogue, compensation assignments and salary-change queue with requested/approved and redacted states.

**How to use it.**

1. Inspect the relevant assignment and salary-change stage; complete a pending review/application through People approvals when available.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Avoid calculating from a proposed salary as though it were effective compensation.

**Limits and recovery.** The reviewed workbench reports source state; it does not expose a complete salary/assignment creation form. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/compensation/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:68>).

## Payroll contract readiness

**Open:** [/en/dashboard/payroll/contracts](http://localhost:3000/en/dashboard/payroll/contracts). **Reach it:** Contracts. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.contracts.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Contracts and linked users with eligibility, status, evidence and redaction indicators.

**How to use it.**

1. Find the employee/contract, verify the effective period and evidence, then use the supported People approval/source process for outstanding changes.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Confirm the contract governing a payroll input before calculation.

**Limits and recovery.** The current screen is read-only; its lifecycle title does not imply full contract-authoring controls. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/contracts/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:85>).

## Payroll declarations

**Open:** [/en/dashboard/payroll/declarations](http://localhost:3000/en/dashboard/payroll/declarations). **Reach it:** Declarations. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.command.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Prepared declaration rows, status, source-register proof, blockers, scope/redaction and adapter execution controls.

**How to use it.**

1. Inspect the declaration's locked-register source and readiness.
2. Use Queue adapter execution only when the supported adapter and required evidence are ready, then track later execution and response evidence.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Keep statutory preparation and delivery work tied to the same payroll source.

**Limits and recovery.** Queued execution is not authority acceptance. External credentials, adapter capability, country-pack review and response evidence may still block completion. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/declarations/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:101>).

## Payroll employee sources

**Open:** [/en/dashboard/payroll/employees](http://localhost:3000/en/dashboard/payroll/employees). **Reach it:** Employees. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.employees.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Linked/unmapped users, active-contract and frozen-attendance readiness, candidates, orphan source rows and redactions.

**How to use it.**

1. Search the employee and inspect each readiness column.
2. Follow the linked People profile/source ownership to correct the named gap before calculating.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Stop missing identity links from becoming missing or duplicated pay.

**Limits and recovery.** This is a source/readiness workbench; no complete employee-creation form is exposed here. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/employees/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:118>).

## Payroll command center

**Open:** [/en/dashboard/payroll](http://localhost:3000/en/dashboard/payroll). **Reach it:** Overview. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.command.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Run/payment/declaration/close readiness, action board, blockers, provider/authority health and specialist country-pack/pilot certification controls.

**How to use it.**

1. Start with current-period blockers and open the owning source workspace.
2. Use source employees, contracts, compensation and attendance to understand readiness; go to Runs for permitted transitions.
3. Specialist pack/pilot controls need reviewed references, versions, evidence and independent approvals.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Track one payroll period across preparation, approval, payment and proof without assuming a green summary completes all stages.

**Limits and recovery.** Evaluate pack, Record certificate, Approve certificate and pilot persistence create governance records; they do not confer legal certification by their presence in the UI. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:28>).

## Payroll payments and settlement evidence

**Open:** [/en/dashboard/payroll/payments](http://localhost:3000/en/dashboard/payroll/payments). **Reach it:** Payments. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payments.reconciliation.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Employee balance/recovery cases and payment-batch reconciliation proof. The page combines two workspaces.

**How to use it.**

1. For a genuine balance settlement, enter amount/date, responsible identity, evidence/document hashes, reference and notes in Record settlement.
2. For batch reconciliation, use Record settlement proof with the source register and supported provider/statement/match references, then inspect the returned state.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Connect released payroll amounts to traceable settlement evidence and distinguish partial from complete settlement.

**Limits and recovery.** These forms record protected evidence/state changes. They should not be described as an unrestricted bank-transfer initiation form; a manual reference is insufficient proof. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payments/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:150>).

## My payslips

**Open:** [/en/dashboard/payroll/payslips](http://localhost:3000/en/dashboard/payroll/payslips). **Reach it:** My Payslips. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.payslips.self.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Issued payslips available to the current employee, with permitted lines, proof and blockers.

**How to use it.**

1. Choose the intended period/document and inspect available proof.
2. If no payslip appears, check whether emission completed and your employee-user mapping is correct.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Give employees a consistent issued record without exposing other employees' compensation.

**Limits and recovery.** An approved run is not yet an issued payslip; self-service redaction and identity scope still apply. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payslips/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:134>).

## Payroll register tie-out

**Open:** [/en/dashboard/payroll/register](http://localhost:3000/en/dashboard/payroll/register). **Reach it:** Register. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.reports.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Run lines, employee counts, net payable, payslips, payment allocations and ledger/close evidence with hashes/source links.

**How to use it.**

1. Compare the register with issued payslips and payment/accounting proof; inspect missing links before accepting the reconciliation.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Detect an amount or employee-scope mismatch before close.

**Limits and recovery.** A hash identifies evidence; it does not by itself prove independent review or external settlement. The page is primarily an evidence/tie-out surface. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/register/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:167>).

## Payroll runs

**Open:** [/en/dashboard/payroll/runs](http://localhost:3000/en/dashboard/payroll/runs). **Reach it:** Runs. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.command.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Runs with period, state, readiness/proof, accounting links and a service-provided list of next actions.

**How to use it.**

1. Open the eligible action drawer: calculation, review, approval, emission or posting.
2. Inspect required permission, Fresh auth, Maker-checker and source proof.
3. Supply the requested evidence/date inputs and confirm the action; verify the resulting run state.
4. Use separate declaration/payment drawers for those downstream stages.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Advance payroll through reviewable checkpoints instead of treating Calculate as completion.

**Limits and recovery.** Payment request, approval and release use separate actors where required. Release is a controlled batch transition, not proof the bank settled it; settlement evidence belongs in Payments. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/runs/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:183>).

## Payroll setup and proof controls

**Open:** [/en/dashboard/payroll/setup](http://localhost:3000/en/dashboard/payroll/setup). **Reach it:** Setup. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** payroll.runs.calculate. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Payroll setup/readiness and specialist historical proof-backfill plans, dry-run results, certificates and approval/execution fields.

**How to use it.**

1. Review missing prerequisites with the payroll administrator.
2. For specialist backfill work, inspect the dry-run/certificate and independent approval evidence before the protected Persist certificate, Approve execution, Validate proof or Execute backfill actions.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Expose historical proof gaps before a payroll rollout or assurance review.

**Limits and recovery.** This is not a simple everyday payroll-preferences screen. Hashes, approval-token evidence and idempotency fields require the documented operational process; never invent values to clear a blocker. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/setup/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts:200>).

## People approvals

**Open:** [/en/dashboard/people/approvals](http://localhost:3000/en/dashboard/people/approvals). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** hris.people.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Lifecycle, contract, document, compensation, salary and payment-destination requests grouped by review/apply stage and readiness.

**How to use it.**

1. Filter All, Review or Apply and the relevant domain.
2. Open an item, inspect evidence, enter the decision reason and required evidence hash, then Approve, Reject or Apply as offered.
3. Verify the new stage and history.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Keep request, independent decision and application separate and traceable.

**Limits and recovery.** The requester cannot review their own request; the approver/requester may also be barred from applying it. A separate operator must finish application when the service requires it. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/approvals/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/people-route-data-access.ts:89>).

## People movement history

**Open:** [/en/dashboard/people/history](http://localhost:3000/en/dashboard/people/history). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** hris.people.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Recorded HR changes with domains, risk/proof filters and employee links.

**How to use it.**

1. Search/filter the movement and inspect supporting proof.
2. Open profile to compare the current employee state with the recorded change.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Explain who changed employment-related data and why a payroll input changed.

**Limits and recovery.** History is a review surface, not permission to overwrite prior records. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/history/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/people-route-data-access.ts:75>).

## My employee workspace

**Open:** [/en/dashboard/people/me](http://localhost:3000/en/dashboard/people/me). **Reach it:** My HR. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** hris.self_service.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Self-service employee information plus leave, overtime and attendance-correction requests and payslip navigation.

**How to use it.**

1. Choose the request type, enter required dates/minutes/reason and Submit request.
2. Check its returned/pending state; use Payslips for issued personal documents.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Provide the required time evidence early enough for manager review and payroll preparation.

**Limits and recovery.** Submitting a request is not approval or a frozen payroll input. Self-service does not expose all employees' pay. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/me/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/people-route-data-access.ts:61>).

## People directory

**Open:** [/en/dashboard/people](http://localhost:3000/en/dashboard/people). **Reach it:** People. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** hris.people.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Employee identity/readiness rows with search, sorting, date filters, pagination and links to profile, history and approvals.

**How to use it.**

1. Narrow to the intended employee or date range, read readiness/state and Open profile.
2. Use Approvals for governed changes and History to trace applied changes.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Resolve source-data gaps before they reach payroll.

**Limits and recovery.** The returned data is scoped and may be redacted. A directory count is not necessarily all employees in every location. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/people-route-data-access.ts:17>).

## Team workspace

**Open:** [/en/dashboard/people/team](http://localhost:3000/en/dashboard/people/team). **Reach it:** Workforce. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** hris.people.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. 

**What it shows.** Employees/requests within the manager's permitted responsibility and operational-time approval controls.

**How to use it.**

1. Inspect the scoped request and supporting dates/minutes/reason.
2. Approve or Reject only the intended item with required justification, then verify the resulting state.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Clear pending time requests before the payroll input cut-off.

**Limits and recovery.** Manager responsibility and separation rules still apply; being able to view a request does not guarantee the right to approve it. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/team/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/people-route-data-access.ts:47>).

## Employee profile

**Open:** `/en/dashboard/people/[employeeId]`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Employees, managers, HR administrators, payroll operators and independent reviewers.

**Prerequisites and access.** hris.people.read. Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** Employment identity, department/job/cost center/country/location/dates/user mapping and named readiness blockers.

**How to use it.**

1. Confirm the employee and responsibility scope.
2. Read blockers such as missing active contract, contract evidence, frozen attendance or payment-destination evidence.
3. Route each blocker to HR/payroll ownership; return to People for the next record.

**Confirm the outcome.** Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.

**Get value from it.** Use a single profile to identify which upstream requirement prevents payroll readiness.

**Limits and recovery.** This profile is read-only. Location responsibility is expressly different from reporting-line authority; outside-scope profiles are denied, not empty. Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/[employeeId]/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/people/people-route-data-access.ts:33>).



---

# Point of sale and cash accountability

[Guide home](README.md) · [Shared controls](shared-controls.md) · [Detailed control notes](control-notes.md) · [Metric dictionary](metric-dictionary.md)

Evidence: source reviewed 2026-09-06. Dashboard interaction is blocked by sign-in. Instructions below describe implementation, not a completed live walkthrough.

The current checkout exposes cash tender and no receipt delivery. Opening a shift, editing a cart, charging a sale and closing a shift all persist state. The cash drawer workspace helps reconcile the resulting physical-cash evidence.

## Pages in this chapter

- [/en/dashboard/cashDrawer](#redirect-cashdrawer)
- [Cash drawer management](#cash-drawer-management)
- [Point of sale](#point-of-sale)

## Redirect: /cashDrawer

**Open:** [/en/dashboard/cashDrawer](http://localhost:3000/en/dashboard/cashDrawer). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** redirect; runtime blocked.

This route redirects after its access checks. Use [/en/dashboard/finance/cash-drawer](http://localhost:3000/en/dashboard/finance/cash-drawer) and [the canonical guide](modules/pos-cash.md#cash-drawer-management). 

**Access:** finance.cash-drawer.read OR finance.read. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/cashDrawer/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/cashDrawer/page.tsx:1>).

## Cash drawer management

**Open:** [/en/dashboard/finance/cash-drawer](http://localhost:3000/en/dashboard/finance/cash-drawer). **Reach it:** Cash Drawer. **Evidence state:** source-only; runtime blocked.

**Audience.** Cashiers, store managers and cash-control staff.

**Prerequisites and access.** finance.cash-drawer.read OR finance.read. An accessible location and relevant cash-drawer/session read authority. Viewing evidence does not require an active shift or sellable stock. 

**What it shows.** Overview, Drawers, Movement, Sessions and Journal views, with location/date filters, balances, sessions and variance information.

**How to use it.**

1. Choose location/dates and Refresh.
2. Search sessions by cashier/terminal and sort by Time, Sales or Variance.
3. Expand session/journal details, then follow Open POS, Reconciliation, Manage terminals, Cash flow or Cash and payment history to the owning workflow.

**Confirm the outcome.** Check the refreshed session/drawer/variance evidence. Charge and Close take place through the separate POS workflow.

**Get value from it.** Use unexplained variance to identify the specific shift requiring a count/evidence review.

**Limits and recovery.** A cash drawer is physical cash accountability; it is not a bank balance. A current balance and a dated session total can have different time bases. A failed close retains inputs for correction. Inspect current session/order state before repeating a submission; hardware readiness labels alone do not prove a device is connected. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/cash-drawer/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts:74>).

## Point of sale

**Open:** [/en/dashboard/pos](http://localhost:3000/en/dashboard/pos). **Reach it:** POS. **Evidence state:** partial; runtime blocked.

**Audience.** Cashiers, store managers and cash-control staff.

**Prerequisites and access.** OPERATE_POS. Accessible location, configured available terminal, assigned cashier/drawer as applicable, active shift and stock eligible for sale. Server permissions and current session state govern actions. 

**What it shows.** Location/terminal setup, shift state, customer, catalog in grid/list form, cart quantities/totals, cash tender, receipt history controls and offline-sync status.

**How to use it.**

1. Choose location and terminal, open a shift with the actual Opening float, then scan barcode or search SKU/item/category.
2. Add items, confirm quantities and customer, enter the cash tender and review the sale before committing.
3. At shift end enter Counted cash and a Variance explanation when required; close the shift and inspect the session record.

**Confirm the outcome.** After Charge, inspect order number, total/change and returned posting evidence. After Close, confirm the session closed and the counted cash/variance persisted.

**Get value from it.** Tie each sale to stock, a cashier session and accountable payment evidence.

**Limits and recovery.** The current selectable tender/receipt arrays expose CASH and NONE only: cash checkout with no delivery receipt. Electronic tender and email/SMS/WhatsApp branches exist in source but are not offered by this configuration. Park sale and Manager override only show a backend-gated warning. Do not describe those as working sale-management actions. A failed close retains inputs for correction. Inspect current session/order state before repeating a submission; hardware readiness labels alone do not prove a device is connected. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/pos/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/pos/pos-route-data-access.ts:20>).



---

# Suppliers, purchase orders and AP monitoring

[Guide home](README.md) · [Shared controls](shared-controls.md) · [Detailed control notes](control-notes.md) · [Metric dictionary](metric-dictionary.md)

Evidence: source reviewed 2026-09-06. Dashboard interaction is blocked by sign-in. Instructions below describe implementation, not a completed live walkthrough.

The supported purchase-order journey is draft, submit, independent approval, receiving and completion. The AP control dashboard monitors invoice/payment readiness; it does not expose a complete financial execution UI.

## Pages in this chapter

- [Purchase analytics](#purchase-analytics)
- [Create purchase order](#create-purchase-order)
- [Purchase orders](#purchase-orders)
- [Edit purchase order](#edit-purchase-order)
- [Purchase order detail](#purchase-order-detail)
- [Supplier acknowledgement](#supplier-acknowledgement)
- [/en/dashboard/purchases](#redirect-purchases)
- [AP history](#ap-history)
- [AP control workbench](#ap-control-workbench)
- [Create supplier](#create-supplier)
- [Supplier directory](#supplier-directory)
- [Edit supplier](#edit-supplier)
- [View supplier](#view-supplier)
- [/en/dashboard/purchases/[id]](#redirect-purchasesid)
- [/en/dashboard/suppliersSystem/new](#shared-entry-supplierssystemnew)
- [/en/dashboard/suppliersSystem](#shared-entry-supplierssystem)
- [/en/dashboard/suppliersSystem/[id]/edit](#shared-entry-supplierssystemidedit)
- [/en/dashboard/suppliersSystem/[id]](#shared-entry-supplierssystemid)

## Purchase analytics

**Open:** [/en/dashboard/purchase-orders/analytics](http://localhost:3000/en/dashboard/purchase-orders/analytics). **Reach it:** Purchase Analytics. **Evidence state:** source-only; runtime blocked.

**Audience.** Purchasing, receiving and accounts-payable teams.

**Prerequisites and access.** purchases.orders.read. Valid supplier, receiving location and item records; permitted purchasing access; independent approval where required; state-specific commands. 

**What it shows.** Purchasing summaries and charts for selected dates/filters, with supporting purchase data.

**How to use it.**

1. Choose the reporting period, compare totals and supplier/order patterns, then return to Purchase orders for the records driving a change.

**Confirm the outcome.** Confirm the saved order/status, received and outstanding quantities, receipt disposition and resulting stock history. Supplier proposals and AP readiness are separate evidence states.

**Get value from it.** Plan purchasing using actual order activity while separating commitments from receipts and payments.

**Limits and recovery.** Read displayed coverage/freshness; operational order amounts should not be treated as posted purchasing expense without the accounting bridge. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchase-orders/analytics/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchase-orders/purchase-orders-route-data-access.ts:41>).

## Create purchase order

**Open:** [/en/dashboard/purchase-orders/new](http://localhost:3000/en/dashboard/purchase-orders/new). **Reach it:** New Purchase Order. **Evidence state:** source-only; runtime blocked.

**Audience.** Purchasing, receiving and accounts-payable teams.

**Prerequisites and access.** purchases.orders.create. Valid supplier, receiving location and item records; permitted purchasing access; independent approval where required; state-specific commands. 

**What it shows.** A multi-step purchase form: supplier/location, order identity/dates, item lines and quantities/prices/tax, delivery/payment information and notes.

**How to use it.**

1. Select a valid supplier and receiving location, add the intended items, inspect quantities and unit costs, then progress through the review steps before saving.
2. Reopen the saved order and check its status/total.

**Confirm the outcome.** Confirm the saved order/status, received and outstanding quantities, receipt disposition and resulting stock history. Supplier proposals and AP readiness are separate evidence states.

**Get value from it.** Agree the purchasing intent before goods arrive and reduce untracked receipts.

**Limits and recovery.** A saved draft does not send an order or post accounts. A cloned order must be reviewed as a new transaction; old dates and prices are not automatically still appropriate. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchase-orders/new/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchase-orders/purchase-orders-route-data-access.ts:78>).

## Purchase orders

**Open:** [/en/dashboard/purchase-orders](http://localhost:3000/en/dashboard/purchase-orders). **Reach it:** Purchase Orders. **Evidence state:** source-only; runtime blocked.

**Audience.** Purchasing, receiving and accounts-payable teams.

**Prerequisites and access.** purchases.orders.read. Valid supplier, receiving location and item records; permitted purchasing access; independent approval where required; state-specific commands. 

**What it shows.** A purchase-order workbench with status/date/search filters, selected rows, exports and record actions.

**How to use it.**

1. Find the supplier/order, inspect its status, then create a new order or open the existing detail.
2. Use the status-appropriate approval, receiving, cancellation or print action; confirm each transition in the refreshed record.

**Confirm the outcome.** Confirm the saved order/status, received and outstanding quantities, receipt disposition and resulting stock history. Supplier proposals and AP readiness are separate evidence states.

**Get value from it.** Maintain one traceable order-to-receipt flow for purchasing and inventory teams.

**Limits and recovery.** Approval is not receipt, and a purchase order is not a supplier invoice or settlement. Legacy /purchases links lead here. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchase-orders/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchase-orders/purchase-orders-route-data-access.ts:29>).

## Edit purchase order

**Open:** `/en/dashboard/purchase-orders/[id]/edit`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Purchasing, receiving and accounts-payable teams.

**Prerequisites and access.** purchases.orders.update. Valid supplier, receiving location and item records; permitted purchasing access; independent approval where required; state-specific commands. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** An editable order form for an eligible order, with item lines, review steps and unsaved-change handling.

**How to use it.**

1. Open an eligible record; edit the supplier/order fields and line quantities/prices.
2. Use Previous/Continue to review, then save.
3. If interrupted, use the offered discard/reopen workflow and inspect the saved record.

**Confirm the outcome.** Confirm the saved order/status, received and outstanding quantities, receipt disposition and resulting stock history. Supplier proposals and AP readiness are separate evidence states.

**Get value from it.** Correct a draft before approval or receiving creates downstream commitments.

**Limits and recovery.** State changes can make an open edit stale. Reload and review if the order has been received or otherwise advanced; do not force the old draft over current evidence. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchase-orders/[id]/edit/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchase-orders/purchase-orders-route-data-access.ts:90>).

## Purchase order detail

**Open:** `/en/dashboard/purchase-orders/[id]`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Purchasing, receiving and accounts-payable teams.

**Prerequisites and access.** purchases.orders.read. Valid supplier, receiving location and item records; permitted purchasing access; independent approval where required; state-specific commands. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** Order identity, supplier, lines, totals, status, receipt progress and next-stage actions.

**How to use it.**

1. Inspect the order, then Submit or Approve where permitted.
2. Receive Items opens line quantities and receipt evidence: batch/lot, optional expiry and inspection disposition.
3. Receive All Available fills remaining amounts; Clear All resets the receipt selection.
4. Confirm receiving, then verify received/outstanding quantities.

**Confirm the outcome.** Confirm the saved order/status, received and outstanding quantities, receipt disposition and resulting stock history. Supplier proposals and AP readiness are separate evidence states.

**Get value from it.** Compare ordered and received quantities while retaining inspection evidence for inventory and payables.

**Limits and recovery.** Passed inspection releases through the supported flow; Failed or Incomplete inspection holds the received stock as implemented. Print is a document output, not supplier delivery or payment. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchase-orders/[id]/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchase-orders/purchase-orders-route-data-access.ts:53>).

## Supplier acknowledgement

**Open:** `/en/dashboard/purchase-orders/[id]/supplier-acknowledgement`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Purchasing, receiving and accounts-payable teams.

**Prerequisites and access.** purchases.orders.read. Valid supplier, receiving location and item records; permitted purchasing access; independent approval where required; state-specific commands. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** The supplier-facing acknowledgement/share state and audit history for one purchase order.

**How to use it.**

1. For an approved PO, review the optional recipient reference, choose Issue invitation, then Copy link.
2. Inspect the generated expiry.
3. Review proposals and use the permitted buyer decision or revocation command with its required reason.

**Confirm the outcome.** Inspect token status/expiry, access history or the recorded buyer decision. This page does not change receipt quantities or stock.

**Get value from it.** Keep evidence of what the supplier was asked to acknowledge and whether the acknowledgement arrived.

**Limits and recovery.** This workbench issues/copies a link; it has no send-email action. Actions require purchase-order update authority and identity verified within five minutes, but no inline password step-up form is exposed here. Buyer acceptance records a review decision without changing the authoritative PO, stock, AP or ledger. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchase-orders/[id]/supplier-acknowledgement/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchase-orders/purchase-orders-route-data-access.ts:65>).

## Redirect: /purchases

**Open:** [/en/dashboard/purchases](http://localhost:3000/en/dashboard/purchases). **Reach it:** Overview. **Evidence state:** redirect; runtime blocked.

This route redirects after its access checks. Use [/en/dashboard/purchase-orders](http://localhost:3000/en/dashboard/purchase-orders) and [the canonical guide](modules/purchasing.md#purchase-orders). Older unreachable purchase-page button code is excluded from the operational instructions.

**Access:** purchases.orders.read. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/purchases/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchases/page.tsx:1>).

## AP history

**Open:** [/en/dashboard/purchases/payables/history](http://localhost:3000/en/dashboard/purchases/payables/history). **Reach it:** AP History. **Evidence state:** source-only; runtime blocked.

**Audience.** Purchasing, receiving and accounts-payable teams.

**Prerequisites and access.** purchasing.ap.invoice.view OR finance.payables.read OR purchases.suppliers.read. Valid supplier, receiving location and item records; permitted purchasing access; independent approval where required; state-specific commands. 

**What it shows.** Accounts-payable events, records and proof in a history workbench.

**How to use it.**

1. Narrow period/search/filter scope, select a record and inspect its details and lineage.
2. Open the source AP workbench to perform a permitted next step.

**Confirm the outcome.** Confirm the saved order/status, received and outstanding quantities, receipt disposition and resulting stock history. Supplier proposals and AP readiness are separate evidence states.

**Get value from it.** Explain an invoice/payment movement and preserve its evidence trail.

**Limits and recovery.** Filtered history is not necessarily the organization's full current payable balance. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchases/payables/history/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchases/purchases-route-data-access.ts:82>).

## AP control workbench

**Open:** [/en/dashboard/purchases/payables](http://localhost:3000/en/dashboard/purchases/payables). **Reach it:** AP Workbench. **Evidence state:** source-only; runtime blocked.

**Audience.** Purchasing, receiving and accounts-payable teams.

**Prerequisites and access.** purchasing.ap.invoice.view. Valid supplier, receiving location and item records; permitted purchasing access; independent approval where required; state-specific commands. 

**What it shows.** Supplier-invoice readiness, matching and controlled accounts-payable work, including exceptions and evidence.

**How to use it.**

1. Inspect recent invoices, released payments, pending bank changes and the read-only action queue.
2. Use Open AP history, Open suppliers, Review history or a supplier-profile link to inspect supporting evidence.
3. Reload the page for a fresh snapshot; there are no local search/date filters on this screen.

**Confirm the outcome.** Inspect refreshed invoice/payment/blocker evidence and follow the owning workflow.

**Get value from it.** Identify missing receipt, matching or approval evidence and give the responsible operator a specific case to resolve.

**Limits and recovery.** The action queue is explicitly read-only in the current workbench. It does not expose a complete invoice match/approve/post/payment command flow; missing command UI must not be invented from service names. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchases/payables/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchases/purchases-route-data-access.ts:60>).

## Create supplier

**Open:** [/en/dashboard/purchases/suppliers/create](http://localhost:3000/en/dashboard/purchases/suppliers/create). **Reach it:** New Supplier. **Evidence state:** source-only; runtime blocked.

**Audience.** Purchasing, receiving and accounts-payable teams.

**Prerequisites and access.** purchases.suppliers.create. Valid supplier, receiving location and item records; permitted purchasing access; independent approval where required; state-specific commands. 

**What it shows.** The supplier directory opens the appropriate create dialog for the current route. Forms cover name/code, contact information, address/tax identity and commercial terms.

**How to use it.**

1. Confirm supplier identity.
2. Complete required identity fields, review terms and active status, save, and verify the returned supplier row.

**Confirm the outcome.** Confirm the saved order/status, received and outstanding quantities, receipt disposition and resulting stock history. Supplier proposals and AP readiness are separate evidence states.

**Get value from it.** Use a single supplier master record across sourcing, purchase orders and AP.

**Limits and recovery.** These are route-driven modes of the same dashboard, not independent supplier data stores. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchases/suppliers/create/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchases/purchases-route-data-access.ts:118>).

## Supplier directory

**Open:** [/en/dashboard/purchases/suppliers](http://localhost:3000/en/dashboard/purchases/suppliers). **Reach it:** Suppliers. **Evidence state:** source-only; runtime blocked.

**Audience.** Purchasing, receiving and accounts-payable teams.

**Prerequisites and access.** purchases.suppliers.read. Valid supplier, receiving location and item records; permitted purchasing access; independent approval where required; state-specific commands. 

**What it shows.** Supplier contacts, terms, activity, open-order/credit/linked-item indicators, filters and management actions.

**How to use it.**

1. Search and filter active, open orders, over limit, linked items or no links.
2. Create/edit/open the intended supplier.
3. For export, inspect whether Include sensitive fields is available and selected, then verify the output scope.

**Confirm the outcome.** Confirm the saved order/status, received and outstanding quantities, receipt disposition and resulting stock history. Supplier proposals and AP readiness are separate evidence states.

**Get value from it.** Keep supplier identity and item links usable for purchasing and avoid duplicate payee records.

**Limits and recovery.** Archiving preserves existing history; sensitive export fields have additional permission constraints. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchases/suppliers/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchases/purchases-route-data-access.ts:101>).

## Edit supplier

**Open:** `/en/dashboard/purchases/suppliers/[id]/edit`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Purchasing, receiving and accounts-payable teams.

**Prerequisites and access.** purchases.suppliers.update. Valid supplier, receiving location and item records; permitted purchasing access; independent approval where required; state-specific commands. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** The supplier directory opens the appropriate edit dialog for the current route. Forms cover name/code, contact information, address/tax identity and commercial terms.

**How to use it.**

1. Confirm supplier identity.
2. Complete required identity fields, review terms and active status, save, and verify the returned supplier row.

**Confirm the outcome.** Confirm the saved order/status, received and outstanding quantities, receipt disposition and resulting stock history. Supplier proposals and AP readiness are separate evidence states.

**Get value from it.** Use a single supplier master record across sourcing, purchase orders and AP.

**Limits and recovery.** These are route-driven modes of the same dashboard, not independent supplier data stores. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchases/suppliers/[id]/edit/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchases/purchases-route-data-access.ts:152>).

## View supplier

**Open:** `/en/dashboard/purchases/suppliers/[id]`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Purchasing, receiving and accounts-payable teams.

**Prerequisites and access.** purchases.suppliers.read. Valid supplier, receiving location and item records; permitted purchasing access; independent approval where required; state-specific commands. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** The supplier directory opens the appropriate view dialog for the current route. Forms cover name/code, contact information, address/tax identity and commercial terms.

**How to use it.**

1. Confirm supplier identity.
2. Inspect details and follow the available edit/order/item links.

**Confirm the outcome.** Confirm the saved order/status, received and outstanding quantities, receipt disposition and resulting stock history. Supplier proposals and AP readiness are separate evidence states.

**Get value from it.** Use a single supplier master record across sourcing, purchase orders and AP.

**Limits and recovery.** These are route-driven modes of the same dashboard, not independent supplier data stores. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchases/suppliers/[id]/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchases/purchases-route-data-access.ts:135>).

## Redirect: /purchases/[id]

**Open:** `/en/dashboard/purchases/[id]`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** redirect; runtime blocked.

This route redirects after its access checks. Use `/en/dashboard/purchase-orders/[id]` and [the canonical guide](modules/purchasing.md#purchase-order-detail). Older unreachable purchase-page button code is excluded from the operational instructions.

**Access:** purchases.orders.read. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/purchases/[id]/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchases/[id]/page.tsx:1>).

## Shared entry: /suppliersSystem/new

**Open:** [/en/dashboard/suppliersSystem/new](http://localhost:3000/en/dashboard/suppliersSystem/new). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** shared implementation; runtime blocked.

This route renders a shared implementation rather than a separate business process. Use [/en/dashboard/purchases/suppliers/create](http://localhost:3000/en/dashboard/purchases/suppliers/create) and [the canonical guide](modules/purchasing.md#create-supplier). 

**Access:** purchases.suppliers.create. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/suppliersSystem/new/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/suppliersSystem/new/page.tsx:1>).

## Shared entry: /suppliersSystem

**Open:** [/en/dashboard/suppliersSystem](http://localhost:3000/en/dashboard/suppliersSystem). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** shared implementation; runtime blocked.

This route renders a shared implementation rather than a separate business process. Use [/en/dashboard/purchases/suppliers](http://localhost:3000/en/dashboard/purchases/suppliers) and [the canonical guide](modules/purchasing.md#supplier-directory). 

**Access:** purchases.suppliers.read. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/suppliersSystem/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/suppliersSystem/page.tsx:1>).

## Shared entry: /suppliersSystem/[id]/edit

**Open:** `/en/dashboard/suppliersSystem/[id]/edit`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** shared implementation; runtime blocked.

This route renders a shared implementation rather than a separate business process. Use `/en/dashboard/purchases/suppliers/[id]/edit` and [the canonical guide](modules/purchasing.md#edit-supplier). 

**Access:** purchases.suppliers.update. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/suppliersSystem/[id]/edit/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/suppliersSystem/[id]/edit/page.tsx:1>).

## Shared entry: /suppliersSystem/[id]

**Open:** `/en/dashboard/suppliersSystem/[id]`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** shared implementation; runtime blocked.

This route renders a shared implementation rather than a separate business process. Use `/en/dashboard/purchases/suppliers/[id]` and [the canonical guide](modules/purchasing.md#view-supplier). 

**Access:** purchases.suppliers.read. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/suppliersSystem/[id]/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/suppliersSystem/[id]/page.tsx:1>).



---

# Settings, access and workspace composition

[Guide home](README.md) · [Shared controls](shared-controls.md) · [Detailed control notes](control-notes.md) · [Metric dictionary](metric-dictionary.md)

Evidence: source reviewed 2026-09-06. Dashboard interaction is blocked by sign-in. Instructions below describe implementation, not a completed live walkthrough.

Settings establish organization context and access. Read the full review before applying changes: drafts, current configuration, permission grants, operational stops and successful preparation are different things. This chapter also covers account and notification demonstration routes.

## Pages in this chapter

- [Change password](#change-password)
- [Notification demonstration](#notification-demonstration)
- [Appearance](#appearance)
- [Company settings](#company-settings)
- [Data onboarding](#data-onboarding)
- [Create location](#create-location)
- [/en/dashboard/settings/locations/new](#shared-entry-settingslocationsnew)
- [Locations](#locations)
- [Edit location](#edit-location)
- [Module control center](#module-control-center)
- [Notification settings and tests](#notification-settings-and-tests)
- [/en/dashboard/settings/organization](#redirect-settingsorganization)
- [Create role](#create-role)
- [Role administration](#role-administration)
- [Edit role](#edit-role)
- [Security settings](#security-settings)
- [Create tax rate](#create-tax-rate)
- [Tax rates](#tax-rates)
- [Edit tax rate](#edit-tax-rate)
- [Terminals](#terminals)
- [Users and invitations](#users-and-invitations)
- [Member access](#member-access)

## Change password

**Open:** [/en/dashboard/change-password](http://localhost:3000/en/dashboard/change-password). **Reach it:** Change Password. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** profile.password.update. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Current, new and confirm-password fields with password policy/error handling.

**How to use it.**

1. Enter the current password and a matching new/confirmation value that meets the displayed policy; submit only when ready and follow the sign-in/success instructions.

**Confirm the outcome.** Follow the returned success/sign-in instructions and confirm that the new credential works through normal sign-in. A rejected form is not a completed password change.

**Get value from it.** Replace an account credential through its supported protected workflow.

**Limits and recovery.** The source enforces strength/history/breach-related checks; a rejected password is not a transport failure to repeatedly resubmit. This documentation inspection did not change credentials. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/change-password/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/change-password/change-password-route-data-access.ts:20>).

## Notification demonstration

**Open:** [/en/dashboard/notifications-demo](http://localhost:3000/en/dashboard/notifications-demo). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** communication.notifications.read. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** A notification test surface with synthetic notification actions.

**How to use it.**

1. Use only for deliberate presentation testing; return to operational evidence pages for real alerts and transactions.

**Confirm the outcome.** Inspect the visible notification/read-count state in the current session. Reloading can clear the queue; only the sound preference persists in browser storage.

**Get value from it.** Understand notification presentation without mistaking demonstrations for business records.

**Limits and recovery.** Demonstration functionality. Test buttons can change the local notification queue; they are not evidence of a production event pipeline. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/notifications-demo/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/notifications-demo/notifications-demo-route-data-access.ts:27>).

## Appearance

**Open:** [/en/dashboard/settings/appearance](http://localhost:3000/en/dashboard/settings/appearance). **Reach it:** Appearance. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** DASHBOARD_READ. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Light, Dark and System theme choices and the resolved appearance.

**How to use it.**

1. Choose the desired theme.
2. System follows the device preference; inspect the result in this browser.

**Confirm the outcome.** Inspect the active Light/Dark/System theme and its browser-persisted preference; no server command receipt is involved.

**Get value from it.** Use a comfortable, readable theme for long work sessions.

**Limits and recovery.** This is a browser-persisted theme setting. There is no complete saved custom-palette, layout-preset or global-density settings model on this page; individual tables can have their own density controls. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/appearance/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:35>).

## Company settings

**Open:** [/en/dashboard/settings/company](http://localhost:3000/en/dashboard/settings/company). **Reach it:** Company. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** COMPANY_READ. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** The active organization record, relation counts, setup links and three count cards above a full-width Gross paid payment total.

**How to use it.**

1. Confirm the organization identity.
2. Open its settings form to review editable organization data.
3. Use the displayed comparison/review flow before saving; resolve stale revisions with Load latest comparison.
4. Registration/sign-in handoff controls open the appropriate external page for another organization.
5. The reviewed CSV flow prepares scope before protected download.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Keep currency and organization identity consistent for downstream operations and use setup links to complete missing foundations.

**Limits and recovery.** The current amount label is Gross paid payment total. It adds all non-deleted PAID payments, including both sales and purchases, across all dates before refund deductions. It is neither revenue nor cash balance. Relation counts do not filter each relation for active/deleted state. Currency is read-only in this form; this directory exposes the current organization only. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/company/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:42>).

## Data onboarding

**Open:** [/en/dashboard/settings/data-onboarding](http://localhost:3000/en/dashboard/settings/data-onboarding). **Reach it:** Data onboarding. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** Authenticated organization and route guard; exact permission set not statically resolved. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** A governed master-data import workbench for customers, suppliers and items, with template, dry validation, approval, commit and evidence.

**How to use it.**

1. Choose the target and Download template.
2. Prepare a CSV within 5 MB and 1,000 rows.
3. Run dry validation, inspect mapped fields/errors/risks and correct the file.
4. Record the explicit approval for the exact source/mapping evidence, then Commit through the domain owners when allowed.
5. Export the evidence manifest and inspect created results.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Onboard consistent master data with reviewable validation before operational use.

**Limits and recovery.** Dry validation may persist a run/evidence record. Zero validation errors is not permission to skip approval; a changed file or mapping needs fresh review. Do not treat this as a transaction/ledger import. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/data-onboarding/page.tsx:1>).

## Create location

**Open:** [/en/dashboard/settings/locations/create](http://localhost:3000/en/dashboard/settings/locations/create). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** locations.create. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** The location dashboard with the create dialog, including name/code/type, manager, address/contact and policy options.

**How to use it.**

1. Enter required identity and intended manager/type, review policy checkboxes, save and confirm the new row before configuring its terminal or inventory.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Create a clear physical/operational scope before recording movements and sales.

**Limits and recovery.** No additional route-specific gap was established in this source review. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/locations/create/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:71>).

## Shared entry: /settings/locations/new

**Open:** [/en/dashboard/settings/locations/new](http://localhost:3000/en/dashboard/settings/locations/new). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** shared implementation; runtime blocked.

This route renders a shared implementation rather than a separate business process. Use [/en/dashboard/settings/locations/create](http://localhost:3000/en/dashboard/settings/locations/create) and [the canonical guide](modules/settings.md#create-location). 

**Access:** locations.create. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/settings/locations/new/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/locations/new/page.tsx:1>).

## Locations

**Open:** [/en/dashboard/settings/locations](http://localhost:3000/en/dashboard/settings/locations). **Reach it:** Locations. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** locations.read. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Locations with type, manager, address/contact, active/setup indicators, filters and links to stock, transfers, POS and drawers.

**How to use it.**

1. Search/filter by status, type, setup or date; set visible columns/density and select rows for export as needed.
2. Create or edit a location, review default/approval/negative-stock settings and save.
3. Follow inventory/POS links to complete operational setup.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Make stock and cash responsibility explicit by location.

**Limits and recovery.** Changing approval/default/negative-stock policy affects future behavior; location creation alone does not create a usable POS terminal or open shift. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/locations/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:64>).

## Edit location

**Open:** `/en/dashboard/settings/locations/[id]/edit`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** locations.update. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** The selected location in the shared management form.

**How to use it.**

1. Review identity, responsibility and operational policy changes, then save.
2. Confirm the current record and downstream setup links.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Keep locations accurate without confusing an administrative edit with moving stock.

**Limits and recovery.** No additional route-specific gap was established in this source review. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/locations/[id]/edit/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:85>).

## Module control center

**Open:** [/en/dashboard/settings/modules](http://localhost:3000/en/dashboard/settings/modules). **Reach it:** Modules. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** MANAGE_SYSTEM_SETTINGS. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Foundation, package/composition and individual-module state, selection/dependencies, operational readiness/stops and review/identity controls.

**How to use it.**

1. Start with the active foundation and package composition.
2. Inspect module dependencies and readiness; select only the capabilities your workflows need.
3. Review the complete proposed change and confirm identity before applying any protected selection or operational command.
4. Reload the server result and inspect what is selected, granted, provisioned and usable.

**Confirm the outcome.** Compare Requested revision and Active workspace revision, inspect preparation conditions and the recorded change history, and verify whether the intended workspace is actually active.

**Get value from it.** Keep the workspace aligned with actual operating needs and discover the specific access/setup blocker when a module is unavailable.

**Limits and recovery.** Selection, commercial grant, provisioning, operational availability and user permission are separate conditions. This page is not a checkout/payment form and does not automatically grant user permissions. Some stop controls are supported only for specific modules/workflows; see the module-control notes. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:92>).

## Notification settings and tests

**Open:** [/en/dashboard/settings/notifications](http://localhost:3000/en/dashboard/settings/notifications). **Reach it:** Notifications. **Evidence state:** partial; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** communication.notifications.read. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Sound preference, a temporary notification queue and test controls.

**How to use it.**

1. Toggle sound as desired.
2. Send test, Security alert and Payment update add synthetic notifications for presentation testing.
3. Mark all read changes queue state; Clear queue removes the local list.

**Confirm the outcome.** Inspect the visible notification/read-count state in the current session. Reloading can clear the queue; only the sound preference persists in browser storage.

**Get value from it.** Check how alerts appear and sound before relying on the interface during operations.

**Limits and recovery.** Only the sound preference persists in browser storage; the queue is session memory. These are not real security events/payments and do not establish a durable email/push-subscription preference center. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/notifications/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:99>).

## Redirect: /settings/organization

**Open:** [/en/dashboard/settings/organization](http://localhost:3000/en/dashboard/settings/organization). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** redirect; runtime blocked.

This route redirects after its access checks. Use [/en/dashboard/settings/company](http://localhost:3000/en/dashboard/settings/company) and [the canonical guide](modules/settings.md#company-settings). 

**Access:** COMPANY_READ. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/settings/organization/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/organization/page.tsx:1>).

## Create role

**Open:** [/en/dashboard/settings/roles/new](http://localhost:3000/en/dashboard/settings/roles/new). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** roles.create. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** English/French names, description, reviewed permission/risk catalogue, proposed changes, identity confirmation and history.

**How to use it.**

1. Enter the role's purpose, select only required permissions, inspect risk and any disabled/out-of-authority grants, then review and confirm the protected command.
2. Check server history and the resulting role.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Build comprehensible access bundles with evidence of who changed them.

**Limits and recovery.** Uneditable grants may need to remain preserved. A local checkbox selection is not a saved permission change. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/roles/new/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:120>).

## Role administration

**Open:** [/en/dashboard/settings/roles](http://localhost:3000/en/dashboard/settings/roles). **Reach it:** Roles & Permissions. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** READ_ROLES. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Roles and their permission-related summaries, search/selection and create/edit navigation.

**How to use it.**

1. Search for an existing role before Add Role.
2. Open it to inspect its permission set and review process.
3. Verify saved role changes from the directory/history.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Use reusable roles rather than ad hoc access assumptions.

**Limits and recovery.** A role name is not a guarantee of its permissions; assess its actual grant set and your authority to change it. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/roles/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:113>).

## Edit role

**Open:** `/en/dashboard/settings/roles/update/[id]`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** roles.update. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** English/French names, description, reviewed permission/risk catalogue, proposed changes, identity confirmation and history.

**How to use it.**

1. Enter the role's purpose, select only required permissions, inspect risk and any disabled/out-of-authority grants, then review and confirm the protected command.
2. Check server history and the resulting role.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Build comprehensible access bundles with evidence of who changed them.

**Limits and recovery.** Uneditable grants may need to remain preserved. A local checkbox selection is not a saved permission change. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/roles/update/[id]/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:127>).

## Security settings

**Open:** [/en/dashboard/settings/security](http://localhost:3000/en/dashboard/settings/security). **Reach it:** Security. **Evidence state:** partial; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** profile.read. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Password/credential readiness, session counts, recent login/security indicators, role/permission context and links to password maintenance.

**How to use it.**

1. Inspect current session and account state.
2. Change password opens the dedicated form.
3. Sign out other sessions revokes the other sessions; confirm their removal afterward.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Review active access and remove sessions that should no longer be valid.

**Limits and recovery.** The current page does not supply a finished MFA enrolment/challenge flow. A two-factor readiness label or navigation description should not be presented as an available toggle. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/security/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:134>).

## Create tax rate

**Open:** [/en/dashboard/settings/tax-rates/create](http://localhost:3000/en/dashboard/settings/tax-rates/create). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** taxes.create. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** The tax-rate dashboard with its create dialog.

**How to use it.**

1. Enter name/type/rate and active state, validate the percentage field and save.
2. Verify the new rate before assigning it to an item or transaction.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Prepare a reviewed rate before operational users need it.

**Limits and recovery.** No additional route-specific gap was established in this source review. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/tax-rates/create/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:149>).

## Tax rates

**Open:** [/en/dashboard/settings/tax-rates](http://localhost:3000/en/dashboard/settings/tax-rates). **Reach it:** Tax Rates. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** taxes.read. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Configured tax names, rates, types and activity with create/edit/remove controls and list presentation filters.

**How to use it.**

1. Find the intended tax.
2. Create/Edit with bilingual names, type, percentage and active state; review before saving and verify the row.
3. Inspect use/confirmation before Remove.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Apply consistent configured rates to supported product/order calculations.

**Limits and recovery.** A configured percentage is application data, not tax-law advice or proof the rate is legally correct for a country/product/date. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/tax-rates/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:142>).

## Edit tax rate

**Open:** `/en/dashboard/settings/tax-rates/[id]/edit`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** taxes.update. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** The selected tax rate in the shared management form.

**How to use it.**

1. Review the intended name/type/rate/activity changes and save.
2. Confirm the result and consider affected future uses.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Keep tax master data deliberate and consistent.

**Limits and recovery.** Changing a configuration does not imply automatic recalculation of historical transactions. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/tax-rates/[id]/edit/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:156>).

## Terminals

**Open:** [/en/dashboard/settings/terminals](http://localhost:3000/en/dashboard/settings/terminals). **Reach it:** Terminals. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** POS_STATION_READ. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Terminal identity/number, location, assigned cashier, cash-drawer/session links, filters and active state.

**How to use it.**

1. Create or Edit a terminal, choosing location and valid cashier/drawer where required; review its generated/entered number.
2. Use Open POS or drawer links to inspect operation.
3. Deactivate only after checking live session consequences.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Give each checkout a traceable location, operator and drawer context.

**Limits and recovery.** A terminal record does not open a shift or establish payment-provider authority. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/terminals/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:163>).

## Users and invitations

**Open:** [/en/dashboard/settings/users](http://localhost:3000/en/dashboard/settings/users). **Reach it:** Users & Invites. **Evidence state:** partial; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** READ_USERS. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Organization member counts, activation/verification/role filters and an invitation register with Awaiting acceptance, Accepted, Expired and Cancelled states. Delivery-attempt history is separate.

**How to use it.**

1. Search/filter members, inspect activation/verification/roles and switch Users/Invitations tabs.
2. Invite user opens Email address and an authorized Role; Record invitation persists the reviewed request.
3. Inspect its receipt/history and Refresh invitations before retrying an uncertain result.
4. Replace invitation and Cancel invitation require their own review; use member access for an accepted invitation.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Add the right person with the right access while preserving an invitation trail.

**Limits and recovery.** Email delivery is disabled in the reviewed build. Recording an invitation or delivery request is not sending email. Verification, activation, accepted invitation and effective permissions are separate states. Deactivation is a protected action that revokes sessions and pending links while retaining business history; self/last-administrator safeguards apply. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/users/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:170>).

## Member access

**Open:** `/en/dashboard/settings/users/update/[id]`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** users.read. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** A selected member's current/proposed role assignments, review differences, identity confirmation and command history.

**How to use it.**

1. Select intended roles, review changes and reasons, confirm identity and submit the protected access change.
2. Reload history/current membership to verify the result; resolve stale comparisons before retrying.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Keep access changes accountable and appropriately scoped.

**Limits and recovery.** Viewing a member does not grant authority to change every role. Self-access and last-custodian safeguards may block a change; this is not a general personal-profile editor. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](workflows.md) · [Role routines](role-playbooks.md) · [Control evidence](controls.csv) · [Technical notes](technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/users/update/[id]/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:177>).



---

# Evidence and verification notes

[Guide home](README.md)

Source inventory timestamp: 2026-09-06T16:50:15.390Z. Package assembly: 2026-09-06T16:50:20.522Z.

The browser entry attempt to http://localhost:3000/en/dashboard redirected to http://localhost:3000/en/login. No dashboard UI was observed after authentication; no dashboard control was exercised. No screenshots of business data were captured. No account, invitation, transaction, configuration, migration, seed or application source was changed by this documentation task. Earlier work in this conversation is outside this inspection's change scope.

## Coverage

130 route patterns; 108 source-only; 7 redirect; 7 partial; 7 shared implementation; 1 placeholder. These source classifications are mutually exclusive. Runtime blocking overlaps all 130 routes; it must not be added as a separate disjoint route count. Dynamic patterns represent a page type, not every database record. No representative authorized record was available.

The register contains 3532 rows: 74 explicitly source-reviewed control instances plus static JSX candidates. A repeated shared control can have one row per route; these are not unique live controls. Candidate rows include unresolved translations, dynamic labels, conditional/dormant code and shared barrel exports. Every extracted candidate has either an explanation or an explicit uncertainty; this is not proof that dynamic runtime-only controls are exhaustively known.

## Source and navigation

[Coverage register](coverage.csv) · [Control register](controls.csv) · [Navigation inventory](<E:/ohada saas/Focused projects/stoquify/what-next/dashboard-user-guide/evidence/navigation.csv>) · [Source manifest](<E:/ohada saas/Focused projects/stoquify/what-next/dashboard-user-guide/evidence/source-manifest.csv>) · [Verification log](<E:/ohada saas/Focused projects/stoquify/what-next/dashboard-user-guide/evidence/verification.json>). 17 application route-handler files are recorded separately as non-page endpoints; they are not counted as dashboard pages. Test fixtures, backup page files and non-page helpers are not page routes.

Current source route/component/action/service files take precedence over planning reports. Knowledge-graph reports dated 2026-08-09 were consulted for relationships; they predate this snapshot and cannot prove new behavior. No certification, external provider connectivity, statutory suitability, security audit or accessibility conformance is asserted.

## Unresolved navigation destinations

- My Profile: `/en/dashboard/profile` — no page route discovered; [components/UserDropdownMenu.tsx:183](<E:/ohada saas/Focused projects/stoquify/components/UserDropdownMenu.tsx:183>).
- Settings (account menu): `/en/dashboard/settings` — no page route discovered; [components/UserDropdownMenu.tsx:183](<E:/ohada saas/Focused projects/stoquify/components/UserDropdownMenu.tsx:183>).
- Billing & Plans: `/en/dashboard/billing` — no page route discovered; [components/UserDropdownMenu.tsx:183](<E:/ohada saas/Focused projects/stoquify/components/UserDropdownMenu.tsx:183>).

## Focused supporting tests read

Existing tests were read, not run, for POS close/cash-only checkout, inventory transfer posting/separate approval, AP read-only presentation, customer statement preparation/delivery, analytics provenance and reconciliation controls. No broad build/test suite was needed for documentation.

- [components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx:1](<E:/ohada saas/Focused projects/stoquify/components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx:1>)
- [services/inventory/__tests__/inventory-transfer.service.test.ts:1](<E:/ohada saas/Focused projects/stoquify/services/inventory/__tests__/inventory-transfer.service.test.ts:1>)
- [components/purchasing/__tests__/APControlWorkbench.presentation.test.tsx:1](<E:/ohada saas/Focused projects/stoquify/components/purchasing/__tests__/APControlWorkbench.presentation.test.tsx:1>)
- [components/customers/__tests__/CustomerStatementWorkflow.test.tsx:1](<E:/ohada saas/Focused projects/stoquify/components/customers/__tests__/CustomerStatementWorkflow.test.tsx:1>)
- [services/analytics/__tests__/financial-reports.service.test.ts:1](<E:/ohada saas/Focused projects/stoquify/services/analytics/__tests__/financial-reports.service.test.ts:1>)
- [services/pos/__tests__/cash-payment-history.service.test.ts:1](<E:/ohada saas/Focused projects/stoquify/services/pos/__tests__/cash-payment-history.service.test.ts:1>)
- [components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx:1](<E:/ohada saas/Focused projects/stoquify/components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx:1>)

## Review lenses

| Lens | Applied to the guide |
|---|---|
| Platform/backend/data | Route inventory, read sources, effects, caps, aliases and evidence lineage. |
| Security/privacy | Tenant/role scope, redaction, fresh identity, independent actors and export restrictions. |
| Frontend/UX/localization | Labels, navigation, forms, state/recovery and material English/French differences. Runtime accessibility and mobile layout remain unverified. |
| Finance/accounting/controls | Distinct operational and posted figures, payment settlement, stock posting and close gates. |
| HR/payroll/country packs | Identity, frozen source inputs, guarded run stages and declaration evidence. |
| Reliability/integrations | Polling, stale/error behavior, disabled mail, incomplete UI and provider/receipt boundaries. |
| Product/adoption/modularity | Practical role routines, selection versus grants/activation, workflow handoffs. |
| AI/assurance | Brief/proposal evidence, human decisions, incident and certification limits. |
| Migration/deployment/cost changes | Not applicable: read-only documentation; no deployment, migration or performance/cost change was requested. |

The review used coordinated specialist source reviewers. Recommendations are operating suggestions grounded in this snapshot; they are not new product requirements.

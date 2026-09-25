const root=process.cwd().replaceAll('\\','/');
const S=(f,n=1)=>`[Source: ${f}:${n}](<${root}/${f}:${n}>)`;
const modules={
 'command-center':{title:'Command pages and daily management',intro:'Use these pages to select the next piece of work. They summarize evidence and link to the workspace that owns the transaction. A summary acknowledgement or an AI proposal does not complete the underlying task.',audience:'Owners and managers.',prerequisites:'The current organization, permitted location scope and upstream operational evidence determine what appears.',outcome:'For presentation changes, check the period/location and update timestamp. For review or proposal commands, inspect their receipt/history and then verify the business outcome at its source.',recovery:'Missing/redacted evidence is a reason to narrow the conclusion or obtain authorized source review.'},
 'analytics-sales':{title:'Analytics, reports and daily sales',intro:'These pages help explain activity. Always read source, date range, location and freshness before comparing numbers. Different report families deliberately use different source contracts; see the metric dictionary.',audience:'Owners, managers, sales supervisors and finance analysts.',prerequisites:'Reporting access and relevant sales/session/inventory evidence must exist. Organization timezone and currency must be valid.',outcome:'Confirm that the selected report/period is displayed and check its source/generated timestamp; opening or refreshing a report does not finalize transactions.',recovery:'Try the offered Retry/Refresh after a failed read; widen filters only after checking the selected dates and access.'},
 inventory:{title:'Inventory and product setup',intro:'Set up product identity and measurement first, then use controlled receipts/transfers to change stock. Item metadata, movement history and loss analysis answer different questions.',audience:'Inventory, purchasing and operations staff.',prerequisites:'Use the relevant inventory read/create/update authority, an accessible item/location and required category/unit/tax/supplier master data. Commands can have stricter module/state checks than page access.',outcome:'For master-data saves, reopen the saved row. For receipts or transfer approval, confirm the resulting stock and movement evidence at the affected locations.',recovery:'If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata.'},
 customers:{title:'Customers and statements',intro:'Use the directory for identity and account segmentation, order pages for individual transactions, and statements for a dated, immutable customer-account snapshot. Delivery is a separate controlled action.',audience:'Sales, customer-service and finance staff.',prerequisites:'The customer must belong to the active organization. Creating/editing, exporting and delivering statements require their own permissions and, where requested, fresh identity.',outcome:'Verify the saved customer or statement number/version. A delivery queue receipt proves a queued request; inspect later delivery evidence before claiming the recipient received it.',recovery:'Resolve invalid contact/date inputs and refresh the current record after conflicts. Check history before repeating a potentially completed write.'},
 purchasing:{title:'Suppliers, purchase orders and AP monitoring',intro:'The supported purchase-order journey is draft, submit, independent approval, receiving and completion. The AP control dashboard monitors invoice/payment readiness; it does not expose a complete financial execution UI.',audience:'Purchasing, receiving and accounts-payable teams.',prerequisites:'Valid supplier, receiving location and item records; permitted purchasing access; independent approval where required; state-specific commands.',outcome:'Confirm the saved order/status, received and outstanding quantities, receipt disposition and resulting stock history. Supplier proposals and AP readiness are separate evidence states.',recovery:'Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal.'},
 'pos-cash':{title:'Point of sale and cash accountability',intro:'The current checkout exposes cash tender and no receipt delivery. Opening a shift, editing a cart, charging a sale and closing a shift all persist state. The cash drawer workspace helps reconcile the resulting physical-cash evidence.',audience:'Cashiers, store managers and cash-control staff.',prerequisites:'Accessible location, configured available terminal, assigned cashier/drawer as applicable, active shift and stock eligible for sale. Server permissions and current session state govern actions.',outcome:'After Charge, inspect order number, total/change and returned posting evidence. After Close, confirm the session closed and the counted cash/variance persisted.',recovery:'A failed close retains inputs for correction. Inspect current session/order state before repeating a submission; hardware readiness labels alone do not prove a device is connected.'},
 finance:{title:'Finance, cash evidence and reconciliation',intro:'Use finance views to locate exceptions and compare operating activity. Several totals are capped, mix time scopes or use unusual operational formulas. Reconciliation is the evidence bridge to provider/statement settlement; accounting reports are the posted-ledger view.',audience:'Finance staff, owners, cash managers and reconciliation reviewers.',prerequisites:'Appropriate finance/reconciliation permissions, organization and location context, supported payment/provider evidence and independent reviewer/fresh identity for protected commands.',outcome:'For reads, confirm filters, currency and freshness. For reconciliation, inspect the persisted run/match/suspense state; signed certificate export requires current valid evidence and its own authority.',recovery:'Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals.'},
 accounting:{title:'Accounting, reports and close assurance',intro:'Accounting reports derive from posted ledger evidence. Setup readiness, a draft, approval, posting, close review and certified export are different stages. This guide explains application behavior; it makes no professional or statutory certification claim.',audience:'Accounting administrators, accountants, reviewers and authorized owners.',prerequisites:'Accounting permissions, configured currency/country pack, valid mappings and journals, open period and postable accounts; mandates for external accountant access; required independent/fresh-identity checks.',outcome:'Verify the persisted state and source/audit links. For posting, inspect ledger evidence; for close, inspect current assessment/review and the eligible exported pack rather than just a green readiness badge.',recovery:'Resolve lookup/setup/period blockers at the source. A new or changed source can invalidate earlier review/certification evidence.'},
 'people-payroll':{title:'People, payroll and employee self-service',intro:'People pages govern identity and change approvals; payroll pages assess source readiness and advance protected payroll stages. Several source workbenches are read-only. A calculated run is only one step toward issued payslips, payments, declarations and accounting evidence.',audience:'Employees, managers, HR administrators, payroll operators and independent reviewers.',prerequisites:'Correct employee-user mapping, responsibility scope, reviewed contract/compensation, frozen attendance, approved payment destination and applicable reviewed country-pack/period evidence. Sensitive data is permission-scoped and may be redacted.',outcome:'Confirm the request/review/application or run/batch/declaration state and supporting proof. Verify emitted documents and actual settlement/authority response separately.',recovery:'Use named blockers to find the responsible source process. Do not manufacture hashes, approval identities or payment references to make a readiness screen green.'},
 governance:{title:'Compliance and assurance',intro:'These workspaces show evidence, exceptions and governed review decisions. Adapter status, acknowledgement, suppression, waiver and authority acceptance have different meanings.',audience:'Compliance operators, control owners, independent reviewers and authorized managers.',prerequisites:'Country/module/incident scope, permitted evidence access and action-specific authority. Submission readiness depends on actual adapter credentials, reviewed capability and source evidence.',outcome:'Inspect the resulting incident timeline or the documented preparation/execution/response state. Only an actual authority/provider response can establish external acceptance.',recovery:'Use Retry for failed reads and follow the indicated blocker to its source. Acknowledging or suppressing an incident does not fix its underlying transaction.'},
 settings:{title:'Settings, access and workspace composition',intro:'Settings establish organization context and access. Read the full review before applying changes: drafts, current configuration, permission grants, operational stops and successful preparation are different things. This chapter also covers account and notification demonstration routes.',audience:'Organization owners, authorized administrators and individual account users.',prerequisites:'Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation.',outcome:'Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.',recovery:'For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state.'}
};
const documents={
 README:`# Stoquify dashboard user guide

This guide explains what the current dashboard shows, how to use its controls, and how to turn its signals into completed work. It covers {{TOTAL}} dashboard route patterns, including administrative, hidden, dynamic, shared and legacy entry points. Evidence date: **{{SOURCE_DATE}}**.

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

{{CHAPTERS}}

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

Source classifications: **{{COUNTS}}**. Browser-inspected dashboard pages: **0**. One browser entry attempt was blocked at sign-in; all {{TOTAL}} route patterns remain unverified at runtime. Blocking overlaps the source categories and must not be added to them.

The control register contains **{{CONTROLS}} rows**, including reviewed controls and static candidates repeated across routes. This is not a count of unique functioning controls. Unresolved labels, shared exports and dormant branches are marked; the narrative and reviewed-control rows take precedence over raw candidate extraction.

The canonical publication is under docs/dashboard-user-guide with matching Markdown/PDF reports. The requested inspection package is also maintained under what-next/dashboard-user-guide, including the evidence and CSV registers.
`,
 'shared-controls':`# Shared navigation, controls and recovery

[Guide home](README.md)

## Organization and navigation

Before viewing balances or making a change, confirm the active organization and permitted location. The top organization banner shows identity/role context; its **Live** badge is a static label, not a successful-refresh signal. The separate account menu currently contains hardcoded **User**, **Stoquify** and **Pro** display text. Do not infer subscription or authority from those labels.

The sidebar exposes permitted destinations by group. Expand a module to find its children; use the mobile navigation drawer where appropriate. Top search searches **navigation destinations**, matching titles, parents, sections and module slugs. It returns up to seven results; Enter opens the first. It does not search customers, orders or stock records. Search inside the relevant directory to find those records.

Open website navigates to the public site. The language switch selects EN/FR routes. Theme and sound controls change presentation/preferences. Sign out terminates the session. Account-menu Profile, Settings and Billing & Plans links currently point to dashboard paths with no page route in this inventory; use the specific working settings links instead. Help & Support is outside this dashboard inspection.

${S('components/dashboard/Navbar.tsx',107)}; ${S('components/UserDropdownMenu.tsx',183)}.

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

${S('components/NotificationMenu.tsx',35)}; ${S('app/[locale]/(dashboard)/dashboard/settings/notifications/NotificationsSettingsClient.tsx',62)}.
`,
 'metric-dictionary':`# Metric dictionary: what the numbers actually mean

[Guide home](README.md)

These definitions describe the reviewed implementation. They are especially useful when two pages show different totals for what looks like the same business question. No live organization values were inspected. Examples below are illustrative, not actual accounts.

## Before comparing two amounts

Check organization, location, currency, time range, date basis, included statuses, source, data cap and snapshot freshness. Compare the same basis first. A discrepancy can be a definition difference rather than lost money.

## Company summary

**Gross paid payment total** sums all non-deleted PAID payment amounts for the active organization, covering sales-linked and purchase-linked payments, across all dates and before refund deductions. An illustrative 100 paid customer receipt plus 60 paid supplier payment yields 160 in this metric; it does not mean revenue of 160 or cash of 40. The latest source deliberately replaces the earlier Paid revenue wording.

The directory is only the current organization. Related Users, items, locations, partners, orders and payments are raw relation counts without active/deleted filtering on each relation. Users is therefore not an active-user count. The settings query is cached with five-minute freshness; Refresh before reviewing/exporting. Currency is not editable in the organization profile form.

${S('services/organization/organization-settings.service.ts',105)}; ${S('services/organization/organization-settings.service.ts',125)}; ${S('services/organization/organization-directory-export.service.ts',78)}.

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

${S('services/dashboard/dashboard-read-model.service.ts',233)}; ${S('services/dashboard/dashboard-read-model.service.ts',347)}; ${S('services/dashboard/dashboard-read-model.service.ts',557)}; ${S('hooks/useDashboardData.ts',26)}.

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

${S('services/finance/finance-dashboard.service.ts',555)}; ${S('services/finance/finance-dashboard.service.ts',742)}; ${S('services/finance/finance-dashboard.service.ts',798)}; ${S('hooks/finance/useFinanceDashboard.ts',24)}.

## Analytics reports

| Report | Interpretation |
|---|---|
| Financial Summary | Completed/delivered order revenue; estimated cost uses current item cost price times sold quantity. Later item-cost changes can change that estimate. Payment-method breakdown does not restrict related payment status. |
| Cashier Performance | Sessions selected by session-start date and their eligible sales. Active-session hours use elapsed time. This differs from selecting every individual sale strictly by its timestamp. |
| Item Performance | Period sales mixed with current inventory and cost. Use Revenue/Quantity/Profit/Margin sorting to answer different questions. |
| Cash Flow | Cash-drawer transaction types. Running balance starts at zero for the range; it is accumulated flow, not an independently established opening/bank balance. |

Reports expose source/generation/period/row-count/currency/filter-hash provenance. They are internal management reports, explicitly separate from statutory certified exports or signed close packs. The report page's location comes from URL/context, not a visible location picker. The 7 days shortcut subtracts seven days and includes both endpoints, potentially eight dates; This month includes month-end. Always check the displayed dates.

Charts inherit the report's units and scope. Time-series horizontal axes use the selected date range; value series use displayed currency, and quantity/count series use their named units. Ranked product/category charts compare those groups rather than dates. No unobserved hover, zoom or drill-through behavior is promised.

${S('services/analytics/financial-reports.service.ts',201)}; ${S('services/analytics/financial-reports.service.ts',281)}; ${S('app/[locale]/(dashboard)/dashboard/analytics/reports/ReportsClient.tsx',143)}.

## Daily sales

Daily Sales prefers a stored daily report and shows its original recording time and draft/finalized status. Saved cash/tender facts come from that stored report. Without one, the service aggregates eligible orders for the organization-local reporting day and selected active or retained historical location. Cash/session/tender facts stay unavailable; they are not invented from order totals. With zero orders, AOV is unavailable. Refresh rereads source; it does not regenerate/finalize a report. The query is stale after 30 seconds, has no explicit polling timer and disables retries.

${S('services/analytics/daily-sales-read.service.ts',29)}; ${S('components/analytics/CompleteIntegratedDailySalesDashboard.tsx',54)}.

## Stock, shifts, history and proof

Transfer list counters describe the currently returned/filtered data; the list requests only the first 50 transfers. Detail lookup searches the first 100. Do not call these all-time totals.

POS Paid, Due and Change are tender previews before Charge succeeds. Currency comes from the selected location's organization, with a USD fallback in this component; verify setup if the currency is unexpected. Network/printer readiness fields are presentation values, not physical-device tests.

Cash/payment history has cash-event and payment-capture lanes. Do not add both as independent revenue receipts. Physical expected cash uses signed cash-event impacts; closing counts have zero cash impact. Variance subtracts expected cash from recorded closing counts for the selected events. Electronic tenders are excluded from physical cash. Dates are parsed as UTC calendar boundaries while displays use organization timezone; inspect midnight-adjacent timestamps. Generation, recorded-through and effective-as-of are separate.

AP readiness counts represented posted invoices, pending-payment invoices, released payments, matching/bank-change exceptions and blockers. A stale indication can appear after 15 minutes using its evaluated timestamp. Ready means no represented blocker, not settled accounts or certified close.

Accounting trial-balance totals remain full-report totals when its local account table is filtered. Financial statements use posted ledger classification. Management EBITDA adds income tax, finance costs, depreciation and amortization to net income and is explicitly not a statutory subtotal.

${S('components/inventory/transfers/TransferDashboard.tsx',139)}; ${S('services/pos/cash-payment-history.service.ts',586)}; ${S('components/purchasing/APControlWorkbench.tsx',248)}.
`,
 'control-notes':`# Detailed controls and consequential actions

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

${S('components/modules/ModuleCompositionWorkbench.tsx',453)}; ${S('services/modules/module-composition.service.ts',383)}; ${S('services/modules/module-stop-policy.service.ts',23)}.

## Company, role and member changes

Company **Actions → Edit profile** opens the Company DNA form. **Identity**, **Regional**, **Calendar**, **Review**, **Previous**, **Next**, **Save organization** guide name, industry/address, region, language, timezone and fiscal/inventory start dates. Currency is locked. Updates require system.organization.update. On conflict use **Load latest for comparison**, **Keep my edits and review** or **Use the saved version**.

**Set up another organization** opens a handoff: **Open owner registration**, **Sign in to an existing organization**, **Back to this organization**. It does not directly create another tenant. **Export → Prepare reviewed CSV** checks current-organization scope, reports.export and fresh identity; **Confirm identity** may be required. **Retry same export request**, **Download prepared file again**, **Reload and review current data** distinguish replay from a new review.

Role form controls include **Role name (English)**, optional French name, **Purpose and responsibilities**, **Find a permission**, permission categories and risk-labelled checkboxes. **Review changes → Save reviewed role** saves definition and audit together. Every member using the role is affected. Existing out-of-authority grants may be preserved but not freely added. **Confirm identity** does not bypass another explicit review/save. Conflict/retry controls retain the intended draft or retry the same save.

Users supports search, activation/verification filters, **Clear filters**, **Refresh**, **Export matching members**, Users/Invitations tabs. **Deactivate → Review account deactivation** requires a 3–400-character reason; **Confirm deactivation** stops sign-in, revokes sessions and cancels pending invitation links while retaining business history. Self/last-administrator guards apply.

Member access changes role assignments/reactivation, not arbitrary profile fields. Enter **Reason for this change → Review changes → Confirm access change**. **Confirm password** verifies identity; confirm the change explicitly afterward. Successful access changes revoke member sessions. **Reload and compare** preserves selections/reason; **Retry same request** resolves uncertainty. Reactivation has verification and matching deactivation-evidence requirements.

**Invite user → Invite a colleague** requires Email address and an authorized Role. **Record invitation** creates the reviewed request; links expire after seven days. Email transport is disabled in this build. **Replace invitation** invalidates the old link and records a replacement with a reason. **Cancel invitation** invalidates the link, not an already accepted member account. **View history**, **Refresh history**, **Load older decisions** expose request/delivery-attempt evidence. Refresh status as of the displayed check time before reissuing.

${S('components/settings/OrganizationSettingsForm.tsx',592)}; ${S('components/settings/OrganizationDirectoryExport.tsx',68)}; ${S('components/settings/MemberAccessEditor.tsx',104)}; ${S('services/users/user-invitation-history.service.ts',74)}.

## Master-data onboarding

Choose Customers, Suppliers or Items from permitted targets; **Download template**, select a CSV up to 5 MB/1,000 rows, then **Run dry validation**. This records staging evidence but creates no business master records yet. Inspect source hash, mapping version, valid/error/duplicate counts and row issues. Approve the exact reviewed data using the acknowledgement and **Record explicit approval**; only a fully valid run is eligible. **Commit through domain owners** creates approved records and records resulting IDs/counts. **Export evidence manifest** preserves the handoff evidence.

High risk needs a different authorized approver; examples include at least 100 rows, supplier creation, a positive customer credit limit or item price values. Supported scope is new master data. Current balances, opening stock/accounting balances, historical transactions, merges/updates/deletes and automatic rollback are excluded. A paused batch needs its specific conflict resolved and controlled replay, not an invented clean slate.

${S('services/onboarding/master-data-import.service.ts',32)}; ${S('components/onboarding/MasterDataOnboardingWorkbench.tsx',364)}.

## Purchasing and transfer operations

Purchase order detail uses state/permission rules: DRAFT **Submit** requires lines; submitted **Approve** requires a different user with approval authority; eligible approved/partial orders offer **Receive Items**; fully received orders offer **Complete Order**. Short-close is unavailable. **Cancel Order** is state/permission-dependent; its reason currently falls back to “Cancelled by user.” Clone needs create authority. **Print** opens the browser print dialog.

Receiving requires positive integer line quantities. **Receive All Available** fills remaining ordered quantities; **Clear All** resets them. Optional supplier lot/expiry fields depend on item tracking; serial-tracked items indicate generated serials. **Receiving inspection outcome** is required: Passed releases available inventory; Failed/Incomplete holds stock and requires **Hold reason**. Optional notes preserve inspection evidence. Held stock blocks availability and supplier-invoice matching until authorized resolution; this modal does not resolve the hold. Verify the **Receipts**, **Inventory** and **History** tabs after success.

Supplier acknowledgement: approved PO → **Issue invitation** (optional recipient reference defaults to supplier email) → **Copy link**. No email send button is provided. **Revoke**, **Accept proposal**, **Reject proposal** need a 3–500-character reason. Issuance/review require purchase-order update authority and identity verified within five minutes, with no inline password step-up in this workbench. Accepting a proposal records BUYER_ACCEPTED history without changing authoritative order quantities/dates, stock, AP or accounting.

Transfers: **Create Transfer** requires distinct locations and at least one positive quantity no greater than available stock; repeated additions aggregate and recheck stock. **Approve Transfer** appears for a DRAFT and an actor other than the creator. It immediately posts paired TRANSFER_OUT/TRANSFER_IN and sets COMPLETED. There are no separate ship/receive/cancel/reject buttons in this flow. Priority/internal notes are collected but omitted from the service payload. Older records outside the bounded detail lookup can show an indefinite loading presentation.

AP workbench controls are navigation only: **Open AP history**, **Open suppliers**, **Review history** and supplier-profile links. There are no local search/date filters or invoice execution buttons. Reload the page to get a new source snapshot.

${S('services/purchase-order/purchase-order-capabilities.ts',75)}; ${S('components/purchase-orders/ModernPurchaseOrderDetailPage.tsx',621)}; ${S('services/purchase-order/supplier-po-acknowledgement.service.ts',1185)}; ${S('services/inventory/inventory-transfer.service.ts',806)}.

## POS and physical cash

**Open** creates the shift from selected location/terminal and Opening float. An occupied terminal is blocked. Product add and quantity/remove controls change the persisted cart; quantities commit on blur/keyboard and invalid/rejected input returns to persisted state. Changing location is blocked when the draft contains lines. Customer selection is location-scoped; Walk-in customer clears a named customer.

**Grid**, **List**, **Touch mode**, All/Favorites/Recent, category and favorite controls change local presentation. Favorites/recent are component state. Product details do not supply the promised future supplier/movement/price-history panels.

**Exact cash** and quick amounts fill tender. **Add tender** adds a cash row; the final row cannot be removed. **Charge {amount}** requires an active shift, cart and sufficient positive tender; success gives order number, total/change and posting evidence. Current options are Cash and No receipt. **Park sale** and **Override** show a backend-workflow warning only.

**End shift / Close** requires an explicitly typed nonnegative cash count, up to 12 integer and 2 fractional digits. Empty is not zero. Nonzero variance at currency precision requires an explanation. A failure retains the dialog/input. Receipt history Search/Select sale/Revoke is separately permission-gated; revoking access does not refund or erase the sale. Offline **Retry** refreshes evidence, not enrollment, replay or conflict resolution.

Keyboard controls in source: Ctrl/Cmd+K focuses search, F4 opens customer selection when a location exists, F8 focuses tender, Escape clears searches. These shortcuts were not exercised in a live dashboard session.

${S('components/pos/ProfessionalPOSSystem.tsx',308)}; ${S('components/pos/ProfessionalPOSSystem.tsx',665)}; ${S('components/pos/ProfessionalPOSSystem.tsx',955)}.

## Statements and payment reconciliation

Customer **Generate immutable statement** requires period start/end, read-only organization currency and current password. Inverted dates are blocked; the end uses UTC end-of-day capped at now. Inspect statement number/version, open-item count, closing balance, As of, Recorded through and hash. A truncation warning limits completeness; this form has no export button. **Queue secure delivery** requires Email/WhatsApp destination, explicit consent, optional Allow disputes/Allow promises to pay and password again. Default access lifetime is 30 days. Inspect queue status/redacted destination/expiry; no dashboard revoke button is wired.

Reconciliation **Import** accepts an active provider account and CSV/JSON file or pasted content. Review currency and file errors. **Run** persists reconciliation; the current button uses today as businessDate, not the displayed dashboard filter's date. Review residual amounts/currencies before **Propose match**. An authorized independent reviewer uses **Approve match** with fresh identity and expected evidence revision. The original preparer can **Replace with current evidence** and review a stale proposal again. Suspense follows Assign → propose reclassification → authorized approval.

**Sign** needs signing permission and identity verified within five minutes. Its button has no equivalent inline password form to the manual-match step. **Export** downloads a signed JSON certificate only for an eligible signed run and with separate export/fresh-identity authority. Changed source after signing can invalidate export; rerun/review the evidence. **Retry access check** and a new-tab sign-in support access recovery; a failed read preserves draft amounts for correction.

${S('components/customers/CustomerStatementWorkflow.tsx',91)}; ${S('components/finance/PaymentReconciliationWorkbench.tsx',479)}; ${S('services/reconciliation/payment-reconciliation-certification.service.ts',1053)}.

## People, payroll, accounting and assurance

People approvals separate **Approve**, **Reject** and **Apply**. The source can require an independent operator after approval; requesters cannot review their own request. Give the reason and required evidence hash, then confirm the resulting history/state.

Payroll Runs exposes only service-approved next actions: **Open calculation drawer**, **Open review drawer**, **Open approval drawer**, **Open emission drawer**, **Open posting drawer**, **Open declaration drawer**, **Open payment request drawer**, **Open payment approval drawer**, **Open payment release drawer**. Each shows source proof, permission, Fresh auth and Maker-checker where relevant. Supply its requested date/evidence/payment inputs; do not fabricate proof hashes. Requesting, approving and releasing a payment batch use distinct actors as required. Payments records later settlement proof. Declarations queues adapter work and awaits evidence of execution/response.

Accounting **Create draft** saves balanced lines; **Post** produces ledger evidence; **Reverse** creates a retained reversal trail. **Run assessment**, **Assign to me**, comments, waiver requests, accountant review and close exports each create or use separate evidence. **Ready to close** is a review decision, not automatically the period-close action. Draft and certified JSON exports have different gates.

Assurance **Acknowledge**, **Assign**, **Resolve**, **Suppress**, **Request waiver**, **Approve waiver**, **Reopen** are separate state changes. Enter the action-specific owner/due date/reason/evidence/expiry and **Apply action**, then inspect the timeline. A waiver or suppression does not correct the original record.

${S('components/hris/HrisApprovalInbox.tsx',47)}; ${S('components/payroll/PayrollRunActionPanel.tsx',56)}; ${S('components/accounting/CloseAssuranceCenter.tsx')}; ${S('components/assurance/AssuranceIncidentActions.tsx')}.
`,
 'workflows':`# Cross-page workflows

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
`,
 'role-playbooks':`# Role playbooks: get practical value from the dashboard

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
`,
 'limitations-and-blockers':`# Limitations and verification blockers

[Guide home](README.md) · [Coverage](coverage.csv) · [Control inventory](controls.csv)

## What was and was not verified

The browser entry to the dashboard redirected to /en/login. **Zero authenticated dashboard pages were inspected and zero business controls were exercised.** All {{TOTAL}} route patterns were documented from source, but remain blocked for runtime verification. No authorized representative dynamic record was available. No business-data screenshots were captured, credentials sought, guard bypassed or successful walkthrough invented.

Source coverage is {{COUNTS}}. These classifications concern implementation, while runtime blocking is an overlapping dimension. Source-only means code-backed explanation without a demonstrated runtime outcome; it does not certify the feature.

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
`
};
const reviewedControls=[];
function C(routes,labels,purpose,prerequisites,effect,result,evidence,uncertainty){reviewedControls.push({routes:routes.map(r=>'/en/dashboard'+r),labels,purpose,prerequisites,effect,result,evidence,uncertainty});}
C(['/settings/modules'],['Configure','My workspace','Change history'],'Choose module-workbench view','Manage system settings read access','Changes active view','Selected panel','components/modules/ModuleCompositionWorkbench.tsx:453');
C(['/settings/modules'],['Retailer','Service business','Current configuration'],'Populate the draft selection','Manage system settings read access','Changes local draft; does not apply workspace','Draft needs review','components/modules/ModuleCompositionWorkbench.tsx:453');
C(['/settings/modules'],['Find a capability','Show capabilities'],'Narrow capability catalog','Module workbench access','Filters view, not grants','Filtered catalog','components/modules/ModuleCompositionWorkbench.tsx:489');
C(['/settings/modules'],['Save draft'],'Persist configuration draft','Write permission and fresh identity when required','Records draft without applying','Saved draft','components/modules/ModuleCompositionWorkbench.tsx:256');
C(['/settings/modules'],['Review configuration'],'Obtain authoritative preview','Current revision and permitted scope','Reads current grants/dependencies/setup and prepares review','Reviewed plan/conditions','components/modules/ModuleCompositionWorkbench.tsx:238');
C(['/settings/modules'],['Apply configuration','Verify identity and apply'],'Submit exact reviewed configuration','Current review, required authority and fresh identity','Persists request; preparation and active revision may differ','Requested/preparing/active or failure state','services/modules/module-composition.service.ts:383');
C(['/settings/modules'],['Reopen as new draft'],'Reuse historical selection as new proposal','History/read and draft-write authority','Creates/reopens draft; does not roll back business records','Draft needing review','components/modules/ModuleCompositionWorkbench.tsx:541');
C(['/settings/company'],['Save organization'],'Save reviewed company profile','system.organization.update and required current identity','Persists allowed fields with revision controls; currency locked','Saved profile/revision or comparison conflict','services/organization/organization-profile-update.service.ts:55');
C(['/settings/company'],['Prepare reviewed CSV'],'Prepare controlled organization export','Organization read, reports.export, fresh identity','Checks reviewed snapshot and prepares actual CSV','Download/receipt or review conflict','components/settings/OrganizationDirectoryExport.tsx:68');
C(['/settings/company'],['Open owner registration','Sign in to an existing organization'],'Open another-organization setup handoff','Current page access','Opens designated new tab; no direct tenant creation','Registration/sign-in page','components/settings/OrganizationSetupHandoff.tsx:40');
C(['/settings/users'],['Record invitation'],'Record reviewed invitation','Authorized recipient role and fresh identity if required','Persists invite/delivery request; transport disabled','Recorded invitation; not sent email','services/users/user-invitation-history.service.ts:74');
C(['/settings/users'],['Replace invitation'],'Replace reviewed unaccepted invitation','Authority and required reason/review','Invalidates old link, records replacement','Replacement recorded; email still disabled','components/Forms/users/userInvitationForm.tsx:52');
C(['/settings/users'],['Cancel invitation'],'Invalidate reviewed invitation','Authority and reason/review','Cancels link, does not deactivate accepted member','Cancelled invitation','components/Forms/users/userInvitationForm.tsx:52');
C(['/settings/users'],['Confirm deactivation'],'Deactivate reviewed user','3–400-character reason, authority, fresh identity and self/custodian guards','Stops sign-in, revokes sessions and pending links; preserves business history','Deactivated account receipt','components/settings/user-directory-copy.ts:6');
C(['/settings/users/update/[id]'],['Confirm access change'],'Apply reviewed role/reactivation change','Change-specific authority, reason, review, fresh identity','Persists access change and revokes member sessions','Recorded access state/history','components/settings/MemberAccessEditor.tsx:104');
C(['/settings/roles/new','/settings/roles/update/[id]'],['Save reviewed role'],'Save permission definition','Create/update grant authority, review and identity','Saves role plus audit; affects members using role','Saved role/history','components/Forms/RoleForm.tsx:89');
C(['/settings/data-onboarding'],['Run dry validation'],'Stage and validate master-data CSV','Permitted target; up to 5 MB/1,000 rows','Writes staging batch/evidence without business master records','Validation issues/hash/risk counts','services/onboarding/master-data-import.service.ts:710');
C(['/settings/data-onboarding'],['Record explicit approval'],'Approve exact valid import','Fully valid current batch; independent high-risk approver','Records source/mapping-specific approval','Approved batch','services/onboarding/master-data-import.service.ts:792');
C(['/settings/data-onboarding'],['Commit through domain owners'],'Create approved master records','Approved writable batch and target create rights','Creates domain records and per-row evidence','Committed IDs/counts or paused conflict','services/onboarding/master-data-import.service.ts:960');
C(['/settings/security'],['Sign out other sessions'],'Revoke other sessions','Own-account authority; other sessions exist','Revokes sessions other than current','Other-session count refreshed','app/[locale]/(dashboard)/dashboard/settings/security/page.tsx:291');
C(['/settings/notifications'],['Send test','Security alert','Payment update'],'Test notification presentation','Settings notification access','Adds synthetic in-memory entry','Current queue updated, not real business event','app/[locale]/(dashboard)/dashboard/settings/notifications/NotificationsSettingsClient.tsx:303');
C(['/inventory/transfers'],['Approve Transfer'],'Post stock transfer','DRAFT; different authorized actor; valid available stock','Posts paired OUT/IN stock legs and completes transfer','COMPLETED + movement evidence','services/inventory/inventory-transfer.service.ts:806');
C(['/inventory/transfers'],['Create Transfer'],'Create transfer draft','Distinct locations; positive available item quantities','Persists draft; priority/internal notes omitted by action payload','DRAFT','actions/inventory/inventoryMovementActions.ts:54');
C(['/purchase-orders/[id]'],['Submit'],'Advance order for approval','DRAFT with lines and update authority','Submits draft','SUBMITTED','services/purchase-order/purchase-order-capabilities.ts:75');
C(['/purchase-orders/[id]'],['Approve'],'Approve submitted purchase order','Independent user with approval authority','Records approval','Approved eligible for receiving','services/purchase-order/purchase-order-capabilities.ts:75');
C(['/purchase-orders/[id]'],['Receive Items'],'Open receipt workflow','Eligible approved/partial order; receive authority','Opens quantity/inspection form; completion posts actual receipt','Receipt form, then evidence on submit','components/purchase-orders/ModernPurchaseOrderDetailPage.tsx:621');
C(['/purchase-orders/[id]'],['Receive All Available'],'Fill receipt quantities','Open receipt form','Fills remaining ordered quantities locally','Receipt draft for review','components/purchase-orders/ModernPurchaseOrderDetailPage.tsx:621');
C(['/purchase-orders/[id]'],['Complete Order'],'Complete fully received order','Fully received and update authority','Marks completion; short-close unsupported','Completed order','services/purchase-order/purchase-order-capabilities.ts:75');
C(['/purchase-orders/[id]/supplier-acknowledgement'],['Issue invitation'],'Create supplier acknowledgement access','Approved PO, update authority, identity within 300 seconds','Creates signed expiring access/snapshot; no email send','Link revealed for copy','components/purchase-orders/SupplierPoAcknowledgementWorkbench.tsx:131');
C(['/purchase-orders/[id]/supplier-acknowledgement'],['Copy link'],'Copy issued access URL','Issued URL available','Clipboard only','Copied URL, not delivered','components/purchase-orders/SupplierPoAcknowledgementWorkbench.tsx:227');
C(['/purchase-orders/[id]/supplier-acknowledgement'],['Accept proposal','Reject proposal'],'Record buyer decision','Update authority, fresh identity, 3–500-character reason','Records decision; no authoritative PO/stock/AP/ledger mutation','Buyer decision history','services/purchase-order/supplier-po-acknowledgement.service.ts:1185');
C(['/purchases/payables'],['Open AP history','Open suppliers','Review history'],'Open supporting workspace','AP read access and destination authority','Navigation only','Destination evidence page','components/purchasing/APControlWorkbench.tsx:280');
C(['/customers/[id]/statement'],['Generate immutable statement'],'Create dated statement snapshot','accounting.exports.create, valid dates, current password','Writes immutable statement evidence','Statement number/version/hash','components/customers/CustomerStatementWorkflow.tsx:91');
C(['/customers/[id]/statement'],['Queue secure delivery'],'Queue statement delivery','Snapshot, channel/destination, consent, fresh password/export authority','Queues outbound secure delivery','Queue receipt; not confirmed delivery','components/customers/CustomerStatementWorkflow.tsx:171');
C(['/pos'],['Grid','List','Touch mode'],'Change POS presentation','POS page access','Local presentation change','Selected view','components/pos/ProfessionalPOSSystem.tsx:1212');
C(['/pos'],['Exact cash'],'Fill tender amount','Active cart','Local amount set to exact due','Tender preview, no sale committed','components/pos/ProfessionalPOSSystem.tsx:1173');
C(['/pos'],['Park sale','Override'],'Unavailable advanced sale controls','POS page','Shows backend-workflow warning only','No parked/overridden sale','components/pos/ProfessionalPOSSystem.tsx:1179');
C(['/pos'],['Charge {amount}'],'Commit cash sale','Active shift/cart, sufficient positive cash tender','Commits replay-protected sale; receipt NONE','Order number, totals/change, returned posting evidence','components/pos/ProfessionalPOSSystem.tsx:955');
C(['/pos'],['Open'],'Open cashier shift','Available location/terminal and opening float','Creates cashier session/drawer setup','Active shift','components/pos/ProfessionalPOSSystem.tsx:685');
C(['/pos'],['End shift','Close'],'Close current shift','Explicit nonnegative count; nonzero variance reason','Opens/submits close flow according to control context','Closed session or retained inputs on failure','components/pos/ProfessionalPOSSystem.tsx:736');
C(['/finance/cash-payment-history'],['Search'],'Unfinished history search','History read access','Search is not applied by parsing/action mapping','Rows not filtered by this input','hooks/useCashPaymentHistoryWorkbench.ts:32','Partial implementation; use type/date filters');
C(['/finance/cash-payment-history'],['Export'],'Prepare export authorization','History export/fresh-identity/policy checks','Sets ready state; no CSV bytes/download','Ready authorization only','hooks/useCashPaymentHistoryWorkbench.ts:114','Partial implementation; no downloadable report from this path');
C(['/finance/reconciliation'],['Run'],'Run reconciliation','Active account/evidence and command authority','Persists run using today as businessDate','Run and candidate evidence','components/finance/PaymentReconciliationWorkbench.tsx:479');
C(['/finance/reconciliation'],['Sign'],'Sign eligible reconciliation run','payments.reconciliation.sign, identity within 300 seconds','Signs current eligible evidence','Signed run','actions/payments/reconciliation.actions.ts:264');
C(['/finance/reconciliation'],['Export'],'Download signed JSON certificate','Signed eligible run, separate export/fresh identity authority','Downloads certificate; changed source can invalidate eligibility','JSON file and signed evidence','components/finance/PaymentReconciliationWorkbench.tsx:519');
C(['/payroll/runs'],['Open calculation drawer','Open review drawer','Open approval drawer','Open emission drawer','Open posting drawer','Open declaration drawer','Open payment request drawer','Open payment approval drawer','Open payment release drawer'],'Inspect eligible payroll action','Service includes action in nextActions; record scope','Opens drawer showing required proof/authority; separate submit performs command','Action-specific review/form','components/payroll/PayrollRunActionPanel.tsx:56');
C(['/people/approvals'],['Approve','Reject','Apply'],'Record HR decision/application','Domain authority, reason/evidence and independent-actor restrictions','Performs selected controlled transition','Updated stage/history','components/hris/HrisApprovalInbox.tsx:47');
const testEvidence=[
 'components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx',
 'services/inventory/__tests__/inventory-transfer.service.test.ts',
 'components/purchasing/__tests__/APControlWorkbench.presentation.test.tsx',
 'components/customers/__tests__/CustomerStatementWorkflow.test.tsx',
 'services/analytics/__tests__/financial-reports.service.test.ts',
 'services/pos/__tests__/cash-payment-history.service.test.ts',
 'components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx'
];
module.exports={modules,documents,reviewedControls,testEvidence};

# Finance, cash evidence and reconciliation

[Guide home](../README.md) · [Shared controls](../shared-controls.md) · [Detailed control notes](../control-notes.md) · [Metric dictionary](../metric-dictionary.md)

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

**Limits and recovery.** These are capped operational read models with mixed period/current-balance scopes. The displayed profit calculation subtracts purchases, expenses and refunds from revenue; it is not conventional ledger gross profit. Finance collected payments can include PENDING records. See the metric dictionary. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** Proof visibility is role-filtered. An unavailable proof drawer or source does not establish that the underlying financial record is absent. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** These are capped operational read models with mixed period/current-balance scopes. The displayed profit calculation subtracts purchases, expenses and refunds from revenue; it is not conventional ledger gross profit. Finance collected payments can include PENDING records. See the metric dictionary. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** The visible Search input is not applied by this source path. Export prepares authorization and a ready state but does not generate/download a CSV. The drawer explicitly marks proof unavailable. Use type/date filters and source evidence; do not expect those unfinished controls to complete the task. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** These are capped operational read models with mixed period/current-balance scopes. The displayed profit calculation subtracts purchases, expenses and refunds from revenue; it is not conventional ledger gross profit. Finance collected payments can include PENDING records. See the metric dictionary. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** These are capped operational read models with mixed period/current-balance scopes. The displayed profit calculation subtracts purchases, expenses and refunds from revenue; it is not conventional ledger gross profit. Finance collected payments can include PENDING records. See the metric dictionary. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** This balance view is separate from the read-only AP control workbench. It does not prove a complete invoice-to-payment command UI exists. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** A saved payment status alone does not establish a matched bank/provider transaction. Check whether totals cover the filtered/current page or another server summary. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** These are capped operational read models with mixed period/current-balance scopes. The displayed profit calculation subtracts purchases, expenses and refunds from revenue; it is not conventional ledger gross profit. Finance collected payments can include PENDING records. See the metric dictionary. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** These are capped operational read models with mixed period/current-balance scopes. The displayed profit calculation subtracts purchases, expenses and refunds from revenue; it is not conventional ledger gross profit. Finance collected payments can include PENDING records. See the metric dictionary. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** Historical events, outstanding items and current balance are different views and may not share the same totals. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** Current customer balance can differ from a historical statement; finance overview customer summaries also have an active/top-record cap. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** Import, Run, Sign, Assign, Propose match and Approve match can write records. Replacing stale evidence requires a fresh review; a manual reference cannot establish provider payment authority. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** These are capped operational read models with mixed period/current-balance scopes. The displayed profit calculation subtracts purchases, expenses and refunds from revenue; it is not conventional ledger gross profit. Finance collected payments can include PENDING records. See the metric dictionary. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** These are capped operational read models with mixed period/current-balance scopes. The displayed profit calculation subtracts purchases, expenses and refunds from revenue; it is not conventional ledger gross profit. Finance collected payments can include PENDING records. See the metric dictionary. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** Stock and purchase-order steps remain route-only for some proof interactions. A chain visualization is not proof that every producer is fully integrated. Refresh after upstream changes. Keep unavailable/redacted data distinct from zero and check recorded receipts before repeating imports or approvals. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/stock-to-cash/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts:170>).

## Shared entry: /finance/tax-rates/create

**Open:** [/en/dashboard/finance/tax-rates/create](http://localhost:3000/en/dashboard/finance/tax-rates/create). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** shared implementation; runtime blocked.

This route renders a shared implementation rather than a separate business process. Use [/en/dashboard/settings/tax-rates/create](http://localhost:3000/en/dashboard/settings/tax-rates/create) and [the canonical guide](settings.md#create-tax-rate). 

**Access:** taxes.create. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/finance/tax-rates/create/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/tax-rates/create/page.tsx:1>).


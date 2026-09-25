# Analytics, reports and daily sales

[Guide home](../README.md) · [Shared controls](../shared-controls.md) · [Detailed control notes](../control-notes.md) · [Metric dictionary](../metric-dictionary.md)

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

**Limits and recovery.** Operational analytics is distinct from certified accounting-close evidence. Missing or redacted evidence limits the conclusion. Try the offered Retry/Refresh after a failed read; widen filters only after checking the selected dates and access. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** The reviewed read contract uses all-time aggregates; do not interpret these as a selected monthly campaign cohort. Recipient contacts, raw IP addresses and raw user agents are excluded from this reporting contract. Try the offered Retry/Refresh after a failed read; widen filters only after checking the selected dates and access. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** No export/download control exists on the reviewed report screen. Location comes from URL/context, not a visible picker. Date shortcuts can include different endpoints than their informal names suggest; use the metric dictionary and inspect the actual range. Try the offered Retry/Refresh after a failed read; widen filters only after checking the selected dates and access. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** This route currently renders a reporting screen. It is not a general sales-order creation or fulfillment workbench. Recorded cash and payment categories do not establish bank settlement. Try the offered Retry/Refresh after a failed read; widen filters only after checking the selected dates and access. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/sales/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/sales/sales-route-data-access.ts:29>).


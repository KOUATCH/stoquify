# Command pages and daily management

[Guide home](../README.md) · [Shared controls](../shared-controls.md) · [Detailed control notes](../control-notes.md) · [Metric dictionary](../metric-dictionary.md)

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

**Limits and recovery.** Generating, accepting, rejecting or rating a brief can persist records. An AI explanation does not itself approve a payment, post a journal or prove that an action is complete. Missing/redacted evidence is a reason to narrow the conclusion or obtain authorized source review. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** A branch sign-off does not close the accounting period or automatically reconcile payments. Unsupported checks stay visible and must not be counted as passed. Missing/redacted evidence is a reason to narrow the conclusion or obtain authorized source review. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** Location responsibility is not HR reporting-line authority. Some proof-only actions need a proof-drawer host; a route link may be available where an embedded drawer is not. Missing/redacted evidence is a reason to narrow the conclusion or obtain authorized source review. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** Acknowledgement is a review record, not resolution. An upgrade prompt or catalogue badge is not evidence of purchased access or completed provisioning. Missing/redacted evidence is a reason to narrow the conclusion or obtain authorized source review. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** Live data is a polling/read-model label, not a promise of instantaneous updates. The hook defaults to 30 days, marks data stale after 30 seconds and polls every 60 seconds while applicable; loading, errors and browser suspension can delay it. Read the metric notes before equating a card with a statutory account. Missing/redacted evidence is a reason to narrow the conclusion or obtain authorized source review. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/actions/dashboard/getDashboardData.ts:1>).


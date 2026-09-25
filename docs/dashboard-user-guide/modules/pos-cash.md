# Point of sale and cash accountability

[Guide home](../README.md) · [Shared controls](../shared-controls.md) · [Detailed control notes](../control-notes.md) · [Metric dictionary](../metric-dictionary.md)

Evidence: source reviewed 2026-09-06. Dashboard interaction is blocked by sign-in. Instructions below describe implementation, not a completed live walkthrough.

The current checkout exposes cash tender and no receipt delivery. Opening a shift, editing a cart, charging a sale and closing a shift all persist state. The cash drawer workspace helps reconcile the resulting physical-cash evidence.

## Pages in this chapter

- [/en/dashboard/cashDrawer](#redirect-cashdrawer)
- [Cash drawer management](#cash-drawer-management)
- [Point of sale](#point-of-sale)

## Redirect: /cashDrawer

**Open:** [/en/dashboard/cashDrawer](http://localhost:3000/en/dashboard/cashDrawer). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** redirect; runtime blocked.

This route redirects after its access checks. Use [/en/dashboard/finance/cash-drawer](http://localhost:3000/en/dashboard/finance/cash-drawer) and [the canonical guide](pos-cash.md#cash-drawer-management). 

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

**Limits and recovery.** A cash drawer is physical cash accountability; it is not a bank balance. A current balance and a dated session total can have different time bases. A failed close retains inputs for correction. Inspect current session/order state before repeating a submission; hardware readiness labels alone do not prove a device is connected. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** The current selectable tender/receipt arrays expose CASH and NONE only: cash checkout with no delivery receipt. Electronic tender and email/SMS/WhatsApp branches exist in source but are not offered by this configuration. Park sale and Manager override only show a backend-gated warning. Do not describe those as working sale-management actions. A failed close retains inputs for correction. Inspect current session/order state before repeating a submission; hardware readiness labels alone do not prove a device is connected. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/pos/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/pos/pos-route-data-access.ts:20>).


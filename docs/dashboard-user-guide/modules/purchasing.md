# Suppliers, purchase orders and AP monitoring

[Guide home](../README.md) · [Shared controls](../shared-controls.md) · [Detailed control notes](../control-notes.md) · [Metric dictionary](../metric-dictionary.md)

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

**Limits and recovery.** Read displayed coverage/freshness; operational order amounts should not be treated as posted purchasing expense without the accounting bridge. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** A saved draft does not send an order or post accounts. A cloned order must be reviewed as a new transaction; old dates and prices are not automatically still appropriate. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** Approval is not receipt, and a purchase order is not a supplier invoice or settlement. Legacy /purchases links lead here. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** State changes can make an open edit stale. Reload and review if the order has been received or otherwise advanced; do not force the old draft over current evidence. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** Passed inspection releases through the supported flow; Failed or Incomplete inspection holds the received stock as implemented. Print is a document output, not supplier delivery or payment. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** This workbench issues/copies a link; it has no send-email action. Actions require purchase-order update authority and identity verified within five minutes, but no inline password step-up form is exposed here. Buyer acceptance records a review decision without changing the authoritative PO, stock, AP or ledger. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchase-orders/[id]/supplier-acknowledgement/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchase-orders/purchase-orders-route-data-access.ts:65>).

## Redirect: /purchases

**Open:** [/en/dashboard/purchases](http://localhost:3000/en/dashboard/purchases). **Reach it:** Overview. **Evidence state:** redirect; runtime blocked.

This route redirects after its access checks. Use [/en/dashboard/purchase-orders](http://localhost:3000/en/dashboard/purchase-orders) and [the canonical guide](purchasing.md#purchase-orders). Older unreachable purchase-page button code is excluded from the operational instructions.

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

**Limits and recovery.** Filtered history is not necessarily the organization's full current payable balance. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** The action queue is explicitly read-only in the current workbench. It does not expose a complete invoice match/approve/post/payment command flow; missing command UI must not be invented from service names. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** These are route-driven modes of the same dashboard, not independent supplier data stores. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** Archiving preserves existing history; sensitive export fields have additional permission constraints. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** These are route-driven modes of the same dashboard, not independent supplier data stores. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** These are route-driven modes of the same dashboard, not independent supplier data stores. Do not receive twice after an uncertain result: inspect the order and receipts first. Held inventory needs authorized resolution outside the receiving modal. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchases/suppliers/[id]/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchases/purchases-route-data-access.ts:135>).

## Redirect: /purchases/[id]

**Open:** `/en/dashboard/purchases/[id]`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** redirect; runtime blocked.

This route redirects after its access checks. Use `/en/dashboard/purchase-orders/[id]` and [the canonical guide](purchasing.md#purchase-order-detail). Older unreachable purchase-page button code is excluded from the operational instructions.

**Access:** purchases.orders.read. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/purchases/[id]/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchases/[id]/page.tsx:1>).

## Shared entry: /suppliersSystem/new

**Open:** [/en/dashboard/suppliersSystem/new](http://localhost:3000/en/dashboard/suppliersSystem/new). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** shared implementation; runtime blocked.

This route renders a shared implementation rather than a separate business process. Use [/en/dashboard/purchases/suppliers/create](http://localhost:3000/en/dashboard/purchases/suppliers/create) and [the canonical guide](purchasing.md#create-supplier). 

**Access:** purchases.suppliers.create. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/suppliersSystem/new/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/suppliersSystem/new/page.tsx:1>).

## Shared entry: /suppliersSystem

**Open:** [/en/dashboard/suppliersSystem](http://localhost:3000/en/dashboard/suppliersSystem). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** shared implementation; runtime blocked.

This route renders a shared implementation rather than a separate business process. Use [/en/dashboard/purchases/suppliers](http://localhost:3000/en/dashboard/purchases/suppliers) and [the canonical guide](purchasing.md#supplier-directory). 

**Access:** purchases.suppliers.read. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/suppliersSystem/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/suppliersSystem/page.tsx:1>).

## Shared entry: /suppliersSystem/[id]/edit

**Open:** `/en/dashboard/suppliersSystem/[id]/edit`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** shared implementation; runtime blocked.

This route renders a shared implementation rather than a separate business process. Use `/en/dashboard/purchases/suppliers/[id]/edit` and [the canonical guide](purchasing.md#edit-supplier). 

**Access:** purchases.suppliers.update. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/suppliersSystem/[id]/edit/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/suppliersSystem/[id]/edit/page.tsx:1>).

## Shared entry: /suppliersSystem/[id]

**Open:** `/en/dashboard/suppliersSystem/[id]`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** shared implementation; runtime blocked.

This route renders a shared implementation rather than a separate business process. Use `/en/dashboard/purchases/suppliers/[id]` and [the canonical guide](purchasing.md#view-supplier). 

**Access:** purchases.suppliers.read. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/suppliersSystem/[id]/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/suppliersSystem/[id]/page.tsx:1>).


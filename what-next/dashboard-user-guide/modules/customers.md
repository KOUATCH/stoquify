# Customers and statements

[Guide home](../README.md) · [Shared controls](../shared-controls.md) · [Detailed control notes](../control-notes.md) · [Metric dictionary](../metric-dictionary.md)

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

**Limits and recovery.** Inactive preserves history while restricting future use. Contact fields alone do not authorize sending messages or sharing financial records. Resolve invalid contact/date inputs and refresh the current record after conflicts. Check history before repeating a potentially completed write. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** Directory balance/order indicators are operational and may differ in scope from a dated statement or the posted ledger. Resolve invalid contact/date inputs and refresh the current record after conflicts. Check history before repeating a potentially completed write. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** Inactive preserves history while restricting future use. Contact fields alone do not authorize sending messages or sharing financial records. Resolve invalid contact/date inputs and refresh the current record after conflicts. Check history before repeating a potentially completed write. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** The current /sales destination is a daily-sales report, so an Open sales link should not be described as a complete order editor. Resolve invalid contact/date inputs and refresh the current record after conflicts. Check history before repeating a potentially completed write. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** This is record-specific information. A profile summary is not necessarily a full date-bounded account statement. Resolve invalid contact/date inputs and refresh the current record after conflicts. Check history before repeating a potentially completed write. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** Both commands require accounting export authority and fresh identity. Generating the snapshot and queuing delivery are separate writes. A queued delivery is not confirmed recipient delivery. Despite descriptive revocation wording, no revoke control is wired on this dashboard form. Resolve invalid contact/date inputs and refresh the current record after conflicts. Check history before repeating a potentially completed write. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/customers/[id]/statement/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/customers/customers-route-data-access.ts:89>).


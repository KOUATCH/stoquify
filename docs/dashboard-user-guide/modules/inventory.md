# Inventory and product setup

[Guide home](../README.md) · [Shared controls](../shared-controls.md) · [Detailed control notes](../control-notes.md) · [Metric dictionary](../metric-dictionary.md)

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

**Limits and recovery.** This changes brand master data; it does not move stock or change past transactions. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** No additional route-specific gap was established in this source review. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** This changes brand master data; it does not move stock or change past transactions. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** The exact hierarchy validation/error messages require live confirmation; do not assume the UI permits cycles or self-parenting. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** A filtered category list is not a stock valuation report. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** The exact hierarchy validation/error messages require live confirmation; do not assume the UI permits cycles or self-parenting. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** No additional route-specific gap was established in this source review. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** Opening stock posts quantity; it is not a harmless form preference. Do not enter opening stock for receipts already recorded through purchasing. Exact live validation messages and upload availability were not exercised. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/items/create/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:92>).

## Redirect: /inventory/items/new

**Open:** [/en/dashboard/inventory/items/new](http://localhost:3000/en/dashboard/inventory/items/new). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** redirect; runtime blocked.

This route redirects after its access checks. Use [/en/dashboard/inventory/items/create](http://localhost:3000/en/dashboard/inventory/items/create) and [the canonical guide](inventory.md#create-item). 

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

**Limits and recovery.** Metadata edits are not stock adjustments. Export and selection can be limited to loaded/selected rows; the export label and downloaded rows are the authority for scope. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** Tracking options only affect workflows that actually support the corresponding evidence. Editing an item's displayed cost or stock policy does not repair historical ledger quantities. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** Placeholder functionality: the source contains no complete other-information workflow. No browser verification was possible. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** The available supplier lookup is bounded; an absent supplier may require directory/setup work or a broader lookup. Saved relationship terms are planning data, not a placed order or confirmed receipt. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** The screen is analytical: it does not itself approve write-offs or edit valuation. Partial source coverage must remain visible in any conclusion. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** History is evidence, not a form for overwriting old stock. A correction should remain linked to its originating workflow. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/movements/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:134>).

## Redirect: /inventory

**Open:** [/en/dashboard/inventory](http://localhost:3000/en/dashboard/inventory). **Reach it:** Overview. **Evidence state:** redirect; runtime blocked.

This route redirects after its access checks. Use [/en/dashboard/inventory/items](http://localhost:3000/en/dashboard/inventory/items) and [the canonical guide](inventory.md#item-directory). 

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

**Limits and recovery.** There are no separate dispatch/receive buttons in this current workflow. Older status badges do not establish those operations. Priority and internal notes are collected in the form but omitted by the create action's service payload, so do not rely on them being saved. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** No additional route-specific gap was established in this source review. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** A conversion rate must be interpreted against the selected base unit. This page does not prove that every downstream workflow automatically converts arbitrary unit combinations. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

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

**Limits and recovery.** No additional route-specific gap was established in this source review. If stock is insufficient or evidence is stale, reread source inventory before retrying. Do not repair a movement by overwriting item metadata. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/units/[id]/edit/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts:162>).

## Redirect: /items/new

**Open:** [/en/dashboard/items/new](http://localhost:3000/en/dashboard/items/new). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** redirect; runtime blocked.

This route redirects after its access checks. Use [/en/dashboard/inventory/items/create](http://localhost:3000/en/dashboard/inventory/items/create) and [the canonical guide](inventory.md#create-item). 

**Access:** inventory.items.create. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/items/new/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/items/new/page.tsx:1>).

## Shared entry: /items

**Open:** [/en/dashboard/items](http://localhost:3000/en/dashboard/items). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** shared implementation; runtime blocked.

This route renders a shared implementation rather than a separate business process. Use [/en/dashboard/inventory/items](http://localhost:3000/en/dashboard/inventory/items) and [the canonical guide](inventory.md#item-directory). 

**Access:** inventory.items.read. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/items/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/items/page.tsx:1>).


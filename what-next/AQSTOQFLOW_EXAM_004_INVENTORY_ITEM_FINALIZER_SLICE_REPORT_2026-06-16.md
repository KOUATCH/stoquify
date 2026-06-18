# AqStoqFlow Exam 004 Inventory Item Finalizer Slice Report

Date: 2026-06-16

## Risk Class

`exam-004-aqstoqflow-inventory-item-finalizer`

## Result

Migrated the remaining direct Prisma branch in `updateItemStockById` out of the server action and into the item service layer.

The action already used `requestManualItemStockAdjustment` for quantity-changing stock edits. This slice moved the non-quantity stock policy branch (`minStockLevel` and `maxStockLevel`) into `services/item/item.service.ts`, leaving the action responsible for permission checks, service orchestration, and cache revalidation.

## Files Inspected

- `C:\Users\J COMPUTER\.codex\skills\exam-004-aqstoqflow-inventory-item-finalizer\SKILL.md`
- `C:\Users\J COMPUTER\.codex\skills\exam-004-aqstoqflow-inventory-item-finalizer\references\risk-brief.md`
- `C:\Users\J COMPUTER\.codex\skills\exam-004-aqstoqflow-inventory-item-finalizer\references\runtime-boundary.md`
- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `actions/itemsShow/updateItemStockById.ts`
- `actions/item/items.ts`
- `services/item/item.service.ts`
- `services/inventory/inventory-adjustment.service.ts`
- `types/itemTypes.ts`

## Files Changed

- `actions/itemsShow/updateItemStockById.ts`
- `actions/itemsShow/__tests__/updateItemStockById.test.ts`
- `services/item/item.service.ts`
- `services/item/__tests__/item.service.test.ts`
- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json`
- `what-next/AQSTOQFLOW_EXAM_004_INVENTORY_ITEM_FINALIZER_SLICE_REPORT_2026-06-16.md`

## Services Added Or Reused

Added:

- `updateItemStockPolicy`
- `UpdateItemStockPolicyInput`
- `ItemStockPolicyResult`

Reused:

- `requestManualItemStockAdjustment`

## Actions Migrated

Migrated:

- `actions/itemsShow/updateItemStockById.ts`

Behavior preserved:

- quantity-changing edits still create submitted stock adjustments through `requestManualItemStockAdjustment`;
- min/max stock policy edits now call `updateItemStockPolicy`;
- the action still checks `inventory.items.update`;
- the action still derives tenant and actor from RBAC context;
- the action still revalidates `/dashboard/inventory/items`.

## Controls Added

- The action no longer imports `@/prisma/db`.
- The action no longer opens a Prisma transaction.
- Stock policy updates are tenant-scoped inside `services/item`.
- The service checks `id`, `organizationId`, and `deletedAt: null` before update.
- Quantity-changing stock edits remain on the inventory adjustment workflow and do not directly mutate stock quantities.

## Tests Added

- `services/item/__tests__/item.service.test.ts`
- `actions/itemsShow/__tests__/updateItemStockById.test.ts`

Covered behavior:

- service updates min/max stock policy only after tenant-scoped item lookup;
- service rejects item updates outside tenant scope;
- action delegates stock policy changes to item service;
- action keeps quantity changes on the stock adjustment workflow.

## Verification Results

Passed:

```powershell
npm test -- services/item/__tests__/item.service.test.ts actions/itemsShow/__tests__/updateItemStockById.test.ts --runInBand
npm run inventory:boundary:fail
node scripts\service-boundary-gate.js --mode report --out what-next\AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md --json-out what-next\AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json
npm run typecheck
npm run prisma:validate
```

Notes:

- `npm run prisma:validate` passed and emitted the existing Prisma 7 deprecation warning for `package.json#prisma`.
- `npm run inventory:boundary:fail` remains green with 0 active final-stock mutation violations.

## Boundary Impact

The service-boundary report changed from:

- Active service-boundary violations: 286
- `ACTION_OWNED_ECONOMIC_MUTATION`: 15
- `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE`: 144
- `DIRECT_PRISMA_DB_IMPORT`: 54

to:

- Active service-boundary violations: 283
- `ACTION_OWNED_ECONOMIC_MUTATION`: 14
- `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE`: 143
- `DIRECT_PRISMA_DB_IMPORT`: 53

`actions/itemsShow/updateItemStockById.ts` no longer appears in the active service-boundary report.

## Remaining Blockers

The inventory/item migration is not complete. Remaining order-1 findings still include:

- `actions/inventory/inventoryActions.ts`
- `actions/inventory/inventoryMovementActions.ts`
- `actions/item/items.ts`
- `actions/item/listItemsAction.ts`
- `actions/itemsShow/deleteItem.ts`
- `actions/itemsShow/getBriefItemById.ts`
- `actions/itemsShow/getBriefOrgItems.ts`
- `actions/itemsShow/getOrgItems.ts`
- `actions/itemsShow/getOrgItemsWithInventoryLevels.ts`
- `actions/itemsShow/getOrgItemsWithInventoryLevelsLocation.ts`
- `actions/itemsShow/updateItemBasicInfoById.ts`
- `actions/itemsShow/updateItemById.ts`
- `actions/itemsShow/updateItemItemDetailsById.ts`
- `actions/itemsShow/updateItemPricingById.ts`
- `actions/itemsShow/updateItemRelationsById.ts`

## Next Skill Or Slice

Continue `exam-004-aqstoqflow-inventory-item-finalizer` with the rest of the item action migration cluster before advancing to purchasing/AP.

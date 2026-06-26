# AqStoqFlow 010 Adjustment, Write-Off, And Count Kernel Report

Date: 2026-06-15

Selected skill: `010-aqstoqflow-inventory-valuation-kernel`

Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`

## Active Slice

Implemented the next 010 inventory slice:

- `stock.adjustment.posted`
- `stock.write_off.posted`
- physical count freeze and variance generation
- evidence hashes for sensitive stock events
- maker-checker controls
- ledger posting when configured, or explicit posting blockers when not configured
- durable business-event and notification outbox records

## Files Changed For This Slice

- `prisma/schema.prisma`
- `prisma/migrations/20260615120000_inventory_adjustment_count_kernel/migration.sql`
- `services/inventory/inventory-event.schemas.ts`
- `services/inventory/inventory-errors.ts`
- `services/inventory/inventory-adjustment.service.ts`
- `services/inventory/inventory-count.service.ts`
- `services/inventory/inventory-valuation.service.ts`
- `services/inventory/__tests__/inventory-adjustment.service.test.ts`
- `services/inventory/__tests__/inventory-count.service.test.ts`

## Implementation Summary

The inventory kernel now owns adjustment and count posting at the service boundary.

`inventory-adjustment.service.ts` can create and post stock adjustments, enforce evidence for sensitive adjustments, reject maker-checker violations, update inventory projections with optimistic guards, create immutable movement rows, publish `stock.adjustment.posted` or `stock.write_off.posted`, and create a ledger posting batch.

When no active posting rule exists, the service does not silently ignore accounting. It marks the posting batch as failed, writes a ledger audit event, links the business event to the failed batch, and emits an operator-visible notification payload for the blocked ledger posting.

`inventory-count.service.ts` freezes count snapshots, hashes the frozen system quantities, accepts counted quantities, computes variances, requires a count sheet hash, enforces maker-checker on posting, and turns non-zero count variance into a generated `PHYSICAL_COUNT` adjustment. The physical count validation event records `inventory.physical_count.validated` and links to the generated adjustment event.

## Gates Passed

- Tenant scope is present on stock adjustment and count reads/writes.
- Count sessions freeze system quantity and unit cost snapshots before entry.
- Sensitive adjustments and write-offs require evidence hashes.
- Physical count posting requires a count sheet hash.
- Same actor cannot create/submit and approve sensitive inventory events.
- Stock projection updates use optimistic `InventoryLevel.version` guards.
- Adjustment and count events are idempotency-keyed business events.
- Inventory movement rows are created in the same transaction as projection updates.
- Ledger posting is never silent: it posts when rules exist or creates an explicit failed posting batch blocker.
- User/operator notification outbox payloads are created for posted adjustments, posted counts, count variances, and blocked adjustment ledger posting.
- Regression tests cover adjustment posting, write-off evidence failure, maker-checker failure, count snapshot freeze, count variance generation, and count variance posting through adjustment.

## Gates Still Blocked

The full 010 chunk is not yet complete because legacy final stock producers still bypass the new inventory kernel:

- `services/purchase-order/purchase-order.service.ts`
- `services/pos/pos.service.ts`
- `actions/itemsShow/updateItemStockById.ts`
- `actions/itemsShow/createActionItem.ts`
- remaining legacy helpers in `actions/inventory/inventoryMovementActions.ts`
- `services/item/item.service.ts`

These paths must be migrated or wrapped before the suite can safely advance to 011.

## Verification

Passed:

```powershell
npm test -- services/inventory --runInBand
npm run prisma:validate
npm test -- services/events/__tests__/business-event.service.test.ts --runInBand
npm run typecheck
npm run prisma:generate
```

Focused result:

- Inventory tests: 5 suites passed, 17 tests passed.
- Business event tests: 1 suite passed, 3 tests passed.
- Prisma schema validation passed.
- TypeScript typecheck passed.
- Prisma Client generation passed.

## Next Recommended Slice

Stay inside `010-aqstoqflow-inventory-valuation-kernel`.

Next work should migrate the remaining stock mutation producers into the inventory kernel in this order:

1. item initial stock and manual stock updates;
2. purchasing goods receipt inventory effects;
3. POS sale, refund, and void inventory effects;
4. remaining legacy inventory action helpers;
5. final static gate proving no final stock event updates `InventoryLevel` outside `services/inventory/*`.

Only after that gate is green should the suite advance to `011-aqstoqflow-purchasing-ap-controls`.

# AqStoqFlow Inventory Boundary Gate Report

Generated: 2026-06-15T12:05:54.782Z

Root: `E:\ohada saas\newStockFlow\aqstoqflow`

Mode: `report`

## Summary

- Active violations: 0
- Allowed kernel/test findings: 22
- Total stock mutation callsites scanned: 22

## Classification Counts

- No active violations.

## Active Violations

No direct stock mutation remains outside the inventory kernel allowlist.

## Migration Order

1. Migrate item initial stock and manual stock updates to opening-stock or adjustment events.
2. Migrate purchasing goods receipt inventory effects to a goods-receipt stock event.
3. Migrate POS sale, refund, and void inventory effects to POS inventory events.
4. Wrap or retire legacy inventory action helpers and shared inventory helpers.
5. Convert runtime-like scripts to kernel calls or mark them seed-only.
6. Turn this gate from report mode to fail mode once active violations reach zero.

## Enforcement Ladder

- `report`: document all direct stock mutation bypasses without blocking development.
- `warn`: keep exit code 0 but make the boundary breach visible in CI logs.
- `fail`: exit non-zero when any active violation remains.

## Allowed Findings

| Classification | File | Line | Call |
| --- | --- | ---: | --- |
| SEED_OR_MIGRATION_ONLY | `prisma/comprehensive-seed.ts` | 1448 | `inventoryLevel.createMany` |
| SEED_OR_MIGRATION_ONLY | `prisma/comprehensive-seed.ts` | 1814 | `inventoryTransaction.createMany` |
| SEED_OR_MIGRATION_ONLY | `prisma/production-seed.ts` | 104 | `inventoryLevel.upsert` |
| SEED_OR_MIGRATION_ONLY | `prisma/seed.ts` | 132 | `inventoryTransaction.deleteMany` |
| SEED_OR_MIGRATION_ONLY | `prisma/seed.ts` | 133 | `inventoryLevel.deleteMany` |
| SEED_OR_MIGRATION_ONLY | `prisma/seed.ts` | 486 | `inventoryLevel.create` |
| SEED_OR_MIGRATION_ONLY | `prisma/seed.ts` | 505 | `inventoryTransaction.create` |
| SCRIPT_DEMO_SEED_ONLY | `scripts/boost-pos-demo-stock.ts` | 225 | `inventoryLevel.update` |
| SCRIPT_DEMO_SEED_ONLY | `scripts/boost-pos-demo-stock.ts` | 238 | `inventoryLevel.create` |
| SCRIPT_DEMO_SEED_ONLY | `scripts/boost-pos-demo-stock.ts` | 253 | `inventoryTransaction.create` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-adjustment.service.ts` | 464 | `inventoryLevel.updateMany` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-adjustment.service.ts` | 480 | `inventoryLevel.create` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-adjustment.service.ts` | 510 | `inventoryTransaction.create` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-stock-event.service.ts` | 342 | `inventoryLevel.updateMany` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-stock-event.service.ts` | 360 | `inventoryTransaction.create` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-stock-event.service.ts` | 462 | `inventoryLevel.updateMany` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-stock-event.service.ts` | 478 | `inventoryLevel.create` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-stock-event.service.ts` | 496 | `inventoryTransaction.create` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-transfer.service.ts` | 335 | `inventoryTransaction.create` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-transfer.service.ts` | 371 | `inventoryLevel.updateMany` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-transfer.service.ts` | 417 | `inventoryLevel.updateMany` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-transfer.service.ts` | 436 | `inventoryLevel.create` |


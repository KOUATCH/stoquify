# AqStoqFlow Inventory Boundary Gate Report

Generated: 2026-09-24T08:51:41.938Z

Root: `E:\ohada saas\Focused projects\stoquify`

Mode: `fail`

## Summary

- Active violations: 24
- Allowed kernel/test findings: 28
- Total stock mutation callsites scanned: 52

## Classification Counts

- SCRIPT_STOCK_MUTATION: 5
- UNKNOWN_STOCK_MUTATION: 19

## Active Violations

| Order | Classification | File | Line | Call | Reason |
| --- | --- | --- | ---: | --- | --- |
| 5 | SCRIPT_STOCK_MUTATION | `scripts/boost-pos-demo-stock.ts` | 229 | `inventoryLevel.update` | Scripts must use the kernel or have a reviewed, hash-bound disposable fixture classification. |
| 5 | SCRIPT_STOCK_MUTATION | `scripts/boost-pos-demo-stock.ts` | 242 | `inventoryLevel.create` | Scripts must use the kernel or have a reviewed, hash-bound disposable fixture classification. |
| 5 | SCRIPT_STOCK_MUTATION | `scripts/boost-pos-demo-stock.ts` | 257 | `inventoryTransaction.create` | Scripts must use the kernel or have a reviewed, hash-bound disposable fixture classification. |
| 5 | SCRIPT_STOCK_MUTATION | `scripts/modern-modules-lifecycle-fixture.ts` | 79 | `inventoryLevel.upsert` | Scripts must use the kernel or have a reviewed, hash-bound disposable fixture classification. |
| 5 | SCRIPT_STOCK_MUTATION | `scripts/supplier-po-ack-e2e-fixture.js` | 187 | `inventoryLevel.create` | Scripts must use the kernel or have a reviewed, hash-bound disposable fixture classification. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-cart-access-browser-v130.cjs` | 20 | `inventoryLevel.create` | Direct inventoryLevel.create is outside the inventory kernel allowlist. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-cart-access-v130.cjs` | 17 | `inventoryLevel.create` | Direct inventoryLevel.create is outside the inventory kernel allowlist. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-digest-inventory.cjs` | 20 | `inventoryLevel.create` | Direct inventoryLevel.create is outside the inventory kernel allowlist. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-digest-stock-access.cjs` | 23 | `inventoryLevel.create` | Direct inventoryLevel.create is outside the inventory kernel allowlist. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-pos-cart-concurrency-v130.cjs` | 16 | `inventoryLevel.create` | Direct inventoryLevel.create is outside the inventory kernel allowlist. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-pos-cart-concurrency-v130.cjs` | 30 | `inventoryLevel.update` | Direct inventoryLevel.update is outside the inventory kernel allowlist. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-pos-cart-v122.cjs` | 16 | `inventoryLevel.create` | Direct inventoryLevel.create is outside the inventory kernel allowlist. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-pos-cart-v122.cjs` | 30 | `inventoryLevel.update` | Direct inventoryLevel.update is outside the inventory kernel allowlist. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-pulse-actions-v145.cjs` | 6 | `inventoryLevel.updateMany` | Direct inventoryLevel.updateMany is outside the inventory kernel allowlist. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-pulse-actions-v145.cjs` | 8 | `inventoryLevel.create` | Direct inventoryLevel.create is outside the inventory kernel allowlist. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-pulse-actions-v145.cjs` | 9 | `inventoryLevel.updateMany` | Direct inventoryLevel.updateMany is outside the inventory kernel allowlist. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-pulse-actions-v145.cjs` | 10 | `inventoryLevel.create` | Direct inventoryLevel.create is outside the inventory kernel allowlist. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-pulse-actions-v145.cjs` | 12 | `inventoryLevel.updateMany` | Direct inventoryLevel.updateMany is outside the inventory kernel allowlist. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-pulse-observations-v146.cjs` | 10 | `inventoryLevel.updateMany` | Direct inventoryLevel.updateMany is outside the inventory kernel allowlist. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-report-browser-v141.cjs` | 12 | `inventoryTransaction.updateMany` | Direct inventoryTransaction.updateMany is outside the inventory kernel allowlist. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-report-cost-v141.cjs` | 8 | `inventoryTransaction.updateMany` | Direct inventoryTransaction.updateMany is outside the inventory kernel allowlist. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-report-cost-v141.cjs` | 10 | `inventoryTransaction.updateMany` | Direct inventoryTransaction.updateMany is outside the inventory kernel allowlist. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-report-cost-v141.cjs` | 14 | `inventoryTransaction.create` | Direct inventoryTransaction.create is outside the inventory kernel allowlist. |
| 6 | UNKNOWN_STOCK_MUTATION | `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-tender-access-v131.cjs` | 12 | `inventoryLevel.create` | Direct inventoryLevel.create is outside the inventory kernel allowlist. |

## Migration Order

1. Migrate item initial stock and manual stock updates to opening-stock or adjustment events.
2. Migrate purchasing goods receipt inventory effects to a goods-receipt stock event.
3. Migrate POS sale, refund, and void inventory effects to POS inventory events.
4. Wrap or retire legacy inventory action helpers and shared inventory helpers.
5. Convert runtime-like scripts to kernel calls or review and hash-bind their disposable database guards.
6. Turn this gate from report mode to fail mode once active violations reach zero.

## Enforcement Ladder

- `report`: document all direct stock mutation bypasses without blocking development.
- `warn`: keep exit code 0 but make the boundary breach visible in CI logs.
- `fail`: exit non-zero when any active violation remains.

## Allowed Findings

| Classification | File | Line | Call |
| --- | --- | ---: | --- |
| SEED_OR_MIGRATION_ONLY | `prisma/compliance-hris-role-seed.ts` | 617 | `inventoryLevel.upsert` |
| SEED_OR_MIGRATION_ONLY | `prisma/compliance-hris-role-seed.ts` | 651 | `inventoryTransaction.upsert` |
| SEED_OR_MIGRATION_ONLY | `prisma/comprehensive-seed.ts` | 1839 | `inventoryLevel.createMany` |
| SEED_OR_MIGRATION_ONLY | `prisma/comprehensive-seed.ts` | 2220 | `inventoryTransaction.createMany` |
| SEED_OR_MIGRATION_ONLY | `prisma/seed.ts` | 134 | `inventoryTransaction.deleteMany` |
| SEED_OR_MIGRATION_ONLY | `prisma/seed.ts` | 135 | `inventoryLevel.deleteMany` |
| SEED_OR_MIGRATION_ONLY | `prisma/seed.ts` | 488 | `inventoryLevel.create` |
| SEED_OR_MIGRATION_ONLY | `prisma/seed.ts` | 507 | `inventoryTransaction.create` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-adjustment-reversal.service.ts` | 508 | `inventoryLevel.updateMany` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-adjustment-reversal.service.ts` | 550 | `inventoryTransaction.create` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-adjustment.service.ts` | 498 | `inventoryLevel.updateMany` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-adjustment.service.ts` | 514 | `inventoryLevel.create` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-adjustment.service.ts` | 544 | `inventoryTransaction.create` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-stock-event.service.ts` | 406 | `inventoryLevel.updateMany` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-stock-event.service.ts` | 424 | `inventoryTransaction.create` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-stock-event.service.ts` | 543 | `inventoryLevel.updateMany` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-stock-event.service.ts` | 560 | `inventoryLevel.create` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-stock-event.service.ts` | 578 | `inventoryTransaction.create` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-transfer-lifecycle.service.ts` | 151 | `inventoryLevel.upsert` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-transfer-lifecycle.service.ts` | 164 | `inventoryLevel.updateMany` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-transfer-lifecycle.service.ts` | 170 | `inventoryLevel.updateMany` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-transfer-lifecycle.service.ts` | 186 | `inventoryLevel.updateMany` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-transfer-lifecycle.service.ts` | 195 | `inventoryTransaction.create` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-transfer.service.ts` | 365 | `inventoryTransaction.create` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-transfer.service.ts` | 405 | `inventoryLevel.updateMany` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-transfer.service.ts` | 453 | `inventoryLevel.updateMany` |
| ALLOWED_INVENTORY_KERNEL | `services/inventory/inventory-transfer.service.ts` | 472 | `inventoryLevel.create` |
| TEST_OR_MOCK_ONLY | `services/pos/__tests__/pos-full-commit.postgres.test.ts` | 47 | `inventoryLevel.create` |


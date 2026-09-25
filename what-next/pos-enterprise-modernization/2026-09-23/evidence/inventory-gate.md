# AqStoqFlow Inventory Boundary Gate Report

Generated: 2026-09-23T20:24:20.464Z

Root: `E:\ohada saas\Focused projects\stoquify`

Mode: `fail`

## Summary

- Active violations: 20
- Allowed kernel/test findings: 52
- Total stock mutation callsites scanned: 72

## Classification Counts

- SCRIPT_STOCK_MUTATION: 1
- UNKNOWN_STOCK_MUTATION: 19

## Active Violations

| Order | Classification | File | Line | Call | Reason |
| --- | --- | --- | ---: | --- | --- |
| 5 | SCRIPT_STOCK_MUTATION | `scripts/modern-modules-lifecycle-fixture.ts` | 77 | `inventoryLevel.upsert` | Runtime-like scripts that mutate stock must either use the kernel or be explicitly seed-only. |
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
5. Convert runtime-like scripts to kernel calls or mark them seed-only.
6. Turn this gate from report mode to fail mode once active violations reach zero.

## Enforcement Ladder

- `report`: document all direct stock mutation bypasses without blocking development.
- `warn`: keep exit code 0 but make the boundary breach visible in CI logs.
- `fail`: exit non-zero when any active violation remains.


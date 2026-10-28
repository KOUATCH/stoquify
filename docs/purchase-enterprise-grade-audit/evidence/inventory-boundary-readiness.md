# AqStoqFlow Inventory Boundary Gate Report

Generated: 2026-08-17T03:53:35.615Z

Root: `E:\ohada saas\Focused projects\stoquify`

Mode: `fail`

## Summary

- Active violations: 1
- Allowed kernel/test findings: 27
- Total stock mutation callsites scanned: 28

## Classification Counts

- SCRIPT_STOCK_MUTATION: 1

## Active Violations

| Order | Classification | File | Line | Call | Reason |
| --- | --- | --- | ---: | --- | --- |
| 5 | SCRIPT_STOCK_MUTATION | `scripts/supplier-po-ack-e2e-fixture.js` | 195 | `inventoryLevel.create` | Runtime-like scripts that mutate stock must either use the kernel or be explicitly seed-only. |

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


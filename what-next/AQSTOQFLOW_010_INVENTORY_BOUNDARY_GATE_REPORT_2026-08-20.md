# AqStoqFlow Inventory Boundary Gate Report

Generated: 2026-08-20T09:19:34.767Z

Root: `E:\ohada saas\Focused projects\stoquify`

Mode: `fail`

## Summary

- Active violations: 0
- Allowed kernel/test findings: 45
- Total stock mutation callsites scanned: 45

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


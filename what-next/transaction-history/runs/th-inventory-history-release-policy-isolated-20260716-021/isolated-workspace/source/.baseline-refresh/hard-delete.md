# AqStoqFlow Hard Delete Gate Report

Generated: 2026-06-18T09:40:04.892Z

Root: `E:\ohada saas\newStockFlow\aqstoqflow`
Mode: `report`
Scan directories: `actions`, `services`, `app`, `hooks`, `components`

## Summary

- Active unsafe hard-delete findings: 0
- Allowed classified hard deletes: 7
- Total delete callsites scanned: 7

## Active Counts

- No active unsafe hard-delete findings.

## Active Findings

No active unsafe hard-delete findings remain in the scanned runtime boundaries.

## Allowed Classification Counts

- CONFIG_RELATIONSHIP_CLEANUP: 1
- CONFIG_REPLACEMENT_CLEANUP: 1
- CONFIG_RETENTION_CLEANUP: 1
- DRAFT_CLEANUP: 4

## Enforcement Ladder

- `report`: classify current hard deletes without blocking development.
- `warn`: exit 0 while surfacing active unsafe hard deletes in logs.
- `fail`: exit non-zero when active unsafe hard deletes remain.


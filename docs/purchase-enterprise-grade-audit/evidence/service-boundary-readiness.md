# AqStoqFlow Service Boundary Gate Report

Generated: 2026-08-17T03:53:24.088Z

Root: `E:\ohada saas\Focused projects\stoquify`
Mode: `fail`
Scan directories: `app`, `actions`, `components`, `hooks`

## Summary

- Active service-boundary violations: 0
- Allowed test/mock/service findings: 13
- Total callsites scanned: 13

## Active Counts

- No active service-boundary violations.

## Active Violations

No active direct Prisma or action-owned mutation violations remain in the scanned runtime boundaries.

## Migration Order

1. Migrate item, item detail, and inventory actions into service-owned workflows.
2. Move App Router and API direct Prisma access behind protected service/read-model methods.
3. Consolidate purchasing/AP call sites on the statutory purchasing service boundary.
4. Replace hook-level persistence/type coupling with service-backed action/query DTOs.
5. Replace component-level Prisma client coupling with UI DTOs.
6. Migrate remaining action-owned mutations domain by domain.
7. Turn this gate to fail mode after active violations reach zero or a reviewed baseline is introduced.

## Enforcement Ladder

- `report`: inventory current violations without blocking development.
- `warn`: keep exit code 0 while surfacing the boundary breach in CI logs.
- `fail`: exit non-zero when any active violation remains.


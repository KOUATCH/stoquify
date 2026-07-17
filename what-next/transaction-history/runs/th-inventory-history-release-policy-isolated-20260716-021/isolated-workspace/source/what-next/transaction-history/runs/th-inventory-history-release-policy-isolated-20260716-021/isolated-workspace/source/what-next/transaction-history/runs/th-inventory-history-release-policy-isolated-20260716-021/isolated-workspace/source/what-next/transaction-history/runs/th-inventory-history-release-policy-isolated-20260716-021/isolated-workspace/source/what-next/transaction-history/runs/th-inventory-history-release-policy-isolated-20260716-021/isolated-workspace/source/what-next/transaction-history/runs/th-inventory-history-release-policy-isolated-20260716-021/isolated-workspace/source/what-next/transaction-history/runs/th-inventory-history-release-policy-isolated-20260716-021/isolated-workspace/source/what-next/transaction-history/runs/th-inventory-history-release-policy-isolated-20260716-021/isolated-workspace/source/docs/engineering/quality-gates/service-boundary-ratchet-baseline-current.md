# AqStoqFlow Service Boundary Gate Report

Generated: 2026-06-24T08:17:52.876Z

Root: `E:\ohada saas\newStockFlow\aqstoqflow`
Mode: `report`
Scan directories: `app`, `actions`, `components`, `hooks`

## Summary

- Active service-boundary violations: 0
- Allowed test/mock/service findings: 5
- Total callsites scanned: 5

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

## Allowed Findings

| Classification | File | Line | Evidence |
| --- | --- | ---: | --- |
| TEST_OR_MOCK_ONLY | `actions/__tests__/legacy-rbac-auth-actions.test.ts` | 11 | `jest.mock("@/prisma/db", () => ({` |
| TEST_OR_MOCK_ONLY | `actions/__tests__/legacy-rbac-auth-actions.test.ts` | 66 | `import { db } from "@/prisma/db"` |
| TEST_OR_MOCK_ONLY | `actions/inventory/__tests__/inventoryMovementActions.test.ts` | 29 | `jest.mock("@/prisma/db", () => ({` |
| TEST_OR_MOCK_ONLY | `actions/locations/__tests__/org-list-actions.test.ts` | 4 | `import { db } from "@/prisma/db"` |
| TEST_OR_MOCK_ONLY | `actions/payroll/__tests__/payroll-control.actions.test.ts` | 2 | `import { PaymentMethod } from "@prisma/client"` |


# AqStoqFlow Post-Priority-004 Inventory Read Cleanup Report

Date: 2026-06-17

Skill created and run: `post-priority-004-inventory-cleanup`

Installed skill path: `C:\Users\J COMPUTER\.codex\skills\post-priority-004-inventory-cleanup`

## Source Reports And Files

- `what-next/AQSTOQFLOW_PRIORITY_004_INVENTORY_ITEM_ACTION_MIGRATOR_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_PRIORITY_004_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md`
- `graphify-out/GRAPH_REPORT.md`
- `actions/inventory/inventoryMovementActions.ts`
- `actions/inventory/inventoryActions.ts`
- `services/inventory/*.service.ts`
- `services/item/item.service.ts`
- item edit App Router page and v1 item API routes

## Problem Statement

The prior Priority 004 slice migrated item and transfer mutation paths, but left read/report paths and API page reads with direct Prisma or mock/demo behavior. This slice moves those reads behind service-owned DTO methods while preserving existing action and route response contracts.

## Files Changed

- `services/inventory/inventory-read.service.ts`
- `actions/inventory/inventoryMovementActions.ts`
- `actions/inventory/inventoryActions.ts`
- `services/item/item.service.ts`
- `app/[locale]/(dashboard)/dashboard/inventory/items/[id]/edit/Page.tsx`
- `app/api/v1/organisations/[id]/briefItems/route.ts`
- `app/api/v1/organisations/[id]/items/route.ts`
- `services/inventory/__tests__/inventory-reconciliation.service.test.ts`
- `what-next/AQSTOQFLOW_POST_PRIORITY_004_INVENTORY_READ_CLEANUP_REPORT_2026-06-17.md`

## Services Added Or Reused

- Added `services/inventory/inventory-read.service.ts` for service-owned read DTOs:
  - `listStockTransfers`
  - `listInventoryTransactionMovements`
  - `getStockMovementSummary`
  - `listInventoryLevels`
  - `getInventoryStats`
  - read mappers for stock transfers and stock adjustments
- Reused `services/inventory/inventory-transfer.service.ts` for transfer creation.
- Reused `services/inventory/inventory-adjustment.service.ts` for adjustment/manual stock paths.
- Reused `services/inventory/inventory-stock-event.service.ts` for reservation paths.
- Extended `services/item/item.service.ts` with:
  - `getItemEditDTO`
  - `listItemApiDTOs`
  - `listBriefItemApiDTOs`

## Actions And Routes Migrated

- `getTransfers`, `getInventoryTransactionsMovement`, and `getStockMovementSummary` now delegate to inventory service read methods.
- `actions/inventory/inventoryMovementActions.ts` no longer imports Prisma or owns read query construction.
- `actions/inventory/inventoryActions.ts` was converted from direct Prisma/mock data to service-backed compatibility wrappers.
- Legacy `releaseInventory` now fails closed instead of fabricating reservation-release transactions, pending a service-owned release workflow.
- The item edit page now reads through `getItemEditDTO`.
- `/api/v1/organisations/[id]/briefItems` and `/api/v1/organisations/[id]/items` now read through item service DTO methods after `requireApiSessionForOrg`.

## Controls

- Inventory action reads validate caller-supplied organization ids against trusted authenticated organization context.
- Transfer mutation actions continue to use existing RBAC-protected transfer service paths.
- API routes keep `requireApiSessionForOrg` before service calls.
- Prisma access for this slice is contained in `services/inventory` and `services/item`.
- Mock/demo inventory item, transaction, adjustment, and transfer payloads were removed from `actions/inventory/inventoryActions.ts`.
- The reconciliation test mock was updated to match the current service source-count contract.

## Verification

- `python ... quick_validate.py C:\Users\J COMPUTER\.codex\skills\post-priority-004-inventory-cleanup`
  - Result: passed, `Skill is valid!`
- `npm run inventory:boundary:fail`
  - Result: passed.
  - Final evidence: active violations `0`; allowed kernel/test findings `22`.
- `npm run service:boundary:ratchet`
  - Result: passed.
  - Final evidence: baseline active violations `283`; current active violations `187`; delta `-96`; new active findings `0`; resolved active findings `95`.
- `npm test -- services/inventory actions/inventory services/item --runInBand`
  - Result: passed.
  - Evidence: 8 test suites passed, 33 tests passed.
- `npm run prisma:validate`
  - Result: passed.
  - Note: Prisma emitted the existing package.json Prisma config deprecation warning.
- `npm run typecheck`
  - Result: failed on an unrelated existing close-assurance typing issue after touched-slice errors were fixed.
  - Remaining error: `services/accounting/close-assurance.service.ts(946,9)` metadata type `Prisma.InputJsonObject` is not assignable to `JsonValue | undefined`.
- `npm run lint`
  - Result: passed with existing warnings.
  - Warnings: hook dependency warning in `components/auth/EmailVerificationForm.tsx`; `img` warnings in `components/dashboard/items/ModernItemFormForEditing.tsx`, `components/frontend/custom-carousel.tsx`, and `components/ui/groups/inventory/ItemManagement.tsx`.

Several commands initially hit the sandbox helper startup failure and were rerun with approved escalation. The command results above are from the successful reruns.

## Remaining Blockers

- Full typecheck is blocked by the existing close-assurance metadata type error in `services/accounting/close-assurance.service.ts`.
- The service-boundary gate still reports 187 active non-slice findings across auth, analytics, dashboard, locations, roles, suppliers, tax rates, units, users, and an organization route.
- `releaseInventory` needs a real service-owned release workflow before callers should use that legacy export.

## Next Recommended Priority

Close the unrelated close-assurance typecheck blocker first so the release gate can prove green type health again. Then continue the ordered service-boundary backlog with the remaining non-inventory action and App Router direct Prisma findings.

# AqStoqFlow Priority 004 Inventory Item Action Migrator Report

Date: 2026-06-16

Skill: `priority-004-inventory-item-action-migrator`

## Status

Completed the Priority 004 inventory/item action migration slice.

The item and `itemsShow` legacy action clusters now delegate item reads, updates, soft deletion, and manual stock adjustment orchestration to the item and inventory services. The remaining direct stock mutation gate is green with zero active violations.

The broader service-boundary backlog was reduced from 280 active findings after Priority 003 to 225 active findings after this slice. Against the ratchet baseline of 283, this is a reduction of 58 findings with no new active findings.

## Source Reports And Files Inspected

- `C:\Users\J COMPUTER\.codex\skills\priority-004-inventory-item-action-migrator\SKILL.md`
- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_PRIORITY_003_TENANT_RBAC_MAKER_CHECKER_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md`
- `graphify-out/GRAPH_REPORT.md`
- `actions/item/items.ts`
- `actions/item/listItemsAction.ts`
- `actions/itemsShow/*`
- `actions/inventory/inventoryMovementActions.ts`
- `services/item/item.service.ts`
- `services/inventory/inventory-transfer.service.ts`
- `services/inventory/inventory-event.schemas.ts`

## Files Changed

- `services/item/item.service.ts`
- `services/item/__tests__/item.service.test.ts`
- `actions/item/items.ts`
- `actions/item/listItemsAction.ts`
- `actions/itemsShow/createActionItem.ts`
- `actions/itemsShow/deleteItem.ts`
- `actions/itemsShow/getBriefItemById.ts`
- `actions/itemsShow/getBriefOrgItems.ts`
- `actions/itemsShow/getOrgItems.ts`
- `actions/itemsShow/getOrgItemsWithInventoryLevels.ts`
- `actions/itemsShow/getOrgItemsWithInventoryLevelsLocation.ts`
- `actions/itemsShow/updateItemBasicInfoById.ts`
- `actions/itemsShow/updateItemById.ts`
- `actions/itemsShow/updateItemItemDetailsById.ts`
- `actions/itemsShow/updateItemPricingById.ts`
- `actions/itemsShow/updateItemRelationsById.ts`
- `actions/itemsShow/updateItemStockById.ts`
- `actions/itemsShow/__tests__/item-service-boundary.actions.test.ts`
- `services/inventory/inventory-event.schemas.ts`
- `services/inventory/inventory-transfer.service.ts`
- `services/inventory/__tests__/inventory-transfer.service.test.ts`
- `actions/inventory/inventoryMovementActions.ts`
- `actions/inventory/__tests__/inventoryMovementActions.test.ts`
- `what-next/AQSTOQFLOW_PRIORITY_004_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_PRIORITY_004_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json`

## Controls Added Or Strengthened

- Moved item action business logic behind `services/item/item.service.ts`.
- Added service-owned item list/read/update/archive workflows with organization scope.
- Converted legacy item deletion to service-owned archive behavior instead of hard delete for evidence-bearing records.
- Kept manual stock deltas out of actions by routing them through the inventory adjustment workflow.
- Added RBAC checks to migrated item and `itemsShow` actions for read, create, update, stock adjustment, and delete/archive flows.
- Derived tenant scope from RBAC/session context instead of trusting caller-supplied organization IDs.
- Added service-owned stock transfer draft creation in `services/inventory/inventory-transfer.service.ts`.
- Moved stock transfer source/destination validation, item validation, duplicate-line aggregation, source stock availability checks, transfer number allocation, and audit evidence out of `actions/inventory/inventoryMovementActions.ts`.
- Tightened stock transfer approval action so `organizationId` and `approvedById` come from RBAC context, not request payloads.
- Added typed service errors for business-rule, not-found, insufficient-stock, and duplicate-number cases.

## Ledger, Business Event, And Close Notes

- Manual item stock quantity changes now reach the existing stock adjustment service path, preserving its maker-checker, business-event, ledger posting, and close-blocker behavior.
- Stock transfer posting remains owned by `postStockTransfer`, which records a business event, posts transfer movements, checks the open accounting period, enforces maker-checker where controlled locations require it, and records audit evidence.
- Stock transfer draft creation is now service-owned and audited. It does not post stock or ledger entries until the approval/posting workflow runs.

## Tests Added Or Updated

- Added item service regression coverage for service-owned list/update/archive behavior.
- Added `itemsShow` action boundary coverage proving actions derive tenant from RBAC and delegate to services.
- Added stock transfer service coverage for audited draft creation and duplicate-line stock availability checks.
- Added inventory movement action coverage proving create and approve transfer actions use RBAC tenant/actor context and delegate to services.

## Static And Boundary Gates

Service-boundary report:

- Command: `node scripts\service-boundary-gate.js --mode report --out what-next\AQSTOQFLOW_PRIORITY_004_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md --json-out what-next\AQSTOQFLOW_PRIORITY_004_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json`
- Active findings: 225
- Active counts:
  - `DIRECT_PRISMA_DB_IMPORT`: 39
  - `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE`: 116
  - `PRISMA_CLIENT_BOUNDARY_COUPLING`: 32
  - `ACTION_OWNED_MUTATION`: 38

Ratchet:

- Command: `npm run service:boundary:ratchet`
- Baseline active violations: 283
- Current active violations: 225
- Active violation delta: -58
- New active findings: 0
- Resolved active findings: 58
- Worsened classifications: 0
- Result: passed

Inventory stock mutation boundary:

- Command: `npm run inventory:boundary:fail`
- Active violations: 0
- Result: passed

## Verification Commands And Results

- `npm test -- services/inventory/__tests__/inventory-transfer.service.test.ts actions/inventory/__tests__/inventoryMovementActions.test.ts --runInBand`
  - Passed: 2 suites, 10 tests.
- `npm test -- services/inventory services/item actions/inventory actions/item actions/itemsShow --runInBand`
  - Passed: 10 suites, 38 tests.
- `npm run prisma:validate`
  - Passed. Prisma schema is valid.
- `npm run typecheck`
  - Passed.
- `npm run lint`
  - Passed with existing warnings outside this migration slice:
    - `components/auth/EmailVerificationForm.tsx`
    - `components/dashboard/items/ModernItemFormForEditing.tsx`
    - `components/frontend/custom-carousel.tsx`
    - `components/ui/groups/inventory/ItemManagement.tsx`
- `git diff --check -- <Priority 004 touched files>`
  - Passed.

## Remaining Debt

- `actions/inventory/inventoryActions.ts` still has direct Prisma read access and must be migrated or retired in the next inventory cleanup pass.
- `actions/inventory/inventoryMovementActions.ts` still has read/report direct Prisma paths for transfer listing, movement listing, and stock movement summary. The action-owned economic transfer creation mutation was removed in this slice.
- App Router/API item read paths still bypass service DTOs:
  - `app/[locale]/(dashboard)/dashboard/inventory/items/[id]/edit/Page.tsx`
  - `app/api/v1/organisations/[id]/briefItems/route.ts`
  - `app/api/v1/organisations/[id]/items/route.ts`
- Broader non-inventory service-boundary debt remains in analytics, auth, customers, dashboard, roles, suppliers, tax rates, units, and users.
- The remaining 225 service-boundary findings are intentionally not deleted blindly; they should continue through the ordered priority suite.

## Recommended Next Slice

Continue with a focused inventory read-model cleanup before moving fully to Priority 005:

1. Move `getTransfers`, `getInventoryTransactionsMovement`, and `getStockMovementSummary` behind service-owned read methods.
2. Migrate `actions/inventory/inventoryActions.ts` away from direct Prisma and mock/demo transfer helpers.
3. Replace item App Router/API direct Prisma reads with service-backed read DTOs.
4. Re-run `npm run inventory:boundary:fail`, `npm run service:boundary:ratchet`, focused inventory/action tests, typecheck, Prisma validation, and lint.


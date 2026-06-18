# AqStoqFlow Priority 005 Purchasing AP Consolidator Report

Date: 2026-06-16

Skills:

- `priority-005-purchasing-ap-consolidator`
- `011-aqstoqflow-purchasing-ap-controls`
- `exam-005-aqstoqflow-purchasing-ap-consolidator`

## Status

Completed the next purchasing/AP consolidation slice.

This pass hardened the legacy purchase-order workflow that still coexists with the newer AP control kernel. It did not attempt a blind deletion of `services/purchase-order`; instead it removed the highest-risk behavior in the active legacy path: placeholder approval actors, caller-controlled approval identity, purchase-order hard delete, missing RBAC on legacy PO actions, and raw generic errors on the touched workflows.

The broader service-boundary count remains 225 active findings. The service-boundary ratchet still passes with no new findings against the 283 baseline. Inventory stock mutation boundary remains green with zero active violations.

## Source Reports And Files Inspected

- `C:\Users\J COMPUTER\.codex\skills\priority-005-purchasing-ap-consolidator\SKILL.md`
- `C:\Users\J COMPUTER\.codex\skills\011-aqstoqflow-purchasing-ap-controls\SKILL.md`
- `C:\Users\J COMPUTER\.codex\skills\011-aqstoqflow-purchasing-ap-controls\references\chunk-blueprint.md`
- `C:\Users\J COMPUTER\.codex\skills\exam-005-aqstoqflow-purchasing-ap-consolidator\SKILL.md`
- `C:\Users\J COMPUTER\.codex\skills\exam-005-aqstoqflow-purchasing-ap-consolidator\references\risk-brief.md`
- `C:\Users\J COMPUTER\.codex\skills\exam-005-aqstoqflow-purchasing-ap-consolidator\references\runtime-boundary.md`
- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md`
- `graphify-out/GRAPH_REPORT.md`
- `services/purchase-order/purchase-order.service.ts`
- `services/purchase-order/purchase-order.schemas.ts`
- `services/purchasing/ap-control.service.ts`
- `services/purchasing/ap-control.schemas.ts`
- `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts`
- `actions/purchaseOrderWorkflow/GoodsReceiptAndSummary.ts`
- `actions/purchasing/ap-control.actions.ts`
- `components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx`
- `components/purchase-orders/ModernPurchaseOrderDetailPage.tsx`
- `hooks/useRecentPurchaseOrderQueries.ts`
- `prisma/schema.prisma`

## Current Priority Status Before Changes

- The newer AP control kernel under `services/purchasing` already covered supplier invoice posting, AP ledger posting/blockers, supplier bank change controls, supplier payment release, reconciliation evidence, and focused tests.
- The older purchase-order workflow under `services/purchase-order` still owned create/update/submit/approve/receive/cancel/delete/read behavior.
- The legacy PO action used active organization context but did not require specific purchasing permissions.
- The purchase-order management UI still sent `approvedBy: "system-user"`.
- The legacy PO service allowed the requester to approve their own purchase order.
- `deletePurchaseOrder` physically deleted purchase-order lines and the purchase order.
- Goods receipt stock effects were already routed through `postGoodsReceiptStock`, so this pass preserved that inventory service boundary.

## Files Changed

- `services/purchase-order/purchase-order.service.ts`
- `services/purchase-order/__tests__/purchase-order.service.test.ts`
- `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts`
- `actions/purchaseOrderWorkflow/GoodsReceiptAndSummary.ts`
- `actions/purchaseOrderWorkflow/__tests__/purchaseOrderSystemAction.test.ts`
- `components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx`
- `components/purchase-orders/ModernPurchaseOrderDetailPage.tsx`
- `what-next/AQSTOQFLOW_PRIORITY_005_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_PRIORITY_005_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json`

## Services Added Or Reused

- Reused `services/purchasing/ap-control.service.ts` as the canonical AP invoice/payment/fraud-control owner.
- Reused `services/inventory/inventory-stock-event.service.ts` for goods receipt stock effects.
- Hardened `services/purchase-order/purchase-order.service.ts` as the remaining legacy PO workflow owner while full consolidation continues.

## Actions, Routes, Hooks, Or UI Callers Migrated

- `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts`
  - now derives tenant and actor from `requirePermission`;
  - requires specific purchasing permissions for read/create/update/delete/submit/approve/cancel/receive/clone/export/report paths;
  - ignores caller-supplied approver identity for approval;
  - passes the RBAC actor into the archive service path.
- `actions/purchaseOrderWorkflow/GoodsReceiptAndSummary.ts`
  - now uses `purchases.orders.read` permission and typed tenant errors.
- `components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx`
  - no longer sends the `"system-user"` placeholder approval actor.
- `components/purchase-orders/ModernPurchaseOrderDetailPage.tsx`
  - no longer sends a client-supplied approver for PO approval.

No App Router routes or hooks were migrated in this slice.

## Controls Added Or Strengthened

- Tenant isolation: legacy PO actions derive `orgId` from RBAC context and reject mismatched requested organization IDs.
- RBAC: legacy PO actions now require explicit purchasing permissions.
- Actor identity: approve/delete/archive operations use the authenticated RBAC actor, not caller payloads.
- Maker-checker: purchase-order approval rejects the same actor who created the PO.
- Placeholder control: `"system-user"` is rejected by service approval/archive paths and no longer emitted by the purchase-order management UI.
- Immutability: purchase-order delete is now archive/soft-delete with `deletedAt` and `CANCELLED` status instead of physical deletion.
- Audit evidence: approval and archive paths create `AuditLog` entries with before/after evidence.
- Typed errors: touched PO validation, not-found, conflict, business-rule, and tenant errors now use service `_shared` error classes.
- Inventory boundary: goods receipt stock effects remain routed through `postGoodsReceiptStock`.

## Ledger, Business Event, And Close Notes

- This slice did not change supplier invoice posting or supplier payment release; those remain in `services/purchasing/ap-control.service.ts`.
- AP ledger posting and close-blocker behavior remain owned by the existing AP service.
- Purchase-order approval itself does not post ledger entries. Supplier invoices and supplier payments remain the accounting-impact events.
- Goods receipt stock effects continue through the inventory stock-event service and did not introduce direct stock mutation.

## Tests Added Or Changed

- Added `services/purchase-order/__tests__/purchase-order.service.test.ts` covering:
  - PO self-approval rejection;
  - approved-by-different-user path with audit evidence;
  - archive behavior without hard-deleting purchase orders or lines.
- Added `actions/purchaseOrderWorkflow/__tests__/purchaseOrderSystemAction.test.ts` covering:
  - approval uses RBAC actor instead of caller `approvedBy`;
  - archive/delete uses RBAC actor;
  - wrong tenant is rejected before service execution.

## Static And Boundary Gates

Service-boundary report:

- Command: `node scripts\service-boundary-gate.js --mode report --out what-next\AQSTOQFLOW_PRIORITY_005_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md --json-out what-next\AQSTOQFLOW_PRIORITY_005_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json`
- Active findings: 225
- Active counts:
  - `DIRECT_PRISMA_DB_IMPORT`: 39
  - `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE`: 116
  - `PRISMA_CLIENT_BOUNDARY_COUPLING`: 32
  - `ACTION_OWNED_MUTATION`: 38

Service-boundary ratchet:

- Command: `npm run service:boundary:ratchet`
- Baseline active violations: 283
- Current active violations: 225
- Active violation delta: -58
- New active findings: 0
- Resolved active findings: 58
- Worsened classifications: 0
- Result: passed

Inventory boundary:

- Command: `npm run inventory:boundary:fail`
- Active violations: 0
- Result: passed

## Verification Commands And Results

- `npm test -- services/purchase-order actions/purchaseOrderWorkflow actions/purchasing services/purchasing --runInBand`
  - Passed: 4 suites, 25 tests.
- `npm test -- services/purchasing services/purchase-order actions/purchasing --runInBand`
  - Passed: 3 suites, 22 tests.
- `npm run inventory:boundary:fail`
  - Passed: 0 active violations.
- `npm run service:boundary:ratchet`
  - Passed: no new findings.
- `node scripts\service-boundary-gate.js --mode report --out what-next\AQSTOQFLOW_PRIORITY_005_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md --json-out what-next\AQSTOQFLOW_PRIORITY_005_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json`
  - Passed/report generated.
- `npm run prisma:validate`
  - Passed. Prisma schema is valid.
- `npm run typecheck`
  - Passed.
- `npm run lint`
  - Passed with existing warnings outside this slice:
    - `components/auth/EmailVerificationForm.tsx`
    - `components/dashboard/items/ModernItemFormForEditing.tsx`
    - `components/frontend/custom-carousel.tsx`
    - `components/ui/groups/inventory/ItemManagement.tsx`
- `git diff --check -- <Priority 005 touched files>`
  - Passed.

## Remaining Blockers

- `services/purchase-order` still exists beside `services/purchasing`; full consolidation is not finished.
- `services/purchase-order/purchase-order.service.ts` still rewrites draft PO lines with `purchaseOrderLine.deleteMany` during update. This is now limited by workflow controls but should be converted to explicit draft-only line reconciliation in a later pass.
- PO submit/cancel/close/receive should eventually record business-event evidence, not only direct state changes.
- App Router and UI/hook type coupling still appear in:
  - `app/[locale]/(dashboard)/dashboard/purchases/[id]/page.tsx`
  - `app/[locale]/(dashboard)/dashboard/purchases/page.tsx`
  - `hooks/useRecentPurchaseOrderQueries.ts`
  - `components/purchase-orders/ModernStatusBadge.tsx`
- Supplier/item supplier legacy actions remain outside this slice and still appear in the broader service-boundary backlog.
- Full PO-to-AP consolidation still needs canonical service contracts for receipt-to-invoice handoff, PO read-model DTOs, and dashboard/API route migration.

## Next Priority Skill

Run `priority-006-hard-delete-immutability` next, with a purchasing follow-up note: finish draft-only line reconciliation and remove remaining hard-delete patterns from evidence-bearing domains.


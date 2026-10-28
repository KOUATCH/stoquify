# AqStoqFlow Priority 005B PO Workflow Sanitizer Report

Date: 2026-06-16

Skill installed:

- `C:\Users\J COMPUTER\.codex\skills\priority-005b-aqstoqflow-po-workflow-sanitizer\SKILL.md`

## Status

Completed the Priority 005B PO workflow sanitizer slice.

This pass did not attempt a broad deletion of the transitional `services/purchase-order` service. Instead, it removed the highest-risk remaining PO update behavior from the Priority 005 report: draft line rewrites no longer bulk-delete all `PurchaseOrderLine` records. PO line changes now use a controlled reconciliation path with protected evidence checks and audit evidence.

The slice also reduced PO read-model/UI Prisma coupling in the touched hook, action, component, and purchase pages by using the service schema `PurchaseOrderStatus` type.

## Files Inspected

- `what-next/AQSTOQFLOW_PRIORITY_005_PURCHASING_AP_CONSOLIDATOR_REPORT_2026-06-16.md`
- `C:\Users\J COMPUTER\.codex\skills\priority-005-purchasing-ap-consolidator\SKILL.md`
- `C:\Users\J COMPUTER\.codex\skills\011-aqstoqflow-purchasing-ap-controls\SKILL.md`
- `C:\Users\J COMPUTER\.codex\skills\exam-005-aqstoqflow-purchasing-ap-consolidator\SKILL.md`
- `services/purchase-order/purchase-order.service.ts`
- `services/purchase-order/purchase-order.schemas.ts`
- `services/purchase-order/__tests__/purchase-order.service.test.ts`
- `services/purchasing/ap-control.service.ts`
- `services/purchasing/ap-control.schemas.ts`
- `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts`
- `actions/purchaseOrderWorkflow/GoodsReceiptAndSummary.ts`
- `actions/purchasing/ap-control.actions.ts`
- `hooks/useRecentPurchaseOrderQueries.ts`
- `components/purchase-orders/ModernStatusBadge.tsx`
- `components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx`
- `app/[locale]/(dashboard)/dashboard/purchases/page.tsx`
- `app/[locale]/(dashboard)/dashboard/purchases/[id]/page.tsx`
- `prisma/schema.prisma`

## Files Changed

- `services/purchase-order/purchase-order.service.ts`
- `services/purchase-order/purchase-order.schemas.ts`
- `services/purchase-order/__tests__/purchase-order.service.test.ts`
- `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts`
- `hooks/useRecentPurchaseOrderQueries.ts`
- `components/purchase-orders/ModernStatusBadge.tsx`
- `app/[locale]/(dashboard)/dashboard/purchases/page.tsx`
- `app/[locale]/(dashboard)/dashboard/purchases/[id]/page.tsx`
- `what-next/AQSTOQFLOW_PRIORITY_005B_PO_WORKFLOW_SANITIZER_SERVICE_BOUNDARY_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_PRIORITY_005B_PO_WORKFLOW_SANITIZER_SERVICE_BOUNDARY_REPORT_2026-06-16.json`
- `what-next/AQSTOQFLOW_PRIORITY_005B_PO_WORKFLOW_SANITIZER_REPORT_2026-06-16.md`

## Legacy PO Paths Migrated Or Retained

- Retained `services/purchase-order` as the transitional PO workflow owner because full canonical PO absorption into `services/purchasing` still needs receipt-to-invoice/AP contracts.
- Migrated the update line replacement behavior away from `purchaseOrderLine.deleteMany`.
- Retained draft-only individual line removal only after verifying no receipt or supplier-invoice evidence exists.
- Retained `services/purchasing` as the AP invoice/payment/ledger/blocker owner.

## Services Added Or Reused

- Reused `services/purchase-order/purchase-order.service.ts` for the transitional PO update workflow.
- Reused `services/purchase-order/purchase-order.schemas.ts` as the service DTO/status source for touched hooks and UI.
- Reused `services/purchasing/ap-control.service.ts` for existing AP controls; no AP posting logic changed in this slice.

## Actions, Hooks, And UI Callers Migrated

- `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts`
  - now passes the trusted RBAC actor into `updatePurchaseOrderService` as `updatedById`.
  - no longer imports `PurchaseOrderStatus` from Prisma.
- `hooks/useRecentPurchaseOrderQueries.ts`
  - no longer imports Prisma `PurchaseOrder` or `PurchaseOrderStatus`.
  - uses a local sort-field union and the service schema status type.
- `components/purchase-orders/ModernStatusBadge.tsx`
  - no longer imports Prisma `PurchaseOrderStatus`.
- `app/[locale]/(dashboard)/dashboard/purchases/page.tsx`
  - no longer imports Prisma `PurchaseOrderStatus`.
- `app/[locale]/(dashboard)/dashboard/purchases/[id]/page.tsx`
  - no longer imports Prisma `PurchaseOrderStatus`.

## Controls Added

- Draft/submitted line reconciliation now checks workflow status before touching lines.
- Partially received purchase orders are now non-editable in the legacy PO update path.
- Current PO lines are checked for `receivedQuantity`, `goodsReceiptLines`, and `supplierInvoiceLines` before any line replacement.
- Matching item lines are updated in place.
- New draft lines are created explicitly.
- Removed draft lines are individually deleted only when no receipt or invoice evidence exists.
- Every line reconciliation writes `AuditLog` evidence with before, after, and reconciled line IDs.
- Update actions pass a trusted actor ID from RBAC context into the service for audit attribution.
- Touched hook/action/UI paths no longer couple to Prisma client status types.

## Tests Added Or Updated

Updated `services/purchase-order/__tests__/purchase-order.service.test.ts` with coverage for:

- editable draft line reconciliation without `purchaseOrderLine.deleteMany`;
- audit evidence for updated, created, and removed draft lines;
- rejection when receipt or supplier-invoice evidence protects existing lines;
- rejection of partially received PO edits before reconciliation;
- existing Priority 005 approval and archive controls.

## Verification Results

- `python C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py C:\Users\J COMPUTER\.codex\skills\priority-005b-aqstoqflow-po-workflow-sanitizer`
  - Passed. Skill is valid.
- `npm test -- services/purchase-order actions/purchaseOrderWorkflow actions/purchasing services/purchasing --runInBand`
  - Passed: 4 suites, 28 tests.
- `npm run inventory:boundary:fail`
  - Passed: 0 active violations.
- `npm run service:boundary:ratchet`
  - Passed: active service-boundary violations improved from baseline 283 to current 220; no new findings.
- `node scripts/service-boundary-gate.js --mode report --out what-next/AQSTOQFLOW_PRIORITY_005B_PO_WORKFLOW_SANITIZER_SERVICE_BOUNDARY_REPORT_2026-06-16.md --json-out what-next/AQSTOQFLOW_PRIORITY_005B_PO_WORKFLOW_SANITIZER_SERVICE_BOUNDARY_REPORT_2026-06-16.json`
  - Passed/report generated.
- `npm run prisma:validate`
  - Passed. Prisma schema is valid.
  - Existing Prisma warning: `package.json#prisma` config is deprecated for Prisma 7.
- `npm run typecheck`
  - Passed.
- `npm run lint`
  - Passed with existing warnings outside this slice:
    - `components/auth/EmailVerificationForm.tsx`
    - `components/dashboard/items/ModernItemFormForEditing.tsx`
    - `components/frontend/custom-carousel.tsx`
    - `components/ui/groups/inventory/ItemManagement.tsx`
  - Existing Next warning: `next lint` is deprecated for Next.js 16.
- `git diff --check -- <Priority 005B touched files>`
  - Passed.
- `rg -n "@prisma/client" hooks/useRecentPurchaseOrderQueries.ts components/purchase-orders/ModernStatusBadge.tsx "app/[locale]/(dashboard)/dashboard/purchases" actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts`
  - No matches.
- `rg -n "purchaseOrderLine\.deleteMany" services/purchase-order/purchase-order.service.ts`
  - No matches.

## Remaining Blockers

- `services/purchase-order` still exists beside `services/purchasing`; complete canonical PO consolidation remains a later migration.
- Full receipt-to-invoice AP handoff still needs a canonical service contract under `services/purchasing`.
- PO submit, cancel, close, receive, archive, and invoice handoff still need broader business-event standardization beyond direct audit logs.
- The service-boundary report still has 220 active findings outside this slice.
- Broad App Router/API direct Prisma paths, inventory actions, supplier actions, auth actions, and reporting actions remain in the wider modernization backlog.
- Prisma 7 migration preparation remains future platform work.
- Next.js lint migration away from `next lint` remains future CI modernization work.

## Next Recommended Slice

Run `priority-006-hard-delete-immutability` next for the ordered suite, with a purchasing follow-up slice to define canonical `services/purchasing` PO read-model, receipt-to-invoice handoff, and AP close-blocker contracts so `services/purchase-order` can be retired safely.

# Purchase-Order Read-Model Module Ownership Follow-up

Date: 2026-07-20

Skill: `aqstoqflow-module-surface-registry-ratchet`

Lane: full surface registry and inventory ratchets

Status: complete

## Scope

Map `actions/purchaseOrderWorkflow/GoodsReceiptAndSummary.ts` to its canonical module owner without changing purchase-order runtime behavior.

## Evidence and decision

- ADR 0004 assigns `actions/purchaseOrderWorkflow` and `services/purchase-order` to canonical `purchasing` ownership.
- ADR 0011 assigns purchase-order workflows, purchases, and suppliers to `purchasing`.
- The canonical catalog defines `purchasing` as Purchasing and AP, owned by Procurement.
- The action delegates only to `services/purchase-order/purchase-order.service`.
- Its two exported read models require `purchases.orders.read` and reject an organization ID that differs from the authorized `orgId`.
- `hooks/useRecentPurchaseOrderQueries.ts` consumes its goods-receipt read model inside the purchase-order workflow.
- The action knowledge graph records `getGoodsReceiptsForPurchaseOrder`, `getPurchaseOrdersSummary`, and `scopedOrg` as cohesive Community 50.

Canonical module owner: `purchasing`

## Changes

- Added an exact-file `purchasing` mapping for `purchaseOrderWorkflow/GoodsReceiptAndSummary.ts`.
- Added a focused inventory regression for module slug, permission, guard, and classification.
- Regenerated the module-surface inventory and baseline ratchet in warn mode.

## Delta

- Purchase-order read-model active gaps: 1 → 0
- Whole inventory active gaps: 14 → 13
- Saved baseline active gaps: 55
- Overall active-gap delta: **−42**
- New findings: 0
- Resolved findings: 42
- Remaining unmapped records: 7
- Remaining missing-permission records: 4
- Ratchet status: passed

## Controls

- Tenant: the existing action continues to compare the supplied organization ID with the authorized `orgId`.
- RBAC: existing `requirePermission("purchases.orders.read")` behavior is unchanged.
- Entitlement: module control remains observe/report only; no enforcement was introduced.
- Audit: the existing read authorization keeps `auditAllowed: false`; no audit semantics changed.
- Redaction and errors: current return shaping and `BusinessRuleError` behavior remain unchanged.
- Release gate: the mapping is exact-file and regression-tested, avoiding namespace-wide inference.

## Verification

- `scripts/__tests__/module-surface-inventory-purchase-order-read-model-ownership.test.js` — passed.
- `actions/purchaseOrderWorkflow/__tests__/purchaseOrderSystemAction.test.ts` — passed.
- `hooks/__tests__/useRecentPurchaseOrderQueries.boundary.test.tsx` — passed.
- Combined focused result: 3 suites / 9 tests passed.
- `npm run module:surface:ratchet` — passed, 367 records, 13 active gaps, zero new findings.

## Next handoff

Inspect the two supplier-management surfaces together:

- `actions/suppliers/itemSupplierActions.ts`
- `actions/suppliers/supplier-management-actions.ts`

ADR 0011 currently assigns `actions/suppliers` to `purchasing`, but item-supplier links also touch inventory ownership and both records expose permission-parser anomalies. Resolve ownership and parser evidence before mapping; do not use a broad supplier namespace rule until that distinction is verified.

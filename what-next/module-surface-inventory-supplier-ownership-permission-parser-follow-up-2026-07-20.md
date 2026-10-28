# Supplier Ownership and Permission-Parser Follow-up

Date: 2026-07-20

Skill: `aqstoqflow-module-surface-registry-ratchet`

Lane: full surface registry and inventory ratchets

Status: complete

## Scope

Jointly inspect and classify:

- `actions/suppliers/itemSupplierActions.ts`
- `actions/suppliers/supplier-management-actions.ts`

Correct only their module ownership and inventory parser evidence. No supplier, inventory, purchasing, tenant, or authorization runtime behavior was changed.

## Evidence and decision

- ADR 0011 assigns both `actions/suppliers` and `services/supplier` to canonical `purchasing` ownership.
- The canonical catalog includes suppliers in the Purchasing and AP module owned by Procurement.
- Both actions delegate to `services/supplier/supplier.service`.
- Supplier management is consumed by the purchasing supplier dashboard and invalidates purchase, supplier, and dependent item views.
- Item-supplier actions manage supplier sourcing relationships and revalidate both inventory-item and purchasing-supplier views.
- The action graph separates supplier management (Community 9) and item-supplier operations (Community 13), while the service graph keeps both in the same supplier-service community.
- Item-supplier operations require both inventory-item and purchasing-supplier permissions. That is a cross-module RBAC dependency, not evidence that stock truth belongs to this boundary.

Decision: both surfaces belong to `purchasing`. Inventory remains the owner of item and stock truth; item-supplier sourcing depends on inventory permissions without becoming an Inventory-owned action surface.

## Parser findings and changes

- `itemSupplierActions.ts` was reported with the placeholder permission `permissions` because `requireAllPermissions` receives a local variable.
- `supplier-management-actions.ts` was reported with source text from `error.message.startsWith(...)` because the generic literal matcher crossed a string boundary.
- Added exact-file named permission-map extraction for `ITEM_SUPPLIER_PERMISSIONS` and `SUPPLIER_PERMISSIONS`.
- Deduplicated repeated permissions within those named maps.
- Classified the existing supplier-management `requireOrg()` plus explicit `hasPermission(user.permissions, ...)` boundary as `requireOrg+permission-check`.
- Added exact-file `purchasing` ownership mappings and a focused regression suite.

## Resulting records

- `itemSupplierActions.ts`: `purchasing`; six effective permissions spanning inventory items and purchasing suppliers; `requireAllPermissions`.
- `supplier-management-actions.ts`: `purchasing`; four supplier CRUD permissions; `requireOrg+permission-check`.

## Delta

- Supplier tranche active gaps: 3 → 0
- Whole inventory active gaps: 13 → 10
- Saved baseline active gaps: 55
- Overall active-gap delta: **−45**
- New findings: 0
- Resolved findings: 45
- Remaining unmapped records: 5
- Remaining missing-permission records: 4
- Ratchet status: passed

## Controls

- Tenant: existing `assertCanUseOrganization`, authorized `orgId`, and explicit organization comparison remain unchanged.
- RBAC: existing cross-domain `requireAllPermissions` and supplier CRUD permission checks remain unchanged.
- Entitlement: module control remains observe/report only; no enforcement was introduced.
- Audit/redaction/errors: existing action logging, safe errors, and response shaping remain unchanged.
- Release gate: ownership and parser rules are exact-file and focused-test backed; no broad supplier namespace inference was added.

## Verification

- `scripts/__tests__/module-surface-inventory-supplier-ownership-permissions.test.js` — 2 tests passed.
- `actions/suppliers/__tests__/itemSupplierActions.test.ts` — passed.
- `services/supplier/__tests__/supplier.service.test.ts` — passed.
- Existing runtime regression result: 2 suites / 8 tests passed.
- `npm run module:surface:ratchet` — passed, 367 records, 10 active gaps, zero new findings.

## Next handoff

The next coherent tranche is the three customer action surfaces. They mirror several supplier findings: canonical Sales ownership is documented, one management file has the same local permission-map/string-literal parser anomaly, and two legacy boundaries need explicit permission and guard evidence reviewed before any mapping. Keep the evidence/proof-trail and module-entitlement service findings separate because they are cross-module governance boundaries.

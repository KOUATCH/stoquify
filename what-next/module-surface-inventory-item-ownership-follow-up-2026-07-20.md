# Inventory Item Module-Surface Ownership Follow-up

Date: 2026-07-20

Skill: `aqstoqflow-module-surface-registry-ratchet`

Lane: full surface registry and inventory ratchets

Status: complete

## Scope

Resolve the next bounded ownership cluster in the regenerated module-surface inventory: top-level server actions under `actions/item/`, `actions/item-suppliers/`, and `actions/itemsShow/`.

The accepted ownership ADR assigns these action domains to the canonical `inventory` module. All 17 target actions already exposed RBAC permission and guard evidence; this tranche corrects inventory classification only.

Supplier-management, brands, categories, units, customer, evidence, shared authentication, and other remaining findings were not changed.

## Changes

- Added top-level namespace inference for `item/`, `item-suppliers/`, and `itemsShow/` to canonical `inventory` ownership.
- Kept the rule anchored to the beginning of the action surface so nested names in unrelated namespaces are not absorbed.
- Added an exact-file regression matrix for all 17 target action surfaces.
- Added a negative assertion that `actions/suppliers/itemSupplierActions.ts` remains unmapped pending its own ownership review.
- Regenerated `what-next/module-surface-inventory.json` and `what-next/module-surface-inventory.md` in warn/ratchet mode.

## Delta

### This tranche

- Target actions: 17
- Inventory-mapped targets: 0 → 17
- Unmapped target actions: 17 → 0
- Active gap reduction attributable to this tranche: **−17**

### Whole inventory against saved baseline

- Baseline active gaps: 55
- Current active gaps: 29
- Active gap delta: **−26**
- New gaps: 0
- Resolved gaps: 26
- Remaining unmapped records: 17
- Ratchet status: passed

The earlier preserved work accounted for −9 gaps; this tranche accounts for the subsequent −17. The combined baseline delta is therefore −26.

## Controls

- Service ownership: item and item-supplier action surfaces remain owned by Inventory services; no business truth moved into the scanner or UI.
- Tenant/RBAC: existing `requirePermission` and `requireAllPermissions` boundaries were not changed.
- Entitlement: inventory remains warn/report-only; no hard enforcement or pilot cohort was enabled.
- Audit/redaction: no payload, audit, employee, customer, or financial data handling changed.
- Release ratchet: zero new findings; unrelated ambiguous supplier ownership remains visible rather than being inferred.
- Rollback: remove the three anchored namespace alternatives and the focused test; no data or runtime action behavior requires rollback.

## Verification

- `npx jest scripts/__tests__/module-surface-inventory-item-ownership.test.js --runInBand` — passed, 1 suite / 18 tests.
- `npm run module:surface:ratchet` — passed, 367 records, 29 current active gaps, zero new findings.
- Focused record verification — 17/17 targets map to `inventory`; nested supplier namespace remains unmapped.

## Remaining blockers and handoff

Twenty-nine active inventory findings remain. Several are genuine permission/ownership gaps, while others require explicit not-applicable classification or parser improvement.

Next safest handoff: review the small Inventory-adjacent `brands`, `categories`, and `units` action cluster. Its ownership is clear, but actions lacking server-side RBAC evidence must not be made to look safe merely by assigning a module slug; classification and authorization remediation should be separated and tested.

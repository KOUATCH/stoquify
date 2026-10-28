# Stage 02 Security And Proof Gate: Foundation Inventory

## Verdict

**PASS** for the current foundation-inventory security boundary. The confirmed direct server-action RBAC bypass is closed and tested. This verdict does not claim that cursor, export, or inventory proof features exist; those surfaces remain forbidden until their Stage 02 requirements are implemented and reverified.

- Run: `th-foundation-inventory-20260714-001`
- Mode: `implement`
- Active lanes: `workbench`, `inventory`
- Product files changed: `actions/inventory/inventoryMovementActions.ts`, `actions/inventory/__tests__/inventoryMovementActions.test.ts`

## Control Matrix

| Surface | Tenant source | Permission | Module | Fresh auth | Redaction/proof | Result |
|---|---|---|---|---|---|---|
| Transfer-history action | `requirePermission` context; mismatched caller org denied | `inventory.levels.read` | `inventory`, `enforce`, audited | Not required for read | Existing operational projection only | PASS |
| Movement-history action | `requirePermission` context; mismatched caller org denied | `inventory.levels.read` | `inventory`, `enforce`, audited | Not required for read | Existing operational projection only | PASS |
| Movement-summary action | `requirePermission` context; mismatched caller org denied | `inventory.levels.read` | `inventory`, `enforce`, audited | Not required for read | Aggregate only | PASS |
| Detail/proof drawer | Not implemented | Must be separately authorized before release | Must enforce `inventory` | Fresh auth if sensitive proof is added | No registered inventory proof subject; show proof unavailable | NA |
| Full export | Not implemented | Dedicated export authority and current permission recheck required | Must enforce `inventory` | Required for sensitive bulk export | Server redaction, formula neutralization, row/byte/concurrency limits, audit required | NA |
| Cursor | Not implemented | Tenant and permission rechecked per request | Must enforce `inventory` | Not normally required | Opaque signed cursor bound to tenant, adapter, filter hash, version, and `recordedThrough` | NA |

## Implemented Change

The three read entrypoints now share `requireInventoryHistoryReadAccess`. It:

1. requires canonical `inventory.levels.read` with an auditable resource;
2. rejects caller organization IDs that differ from `ctx.orgId`;
3. evaluates the canonical `inventory` module in `enforce` mode and explicitly denies an unavailable module;
4. passes only `ctx.orgId` to the tenant-scoped read service.

Transfer creation/approval and reservation behavior were not changed.

## Verification

- Focused Jest: **1 suite, 6 tests passed**. Tests cover all three read entrypoints, permission denial, caller-organization mismatch, module denial, and no service call after denial.
- Focused ESLint: passed for both changed files.
- Repository typecheck: `tsc --noEmit --pretty false` passed.
- Formatter: repository Prettier applied only to the two allowlisted files; focused tests and lint passed afterward.

## Residual Risk

- The current table projection includes creator email, location address, unit cost, total cost, batch, serial, and expiry data. `inventory.levels.read` now gates it, but field-level role redaction remains a Medium policy decision before broader roles or exports are introduced.
- `auditAllowed: true` and module-decision audit provide authorization evidence, not immutable or tamper-evident financial proof.
- No inventory proof subject is registered in `services/evidence/evidence-contracts.ts`; Stage 05/06 must not render a proof badge.
- No signed cursor or server export exists. Stage 04 must implement the Stage 02 contract before those surfaces can be released.

No Critical or High security finding remains in the active foundation-inventory action boundary. Stage 03 is independently eligible; Stage 04 remains dependent on exact Stage 03 PASS.

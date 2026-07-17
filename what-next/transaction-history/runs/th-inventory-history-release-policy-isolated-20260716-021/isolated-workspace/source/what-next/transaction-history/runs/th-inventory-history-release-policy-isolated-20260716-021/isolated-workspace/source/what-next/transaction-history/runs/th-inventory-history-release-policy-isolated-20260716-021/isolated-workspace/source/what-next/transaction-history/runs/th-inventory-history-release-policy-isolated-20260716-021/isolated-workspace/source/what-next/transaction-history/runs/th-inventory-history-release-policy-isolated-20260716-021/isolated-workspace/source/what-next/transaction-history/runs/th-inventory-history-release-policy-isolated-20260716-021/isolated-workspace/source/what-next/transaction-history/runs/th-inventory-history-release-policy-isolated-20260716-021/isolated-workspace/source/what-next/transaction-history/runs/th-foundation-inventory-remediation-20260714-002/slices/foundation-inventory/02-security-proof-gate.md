# Stage 02 Security Proof Gate: Foundation Inventory Remediation

## Verdict

**PASS** for the accounting-remediation scope. Stage 03 may proceed. No security product code was changed.

- Run: `th-foundation-inventory-remediation-20260714-002`
- Run mode: `implement`; Stage 02 activity: evidence-only verification
- Active lanes: `workbench`, `inventory`
- Allowed and observed edits: Stage 02 evidence only

This pass covers the currently reachable inventory history read actions and constrains the planned Stage 03 services to internal accounting ownership. It does not approve a future cursor, export, drawer, certificate, or public proof surface; those controls remain mandatory before Stage 04-07 release.

## Permission And Control Matrix

| Surface | Entrypoint | Permission | Tenant source | Module | Fresh auth | Field policy | Result |
|---|---|---|---|---|---|---|---|
| Transfer history read | `getTransfers` | `inventory.levels.read` | RBAC `ctx.orgId`; caller mismatch rejected | `inventory`, enforced | Not required for bounded table read | Least-data row contract | PASS |
| Movement history read | `getInventoryTransactionsMovement` | `inventory.levels.read` | RBAC `ctx.orgId`; caller mismatch rejected | `inventory`, enforced | Not required for bounded table read | Least-data row contract | PASS |
| Movement summary read | `getStockMovementSummary` | `inventory.levels.read` | RBAC `ctx.orgId`; caller mismatch rejected | `inventory`, enforced | Not required for bounded summary read | Aggregate only | PASS |
| Planned correction command | Internal Stage 03 service only | No public entrypoint in this run | Explicit trusted organization passed by owning service | No new action permitted | N/A | Returns identifiers and accounting status only | PASS by boundary |
| Cursor/export/proof drawer | Not implemented in remediation | N/A | Must be tenant/filter bound when Stage 04 begins | Must be enforced | Required for sensitive/bulk export | Explicit allowlist required | N/A |

## Verified Controls

1. `actions/inventory/inventoryMovementActions.ts` calls canonical `requirePermission("inventory.levels.read")` before every history service read.
2. A conflicting caller organization is rejected before module or history service access.
3. `observeModuleAccess` runs with `moduleSlug: "inventory"`, `surfaceType: "action"`, `accessIntent: "read"`, `mode: "enforce"`, and audit enabled.
4. A denied module decision prevents history service access.
5. Services receive only the RBAC-derived organization identifier.
6. Stage 03 is not allowed to edit actions, RBAC, module entitlement, proof registries, export safety, or public routes.

## Frozen Field Policy

Until a role-specific drawer/export policy is implemented:

- Table rows may expose item identity, SKU, location name/code, transaction type, signed quantity, effective/recorded time, reference number, balance, and inventory cost to holders of `inventory.levels.read` because no distinct valuation permission exists today.
- Table and export contracts must omit creator email, location address/phone/email, internal tokens, private notes, and unrestricted batch, serial, and expiry detail.
- A future detail drawer must define separate field allowlists and sensitive-read auditing before those fields are returned.
- Exports require server-side regeneration from normalized filters, formula neutralization, bounded abuse controls, audit events, and fresh authentication. No export is approved by this evidence.
- Checksums remain integrity fingerprints and are not described as signatures or non-repudiation proof.

## Negative Verification

Command:

```powershell
node .\node_modules\jest\bin\jest.js --runInBand --runTestsByPath actions/inventory/__tests__/inventoryMovementActions.test.ts --forceExit
```

Result:

- Test suites: 1 passed
- Tests: 6 passed
- Permission denial prevents service access
- Caller organization mismatch prevents service access
- Module denial prevents service access
- All three reads use canonical permission, enforced module, and RBAC tenant scope

The first local Jest invocation timed out at 60 seconds without a result. The exact by-path retry passed, but Jest required `--forceExit` and reported an open-handle warning. This is a test-harness residual risk, not a security-test failure.

## Residual Risk And Handoff

- Existing action files are dirty from the prior successful security run and are intentionally outside this Stage 02 evidence-only allowlist.
- Cursor authentication, export abuse controls, detail redaction snapshots, and sensitive-read auditing remain Stage 04-07 requirements because those surfaces do not yet exist in this remediation scope.
- Stage 03 must remain internal and must not introduce a direct action/API route or expand returned sensitive fields.
- Stage 03 is eligible. Stage 04 remains blocked until Stage 03 returns exact `PASS` and the read-model security controls are implemented.


# Inventory Loss Control Report

Date: 2026-08-01
Phase: 3
Slice: 406
Status: Certified

## Outcome

Stoquify now has a dedicated protected command boundary for the inventory-loss workflows that already existed in the service layer. The slice exposes four bounded operations:

- create a frozen stock-count session;
- submit the completed count and evidence;
- approve and post a stock count through the maker-checker workflow;
- approve and post a stock adjustment or write-off.

This replaces further POS cash-shortage evidence-wrapper work with a product-facing inventory control capability already supported by live service truth.

## Before And After

Before Slice 406, `inventory-count.service.ts` and `inventory-adjustment.service.ts` owned count, variance, evidence, segregation-of-duties, event, audit, movement, and ledger behavior, but no dedicated protected action surface exposed the four loss-control commands.

After Slice 406, `actions/inventory/inventoryLossControlActions.ts` provides that boundary while preserving service ownership. It does not recreate inventory calculations or posting logic in the action layer.

## Authority And Trust Boundary

Every command:

- requires `inventory.stock.adjust` through `requirePermission`;
- rejects a caller-supplied organization that conflicts with the RBAC organization;
- enforces the `inventory` module entitlement in audited `mode: "enforce"`;
- overwrites caller-supplied actor fields with `ctx.userId`;
- sends `ctx.orgId` as the service organization;
- returns a small serialization-safe summary instead of a raw Prisma result.

The inventory services remain authoritative for validation, count snapshots, evidence hashes, maker-checker rules, idempotency, business events, audit logs, stock movements, valuation, and ledger posting.

## Implementation Anchors

- `createStockCountSessionAction`: `actions/inventory/inventoryLossControlActions.ts:175`
- `submitStockCountSessionAction`: `actions/inventory/inventoryLossControlActions.ts:206`
- `postStockCountAction`: `actions/inventory/inventoryLossControlActions.ts:238`
- `postStockAdjustmentAction`: `actions/inventory/inventoryLossControlActions.ts:270`
- Focused tests begin at `actions/inventory/__tests__/inventoryLossControlActions.test.ts:164`.

## Verification

| Gate | Result |
| --- | --- |
| Focused inventory-loss action Jest | Passed: 1 suite, 10 tests |
| Inventory count and adjustment service Jest | Passed: 2 suites, 8 tests |
| `npm run typecheck` | Passed |
| Scoped ESLint for the action and test | Passed |
| Direct database/auth/activation authority scan | Passed: no matches |
| RBAC, tenant, actor, and module-entitlement scan | Passed: expected server-owned anchors found |
| Trailing-whitespace scan | Passed |

## Scope Guard

This slice adds no UI, schema, migration, new permission, detector, scheduler, worker, alert, external-sharing behavior, AI, copilot, or WhatsApp behavior. It does not enable the POS cash-shortage workflow or claim browser/runtime activation evidence.

The Workflow Assurance static release gate remains ready at 38/38 checks, 11/11 indexes, and 2/2 engine-health gates. The POS cash-shortage definition remains disabled, and browser certification still lacks the required tenant auth state, live incident fixture, screenshots, and server-truth manifest.

## Next Decision

No Slice 407 is selected by this implementation. Return to `stoquify-referral-war-room-orchestrator` to refresh evidence and choose the next narrow, dependency-aware product slice.

# AqStoqFlow Skill 010 — Inventory Valuation Kernel Execution

**Execution date:** 2026-07-26  
**Selected skill:** `010-aqstoqflow-inventory-valuation-kernel`  
**Decision:** **PARTIAL PASS — PRODUCTION RELEASE BLOCKED**

## Executive conclusion

The repository already contains a strong service-owned inventory kernel covering:

- immutable inventory movements;
- weighted-average valuation;
- stock transfers;
- adjustments and write-offs;
- physical counts and variance posting;
- optimistic stock locking;
- business events, audit evidence, outbox notifications, and close invalidation;
- projection rebuild;
- class 3 reconciliation; and
- class 3 close-assurance integration.

This execution corrected a material accounting-time defect in projection rebuild and added a dedicated Skill 010 truth gate.

Skill 010 cannot be declared complete because the mandatory atomic production invariant is absent. The Prisma schema defines recipes, ingredients, and production batches, but there is no canonical `services/production` implementation that consumes ingredients and creates finished goods in one controlled transaction.

## Projection rebuild correction

The previous projection rebuild filtered movements with:

`createdAt <= asOf`

That no longer represents the repository's inventory accounting-time contract. Inventory movements now distinguish:

- `effectiveAt`: economic time; and
- `recordedAt`: knowledge/system time.

Projection rebuild now:

1. Applies `effectiveAt <= asOf`.
2. Applies `recordedAt <= recordedThrough`.
3. Rejects a future `recordedThrough`.
4. Orders deterministically by `effectiveAt`, `recordedAt`, and movement ID.
5. Includes both cutoffs in the projection hash.
6. Reports `UNEXPLAINED_LEVEL` when a non-zero stored inventory level has no supporting immutable movement history.
7. Remains read-only and reports drift instead of overwriting operational stock.

This prevents late-recorded or back-dated stock movements from being silently included in the wrong evidence snapshot and prevents unsupported stock balances from escaping the rebuild.

## Controls verified

- Runtime inventory mutations are confined to `services/inventory`.
- Transfers post balanced quantity/value legs with immutable movements.
- Adjustments and write-offs use controlled workflows and ledger blockers.
- Stock counts create source-linked adjustment evidence for variances.
- Inventory events carry idempotency, hashes, business events, audit evidence, notifications, and close invalidation.
- Negative stock and concurrent updates are controlled by typed errors and optimistic locking.
- Projection rebuild reconstructs weighted-average quantity and value without mutating stored projections.
- Class 3 reconciliation:
  - uses one recorded-through cutoff;
  - proves inventory and ledger roll-forwards;
  - detects inventory/class-3 drift;
  - detects movements missing business-event evidence;
  - detects orphan class 3 postings; and
  - blocks close assurance on material failures.
- Inventory actions remain thin, service-backed boundaries.

## High-severity production blocker

The following required canonical file is absent:

`services/production/production-batch.service.ts`

There is no verified operation such as:

`completeProductionBatch`

that atomically:

- locks and validates the organization-scoped batch;
- freezes the exact recipe version and ingredient snapshot;
- scales ingredient quantities to actual output;
- incorporates approved waste, labor, and overhead;
- checks sufficient ingredient stock;
- posts `PRODUCTION_OUT` movements for every ingredient;
- posts one `PRODUCTION_IN` movement for finished goods;
- calculates the finished-goods weighted-average unit cost;
- records one idempotent `PRODUCTION_BATCH` business event;
- creates audit and outbox evidence;
- performs the required class 3 raw-material-to-finished-goods reclassification;
- links the journal and movements to the production batch;
- invalidates affected close evidence; and
- marks the batch `COMPLETED` only after all inventory and ledger truth is committed.

Without this boundary, production completion could be implemented ad hoc or could update a batch without trustworthy stock and accounting effects.

## Required production implementation contract

### Schema and evidence

Before runtime implementation, add or confirm durable fields for:

- immutable recipe version;
- canonical recipe/ingredient snapshot hash;
- evidence/document hash;
- organization-scoped idempotency key;
- maker and independent approver;
- approval and completion timestamps;
- posted business-event ID;
- ledger posting batch ID;
- production value and currency;
- optimistic version or conditional terminal transition; and
- immutable links to the generated ingredient and output movements.

Use a migration that preserves existing production rows. Do not infer historical recipe snapshots that cannot be proven; label legacy provenance explicitly.

### Atomic completion

Implement `completeProductionBatch` in `services/production/production-batch.service.ts` with a serializable transaction:

1. Re-read and lock the organization-scoped production batch.
2. Require an eligible non-terminal state.
3. Enforce tenant, permission, fresh-authentication, and maker-checker controls.
4. Validate active recipe version, output item, ingredient items, quantities, waste factors, and actual output.
5. Resolve all source inventory levels and reject insufficient stock before mutation.
6. Calculate ingredient consumption using the current weighted-average cost.
7. Calculate total input, labor, overhead, and output unit cost deterministically.
8. Require an active approved posting rule for:
   - source type `PRODUCTION_BATCH`;
   - posting purpose `PRODUCTION_BATCH`.
9. Create a balanced class 3 journal that moves value from raw materials/work in progress to finished goods using approved account mappings.
10. Create all `PRODUCTION_OUT` and `PRODUCTION_IN` movement rows and update projections.
11. Create accounting source links, business event, audit evidence, outbox notification, and close invalidation.
12. Mark the batch complete only after inventory and ledger assertions pass.
13. Roll back every operation on any failure.

### Corrections

Completed production facts must not be edited. Corrections require a compensating reversal/void event that:

- reverses finished-goods output;
- restores ingredient quantities and value;
- reverses the linked journal;
- maintains lineage to the original batch; and
- invalidates prior close evidence.

### Required tests

At minimum:

- successful multi-ingredient completion;
- exact weighted-average input and output costing;
- ingredient insufficiency rollback;
- missing/invalid posting rule rollback;
- unbalanced account recipe rejection;
- maker-checker rejection;
- tenant-boundary rejection;
- idempotent replay;
- concurrent completion produces one economic event;
- recipe changes after batch planning do not alter the frozen snapshot;
- journal/source-link/movement continuity;
- production reversal;
- projection rebuild after production;
- class 3 tie-out after production; and
- production failure leaves batch, stock, ledger, audit, and outbox unchanged.

## New Skill 010 truth gate

Added `scripts/inventory-valuation-truth-gate.js` with five controls:

1. `service_owned_immutable_stock_events`
2. `bitemporal_projection_rebuild`
3. `class3_reconciliation_truth`
4. `class3_close_assurance_integration`
5. `atomic_production_consumption_and_output`

Current result:

- Checks ready: **4/5**
- Blocker: `atomic_production_consumption_and_output`

The gate has focused regression tests and supports report and fail modes.

## Verification results

- Pre-change inventory kernel baseline: **11 suites, 60 tests passed**
- Projection rebuild and class 3 focused verification: **2 suites, 10 tests passed**
- Full inventory kernel plus truth-gate tests: **12 suites, 66 tests passed**
- Inventory actions and close-assurance integration: **5 suites, 48 tests passed**
- Inventory boundary gate: **passed; 0 active violations**
- Inventory valuation truth gate: **blocked 4/5**, only production atomicity missing
- TypeScript typecheck: **passed**
- Prisma validation: **passed**
- Error-boundary gate: **passed; 0 active unsafe findings**

## Files changed

- `services/inventory/inventory-projection-rebuild.service.ts`
- `services/inventory/__tests__/inventory-projection-rebuild.service.test.ts`
- `scripts/inventory-valuation-truth-gate.js`
- `scripts/__tests__/inventory-valuation-truth-gate.test.js`
- `what-next/inventory-valuation-truth-readiness.md`
- `what-next/inventory-valuation-truth-readiness.json`
- `what-next/AQSTOQFLOW_SKILL_010_INVENTORY_VALUATION_KERNEL_EXECUTION_2026-07-26.md`

## Release decision

The non-production inventory kernel improvements are verified, but Skill 010 remains release-blocked on:

`atomic_production_consumption_and_output`

Do not represent production inventory or production costing as complete until the service, schema evidence, posting rule, compensating reversal, and production-to-class-3 tests above are implemented.

## Next recommended numbered skill

`011-aqstoqflow-purchasing-ap-controls`

Skill 011 may be assessed independently, but advancing to it must not be interpreted as production approval of Skill 010.

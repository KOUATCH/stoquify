# Stoquify Transaction History Execution Ledger

## Run

- Run ID: `th-foundation-inventory-20260714-001`
- Trace ID: `82b750e4-b0de-47bc-a69c-5333da8327bd`
- Slice: `foundation-inventory`
- Mode: `implement`
- Baseline commit: `5cf02043eed4fbfb7e6e1bb3b1a4c87683965e2d`
- Runtime evidence: `what-next/transaction-history/runs/th-foundation-inventory-20260714-001/`

## Stage Ledger

| Stage | Status | Work performed | Evidence |
|---|---|---|---|
| 00 Orchestrator | INVOKED | Validated manifest and current dirty inventory; selected dependency-safe stages; no product edits | `run-manifest.json`, `run-state.json` |
| 01 Architecture | PASS | Mapped route, workbench, hook/action, service, Prisma, permission, proof, and tests; routed exact downstream owners | `slices/foundation-inventory/01-architecture-gate.*` |
| 02 Security/proof | PASS | Closed direct-action RBAC bypass; enforced `inventory` entitlement; added denial and tenant-scope tests | `slices/foundation-inventory/02-security-proof-gate.*` |
| 03 Accounting/control | BLOCKED | Verified posting controls and identified release-blocking time, reconciliation, period tie-out, and correction-chain gaps | `slices/foundation-inventory/03-accounting-control-gate.*` |
| 04 Read model | NOT ELIGIBLE | Stage 03 is not `PASS` | none |
| 05 UX contract | NOT ELIGIBLE | Stage 04 not completed | none |
| 06 Frontend delivery | NOT ELIGIBLE | Stages 04/05 not completed | none |
| 07 Release review | NOT ELIGIBLE | Stages 02-06 are not all current `PASS` | none |

## Product Change

Only two product files were changed:

- `actions/inventory/inventoryMovementActions.ts`
- `actions/inventory/__tests__/inventoryMovementActions.test.ts`

`getTransfers`, `getInventoryTransactionsMovement`, and `getStockMovementSummary` now require `inventory.levels.read`, reject caller organization mismatch, enforce the `inventory` module, and pass only RBAC-derived organization scope to read services.

## Verification

- Focused authorization suite: **1 suite, 6 tests passed**.
- Inventory control suites: **7 suites, 32 tests passed**.
- Focused ESLint on the changed files: passed.
- Full TypeScript check: passed.
- Orchestrator control-plane tests: **13/13 passed** for source and installed copies.
- Runtime artifact validator: passed with three promoted stage artifacts and verified checksums.

## Active Blockers

1. `INVENTORY_EFFECTIVE_RECORDED_TIME_MISSING`: `InventoryTransaction` cannot distinguish economic effect from recorded knowledge time.
2. `INVENTORY_RECONCILIATION_CAPPED`: source-continuity proof scans only 500 movements and 1,000 business events.
3. `INVENTORY_PERIOD_TIEOUT_TEMPORAL_MISMATCH`: period activity is compared with current inventory value rather than a closing valuation at the same cutoff.
4. `INVENTORY_CORRECTION_CHAIN_MISSING`: immutable reversal/correction lineage is not explicit.
5. `INVENTORY_HISTORY_FIELD_POLICY_PENDING`: creator email, address, costs, batch, serial, and expiry fields need an explicit table/drawer/export redaction policy.

## Next Dependency-Safe Run

Open a new `foundation-inventory` remediation run with explicit schema, migration, service, and test allowlists. Execute in this order:

1. Define immutable `effectiveAt`, `recordedAt`, `recordedThrough`, reversal, and correction semantics.
2. Add migration/backfill provenance and rollback evidence without rewriting financial facts.
3. Replace capped reconciliation proof scans with complete set-based checks or stable keyset traversal.
4. Implement opening, in-period movement, and closing valuation tie-out at one effective/recorded cutoff.
5. Rerun Stage 03. Only exact `PASS` may unlock Stage 04.

Do not begin shared workbench or dashboard implementation while this gate remains blocked.
## Remediation Run 002

- Run ID: `th-foundation-inventory-remediation-20260714-002`
- Trace ID: `dcbfbfe6-a2c2-4da1-8684-8a27555c9836`
- Runtime evidence: `what-next/transaction-history/runs/th-foundation-inventory-remediation-20260714-002/`
- Result: Stage 01 `PASS`; Stage 02 `PASS`; Stage 03 `BLOCKED`; selector returned `STAGE_BLOCKED`; Stages 04-07 remain `PENDING`.

This run retired `INVENTORY_EFFECTIVE_RECORDED_TIME_MISSING`. `InventoryTransaction` now has explicit effective time, server-recorded time, provenance, and tenant-scoped time indexes. Stock events, adjustments, and both transfer legs persist the contract, and the migration labels legacy `createdAt` backfills as approximations rather than exact economic time.

Focused verification passed Prisma schema validation, no-engine client generation, focused ESLint, 3 service suites, and 18 tests. Standard Prisma generation was blocked by a locked Windows query-engine DLL. The full TypeScript check timed out twice without diagnostics under concurrent repository load, so no typecheck pass is claimed.

The next fresh run must implement complete reconciliation and same-cutoff period tie-out. The correction/reversal chain remains a separate schema-level blocker. The accounting-time migration must also be deployed and tested against representative legacy data before Stage 03 can pass.

## Reconciliation Run 003

- Run ID: th-foundation-inventory-reconciliation-20260714-003
- Trace ID: 2c326932-0478-4ee8-977f-cc3227d1647c
- Runtime evidence: what-next/transaction-history/runs/th-foundation-inventory-reconciliation-20260714-003/
- Result: Stage 01 PASS; Stage 02 PASS; Stage 03 BLOCKED; selector returned STAGE_BLOCKED; Stages 04-07 remain PENDING.

This run retired INVENTORY_RECONCILIATION_CAPPED, INVENTORY_PERIOD_TIEOUT_TEMPORAL_MISMATCH, and STAGE03_TYPECHECK_UNAVAILABLE. Inventory and class 3 now use database aggregates for opening, movement, and closing at one effective interval and recorded-through cutoff. Movement-to-event continuity walks the complete population with stable cursor pagination, and orphan class 3 postings use complete counts.

Verification passed 5 focused reconciliation tests, 10 adjacent inventory tests, 16 close-assurance tests, focused ESLint, Prisma validation, two final full TypeScript checks, formatting, checksum validation, and diff hygiene. The runtime validator returned valid=true with 3 artifacts, 0 errors, and 0 warnings.

The next run must implement immutable inventory correction and reversal lineage, then deploy and verify the accounting-time migration against representative legacy rows. Stage 04 remains prohibited until those controls produce an exact Stage 03 PASS.

## Correction Run 004

- Run ID: th-foundation-inventory-correction-20260715-004
- Trace ID: a82e6f25-6283-4be1-8ca5-aa591975bbef
- Runtime evidence: what-next/transaction-history/runs/th-foundation-inventory-correction-20260715-004/
- Result: Stage 01 BLOCKED; selector returned STAGE_BLOCKED; Stages 02-07 remain PENDING.

Stage 01 mapped the required atomic correction contract and rejected unsafe alternatives, including polymorphic manual references, a raw-SQL-only side table, and non-atomic journal reversal after stock posting. Product implementation did not begin because prisma/schema.prisma already contains mixed predecessor inventory-time changes and independent session-assurance changes.

The runtime validator returned valid=true with one artifact, zero errors, and zero warnings. The safe next action is an owner-reviewed clean checkpoint for prisma/schema.prisma and its two existing migrations. No stash, reset, auto-commit, or overwrite was performed.

# Independent inventory reversal verifier review

Review date: 2026-10-01. Read-only source review; no database, tests or verifier execution. Reviewer: settlement_runtime_recipe. Product and verifier files were not edited by this review.

Conclusion: the reviewed driver uses genuine service transitions and real PostgreSQL contention, with explicit synthetic-authority limitations. Two verification gaps were reported to the coordinator: the injected rollback is early in the operation, and runtime observation does not itself assert catalog-before-effects ordering. The coordinator has assigned the inventory owner to add late rollback and runtime catalog assertions. This document is bound to the predecessor driver below, not those subsequent changes.

## Findings

1. **Early rollback coverage is narrower than full downstream rollback.** Driver line 120 injects after `inventoryTransaction.create`. At that point the service has created the correction adjustment, updated the level and inserted its adjustment line/movement, but has not yet created the ledger batch/journal, source link, business event or Close invalidations. The exact before/after snapshot across all effect models proves rollback of the executed stock effects; unchanged downstream tables do not prove those downstream writes would roll back after execution. Add a second late failure after source ledger/event/invalidation writes to establish that broader property.
2. **Runtime lock evidence proves period contention and sorted membership, with catalog ordering currently source-backed.** Driver lines 115–116 capture `close-assessment-order` keys and `pg_blocking_pids` proves an actual conflicting connection. They do not capture `accounting-period-catalog` or assert every scope key was held at the first domain write. The service itself acquires catalog, posting period and full sorted scope before `stockAdjustment.create`; `buildReversalPlans` only reads current levels and later updates use version/value compare-and-swap. Add catalog and first-effect observations if the runtime receipt is to claim this full order independently of source review.

## Verified by source inspection

- `requestManualItemStockAdjustment` genuinely creates and submits a request, with audit, inside the service. The fixture does not directly manufacture SUBMITTED or COMPLETED statuses.
- Fixture posting uses `postStockAdjustment` with a distinct synthetic checker; exact 2-unit/200-value effects are asserted. Reversal uses the actual source-owned command.
- `d.assessment` calls actual `runCloseAssurance` and checks both its READY/T4 output and the accountant portal's T4 grade; a prerequisite exception stops the scenario when those are missing. Certification uses actual export services. No fabricated READY/CERTIFIED write was found on the called fixture paths.
- The observer delegates original database operations and only pauses/injects failures. Creator-first observes a committed RUNNING publication, invalidates it before collectors proceed, and checks that collectors preserve BLOCKED/stale state. Producer-first verifies publication waits and then assesses the compensated source.
- Financial assertions preserve original rows except explicitly permitted source status and inventory projection updates. They check exact row deltas, mirrored debit/credit/base amounts, rates and dimensions, original movement linkage, zero stock/value projection, source links and APPLIED event evidence.
- Exact replay snapshots include financial effects, audit, events/outbox/event audit, and Close run/checklist/finding/evidence/export rows. Retained export bytes and immutable fields are checked.
- The cumulative case uses actual fiscal creation and assessments; it covers a later retained export plus a later period without a Close run. The excluded earlier claim is specifically its inventory annex fingerprint, not universal tenant evidence freshness.
- The service's ordered scope includes original/reversal periods, original adjustment/movement dates, retained batch period, and cumulative later inventory periods. Unsupported inherited RepeatableRead/Serializable transactions are refused before source effects; the owned transaction is ReadCommitted.
- Internal asserted actor IDs are not authenticated permission/fresh-auth proof, and changed-payload replay is explicitly outside the driver claim. These are accurately disclosed limitations.

Graph discovery: `graphify-out/ordered-code-graph.json`, node `inventory_inventory_adjustment_reversal_service_reversestockadjustment`, community 71. Current source was inspected to validate the graph's historical locator.

## Source bindings (SHA-256)

| File | SHA-256 |
| --- | --- |
| `lanes/environment/inventory-adjustment-reversal-runtime.cjs` | `65f1acb7012bee45ae84978dc518cc8b9953b90d52d09e11c83ddd959894527e` |
| `services/inventory/inventory-adjustment-reversal.service.ts` | `ec54b67b9d7be0cc24747e6b131e96f3ef6dc69afdcea88743b6275b83643e9a` |
| `services/inventory/inventory-adjustment.service.ts` | `010ad1be32fb8fb41c28946af033377aa65ad3b13d029235eaa7dc699eb0ffa7` |
| `services/inventory/inventory-close-invalidation.service.ts` | `7c570820469718daf607d0213288f3b1bc37eecfec3dbd88c2fe188bf6b107bf` |
| `services/accounting/journal-reversal-order.service.ts` | `f6b6a6765094e726614c4b9c0be004c6265e50657ad3f319c0317e9ed4442e09` |
| `services/accounting/journal-close-invalidation.service.ts` | `970b4cf5673823dbb9241940fbbc6eae975a454dd3f2ac57d8e90679fc98b342` |
| `lanes/environment/close-denial-recovery-runtime.cjs` | `9a0004e63ef61014bca46a379d1ea621e5735228f515cf76cb64d5d3cd76b425` |
| `lanes/environment/close-current-recovery-runtime.cjs` | `7652c985f51fb304649d5cf41fb713b05551a963e1c6fef270bb417ab4fd9e1a` |

Environment paths above are relative to `what-next/workflow-modernization/2026-09-05-run-01`; product paths are repository-relative. This review establishes no execution pass or release certification.

# Stage 01 Architecture Gate: Foundation Inventory Accounting Remediation

## Verdict

**PASS** for architecture and edit ownership. The remediation boundary is sufficiently defined for Stage 02 verification and Stage 03 implementation. This verdict does not claim that the four accounting blockers are fixed.

- Run: `th-foundation-inventory-remediation-20260714-002`
- Mode: `implement`
- Active lanes: `workbench`, `inventory`
- Product edits in Stage 01: none
- In-scope product targets: clean at dispatch

## Evidence Provenance

The available `graphify-out/manifest.json` references `E:/ohada saas/newStockFlow/aqstoqflow`, not this repository. Its graph is stale cross-repository evidence and was rejected for ownership claims. The current Stoquify source, Prisma schema, tests, and prior checksum-valid run evidence are authoritative.

## Current Ownership Map

| Concern | Current owner | Current fact | Remediation owner |
|---|---|---|---|
| Movement persistence | `prisma/schema.prisma:737-775` | `InventoryTransaction` stores only `createdAt`; no correction relation | Schema plus named migration |
| General stock events | `services/inventory/inventory-stock-event.service.ts:581-671` | Validates `occurredAt`, then writes movements with only posting `now` | Stock-event service |
| Adjustments/write-offs | `services/inventory/inventory-adjustment.service.ts:1177-1197` | Has economic `occurredAt`; movement writer drops it | Adjustment service |
| Transfers | `services/inventory/inventory-transfer.service.ts:734-795` | Has transfer `occurredAt`; both movements drop it | Transfer service |
| Class 3 reconciliation | `services/inventory/inventory-reconciliation.service.ts:78-323` | Caps movement/event proof and compares period activity with current stock value | Reconciliation service |
| Correction/reversal | No domain service | No immutable inventory correction command or one-time lineage | New inventory correction service using existing posting kernel |
| Security boundary | `actions/inventory/inventoryMovementActions.ts` | Prior run enforces `inventory.levels.read`, tenant scope, and inventory entitlement | Stage 02 verification only |
| Stable history read | `services/inventory/inventory-read.service.ts` | Recent/capped read remains outside this accounting remediation | Stage 04 after Stage 03 PASS |

## Frozen Time Contract

1. `effectiveAt` is the economic occurrence time already supplied to the posting kernel and checked against the accounting period. It is immutable after insertion.
2. `recordedAt` is a server-generated UTC time captured once inside the posting transaction and applied to every movement created by that posting operation. It is immutable and distinct from `effectiveAt`.
3. Legacy rows are backfilled from `createdAt` only with explicit `LEGACY_CREATED_AT_APPROXIMATION` provenance. New rows use `EXPLICIT_SOURCE_TIME`. Legacy provenance blocks exact backdated-as-of certification and must appear in partial-source evidence.
4. `recordedThrough` is a query/reconciliation cutoff, not another mutable row timestamp. A run freezes it once and includes only rows with `recordedAt <= recordedThrough`.
5. Inventory ordering and future cursor traversal use `(effectiveAt DESC, recordedAt DESC, id DESC)`.

## Frozen Correction Contract

- Posted movement rows remain append-only; no update or delete is introduced.
- A reversal is a new movement whose signed quantity and signed value exactly negate the original and whose `reversalOfId` points to the original.
- `reversalOfId` is unique, preventing duplicate reversal of one original movement.
- An optional replacement is another new movement whose `correctionOfId` points to the original. A direct correction link is unique; a later correction must target the replacement as the new original.
- The correction service verifies identical organization, item, and location scope; requires an allowed effective period; uses one server `recordedAt`; preserves the original reference and valuation provenance; and delegates stock mutation to the existing idempotent posting kernel.
- Reversal and replacement IDs, business-event identity, actor, reason, effective period, and close invalidation are persisted and tested. The service must fail closed if exact one-time compensation cannot be proven.

## Frozen Reconciliation Contract

For one organization, currency, optional location, effective interval, and immutable `recordedThrough`:

```text
opening inventory value
  + signed effective-period movement value
  = closing inventory value

closing inventory value
  + approved reconciling items
  = cumulative posted class 3 balance at the same effective cutoff
```

- Signed movement value is positive for positive quantity and negative for negative quantity; reservations contribute zero.
- Opening includes complete movements before the period start known by `recordedThrough`.
- Closing includes complete movements through the period end known by `recordedThrough`.
- Class 3 comparison uses cumulative `POSTED`/`REVERSED` journal lines with `entryDate` through the same period end, not only journal activity tagged to the selected period.
- Complete proof uses bounded keyset batches internally. Batch size is operational and may not cap totals, failures, or certification.
- The result reports scanned counts, cutoff, legacy-time count, opening, movement, closing, GL closing, variance, and every missing event/orphan posting exception.

## Exact Stage 03 Edit Ownership

The run manifest permits only:

- `prisma/schema.prisma`
- `prisma/migrations/20260714194500_inventory_history_accounting_time_controls/migration.sql`
- `services/inventory/inventory-event.schemas.ts`
- `services/inventory/inventory-stock-event.service.ts`
- `services/inventory/inventory-adjustment.service.ts`
- `services/inventory/inventory-transfer.service.ts`
- `services/inventory/inventory-reconciliation.service.ts`
- `services/inventory/inventory-correction.service.ts`
- The five exact focused inventory test files named in the manifest
- Stage 03 JSON and Markdown evidence under this run

Directories, neighboring files, UI files, read-model files, accounting policy services, generated Prisma output, and unrelated tests are not allowed.

## Stage Routing

| Blocker | Primary stage | Exact owner |
|---|---|---|
| `INVENTORY_EFFECTIVE_RECORDED_TIME_MISSING` | Stage 03 | Schema, migration, three posting services, tests |
| `INVENTORY_RECONCILIATION_CAPPED` | Stage 03 | Reconciliation service and focused test |
| `INVENTORY_PERIOD_TIEOUT_TEMPORAL_MISMATCH` | Stage 03 | Reconciliation service and focused test |
| `INVENTORY_CORRECTION_CHAIN_MISSING` | Stage 03 | Schema, migration, correction service, posting kernel, focused test |
| Cursor, normalized row/summary/export parity | Stage 04 | History contract and inventory read service only after Stage 03 PASS |
| Workbench semantics and UI | Stages 05-06 | No work permitted in this remediation gate |

## Verification And Residual Risk

- Targeted Git status found no pre-existing edits in the Stage 03 schema, migration, service, or test targets.
- The prior run's two modified inventory action files are outside the Stage 03 allowlist and will not be touched.
- Migration deployment, backfill execution, query plans, correction behavior, roll-forward, and class 3 tie-out remain unverified until Stage 03 executes.
- Existing legacy data cannot acquire true historical economic time. Provenance must preserve that limitation rather than presenting approximated time as exact.

## Handoff

Stage 02 may perform evidence-only verification of tenant, permission, entitlement, and sensitive-field boundaries. Stage 03 may implement only the frozen accounting contracts and exact allowlist above. Stage 04 remains ineligible until both Stage 02 and Stage 03 return exact `PASS` with current checksums.


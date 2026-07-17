# Stage 03 Accounting Control Gate: Foundation Inventory

## Verdict

**BLOCKED** for Stage 04 progression. The inventory posting kernel has meaningful service-owned controls, but the current history model cannot support the proposed effective-time, recorded-time, complete reconciliation, and correction-chain claims. No product edit was authorized for Stage 03 in this run.

- Run: `th-foundation-inventory-20260714-001`
- Mode: `implement` with evidence-only allowlist
- Active lanes: `workbench`, `inventory`
- Product edits: none

## Controls That Pass

| Control | Evidence | Result |
|---|---|---|
| Signed quantity | `InventoryTransaction.quantity` is signed; stock event posting rejects zero and guards insufficient stock. | PASS |
| Atomic stock update | `inventory-stock-event.service.ts:441-476` uses version and quantity guards inside the posting transaction. | PASS |
| Balance after | Stock event and adjustment services persist the post-event on-hand balance at `inventory-stock-event.service.ts:507` and `inventory-adjustment.service.ts:552`. | PASS for posting-time balance only |
| Idempotency | Stock event, transfer, and adjustment services use service-owned idempotency keys and conflict on incompatible replay. | PASS |
| Adjustment/write-off ledger | `inventory-adjustment.service.ts:649-872` creates a posting batch, resolves the period rule, requires a journal, enforces balanced lines, writes a posted journal entry/source link, and records ledger audit evidence. | PASS |
| Class 3 checks | `inventory-reconciliation.service.ts` compares inventory value with posted SYSCOHADA class 3 lines and flags missing source events/orphan class 3 postings. | PASS as a diagnostic, not as complete certification |
| Focused regression | Seven inventory suites executed successfully. | PASS: 7 suites, 32 tests |

## Blocking Gaps

### ACCT-INV-01: no effective-versus-recorded time

`InventoryTransaction` has only `createdAt` (`prisma/schema.prisma:744`). Stock adjustments can select posting rules and journals by `occurredAt` (`inventory-adjustment.service.ts:689`), but that economic date is not persisted on the movement row. A history adapter therefore cannot distinguish business effect from when Stoquify learned or persisted the event, freeze a knowledge cutoff, or answer backdated as-of questions without inventing semantics.

Required remediation: add immutable `effectiveAt` and `recordedAt` semantics with migration/backfill provenance, then make posting services set them explicitly. Do not silently map both to `createdAt`.

### ACCT-INV-02: reconciliation uses capped evidence

`inventory-reconciliation.service.ts:168` inspects at most 500 movements and line 179 at most 1,000 business events while separately counting the full population. Missing stock events after those caps can escape the failure scan. This cannot certify complete source-to-ledger continuity.

Required remediation: replace capped proof scans with complete keyset traversal or set-based anti-joins and verify the query plan at representative volume.

### ACCT-INV-03: period mismatch in class 3 tie-out

When a period is supplied, movement and ledger lines are period-scoped (`inventory-reconciliation.service.ts:90`), but inventory value is derived from current `InventoryLevel.totalValue` (`:224`) rather than a period-end valuation snapshot. Comparing current stock value with period journal activity can produce a temporally invalid tie-out.

Required remediation: define opening, in-period movements, and closing valuation at one effective/recorded cutoff; reconcile the closing subledger value to the class 3 control balance at the same cutoff.

### ACCT-INV-04: correction and reversal chain is not explicit

Movement rows expose generic source references and `balanceAfter`, but the model does not identify which immutable transaction reverses or corrects another. The history cannot safely render correction lineage or restated running balances for backdated corrections.

Required remediation: define immutable reversal/correction linkage and tests for original, reversal, replacement, close invalidation, and replay behavior.

## Non-Blocking Contract Gaps

- The UI transaction type union diverges from Prisma and the service hides this with casts; write-off, reservation, sales return, and purchase return meanings can be mistranslated.
- Row filters and summary filters do not share transaction type, so a selected type can show mismatched KPIs.
- The movement workbench uses a capped list and must remain labelled `Recent` until Stage 04 implements complete traversal and same-cutoff export.

## Verification

`\.\node_modules\.bin\jest.cmd services/inventory/__tests__ actions/inventory/__tests__/inventoryMovementActions.test.ts --runInBand`

- Test suites: 7 passed
- Tests: 32 passed
- Snapshots: 0

The earlier Stage 02 full typecheck and focused lint remain green. No database migration, query plan, backfill, or period-end tie-out was executed in Stage 03, so none is claimed.

## Required Next Run

Stage 04 is not eligible. Create a remediation run with explicit schema/service/test allowlists for ACCT-INV-01 through ACCT-INV-04. Re-run Stage 03 after migration/backfill and complete tie-out evidence; only exact `PASS` may unlock the read-model optimizer.

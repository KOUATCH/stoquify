# Stage 03 Accounting Control Gate

## Run identity

- Run: th-foundation-inventory-reconciliation-20260714-003
- Trace: 2c326932-0478-4ee8-977f-cc3227d1647c
- Slice: foundation-inventory
- Skill: stoquify-transaction-history-03-accounting-control-gate
- Agent role: Bookkeeper & Controller
- Mode: implement
- Verdict: **BLOCKED**

## Executive verdict

This run retires the two high-severity reconciliation defects carried from run 002. Inventory and SYSCOHADA class 3 values now use complete server-side populations at one organization, currency, effective interval, and recorded-through cutoff. Opening plus signed movement is proved against closing for both the inventory subledger and class 3 ledger, and movement-to-business-event continuity uses cursor traversal rather than capped samples.

Stage 03 remains blocked. Posted inventory movements still lack an explicit immutable correction/reversal relationship to the original movement, and the accounting-time migration has not been deployed or verified against representative legacy rows. Stage 04 remains ineligible.

## Implemented controls

### Common cutoff and roll-forward

- The request schema accepts an optional server-validated recordedThrough date.
- Future knowledge cutoffs are rejected before financial queries run.
- Inventory windows filter effectiveAt and recordedAt independently.
- Class 3 windows filter journal entryDate and postedAt independently.
- Opening is all activity before the period start known by recordedThrough.
- Movement is period activity known by recordedThrough.
- Closing is all activity through the period end known by recordedThrough.
- Inbound total cost is positive and outbound absolute total cost is subtracted.
- The result exposes opening, movement, closing, and variance for both populations.

The focused proof fixture demonstrates:

    inventory: 500.00 + 200.00 - 700.00 = 0.00
    class 3:   500.00 + 200.00 - 700.00 = 0.00
    tie-out:   700.00 - 700.00 = 0.00

A deliberate 100.00 class 3 variance blocks the result.

### Complete-population reconciliation

- Inventory value uses database aggregates, not client arrays or take limits.
- Movement/event continuity traverses every inventory movement page with a stable id cursor.
- Page size limits memory only; it does not limit the financial population.
- Missing-event evidence is counted across all pages, while diagnostic samples are limited to 25.
- Orphan class 3 postings use a complete database count with one diagnostic sample.
- Tenant, location, currency, posting state, account class, effective time, and recorded cutoff are applied server-side.

### Posting and close compatibility

- Source counts and continuity evidence remain service-owned.
- Adjacent inventory event and adjustment suites pass.
- Close-assurance and close-pack suites pass with the richer reconciliation result.
- Existing close behavior still consumes reconciliation status, but missing correction lineage remains an unresolved close-control prerequisite.

## Claim matrix

| Claim | Result | Evidence and limitation |
| --- | --- | --- |
| TH03_ROLLFORWARD | PASS | Inventory and class 3 opening, movement, closing, and variances are calculated at common cutoffs and covered by focused tests. |
| TH03_CONTROL_TIEOUT | PASS | Closing inventory value is compared with closing class 3 value at the same effective and recorded cutoffs; deliberate variance blocks. |
| TH03_POSTING_TRACE | PASS | Movement-to-business-event continuity is complete-population and orphan class 3 postings are counted server-side. Existing posting tests remain green. |
| TH03_CORRECTION_REVERSAL | GAP | InventoryTransaction has no explicit original/reversal/correction relationship or one-time reversal constraint. |
| TH03_TIME_CUTOFF | PASS | effectiveAt, recordedAt, entryDate, and postedAt are independently constrained; future recordedThrough is rejected. |
| TH03_RECONCILIATION | PASS | Financial totals are aggregate-based and movement continuity is cursor-complete. |
| TH03_CLOSE_BLOCKERS | GAP | Reconciliation failures block existing close assurance, but correction-lineage readiness is not yet represented as a close blocker. |
| TH03_EVIDENCE_GRADE | PASS | This report makes no reconciled, certified, statutory, migration-deployed, or production-performance claim beyond executed evidence. |
| TH03_OHADA_PROVENANCE | GAP | Class 3 is selected from stored SYSCOHADA class metadata, but immutable country-pack and posting-rule snapshots are not proved by this slice. |
| TH03_AR_PREREQUISITES | NA | AR is outside the foundation-inventory slice. |
| TH03_VERIFICATION | PASS | Focused and adjacent tests, ESLint, Prisma validation, full typecheck, formatting, and diff hygiene pass. |

## Changed files

- services/inventory/inventory-event.schemas.ts
- services/inventory/inventory-reconciliation.service.ts
- services/inventory/__tests__/inventory-reconciliation.service.test.ts
- this Markdown report
- the paired Stage 03 JSON evidence artifact

No Stage 04 read model or UI file was changed.

## Verification evidence

| Command | Result | Evidence |
| --- | --- | --- |
| Focused inventory reconciliation Jest suite | PASS | 1 suite, 5 tests passed, including cutoff, variance, orphan, and 251-row cursor traversal cases. |
| Focused ESLint | PASS | No diagnostics on the three product/test files. |
| npm run prisma:validate | PASS | Prisma schema is valid. |
| First npm run typecheck | FAIL, diagnosed | Only the disposable run-root draft produced diagnostics; it was hash-verified against the promoted service and removed. |
| Final npm run typecheck | PASS | Full tsc --noEmit completed with no diagnostics. |
| Close-assurance Jest suites | PASS | 2 suites, 16 tests passed. |
| Inventory event and adjustment Jest suites | PASS | 2 suites, 10 tests passed. |
| Prettier on exact edit paths | PASS | Final files normalized with the local formatter. |
| Final focused Jest and ESLint rerun | PASS | 5 tests passed and lint remained clean on final bytes. |
| git diff --check on exact edit paths | PASS | No whitespace errors. |

Jest emitted its existing forceExit/open-handle advisory. The run manifest does not authorize separate command-log files, so command outcomes are recorded in this report and in the machine evidence with null log paths.

## Retired blockers

1. INVENTORY_RECONCILIATION_CAPPED: retired by database aggregates, complete counts, and stable cursor traversal.
2. INVENTORY_PERIOD_TIEOUT_TEMPORAL_MISMATCH: retired by opening/movement/closing calculations at identical effective and recorded cutoffs.
3. STAGE03_TYPECHECK_UNAVAILABLE: retired by two successful full TypeScript checks after removing the disposable duplicate draft.

## Active blockers

1. INVENTORY_CORRECTION_CHAIN_MISSING (high): posted inventory movements need append-only reversal/correction links, reason, actor, authorization, one-time reversal protection, and compensating journal treatment.
2. INVENTORY_TIME_MIGRATION_NOT_DEPLOYED (medium): deploy the validated effective/recorded-time migration and verify its backfill, provenance labels, indexes, and representative legacy rows.

## Next controlled run

Create a fresh Stage 01 to Stage 03 remediation run for immutable inventory correction and reversal lineage. Keep migration deployment and backfill verification as an explicit environment gate. Do not dispatch Stage 04 until Stage 03 returns PASS.

## Non-claims

- No database migration was deployed.
- No production data reconciliation or performance benchmark was executed.
- No immutable correction/reversal chain was implemented.
- No system-certified, statutory, or qualified OHADA assurance claim is made.

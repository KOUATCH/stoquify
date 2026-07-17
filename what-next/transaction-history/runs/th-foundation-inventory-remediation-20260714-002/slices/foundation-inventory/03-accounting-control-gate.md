# Stage 03 Accounting Control Gate

## Run identity

- Run: `th-foundation-inventory-remediation-20260714-002`
- Trace: `dcbfbfe6-a2c2-4da1-8684-8a27555c9836`
- Slice: `foundation-inventory`
- Skill: `stoquify-transaction-history-03-accounting-control-gate`
- Agent role: Bookkeeper & Controller
- Mode: `implement`
- Verdict: **BLOCKED**

## Executive verdict

This pass closes the first accounting-control defect from the prior run: inventory movements now distinguish economic effective time from server-recorded time, and legacy rows receive explicit approximation provenance during migration. The schema, three inventory posting services, and focused tests are aligned to that contract.

Stage 03 does not pass. Inventory reconciliation remains population-capped, period tie-out still compares period activity to a current valuation, and corrections/reversals do not yet form an explicit immutable chain. The migration was validated but not deployed. Stage 04 is therefore ineligible.

## Implemented control: effective and recorded time

### Canonical semantics

- `effectiveAt` is the source event's economic occurrence time.
- `recordedAt` is a server-controlled UTC timestamp captured once for the posting transaction.
- `timeProvenance` distinguishes an explicit source occurrence time from legacy `createdAt` approximation.
- `createdAt` remains the database row creation timestamp and is not treated as the economic event time.
- Future as-of queries must constrain both `effectiveAt <= asOf` and `recordedAt <= recordedThrough` where knowledge-at-cutoff matters.

### Schema and migration evidence

- `prisma/schema.prisma` adds `effectiveAt`, `recordedAt`, `timeProvenance`, and tenant-scoped time indexes to `InventoryTransaction`.
- `prisma/migrations/20260714194500_inventory_history_accounting_time_controls/migration.sql` creates the provenance enum, adds nullable columns, backfills legacy rows from `createdAt`, labels those rows `LEGACY_CREATED_AT_APPROXIMATION`, enforces non-null constraints, and creates the query indexes.
- The migration was not applied to a database in this run. No production-deployment or query-plan claim is made.

### Posting-path evidence

- `services/inventory/inventory-stock-event.service.ts` persists event `occurredAt` as effective time and one shared server timestamp as recorded time across reservation and stock lines.
- `services/inventory/inventory-adjustment.service.ts` persists the adjustment event time and server-recorded time with explicit provenance.
- `services/inventory/inventory-transfer.service.ts` gives both transfer legs the same effective and recorded timestamps.
- Focused tests assert the new fields and the shared transfer timestamp.

## Accounting-control assessment

| Control | Result | Evidence and limitation |
| --- | --- | --- |
| Effective-time / recorded-time distinction | PASS | Persisted on all three inventory posting paths with explicit provenance. Deployment remains pending. |
| Legacy temporal provenance | PASS | Migration labels backfilled rows as `LEGACY_CREATED_AT_APPROXIMATION`; no false precision is claimed. |
| Inventory roll-forward completeness | GAP | Existing reconciliation scans capped movement and event samples instead of the complete population. |
| Period closing tie-out | GAP | Period-scoped activity is still compared with current `InventoryLevel` value, not a valuation at the same cutoff. |
| Immutable correction and reversal chain | GAP | Movement rows do not explicitly reference the original movement or correction/reversal relationship. |
| Close blocker enforcement | GAP | The unresolved reconciliation, tie-out, and correction defects are not yet enforced as close blockers. |
| OHADA provenance | GAP | The time control improves auditability, but no SYSCOHADA mapping or close certification is established by this slice. |

## Verification evidence

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run prisma:validate` | PASS | Prisma schema validated successfully. |
| `npm run prisma:generate` | BLOCKED | Windows `EPERM` prevented replacement of the locked query-engine DLL. |
| `.\\node_modules\\.bin\\prisma.cmd generate --no-engine` | PASS | Prisma Client 6.19.3 generated without replacing the locked engine. |
| `node .\\node_modules\\jest\\bin\\jest.js --runInBand --runTestsByPath services/inventory/__tests__/inventory-stock-event.service.test.ts services/inventory/__tests__/inventory-adjustment.service.test.ts services/inventory/__tests__/inventory-transfer.service.test.ts --forceExit` | PASS | 3 suites and 18 tests passed; Jest reported the existing forced-exit/open-handle warning. |
| Focused ESLint | PASS | Completed on retry with no diagnostics. |
| TypeScript typecheck | BLOCKED | Timed out without diagnostics under the same concurrent load. No typecheck pass is claimed. |
| `git diff --check` | PASS | No whitespace errors in the product diff. |
| Added-line ASCII scan | PASS | No non-ASCII characters were introduced by this Stage 03 product slice. |

## Active blockers

1. `INVENTORY_RECONCILIATION_CAPPED` (high): source-continuity reconciliation must cover the complete scoped population or use a cursor-complete strategy whose totals and details share one cutoff.
2. `INVENTORY_PERIOD_TIEOUT_TEMPORAL_MISMATCH` (high): opening, movement, ledger, and closing valuation must be evaluated at the same effective and recorded cutoffs.
3. `INVENTORY_CORRECTION_CHAIN_MISSING` (medium): immutable reversals and corrections must explicitly link to the original movement and preserve reason, actor, time, and authorization evidence.
4. `INVENTORY_TIME_MIGRATION_NOT_DEPLOYED` (medium): the validated migration must be applied and verified against representative legacy data before temporal queries are released.
5. `STAGE03_TYPECHECK_UNAVAILABLE` (medium): the full TypeScript check timed out twice without diagnostics and needs a quiet execution window before this slice can be certified.

## Next controlled run

Create a fresh remediation run from this evidence. Implement uncapped, cutoff-consistent inventory reconciliation and period tie-out first, because both depend directly on the new temporal contract. Implement the correction/reversal chain as a separate bounded change if its schema impact cannot be verified in the same run. Re-run Stage 01 through Stage 03; do not dispatch Stage 04 until Stage 03 returns `PASS`.

## Non-claims

- No database migration was deployed.
- No complete-population reconciliation was achieved.
- No period-close tie-out was certified.
- No correction/reversal chain was implemented.
- No full typecheck, production, performance, or OHADA certification claim is made.

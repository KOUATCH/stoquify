# Stage 03 Accounting Control Gate

## Run identity

- Run: `th-foundation-inventory-correction-20260715-005`
- Trace: `51783d07-4481-4580-be21-7e9312f8d71a`
- Slice: `foundation-inventory`
- Mode: `implement`
- Agent: Bookkeeper & Controller
- Verdict: **BLOCKED**

## Executive decision

The immutable inventory correction and reversal implementation is complete inside the approved boundary and its focused evidence is green. The accounting gate cannot return `PASS`, however, because the local database reports three unapplied migrations, including the accounting-time migration and the new correction-lineage migration. The orchestrator contract explicitly forbids migration deployment, and the Stage 03 contract forbids treating unknown or unapplied migration state as production-ready accounting evidence.

No Stage 04 read-model or user-facing correction command is authorized. The implementation remains internal and unavailable until an owner-approved migration deployment and representative legacy-data verification run completes.

## Exact edits

Product edits:

- `prisma/schema.prisma`
- `prisma/migrations/20260715090000_inventory_correction_reversal_lineage/migration.sql`
- `services/inventory/inventory-adjustment-reversal.schemas.ts`
- `services/inventory/inventory-adjustment-reversal.service.ts`
- `services/inventory/__tests__/inventory-adjustment-reversal.service.test.ts`

Runtime evidence:

- `what-next/transaction-history/runs/th-foundation-inventory-correction-20260715-005/slices/foundation-inventory/03-accounting-control-gate.json`
- `what-next/transaction-history/runs/th-foundation-inventory-correction-20260715-005/slices/foundation-inventory/03-accounting-control-gate.md`

No action, route, component, permission catalog, existing adjustment service, accounting kernel, dependency manifest, or migration deployment state was changed.

## Implemented controls

### Immutable lineage

- `StockAdjustment.reversalOfAdjustmentId` is a one-to-one self-reference with `RESTRICT` deletion and database uniqueness.
- `InventoryTransaction.reversalOfTransactionId` gives every compensating movement a one-to-one link to its original movement.
- The database check requires reversal adjustments to have kind `REVERSAL`, a non-empty reason, non-null requester and approver, and distinct requester/approver IDs.
- Service guards reject reversal of a reversal, a second reversal, a previously reversed journal, and cross-tenant item/location ownership.

### Quantity and valuation

- Original movements are grouped by item/location and read from a complete server-side population for the original adjustment.
- Reversal quantity is the exact negation of each original signed quantity.
- Reversal value is the exact opposite of each original signed value while preserving original unit and total cost.
- Current on-hand, available quantity, and total value must support the exact compensation. Negative quantity/value and zero-quantity residual value are blocked before writes.
- Inventory updates use version plus exact quantity/value predicates and fail on concurrent drift.

### Journal and posting evidence

- The original batch must be `POSTED`, source-owned by the original stock adjustment, use `INVENTORY_ADJUSTMENT`, contain exactly one balanced posted journal, and have a matching source link.
- The correction creates a separate `POSTED` batch with purpose `REVERSAL`.
- Every original journal line is reversed exactly: debit/credit, base debit/base credit, currency, exchange rate, account, location, item, customer/supplier dimensions, JSON dimensions, and metadata are preserved or swapped as appropriate.
- The reversal journal links to the original via `reversalOfEntryId`; the original journal is retained and marked `REVERSED` using the existing accounting convention.
- The correction source link, ledger audit event, business event, general audit record, inventory close invalidation, and original/reversal journal close invalidations are written in the same database transaction.

### Idempotency and security handoff

- A business-event idempotency key provides deterministic replay and rejects reuse against another source or actor pair.
- Database uniqueness prevents concurrent duplicate adjustment and movement reversals.
- The service accepts trusted tenant/requester/approver context and exposes no action or UI. Future exposure remains subject to the Stage 02 `inventory.adjust.approve`, `inventory` module enforcement, 300-second fresh-auth, and direct-invocation negative-test contract.

## Accounting evidence grade

| Claim | Current grade | Decision |
| --- | --- | --- |
| Source-owned correction design | operational | PASS in code and focused tests |
| Exact stock/value compensation | operational | PASS in code and focused tests |
| Exact posted journal reversal | posted-capable | PASS in code and focused tests; runtime availability blocked by unapplied schema |
| Reconciled inventory/class-3 history | reconciled-capable | Prior reconciliation remains green; correction cannot enter the runtime population until migrations deploy |
| System-certified close evidence | unavailable | BLOCKED until migration deployment, representative data verification, reconciliation rerun, and close invalidation evidence are exercised against the database |

The correction copies the original journal's account and dimension facts rather than rerunning mutable posting rules. This preserves the original accounting mapping but does not improve missing country-pack or posting-rule snapshot provenance on the original entry. No statutory OHADA certification claim is made.

## Verification evidence

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run prisma:validate` | PASS | Prisma accepted both self-relations and enums |
| `prisma generate --no-engine` | PASS | Prisma Client 6.19.3 generated successfully |
| New focused reversal suite | PASS | 1 suite, 6 tests |
| Focused ESLint | PASS | New schema/service/test files clean |
| `npm run typecheck -- --pretty false` | PASS | Full TypeScript gate completed |
| Inventory/accounting regression pack | PASS | 7 suites, 36 tests |
| `git diff --check` on five product paths | PASS | No whitespace errors |
| `npm run prisma:migrate:status` | FAIL/BLOCKING | `20260714194500_inventory_history_accounting_time_controls`, `20260714203000_session_assurance`, and `20260715090000_inventory_correction_reversal_lineage` are unapplied |

The six new tests prove exact movement/journal reversal, one-time uniqueness behavior, idempotent replay, maker-checker rejection, quantity/value support checks, and tenant consistency. Existing posting, reconciliation, stock-event, journal-close, and close-pack tests remain green.

## Blocker and next execution

Blocker code: `MIGRATIONS_NOT_APPLIED`.

The next run must be an owner-approved migration deployment and verification run, separate from this orchestrator because `orchestratorPolicy.deployMigrations` is `false`. It must:

1. Review all three pending migrations in order and run the production migration safety gate against the intended environment.
2. Back up and deploy through the repository's safe migration command.
3. Verify inventory accounting-time backfill provenance against representative legacy rows.
4. Verify correction constraints and self-relations at the database level, including concurrent duplicate reversal rejection.
5. Execute one reversible fixture transaction inside a disposable or approved test organization, prove movement and journal net-to-zero, then rerun inventory/class-3 reconciliation and close invalidation checks.
6. Open a fresh Stage 03 `verify` run with database evidence. Stage 04 remains prohibited until it returns exact `PASS`.

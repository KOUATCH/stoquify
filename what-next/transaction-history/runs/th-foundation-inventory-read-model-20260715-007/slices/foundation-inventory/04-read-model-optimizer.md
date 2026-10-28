# Stage 04 Read-Model Optimizer Implementation

## Run identity

- Run: `th-foundation-inventory-read-model-20260715-007`
- Slice: `foundation-inventory`
- Mode: `implement`
- Agent: Database Optimizer
- Verdict: **PARTIAL**
- Passed lane: `inventory`
- Blocked lane: `workbench`

## Executive decision

The inventory lane now has a domain-owned `inventory-movement-v1` read contract with a frozen knowledge cutoff, deterministic keyset traversal, strict server filters, exact uncapped summaries, decimal-string arithmetic, organization-timezone dates, explicit completeness, and bounded server export paging. The implementation and focused verification pass.

Stage 05 is not eligible yet. The existing action and action-test files had pre-existing edits and were excluded under the ownership stop rule. Consequently, the current dashboard still calls the legacy capped preview, execution-time export authorization/redaction is not wired, export proof is not persisted, the cursor secret is not registered in the already-dirty environment template, and production-like plan evidence remains unavailable.

## Prerequisites

| Gate | Evidence | Result |
| --- | --- | --- |
| Stage 02 security/proof | run006 `02-security-proof-gate.json`, SHA-256 `6bb0621a...1439` | PASS |
| Stage 03 accounting/control | run006 `03-accounting-control-gate.json`, SHA-256 `db3e4067...7db93` | PASS |
| Schema and migration state | Prisma schema plus `20260714194500_inventory_history_accounting_time_controls` | PASS |
| Action ownership | `inventoryMovementActions.ts` and its test were dirty before run007 | BLOCKED for integration |

The trusted action boundary already proves permission and entitlement behavior, but this run did not overwrite or merge its ambient changes.

## Source and read-model matrix

| Surface | Owner/source | Classification | Stage 04 result |
| --- | --- | --- | --- |
| Movement rows | `InventoryTransaction` through `readInventoryMovementHistory` | `SYSTEM_OF_RECORD` | PASS |
| Tenant timezone/currency | `Organization` selected by tenant-scoped service input | `SYSTEM_OF_RECORD` | PASS; trusted derivation remains action-owned |
| Summary | `groupBy(type)` over the identical normalized predicate and cutoff | `DERIVED_COMPLETE` | PASS |
| Timestamp quality | `InventoryTransaction.timeProvenance` exact count | `DURABLE_EVIDENCE` | PASS; legacy rows force partial disclosure |
| Quantity aggregation | One tenant item/unit or withheld | `DERIVED_COMPLETE` / `DERIVED_PARTIAL` | PASS; mixed units never become zero |
| Server export pages | `streamInventoryMovementHistoryExport` | `DERIVED_COMPLETE` within the bounded iterator | PARTIAL operationally |
| Inventory action | Existing permission/tenant boundary | `DURABLE_EVIDENCE` | Not integrated because of dirty overlap |
| Dashboard and hook | Existing 100-row flow | `PREVIEW` | Still legacy; workbench lane blocked |

Stored `balanceAfter` is intentionally absent from the new row projection. Stage 03 did not certify its sequencing under backdating and concurrency, so Stage 04 does not present it as authoritative historical balance truth.

## Normalized contract

The adapter accepts one strict Zod filter object using the canonical Prisma `TransactionType` enum. Unknown keys and client-only movement names are rejected before tenant data is queried. The normalized identity contains item, location, type, inclusive organization-local date range, optional `effectiveAsOf`, and organization timezone.

Date-only input is resolved at organization midnight and translated into a half-open UTC interval. For `Africa/Douala`, `2026-07-01` maps to `2026-06-30T23:00:00.000Z <= effectiveAt < 2026-07-01T23:00:00.000Z`.

Rows and summary share exactly:

```text
organizationId = trusted tenant
recordedAt <= recordedThrough
normalized item/location/type/date/effectiveAsOf filters
```

The page query alone adds the keyset tuple predicate. Summary never derives from the capped page.

## Cursor and snapshot

Cursor version 1 is an opaque HMAC-SHA256 token containing tenant, adapter, normalized-filter hash, immutable `recordedThrough`, and `(effectiveAt, recordedAt, id)`. Payload and signature tampering, another signing key, another tenant, another filter scope, malformed dates, and weak/missing configuration fail closed.

Traversal order is `(effectiveAt DESC, recordedAt DESC, id DESC)`. The query uses `pageSize + 1` only for `hasMore`. Later requests retain the first page's `recordedThrough`, so a backdated row recorded after page one cannot enter the traversal.

Supported signing configuration is `AQSTOQFLOW_HISTORY_CURSOR_SECRET`, with `HISTORY_CURSOR_SECRET` as an explicit compatibility name. The secret must contain at least 32 characters. Registration in deployment configuration remains outside this dirty run.

## Parity, caps, and arithmetic

- Page sizes are restricted to 25, 50, or 100.
- All summary groups scan the complete normalized scope at the same cutoff.
- Quantities and money are serialized as fixed-scale decimal strings with unit/currency.
- Zero is emitted only for a complete aggregate with no matching group.
- Quantity totals are `null` when the result is not scoped to one known item unit.
- Legacy timestamp approximation is counted and reported as partial.
- Actor email is not selected into the normalized row projection.
- Canonical Prisma movement types eliminate the prior `RETURN_FROM_CUSTOMER`/`SALES_RETURN`, `RESERVED`/`RESERVATION`, and related vocabulary drift.

## Export contract

The new async server iterator reuses the exact normalized filters, signed cursor, and frozen cutoff in 100-row pages. It defaults to a 10,000-row synchronous ceiling and raises `InventoryHistoryExportLimitError` before representing an oversized traversal as complete.

`TH04_EXPORT` remains a gap for release purposes. The dirty action boundary has not yet supplied execution-time permission/redaction, and no background job persists actor scope, filter hash, cutoff, row count, content hash, completeness manifest, expiry, or resumable state.

## Index and plan evidence

No schema or migration change was made. A read-only, non-executing local `EXPLAIN (COSTS, VERBOSE, FORMAT JSON)` used the largest seeded tenant (`88` rows) and the implemented organization/cutoff/order query. PostgreSQL selected a backward index-only scan on `inventory_transactions_org_effective_recorded_id_idx`, with no explicit sort.

This is structural evidence only. The local database is too small and not production-like, so execution time, buffers, estimate error, and before/after performance are unverified. No additional index is justified from this dataset.

## Changed files

- `services/history/transaction-history.types.ts`
- `services/history/transaction-history-cursor.ts`
- `services/history/__tests__/transaction-history-cursor.test.ts`
- `services/inventory/inventory-read.service.ts`
- `services/inventory/__tests__/inventory-read.service.test.ts`
- This Markdown report and its JSON evidence artifact

No action, hook, component, type vocabulary, schema, migration, or environment file was edited by Stage 04.

## Verification

| Command | Result |
| --- | --- |
| Focused ESLint over the five product files | PASS |
| Jest cursor plus inventory read service | PASS: 2 suites, 11 tests |
| Jest existing inventory action suite | PASS: 1 suite, 6 tests |
| `npm run typecheck -- --pretty false` | PASS |
| `npm run prisma:validate` | PASS |
| `npm run prisma:migrate:status` | PASS: 17 migrations, database up to date |
| `git diff --check` over Stage 04 product files | PASS |
| Local non-executing representative `EXPLAIN` | PASS for structural index support only |
| Production-like `EXPLAIN (ANALYZE, BUFFERS, SETTINGS)` | SKIPPED: approved staging/read replica unavailable |

The focused matrix covers cursor round-trip and tampering, equal-time traversal, page boundary 25/26, immutable cutoff under later requests, backdated insertion exclusion, tenant/filter cursor rejection, canonical enum rejection, organization-timezone boundaries, row-summary predicate parity, decimal serialization, legacy/mixed-unit partiality, export cutoff reuse, and synchronous export overflow.

## Blockers and residual risk

1. `ACTION_BOUNDARY_DIRTY_OVERLAP` (high): the action and test were dirty before run007, so the new contract is not yet the live dashboard API.
2. `EXPORT_EXECUTION_BOUNDARY_PENDING` (high): authorization, redaction, durable manifest, and background execution are not implemented.
3. `HISTORY_CURSOR_SECRET_REGISTRATION_PENDING` (medium): production/development secret registration and preflight are not in this allowlist.
4. `PRODUCTION_LIKE_PLAN_EVIDENCE_MISSING` (medium): the existing index is structurally suitable, but runtime performance is not certified.
5. `HISTORICAL_BALANCE_AUTHORITY_UNPROVEN` (medium): stored `balanceAfter` remains excluded until sequencing/backdating invariants are independently certified.

## Next decision

Open a fresh ownership-safe Stage 04 integration run after the ambient action edits are checkpointed. Wire the trusted permission/tenant boundary to `readInventoryMovementHistory`, register the signing secret through the approved environment/release gate, implement execution-time export authorization and durable proof, and rerun the same tests against the action contract. Only a subsequent Stage 04 `PASS` should unlock Stage 05.

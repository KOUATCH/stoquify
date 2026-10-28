# Stage 04 Read-Model Optimizer Verification

## Run identity

- Run: `th-foundation-inventory-correction-verify-20260715-006`
- Slice: `foundation-inventory`
- Mode: `verify`
- Agent: Database Optimizer
- Verdict: **BLOCKED**
- Product edits: none

## Prerequisites

Stages 02 and 03 are checksum-valid, current, and `PASS` for both active lanes. Tenant scope is derived by `requirePermission("inventory.levels.read")`, organization mismatch is rejected before service access, the inventory entitlement is enforced, and the accounting source now has explicit `effectiveAt`, immutable `recordedAt`, time provenance, and correction lineage.

## Source and surface map

| Surface | Owner/source | Classification | Finding |
| --- | --- | --- | --- |
| Movement rows | `InventoryTransaction` through `inventory-read.service.ts` | `SYSTEM_OF_RECORD` | Tenant-scoped, but ordered by `createdAt` and capped without snapshot pagination |
| Movement summary | Five independent aggregate/count queries | `DERIVED_PARTIAL` | No shared knowledge cutoff and no movement-type filter |
| Action boundary | `inventoryMovementActions.ts` | `DURABLE_EVIDENCE` for authorization | RBAC and entitlement tests pass; filters are inline and not normalized by a strict server schema |
| React Query hooks | `useInventoryMovementQueries.ts` | `PREVIEW` | Rows and summary are separate requests with separate cache/snapshot lifetimes |
| Movement dashboard | `StockMovementDashboard.tsx` | `PREVIEW` | Fixed 100 rows are labelled transaction history; no pagination, completeness state, or server export |
| Export | None found for inventory movement history | `UNKNOWN` | Browser rows cannot satisfy the export contract |

The dated graph places `inventory-read.service.ts` in service community 51, the movement hook in community 22, and the dashboard in component community 91. It is navigation evidence only: the graph manifest predates the accounting-time and correction migrations.

## Contract findings

### Cursor and snapshot

`listInventoryTransactionMovements` has no cursor, `recordedThrough`, `effectiveAsOf`, filter hash, adapter identifier, or stable `(effectiveAt, recordedAt, id)` keyset predicate. A backdated row recorded after page one can therefore change later pages. Result: `TH04_CURSOR_SNAPSHOT = GAP`.

### Filter and time parity

Rows accept `type`; summary does not. Rows and summary run separately without a common cutoff. Date-only input is created in the browser with `toISOString()` and expanded on the server with process-local `setHours(23, 59, 59, 999)`, ignoring the authoritative organization timezone and half-open intervals.

The client movement vocabulary also diverges from Prisma. Examples include `RETURN_FROM_CUSTOMER` versus `SALES_RETURN`, `RETURN_TO_SUPPLIER` versus `PURCHASE_RETURN`, `RESERVED` versus `RESERVATION`, and `SHRINKAGE` versus `WRITE_OFF`. Several client-only values can reach a Prisma enum filter through an `as any` cast. Result: `TH04_FILTER_PARITY = GAP`.

### Completeness and arithmetic

Rows default to 100 and cap at 500 while the summary scans all matching rows; the response has no completeness envelope or cap reason. `toNumber` converts null, undefined, invalid values, and failed conversions to zero. Reservation quantity is always zero, and dashboard fallbacks can present unavailable summary values as zero. Monetary and quantity values are returned as JavaScript numbers instead of decimal strings with unit/currency metadata. Result: `TH04_CAP_COMPLETENESS = GAP`.

### Export

No server-side movement-history export, keyset streaming path, background job, execution-time authorization/redaction, filter hash, cutoff, row count, content hash, or partial-source manifest exists. Result: `TH04_EXPORT = GAP`.

## Index and plan evidence

The deployed database contains 408 movement rows; the largest tenant has 88. The table is approximately 303 KB and its indexes approximately 557 KB. All 88 rows in the representative tenant are labelled `LEGACY_CREATED_AT_APPROXIMATION` and must retain that disclosure.

The current organization/`createdAt` query received a sequential scan plus explicit sort on this small local dataset. A non-executing plan for the required organization + `recordedThrough` query ordered by `(effectiveAt DESC, recordedAt DESC, id DESC)` selected an index-only backward scan on `inventory_transactions_org_effective_recorded_id_idx`.

This proves structural index suitability, not runtime performance. `EXPLAIN ANALYZE` was intentionally not run because the local seed database is not production-like staging or an approved read replica. No new index migration is justified before representative-plan evidence exists. Result: `TH04_INDEX_PLAN = GAP`; existing migration readiness itself passes.

## Verification and test gaps

- `npm run prisma:migrate:status`: PASS, all 17 migrations applied.
- PostgreSQL catalog/index inspection and non-executing `EXPLAIN`: PASS for structural evidence; runtime measurement unavailable.
- `jest --runInBand actions/inventory/__tests__/inventoryMovementActions.test.ts`: PASS, 1 suite and 6 tests.
- Existing tests cover tenant, permission, and entitlement enforcement only.
- No `inventory-read.service.test.ts` exists.
- No tests cover equal-time traversal, backdated insertion, cursor tampering, tenant/filter cursor rejection, date boundaries, type vocabulary, cap boundaries, row-summary parity, export completeness, decimal serialization, or legacy-time disclosure.

Result: `TH04_VERIFICATION = GAP`.

## Required implementation run

Create a fresh `implement` run. Its exact product allowlist should be limited to:

- `services/history/transaction-history.types.ts`
- `services/history/transaction-history-cursor.ts`
- `services/inventory/inventory-read.service.ts`
- `services/inventory/__tests__/inventory-read.service.test.ts`
- `actions/inventory/inventoryMovementActions.ts`
- `actions/inventory/__tests__/inventoryMovementActions.test.ts`

The action paths already have ambient edits, so the implementation run must first establish an ownership checkpoint rather than overwrite them.

Implement one `inventory-movement-v1` adapter that:

1. Derives tenant and permission from trusted context and normalizes one strict server filter object.
2. Uses organization-timezone half-open date intervals and canonical Prisma movement types.
3. Freezes first-page traversal with `recordedThrough` and orders by `(effectiveAt DESC, recordedAt DESC, id DESC)`.
4. Uses a versioned, integrity-protected opaque cursor bound to tenant, adapter, normalized-filter hash, cutoff, and ordering tuple.
5. Returns rows, exact summary, page info, applied filters, snapshot metadata, and completeness in one service-owned result.
6. Serializes quantities and money as decimal strings and preserves missing/partial states instead of coercing them to zero.
7. Streams bounded server exports through the same normalized predicate and cutoff; large-export jobs remain a later explicit scope if thresholds require them.
8. Adds the full Stage 04 test matrix before any Stage 05 handoff.

No Prisma schema or migration change is required for the baseline implementation. Reconsider filtered composite indexes only after representative plan evidence demonstrates a need.

## Decision

Stage 04 is **BLOCKED**. Stage 05 is not eligible. The database source and ordering index are ready, but the current API is a capped preview rather than a complete, stable transaction-history read model.

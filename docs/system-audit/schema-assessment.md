# Schema and integrity assessment

## Scope and current state

The complete Prisma model set and all local migration files were parsed: **211 models, 87 migrations**. The configured database resolved to a local PostgreSQL target. Catalog and aggregate queries ran in explicit READ ONLY transactions, with rollback, statement/lock timeouts and no business identifiers in results. This is local deployed-schema evidence, not production evidence.

Every model has an entry in [schema-model-inventory.csv](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/schema-model-inventory.csv>) and [model-ownership-register.csv](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/model-ownership-register.csv>). The former records fields, decimals, JSON, candidate writes/reads, lifecycle and cascades; the latter assigns a candidate purpose/domain, tenant boundary and explicit authority/retention confidence. [verification/schema-model-details.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/schema-model-details.json>) preserves the field-level inventory and source lines. Regex candidates exclude dynamic calls/raw SQL and are **not proof of exclusive authority**. A reviewed model-specific retention schedule was not established; the register does not invent one.

## Intended versus local database

- All 211 model tables and scalar/enum/array column names have local catalog counterparts. No missing or extra model columns were detected.
- All 87 migration names and SHA-256 checksums match recorded applied migrations; no unfinished or pending migration was found.
- Five additional tables are accounted for: _UserRoles, _prisma_migrations, legacy_production_batches, legacy_recipe_ingredients, legacy_recipes. Legacy manufacturing tables are not evidence of an active BOM/production module.
- The catalog contains 216 tables, 55 noninternal triggers and 147 CHECK constraints.
- This comparison establishes table/column-name and migration-history parity. It does **not** prove exhaustive type/default/index/privilege parity, fresh replay, safe upgrades or production drift absence. Catalog definitions were retained for those next checks.

Evidence: [verification/schema-database-comparison.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/schema-database-comparison.json>); [verification/database-metadata.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/database-metadata.json>); [verification/migration-inventory.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/migration-inventory.json>). Prisma validation passed. No migrations or seed scripts ran during this audit.

## Authority, identity and retention

Most business models carry organizationId. The 28 without it include authentication/global catalogs and child rows such as InventoryLevel, order lines, cash drawers and agent steps. Parent scoping can be correct; absence of organizationId is not a vulnerability by itself. Newer purchase-correction, fiscal and payroll evidence uses stronger composite tenant links and immutable lifecycle controls. Older journals, AP and several child relations still depend more heavily on service validation.

[services/purchasing/ap-control.service.ts:1](<E:/ohada saas/Focused projects/stoquify/services/purchasing/ap-control.service.ts:1>) checks supplier/PO scope and locks economic owners. [services/hris/org.service.ts:26](<E:/ohada saas/Focused projects/stoquify/services/hris/org.service.ts:26>) resolves employee organization and effective manager/delegation scope; its legacy location-manager fallback is current-only. Financial audit data and payroll/private HR data have different access needs; model-specific purge/legal-hold policies and actual scheduler enforcement remain unverified. Cascading organization ownership must not become an accidental financial-record eraser. F10/F14 explain the bounded risks without claiming a live exploit.

Identifiers in JSON/sourceType/sourceId fields are flexible but do not gain relational integrity automatically. The inventory lists unlinked ID-like fields and JSON fields. Their business validity must be demonstrated by source-owner commands, schema versions, hashes and migration/repair tooling. In particular, SupplierInvoice.ledgerPostingBatchId is a nullable string: link coverage must distinguish legitimate drafts from incorrectly unposted final documents.

## Money, quantities and time

The parsed schema uses Decimal for money/quantities and no Float fields. Common quantities use Decimal(12,3), unit costs Decimal(12,2), totals Decimal(14,2). This avoids binary floating-point storage but still requires a reviewed rounding policy at each calculation boundary. Source amounts, tax, base amounts, rate direction and currency version must be separate immutable facts: F01/F07 show that field availability alone does not preserve meaning.

InventoryTransaction carries signed quantity, balanceAfter, effectiveAt, recordedAt and timeProvenance. These support business-time and recorded-time analysis. Legacy-createdAt approximation is explicitly represented. Backdated valuation and cutoff behavior still need isolated end-to-end tests. Partial fiscal-month clipping is defective (F08). Analytics order-activity derives organization timezone/currency and half-open windows; do not generalize that correctness to every report.

## Transactions, concurrency and derived data

The inventory stock-event kernel uses versioned conditional updates and available-quantity checks; AP commands lock supplier/PO rows and record durable posting/recovery evidence. Payroll transitions use expected versions, serializable transactions and immutable snapshots/events. Period posting obtains a shared row lock, while close obtains an exclusive lock. Outboxes use bounded claims, retry counts, stale leases and dead-letter states. These are positive design facts, but mocks cannot establish PostgreSQL race behavior.

Offline queue operations lack an equivalent transactional durability boundary (F03/F04). Generic accounting reversal omits some source ownership (F02). A period lock and a current close-assurance readiness decision are not interchangeable (F06).

## Read-only consistency results and denominators

| Check | Observed local result | Limit |
|---|---|---|
| Journal balance | 0 unbalanced POSTED/REVERSED entry-currency groups | Balanced does not mean economically complete or correct in base currency. |
| Journal tenant joins | 0 line/entry/account tenant mismatches | No adversarial inserts or all-relation tenant proof. |
| FX storage | 12 non-unit-rate lines, 0 candidate conversion mismatches | Current service reproduction still fails F01; sample may be seeded. |
| Journal source linkage | 4 posted/reversed entries lack postingBatchId | Local observation requiring fixture/source classification, not a production-corruption claim. |
| Stock projection | 541 levels; 0 available/on-hand/reserved mismatches; 0 negatives; 0 approximate value mismatches | Does not prove all valuation policy scenarios. |
| Stock movements | 541 levels all have movement evidence; signed physical movement sums agree with quantities | Opening-seed lineage and inventory-to-GL valuation completeness still need controlled proof. |
| AP | 24 allocations with consistent tenant/supplier/currency; no overallocated draft payment | All 24 invoices and 24 payments are DRAFT; zero posted AP lifecycle denominator. |
| Payroll | 24 run arithmetic checks agree | All 24 runs are DRAFT (with payslips); zero emitted/posted denominator. Earlier zero emitted mismatch count is therefore non-probative. |
| Reconciliation | 24 runs | All DRAFT; no certificate hashes or sign-off. |
| Periods | 0 overlapping pairs or out-of-year periods | Does not cover F08 creation edge case. |

The sampled ledger contains opening balances, POS sale/payment and stock adjustment batches. It cannot prove purchase/payroll/reconciliation source-to-ledger completeness. Query text and aggregate outputs: [verification/database-tieouts.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/database-tieouts.json>), [verification/database-cross-domain-tieouts.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/database-cross-domain-tieouts.json>).

## Performance, migration and recovery limits

Tenant/time/status indexes are present across the major fact tables, and the order-activity report uses full database aggregation rather than a truncated application slice. No EXPLAIN ANALYZE, large-tenant load test, query-count budget or production latency/cost study was run. Therefore no scalability or cost readiness is certified.

Historical local restore evidence covers 80 migrations on 29 August, not the current 87-migration runtime. Current fresh replay, upgrade from a populated prior release, trigger negative tests, recovery objectives and actual restore/login/accounting checks remain explicit release work. No rollback script should be inferred from Prisma migration presence.

## Existing retention metadata

HRIS document evidence already records retentionPolicyCode, retentionBasis, retainUntil and legalHold and projects RETAIN / LEGAL_HOLD / EXPIRED_REVIEW_REQUIRED / UNDECIDED. This is a useful control and was not treated as absent. What remains unverified is a qualified, complete model-by-model retention schedule and deployed enforcement. Test fixture labels such as CM_EMPLOYMENT_10Y are not independent proof of a legally correct duration.

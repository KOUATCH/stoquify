# Stage 04 Read-Model Contract

Read this contract completely for every Stage 04 run.

## Result envelope

```ts
type HistoryResult<Row, Summary> = {
  rows: Row[];
  pageInfo: { nextCursor: string | null; hasMore: boolean };
  appliedFilters: NormalizedHistoryFilters;
  summary: Summary;
  snapshot: {
    effectiveAsOf?: string;
    recordedThrough: string;
    generatedAt: string;
    timezone: string;
  };
  completeness: {
    state: "complete" | "partial";
    sources: Array<{ source: string; reason?: string; lagSeconds?: number }>;
  };
};
```

`effectiveAsOf` is the optional business-time ceiling. `recordedThrough` is the immutable knowledge cutoff that freezes traversal. `generatedAt` is response time and must not imply snapshot consistency. Parse date-only filters in the organization timezone and use half-open intervals.

## Cursor contract

Use a signed or integrity-protected opaque encoding of:

```text
version, tenantId, adapterId, normalizedFilterHash, recordedThrough,
effectiveAt, recordedAt, id
```

Never accept cursor tenant or scope from the client as authority. Derive tenant and permissions from trusted context, recompute the adapter and normalized-filter hash, and reject mismatches or unsupported versions.

Normalize every row to non-null ordering keys, then query:

```sql
WHERE tenant_id = :trusted_tenant
  AND recorded_at <= :recorded_through
  AND <normalized server filters>
  AND (effective_at, recorded_at, id) < (:effective_at, :recorded_at, :id)
ORDER BY effective_at DESC, recorded_at DESC, id DESC
LIMIT :page_size_plus_one;
```

Use `pageSize + 1` only to determine `hasMore`; return at most the approved page size. A newly recorded backdated row must not appear mid-traversal because it falls beyond `recordedThrough`.

## Parity and completeness

Create one immutable normalized filter value and apply it to rows, exact summary, action/blocker counts, detail scope, and export. Test parity with sets and totals, not merely matching request objects.

A page limit, recent-activity limit, safety cap, sample, projection lag, unavailable source, or client-only filter makes the affected result partial. Expose the reason. Never convert unavailable or unscanned data to zero, complete, reconciled, certified, or blocker-free.

Keep monetary and quantity arithmetic in database-safe decimal semantics. Return decimal strings with currency or unit. Compute historical opening/closing balances from immutable movements at the same knowledge cutoff; treat stored `balanceAfter` as authoritative only when sequencing, concurrency, and backdating invariants are proven.

## Adapter and projection rules

Prefer a direct adapter when one tenant-scoped table is authoritative and supports the contract. Use a domain-owned, rebuildable projection for multi-source timelines. A projection must retain deterministic source identity/version, tenant, effective and recorded time, state, amount/quantity metadata, correction/reversal links, and source/proof references.

Do not create a universal write ledger. Do not let a read projection replace source posting rules, reconciliation, audit evidence, or close controls. Surface projection lag and partial sources.

## Export contract

Run export authorization and redaction at execution time. Reuse normalized filters and `recordedThrough`. Stream small exports through keyset pages; use a resumable background job for large exports. Persist query/filter hash, contract version, cutoff, actor and permission scope, row count, content hash, source completeness, and expiry. Browser-held rows are never a complete export source.

## Index and plan evidence

Tie each index candidate to a named query's equality predicates, range/order keys, joins, and partial predicate. Include `id` in stable history order. Check redundant prefixes, selectivity, table/index size, write amplification, and foreign-key maintenance before recommending an index.

A measured claim requires a production-like read plan with representative parameters. Record planning/execution time, buffers, estimated versus actual rows, scans, filters, sorts, loops, spills, and before/after plans. A static schema review may report a candidate only.

## Migration contract

Use additive rollout where possible: duplicate audit, nullable schema, bounded restartable backfill, projection reconciliation, dual-read/write or outbox transition, constraint validation, and cleanup in a later release. Build large PostgreSQL indexes with the approved low-lock strategy; `CREATE INDEX CONCURRENTLY` must not run inside a transaction. Check failed builds for invalid indexes.

Version cursor changes and define old-cursor behavior. Do not rewrite immutable financial history to repair `balanceAfter`; use correction/restatement records or rebuildable snapshots. Every migration needs deployment prerequisites, observability, rollback, and a proof that source and projection totals reconcile at the same cutoff.

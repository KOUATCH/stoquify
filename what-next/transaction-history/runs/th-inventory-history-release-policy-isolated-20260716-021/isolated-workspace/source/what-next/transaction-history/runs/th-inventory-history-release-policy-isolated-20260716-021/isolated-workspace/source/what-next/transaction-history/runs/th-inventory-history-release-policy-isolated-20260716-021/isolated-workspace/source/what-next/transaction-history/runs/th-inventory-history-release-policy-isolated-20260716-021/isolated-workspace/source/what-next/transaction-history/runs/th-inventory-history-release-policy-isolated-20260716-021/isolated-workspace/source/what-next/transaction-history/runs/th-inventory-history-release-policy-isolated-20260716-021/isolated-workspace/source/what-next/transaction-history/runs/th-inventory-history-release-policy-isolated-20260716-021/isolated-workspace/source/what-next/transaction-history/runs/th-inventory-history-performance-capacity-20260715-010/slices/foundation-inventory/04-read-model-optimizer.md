# Stage 04 Inventory History Performance and Capacity Verification

## Run identity

- Run: `th-inventory-history-performance-capacity-20260715-010`
- Trace: `0834c37e-ac5b-44ca-90b4-fddee951ade4`
- Slice: `foundation-inventory`
- Mode: `verify`
- Agent: Database Optimizer
- Verdict: **BLOCKED**
- Active lane: `inventory`
- Blocked lane: `workbench`

## Executive decision

Run009's functional background-export controls remain correct under their focused contract, but the implementation is not certifiable at its declared 250,000-row default or 1,000,000-row maximum. This read-only verification found scale behavior that is incompatible with a production-grade large-export promise:

1. Every page appends a reference to one `BusinessEventOutbox.metadata.chunkReferences` array and replaces the complete JSON checkpoint. This produces quadratic checkpoint rewrite growth.
2. Finalization and download both load every encrypted chunk event into one in-memory array before processing. The returned download generator therefore does not provide memory-bounded streaming.
3. The worker-candidate and expiry queries are global by channel, event name, status, and time, while existing outbox indexes are led by organization identity or idempotency fields. The development plans require additional filtering and explicit sorting.
4. The configured database is a small development dataset with approximately 408 inventory transactions, 8 business events, and 10 outbox records. It cannot certify production plan selection, concurrency, throughput, or write amplification.

Stage 04 is `BLOCKED`, not merely waiting for another benchmark. Stage 05 must not begin until checkpoint state is constant-sized, chunk retrieval is paginated or object-backed, worker indexes match actual predicates, and representative load evidence passes.

## Verification environment

| Property | Observed value | Decision |
| --- | --- | --- |
| Database | PostgreSQL 17.5 development database | Reachable, non-production |
| Inventory cardinality | Approximately 408 rows | Not representative |
| Inventory table size | 901,120 bytes total | Too small for production planner proof |
| Business events | Approximately 8 rows | No large-export storage evidence |
| Outbox records | Approximately 10 rows | No worker-queue scale evidence |
| `EXPLAIN ANALYZE` | Not executed | Correct: environment is not representative |
| Sensitive values | URL, database name, tenant IDs, rows, and secrets omitted | PASS |

Only PostgreSQL catalog reads, bounded sample reads, and non-executing `EXPLAIN (FORMAT JSON, SETTINGS)` were used. No production or customer database was accessed and no data, schema, setting, or migration was changed.

## Query-plan findings

| Query | Development plan | Finding |
| --- | --- | --- |
| First history page | Sequential scan plus explicit sort | Existing composite index was not selected at small cardinality; production behavior unverified |
| Next keyset page | Bitmap heap scan through the organization/created-time index plus explicit sort | Planner did not select the effective/recorded/id history index in this dataset |
| History summary | Sequential scan plus hashed aggregate | Expected for a small table; production aggregate cost unverified |
| Worker candidate | Index scan with channel condition, residual filters, then explicit availability/creation sort | No index directly matches global worker predicate and order |
| Expiry scan | Index scan with channel condition, residual filters, then explicit creation sort | No index directly matches expiry predicate and order |

These plans are diagnostic, not performance claims. The 408-row table reasonably favors scans, so the history-page plans neither prove nor disprove the composite index at production cardinality. The worker plans reveal a structural mismatch because their predicates omit `organizationId`, the leading field in the availability index.

## Capacity findings

The sanitized sample contained 100 rendered history rows. NDJSON row size averaged 866 bytes, with 888 bytes at p95. At the current fixed 100-row chunk size:

| Export rows | Chunks | Plaintext estimate | Encrypted chunk JSON estimate | Final checkpoint JSON | Cumulative checkpoint rewrite lower bound |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 10,000 | 100 | 8.259 MiB | 11.046 MiB | 0.018 MiB | 0.914 MiB |
| 250,000 | 2,500 | 206.463 MiB | 276.146 MiB | 0.434 MiB | 543.551 MiB |
| 1,000,000 | 10,000 | 825.853 MiB | 1,104.584 MiB | 1.736 MiB | 8,683.033 MiB |

These are lower bounds. They exclude PostgreSQL tuple headers, JSON/TOAST behavior, WAL, indexes, audits, replication, backups, vacuum, final manifests, and Node object overhead. The one-million-row path can therefore exceed one GiB of encrypted payload and requires a multi-gigabyte metadata rewrite workload before it is downloaded.

## Code-path findings

### Quadratic checkpoint state

`advanceJobInTx` creates `chunkReferences: [...metadata.chunkReferences, chunkReference]` and persists the complete metadata JSON after each page. With 10,000 chunks, later checkpoints repeatedly serialize and rewrite nearly the whole 1.736 MiB reference array. Restartability is correct, but persistence cost is not linear.

### Non-streaming finalization and download

`loadChunkEvents` accepts the complete reference array and returns all matching business events. Both `finalizeJobInTx` and `streamInventoryHistoryExportDownload` await this full array before iterating. At the declared ceiling, encrypted event payloads can approach the 1.1 GiB lower-bound estimate in one process, before decrypted strings and Prisma/JavaScript object overhead.

### Worker index mismatch

`processNextInventoryHistoryBackgroundExportJob` filters globally by `channel`, `eventName`, status, availability, and stale lock time, then orders by `availableAt` and `createdAt`. Expiry filters a similar global set and orders by `createdAt`. Existing outbox indexes do not have these predicates and orders as a usable leading sequence.

### Database artifact concentration

Encrypted chunks, chunk metadata, manifests, request events, completion events, and audits all reside in PostgreSQL. That gives durable evidence and transactional ownership, but there is no evidence that the primary transactional database should absorb hundreds of MiB to more than one GiB per retained export plus WAL and backup amplification.

## Controls that remain valid

- Tenant, actor, dual-permission, module-entitlement, and fresh-auth boundaries remain intact.
- Signed cursor cutoff and applied-filter continuity remain intact across checkpoints.
- Exact idempotency conflict detection, failure-only retry accounting, dead-lettering, and expiry crypto-shredding remain intact.
- AES-256-GCM chunk encryption, wrapped data keys, content hashes, byte counts, and actor-bound download grants remain intact.
- Direct exports remain safely bounded at 10,000 rows.
- Six focused suites pass: 33 tests covering cursor, read model, direct export, background export, actions, and worker behavior.

Passing functional controls do not make the large-export storage and memory path production-safe.

## Required remediation

### 1. Constant-sized job checkpoint

Replace the growing outbox reference array with an O(1) checkpoint containing only next cursor, row count, chunk count, latest sequence, state version, expiry, and rolling evidence identifiers. Chunk identity must live in an append-only, queryable collection rather than one rewritten JSON array.

### 2. Dedicated chunk/artifact boundary

Adopt one reviewed design:

- preferred: encrypted chunks in a vendor-neutral object-storage adapter, with a small database chunk manifest containing job, sequence, object key, bytes, row count, and hash; or
- database-only fallback: a dedicated export-chunk model with unique `(organizationId, jobId, sequence)` and paginated retrieval.

Do not store the complete export body in outbox metadata. Keep data keys wrapped separately so expiry can crypto-shred content while retaining immutable hashes and audit evidence.

### 3. Truly bounded finalization and download

Read chunk manifests in bounded sequence pages, fetch/decrypt one chunk or small batch at a time, update content hashing incrementally, and release buffers before advancing. The download API must begin yielding without first resolving every chunk.

### 4. Purpose-shaped worker indexes

Design and verify indexes against actual predicates, including:

- candidate acquisition by channel, event name, status, availability, and creation order;
- stale-lock recovery by channel, event name, status, and lock time;
- expiry by channel, event name, status, and creation/expiry state; and
- chunk traversal by tenant, job, and sequence.

Use partial indexes where measured cardinality and PostgreSQL operational policy justify them. Do not deploy an index based only on this 10-row outbox plan.

### 5. Migration and rollout gate

Before implementation, approve an exact schema/storage contract, duplicate audit, deployment sequence, retention/deletion behavior, rollback, and compatibility policy for any run009-format jobs. Keep the one-million-row ceiling unavailable until representative load evidence passes.

## Production-like acceptance evidence

The remediation cannot be promoted on unit tests alone. A representative staging or approved read replica must demonstrate:

- history first-page and keyset-page plans at realistic per-tenant cardinality;
- no avoidable explicit sort for the stable page order;
- bounded rows scanned/removed and acceptable estimate accuracy;
- summary aggregation behavior across broad and selective filters;
- worker acquisition under competing workers without duplicate completion;
- linear checkpoint writes as chunk count grows;
- bounded Node heap during finalization and download;
- verified content hash and row parity after restart, retry, expiry, and cancellation;
- database, object-store, WAL, and backup cost at the approved maximum; and
- rollback and cleanup behavior for failed or expired exports.

Performance thresholds must come from an approved SLO and capacity budget; this verification does not invent latency targets.

## Repository ownership

Run010 is read-only for product code. It created only:

- `logs/04-database-capacity-probe.json`
- `slices/foundation-inventory/04-read-model-optimizer.md`
- `slices/foundation-inventory/04-read-model-optimizer.json`
- Run010 control-plane state and trace artifacts

The already-dirty run009 implementation, Prisma schema, migrations, package files, environment files, routes, components, and unrelated work were not edited.

## Verification

| Command | Result |
| --- | --- |
| Sanitized PostgreSQL catalog/index probe | PASS: connected, no sensitive values recorded |
| Non-executing history and worker `EXPLAIN (FORMAT JSON, SETTINGS)` | PASS: five plans captured |
| Sanitized 100-row size sample and capacity model | PASS |
| Focused inventory-history Jest gate | PASS: 6 suites, 33 tests |
| Focused ESLint over cursor/read/export/action/worker surface | PASS |
| `npm run typecheck` | PASS |
| Production-like `EXPLAIN (ANALYZE, BUFFERS, SETTINGS)` | SKIPPED: representative approved environment unavailable |

## Blockers

1. `UNBOUNDED_CHUNK_PRELOAD` (high): finalization and download load all encrypted chunks before processing.
2. `QUADRATIC_CHECKPOINT_REWRITE` (high): the complete growing reference array is replaced after every page.
3. `DATABASE_ARTIFACT_CAPACITY_UNPROVEN` (high): the current ceiling can exceed one GiB of encrypted payload per export before database overhead.
4. `GLOBAL_WORKER_INDEX_CONTRACT_MISSING` (high): acquisition, stale-lock, and expiry predicates lack purpose-shaped production evidence and indexes.
5. `PRODUCTION_LIKE_PLAN_EVIDENCE_MISSING` (medium): the development dataset is far too small for performance certification.
6. `HISTORICAL_BALANCE_AUTHORITY_UNPROVEN` (medium): `balanceAfter` remains excluded and should stay excluded until its sequencing invariants are proved.
7. `PRODUCTION_DELIVERY_BINDING_PENDING` (medium): scheduler, object-storage choice, and HTTP streaming route remain unapproved.

## Next decision

Do not run Stage 05. The next logical step is a new Stage 04 implementation run with an approved constant-sized checkpoint and bounded chunk-storage/streaming design. That run must own an exact migration or storage-adapter allowlist, include worker/chunk indexes, preserve run009's security and evidence controls, and finish with representative capacity verification before Stage 04 can become `PASS`.

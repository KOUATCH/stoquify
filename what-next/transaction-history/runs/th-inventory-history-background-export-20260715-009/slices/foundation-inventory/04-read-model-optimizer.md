# Stage 04 Inventory History Background Export Finalizer

## Run identity

- Run: `th-inventory-history-background-export-20260715-009`
- Trace: `c1b997ec-1750-4434-9c10-781a4502aa9d`
- Slice: `foundation-inventory`
- Mode: `implement`
- Agent: Database Optimizer
- Verdict: **PARTIAL**
- Active lane: `inventory`
- Blocked lane: `workbench`

## Executive decision

The Stage 04 background-export gap identified by run008 is closed at the domain-service boundary. Inventory history above the 10,000-row direct-export ceiling can now be queued as a tenant-bound durable `REPORT_EXPORT` job, continued from persisted signed cursors, processed under atomic leases, retried from the last committed checkpoint, finalized once into an exact NDJSON manifest, downloaded through a short-lived actor-bound grant, and crypto-shredded at expiry.

The implementation reuses the existing append-only `BusinessEvent` and `BusinessEventOutbox` infrastructure. Encrypted export chunks are immutable business-event evidence; the outbox record owns lease, checkpoint, retry, expiry, and completion state. No schema migration, package change, environment-template edit, route, component, or upstream accounting/security policy was changed.

Stage 04 remains `PARTIAL`. Representative `EXPLAIN (ANALYZE, BUFFERS, SETTINGS)` evidence is still unavailable, historical `balanceAfter` authority remains intentionally excluded and unproved, and this run did not bind the tested one-shot worker or download stream to production process-management and HTTP delivery. Stage 05 is not eligible.

## Prerequisite verdict

| Prerequisite | Evidence | Result |
| --- | --- | --- |
| Existing stable inventory read model | Run007 Stage 04 evidence and `inventory-read.service.ts` | PASS |
| Protected direct action/export | Run008 Stage 04 evidence | PASS |
| Tenant, RBAC, fresh-auth, and redaction contract | Run008 action, sensitive-control, export, and secret-preflight evidence | PASS |
| Background export execution | This run's service, action, worker, and focused tests | PASS |
| Production-like plan proof | No approved representative database was available | GAP |

## Source and ownership matrix

| Surface | Classification | Owner and use |
| --- | --- | --- |
| `InventoryTransaction` read adapter | `SYSTEM_OF_RECORD` | Existing inventory read service owns normalized rows, filters, summary, cutoff, and cursor semantics |
| `BusinessEvent` request/chunk/completion records | `DURABLE_EVIDENCE` | Append-only request intent, encrypted immutable chunks, payload hashes, and completion manifest |
| `BusinessEventOutbox` export record | `DURABLE_EVIDENCE` | Job lease, signed-cursor checkpoint, retry state, expiry, and completion status |
| `AuditLog` | `DURABLE_EVIDENCE` | Authorization decision, queue, retry/dead-letter, completion, grant, download-start, and expiry controls |
| NDJSON stream | `DERIVED_COMPLETE` | Reconstructed only from hash-verified encrypted chunks and an exact manifest |
| Historical `balanceAfter` | `UNKNOWN` | Excluded until concurrency, backdating, reversal, and sequencing authority are proved |

## Normalized execution contract

1. Enqueue requires `reports.export`, `inventory.levels.read`, inventory entitlement, and authentication no older than 300 seconds. Tenant, actor, permissions, and auth time come only from protected server context.
2. Callers may provide a fresh filter set, row maximum, retention, retry limit, and idempotency key. Client cursors and identity/security fields cannot enter the service contract.
3. The first 100-row page freezes `recordedThrough`, applied filters, completeness, and the next signed cursor before the durable request and first encrypted chunk are committed.
4. Each worker lease advances a bounded number of pages. Every page must preserve the initial cutoff and applied-filter hash. Each page commits one immutable encrypted chunk and one checkpoint transaction.
5. Successful checkpoints do not consume the failure retry budget. Only processing failures increment `attempts`; the final permitted failure dead-letters the job with a safe error code and audit evidence.
6. Completion decrypts and verifies every chunk, computes exact UTF-8 bytes and SHA-256, records one idempotent completion event, and changes the outbox state to `SENT`.
7. Download grants are tenant-, actor-, job-, content-hash-, and expiry-bound HMAC tokens. Streaming rechecks current dual permissions, job state, expiry, chunk hashes, final bytes, and final content hash.
8. Expiry clears the wrapped per-export data key while retaining content hashes, row counts, and audit evidence. Persisted ciphertext becomes unreadable without deleting the proof trail.

## Cursor, parity, and completeness

- Continuation always uses the opaque cursor issued by the existing inventory read service; the background service never constructs or accepts a client resume cursor.
- `recordedThrough` and the applied-filter hash are frozen by page one and checked on every resumed page.
- Request and applied filters use the same canonical history-filter hashing contract as the signed cursor.
- Direct exports remain bounded at 10,000 rows. Background requests are explicitly bounded from 10,001 to 1,000,000 rows, defaulting to 250,000.
- Exact row count, chunk count, byte length, content hash, snapshot, filters, completeness disclosure, watermark, and redaction scope are persisted in the final manifest.
- A maximum-row boundary with additional pages fails closed; a partial file is never promoted to a ready manifest.

## Security and evidence controls

- The action boundary strips client organization, actor, permission, and authentication fields before validation.
- Enqueue and grant operations require fresh auth and the enforced inventory module entitlement.
- Generic report export permission is insufficient without current inventory-history read permission.
- Per-export 256-bit data keys encrypt chunks with AES-256-GCM. Keys are wrapped with a domain-separated HKDF key derived from the protected history-cursor secret.
- Chunk AAD binds tenant, export, and sequence. Download tokens bind tenant, actor, job, content hash, expiry, and nonce.
- Worker output contains only job IDs, statuses, claim state, and counts. Secrets, cursors, rows, ciphertext, and internal error details are not logged.
- Idempotency keys return the existing job only for the same actor, filters, row maximum, retention, and retry policy. Conflicting reuse fails before another history read.

## Index and migration position

This run did not alter query predicates, ordering, schema, or indexes. It therefore introduces no migration, backfill, dual-write, or rollback operation. Run007's structural index evidence remains applicable, but runtime performance and storage amplification from encrypted event chunks are not certified without representative cardinality, execution-plan, buffer, and retention measurements.

The implementation deliberately uses existing durable tables because no configured object-storage adapter or dedicated export-job model exists in the approved scope. That avoids an unsafe migration in a dirty worktree, but it is not evidence that database-backed encrypted chunks are the final economical storage choice at the one-million-row ceiling.

## Changed files

- `services/inventory/inventory-history-background-export.service.ts`
- `services/inventory/__tests__/inventory-history-background-export.service.test.ts`
- `actions/inventory/inventoryMovementHistoryBackgroundExportActions.ts`
- `actions/inventory/__tests__/inventoryMovementHistoryBackgroundExportActions.test.ts`
- `scripts/inventory-history-export-worker.ts`
- `scripts/__tests__/inventory-history-export-worker.test.ts`
- This Markdown report and its JSON evidence artifact

All six product/test paths were clean and absent at run start. Existing dirty Prisma, package, environment, run008, hook, component, app, and unrelated service files were not edited.

## Verification

| Command | Result |
| --- | --- |
| ESLint over the exact six product/test files | PASS |
| Consolidated focused Jest set | PASS: 3 suites, 18 tests |
| `npm run typecheck` | PASS; final completed rerun exited 0 |
| Initial final typecheck with 180-second runner limit | INCONCLUSIVE: timed out with no diagnostics; superseded by completed 360-second rerun |
| Worker help invocation through repository-compatible `ts-node` CommonJS override | PASS |
| `git diff --check` over the exact six product/test paths | PASS |
| Exact-path ownership check | PASS: six new files, no pre-existing overlap |
| Production-like `EXPLAIN (ANALYZE, BUFFERS, SETTINGS)` | SKIPPED: approved representative environment unavailable |

The 18 focused tests prove protected tenant derivation, fresh-auth ordering, module denial, malicious identity stripping, cursor rejection, exact idempotent replay, conflicting-key rejection, durable cursor checkpoints, multiple successful leases beyond the failure-attempt budget, single finalization, content/byte hashing, token tampering rejection, snapshot-continuity dead-lettering, crypto-shredding, dual-permission denial, persisted-payload tamper detection, bounded worker parsing, queue limits, and explicit-job execution.

## Blockers and residual risk

1. `PRODUCTION_LIKE_PLAN_EVIDENCE_MISSING` (medium): representative execution time, buffers, row-estimate error, sort behavior, and storage/cardinality cost remain uncertified.
2. `HISTORICAL_BALANCE_AUTHORITY_UNPROVEN` (medium): `balanceAfter` remains excluded until concurrency, backdating, reversal, and sequencing invariants are proved.
3. `BACKGROUND_EXPORT_DEPLOYMENT_BINDING_PENDING` (medium): the one-shot worker is executable and tested, but no scheduler/process-manager registration was allowed in this run.
4. `DOWNLOAD_HTTP_BINDING_PENDING` (medium): grant and verified streaming services exist, but no HTTP route was allowed to expose the stream to the future workbench.
5. `DATABASE_ARTIFACT_SCALE_UNCERTIFIED` (medium): encrypted event-chunk retention needs representative storage/load testing or a later approved object-storage adapter before the one-million-row ceiling is a commercial capacity claim.
6. `DEPLOYED_CURSOR_SECRET_UNVERIFIED` (medium): release preflight fails closed, but deployed secret registration and rotation were outside observable repository evidence.

## Next decision

Do not start Stage 05 in this run. The next logical run should be a narrow Stage 04 verification pass on a representative non-production database: capture query plans and cardinality/buffer evidence, measure event-chunk storage and worker throughput, and decide whether the approved production binding uses the existing durable database design or a dedicated object-storage adapter. Resolve or formally scope the historical-balance exclusion, then promote Stage 04 only if those checks pass.

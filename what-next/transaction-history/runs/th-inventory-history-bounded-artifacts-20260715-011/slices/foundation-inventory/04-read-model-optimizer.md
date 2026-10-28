# Stage 04 Read-Model Optimizer - Bounded Artifact Remediation

## Run identity

| Field | Value |
| --- | --- |
| Run | `th-inventory-history-bounded-artifacts-20260715-011` |
| Trace | `5d4e1190-8264-41a3-9bc8-ec44168bc08e` |
| Slice | `foundation-inventory` |
| Mode | `implement` |
| Skill | `stoquify-transaction-history-04-read-model-optimizer` |
| Base and final HEAD | `8a406e93b0e798ed6f476ca5d81df37a2aaa38be` |
| Verdict | **PARTIAL** |
| Stage 05 eligible | **No** |

## Executive result

Run011 removes the four structural scale failures found by run010 without changing the database schema: unbounded chunk preloads, quadratic checkpoint rewrites, encrypted artifact bodies stored in PostgreSQL, and organization-unscoped worker acquisition. Background inventory-history exports now use constant-sized checkpoints, private bounded objects, paginated manifest reads, one-object-at-a-time finalization and download, explicit tenant worker scope, and retryable crypto-shred cleanup.

The result is materially safer and scales linearly under the tested model, but it is not production-certified. Stage 04 remains `PARTIAL` until representative staging plans, object-storage governance and throughput, scheduler/HTTP delivery binding, and historical-balance authority are proved. The public ceiling is therefore fixed at 250,000 rows; the proposed one-million-row tier is disabled.

## Prerequisite chain

- Stage 02 security proof: `PASS`, run006, SHA-256 `6bb0621ad7701c5f9cd096acb7be5d9f6803921d0bb179319a69e4c599414739`.
- Stage 03 accounting control proof: `PASS`, run006, SHA-256 `db3e40670a12cb354359523bb832f371c12a998770facb4d458d1551cee7db93`.
- Stage 04 capacity diagnosis: `BLOCKED`, run010, SHA-256 `7c499b0c9f34d71fdd330141c89d8710789912694720962a9bd1553be743b840`.
- Proposal: SHA-256 `0628f08178fe0441fe22ccbd1a6b429c2bb07b2ea5d278e6dcb799ab117c6979`.

The run011 manifest was corrected before evidence sealing because its initial declaration omitted the required workbench lane and omitted the ten already-scoped Stage 04 product files from stageAllowlists.04. The correction changes no implementation scope; final evidence fingerprints the corrected manifest and the validator is the authority for the sealed contract.

## Implemented controls

| Control | Evidence | Result |
| --- | --- | --- |
| Bounded private artifact adapter | `services/inventory/inventory-history-export-artifact-store.ts:8`, `:26`, `:85`, `:153` | Encrypted chunks only; 16 MiB object limit; private ACL; deterministic opaque object identity. |
| Signed integrity-checked reads | `services/inventory/inventory-history-export-artifact-store.ts:97-113` | Five-minute signed URL, exact length check, SHA-256 verification, no-store fetch. |
| Idempotent upload and bounded deletion | Artifact adapter tests at `:83` and `:153` | Upload conflicts reuse the deterministic object after verification; deletion batches are capped at 100. |
| Frozen page-one replay | `services/inventory/inventory-read.service.ts:854`, `:1147-1163` | Worker can replay page one at the enqueue cutoff without accepting a client-controlled cutoff. |
| O(1) checkpoint | `services/inventory/inventory-history-background-export.service.ts:163-194`, `:741-747` | Schema v2 stores counters, cursor and rolling evidence, not an ever-growing chunk-reference array. |
| Deterministic unique chunk encryption | `services/inventory/inventory-history-background-export.service.ts:403` | HMAC-derived per-export/per-sequence IV makes retry output stable while preserving unique sequence IVs. |
| Bounded persistence and streaming | `services/inventory/inventory-history-background-export.service.ts:817`, `:911`, `:1178`, `:1675` | Manifests are paged; one artifact is read and decrypted at a time; ciphertext is absent from database events. |
| Tenant-scoped worker | `scripts/inventory-history-export-worker.ts:39`, `:62`, `:80`, `:106` | Job, queue and expiry modes require an organization ID. |
| Centralized commercial ceiling | `services/inventory/inventory-history-background-export.service.ts:57-58`; action schema `actions/inventory/inventoryMovementHistoryBackgroundExportActions.ts:36` | Both service and protected action reject requests above 250,000 rows. |
| Crypto-shred retention | Background service `:1241-1252`; test `services/inventory/__tests__/inventory-history-background-export.service.test.ts:550` | Wrapped key is removed before provider deletion; failed deletion remains retryable and auditable. |

No remote object operation occurs inside a database transaction. Upload is completed before the short append/checkpoint transaction; read and deletion are similarly outside transaction callbacks.

## Capacity evidence

The model and sanitized non-executing PostgreSQL 17.5 development plans are saved in `logs/04-bounded-artifact-capacity.json`.

| Rows | Encrypted objects | DB manifests | Checkpoint | Cumulative checkpoint writes |
| ---: | ---: | ---: | ---: | ---: |
| 10,000 | 8.259 MiB | 0.068 MiB | 1.061 KiB | 0.104 MiB |
| 250,000 | 206.470 MiB | 1.695 MiB | 1.061 KiB | 2.589 MiB |
| 1,000,000 future model | 825.882 MiB | 6.781 MiB | 1.061 KiB | 10.357 MiB |

At one million rows, run010 modeled 1,104.584 MiB of encrypted database payload, a 1.736 MiB final checkpoint, and 8,683.033 MiB of cumulative checkpoint rewriting. The v2 structural model reduces those database figures to 6.781 MiB, 1.061 KiB, and 10.357 MiB respectively. This is an analytical comparison, not approval of a one-million-row product tier.

The 101-chunk regression proves constant checkpoint shape: measured metadata grew by less than 256 bytes between chunk 1 and chunk 100, 101 artifact references were persisted as separate append-only records, and finalization had at most one object read in flight.

## Plan findings

- Tenant worker acquisition uses the existing organization/channel/idempotency index but retains an explicit sort in the non-representative development plan.
- Tenant expiry uses the existing organization/status/available index but also retains an explicit sort.
- Chunk-manifest pagination uses the organization/event-source/idempotency unique index without an explicit sort.
- No index migration is justified from the 408-row development fixture. A purpose-shaped migration must be evidence-driven by representative `EXPLAIN (ANALYZE, BUFFERS, SETTINGS)` output.

## Security and lifecycle

- Database records contain only encrypted envelope metadata, small opaque artifact references, byte counts and hashes; encrypted bodies are not persisted in PostgreSQL.
- Provider objects are private and keyed by a hash-derived custom ID that exposes neither tenant nor export identity.
- Read URLs are short-lived and object content is length/hash verified before decryption.
- Expiry first removes the wrapped data key, making retained ciphertext unreadable, then performs bounded provider deletion with retry state.
- Provider error detail is not written to audit metadata.
- Deployment still requires UploadThing secret rotation/preflight, residency and DPA approval, lifecycle/retention confirmation, and throughput/cost evidence.

## Compatibility and migration

No Prisma schema or migration was changed. Existing indexes are reused. Internal checkpoint, manifest and chunk-event schemas move to version 2 and fail closed on run009 version-1 pilot jobs. Because run009 artifacts were pre-production and untracked in this workspace, deployment must drain/delete those pilot jobs and their objects before rolling out v2. There is no silent v1 compatibility fallback.

Rollback is a code rollback plus draining v2 jobs and deleting their private objects. Do not deploy v2 while v1 pilot jobs remain active.

## Verification

| Command or evidence | Result |
| --- | --- |
| Seven focused inventory-history suites, `--runInBand` | `PASS`: 7 suites, 41 tests |
| `npm run typecheck` | `PASS` |
| ESLint on the ten exact implementation/test files | `PASS` |
| Scoped `git diff --check` | `PASS` |
| Trailing-whitespace scan on the ten exact files | `PASS` (no matches) |
| Orchestrator validate-run-artifacts.mjs | PASS: valid, zero errors, zero warnings |
| Orchestrator select-next-stage.mjs | PASS: no next stage; expected STAGE_PARTIAL blocker |
| Sanitized capacity model and non-executing plans | `PASS` for structural evidence; not production certification |
| Production-like `EXPLAIN (ANALYZE, BUFFERS, SETTINGS)` | `SKIPPED`: no approved representative staging dataset |
| Object-provider throughput/residency/lifecycle certification | `SKIPPED`: deployment environment and governance approval unavailable |

## Remaining blockers

1. **High - `OBJECT_STORAGE_CAPACITY_AND_GOVERNANCE_UNCERTIFIED`:** 250,000-row provider throughput, concurrency, lifecycle, cost, residency and contractual controls are not certified. One million rows remains disabled.
2. **Medium - `PRODUCTION_LIKE_PLAN_EVIDENCE_MISSING`:** the development dataset cannot certify worker, expiry or history-read plans at tenant scale.
3. **Medium - `WORKER_INDEX_SORT_UNCERTIFIED`:** worker and expiry plans remain explicitly sorted; add indexes only if representative evidence proves the need.
4. **Medium - `PRODUCTION_DELIVERY_BINDING_PENDING`:** no approved process-manager/scheduler binding or authenticated HTTP streaming endpoint has been certified.
5. **Medium - `HISTORICAL_BALANCE_AUTHORITY_UNPROVEN`:** `balanceAfter` remains excluded until concurrency, backdating, reversal and sequencing invariants are proved.
6. **Medium - `UPLOADTHING_DEPLOYMENT_PREFLIGHT_PENDING`:** production token rotation, private ACL behavior, signed-read behavior and cleanup permissions are not deployment-verified.
7. **Low - `V1_PILOT_JOB_DRAIN_REQUIRED`:** schema-v1 run009 jobs intentionally fail closed and must be drained before rollout.

## Verdict and next logical step

**Stage 04 is `PARTIAL`; Stage 05 is not eligible.** The next run should remain in Stage 04 and bind/certify the production path on an approved representative staging tenant: perform provider governance preflight, execute bounded 250,000-row load/concurrency/expiry tests, capture production-like analyzed plans, bind the tenant-scoped worker scheduler and authenticated streaming delivery, and only then decide whether a narrow index migration is required. Keep the 250,000-row ceiling until that evidence passes.

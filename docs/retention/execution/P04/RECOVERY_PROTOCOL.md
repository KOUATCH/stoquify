# P04 — Recovery proof protocol for P17

13 October 2026. **Prepared procedure; not executed.** No database target has been selected or authorized by this document. The roadmap's proposed **15-minute RPO / 4-hour RTO remain unmeasured**. Local tool success cannot qualify deployed backup operation or unlock live onboarding.

## Current tool review

`scripts/prisma-local-restore-rehearsal.js` imports fs/path/os/crypto, child-process, pg, `prisma-local-fresh-bootstrap` and migration-history helpers. It dumps a source, creates a target and restores into it. It is a mutation tool, not an audit check. P04 did not invoke it or its helpers.

| Source | Guard or limitation |
|---|---|
| Restore runner :18–19,32–71 | Target must match `stoquify_restore_[a-z0-9_]+`; rejects production NODE_ENV, non-PostgreSQL and non-loopback source. PostgreSQL binaries default to local version 17. |
| Bootstrap helper :21–28; restore :252–254 | `loadDatabaseUrl()` can fall back to `.env` and interpolate variables. No source database ownership/name/synthetic-data check. Loopback can be shared or tunneled. Do not use ambient selection. |
| Restore :75–79; bootstrap :51–66 | Target retains source host/port/user configuration with a different database pathname. Creation refuses an existing target. Explicitly verify source != target and the actual instance identity. |
| Restore :267–318 | Profile source, custom-format pg_dump, create target, pg_restore with exit-on-error/no-owner/no-privileges, then counts/history/schema diff/migration status. Source is not intentionally mutated; target is. |
| Restore :20–30,132–149,318–336 | Only nine auth/accounting table counts are compared. `sourcePopulated` is recorded but is not part of READY. Equal source/restore schema diffs need not be empty. No independent row hashes, relationships, attachments, login or worker proof. |
| Restore :321–328,386–394 | Database drop is on normal success path. Exceptions after creation can leave target behind; finally removes the owned system-temp dump directory. Preserve required evidence separately; do not assume failed rehearsal retained a dump or removed the database. |
| Restore :155–172,346–351 | Drop checks namespace/catalog and uses FORCE. `databaseRetained` reflects requested retention, not necessarily actual cleanup success. Future cleanup must independently check instance/name/creation provenance and actual catalog state. |

The source profiling occurs before the dump. Freeze synthetic writers/workers for deterministic comparison; matching live counts at different instants is not reliable recovery proof.

## Required identity and authority sheet

Complete this sheet before any V5 command. These fields are **UNRESOLVED**, not defaults to execute:

| Field | Required value/evidence |
|---|---|
| Rehearsal owner and reviewer | Named platform owner and independent business/control reviewer; date and scope |
| Source instance | Explicit loopback host, port, database, server instance identifier/ownership marker; prove synthetic-only and not a tunnel/shared/customer source |
| Target instance/database | Same explicitly owned disposable instance if using current tool; newly chosen `stoquify_restore_<unique_run>` name; absence verified; not source |
| Credentials | Least authority needed, delivered through controlled process environment; never put URL/password/key in logs or artifacts |
| Source/config revision | HEAD plus relevant dirty content hashes, Prisma schema/migration state, installed Node/Prisma/PostgreSQL/dump/restore versions |
| Object/file namespace | Dedicated synthetic provider bucket/prefix and isolated legacy directory; owner marker and deletion permissions |
| Key inventory | Required version identifiers for picture keys, wrapping/signing secret and auth/session configuration; recoverability checked without recording material |
| Egress and workers | Block all live external sends/payment/filing/provider destinations; identify stopped workers/schedulers and fixture-only adapters |
| Recovery objectives | Explicit reference cutoff, data-loss tolerance, start/end definitions and reviewer-approved pass criteria; do not assume proposed targets are achieved |

Only after this sheet is complete and command/helpers are freshly reviewed may P17 choose a concrete invocation of `node scripts/prisma-local-restore-rehearsal.js` with `--database`, `--pg-bin`, separate `--out`/`--json-out`, and normally `--retain-database` for independent inspection. Supply an explicit reviewed source environment; the tool otherwise reads `.env`. This is a command-selection protocol, not permission to substitute an inferred DATABASE_URL. Never run build/migrations/seeds as incidental recovery verification.

## Synthetic fixture and independent control inventory

1. P03's two locations/two items, accepted/rejected source rows and independent stock/AR/AP/GL controls. They are files today, not persisted records; P13/P17 must use supported setup and expert-approved mappings before creating database equivalents. Retain a second tenant for denials.
2. Active/locked/inactive users, current and revoked sessions, narrow roles, a manager assigned to one location, active/scheduled/expired/revoked accountant grants, READ_ONLY and reviewer capabilities, explicit active/read-only/unavailable module grants.
3. Source-linked sale, receipt, movement, journal and review evidence with agreed expected relationships and balances. Preserve domain idempotency keys and current incident source hashes. No fake successful financial transactions to satisfy fixture counts.
4. Picture objects with expected plaintext hash/length, ciphertext object identity and DB key/IV/tag/AAD references; ready/uploading/deleting states. Legacy files inventoried separately; include missing/corrupt object cases.
5. Export DB payload/manifest/wrapped key plus encrypted chunks, ciphertext/plaintext hashes, row/byte counts, expiry and signed-grant context. Include provider object missing, key missing and chunk tampering.
6. Outbox/inbox states pending/locked/stale-lease/failed/dead-letter/expired/completed, a checkpointed export and duplicate delivery key; fixture notification/payment adapters must record attempts without sending externally.

Capture controls independently of restore code: counts per tenant/type/state, relationship/orphan checks, exact monetary/quantity totals, source watermark, allowed object hashes and completed external-operation references. Counts alone are not sufficient.

## Storage and operational dependencies

| Dependency | Source evidence and required proof |
|---|---|
| PostgreSQL and migrations | Restore/history tooling covers schema/history and narrow counts. Establish deployed provider/tier, PITR window, schedules, backup success/failure alerts, access, retained recovery points and actual restore rights. None verified here. |
| Picture DB + UploadThing | `services/media/picture.service.ts:38–58` stores AES-GCM keys/IV/tag and plaintext SHA-256 in DB, ciphertext externally; :84–105 scopes/decrypts/checks hash. Recover both coherently. `UPLOADTHING_TOKEN` is a prerequisite name only. Quarantine cleanup at :116–129. |
| Legacy disk media | `app/api/uploads/[...path]/route.ts:92–123` reads `public/uploads/<org>/<file>`. Inventory files separately from DB; resolve the direct-static-path concern in T05 before reopening. |
| Background export objects | `services/inventory/inventory-history-export-artifact-store.ts:59–64,128–160` default private ACL, signed reads and ciphertext hash/length. Record actual configured ACL and object backup/deletion behavior; no provider configuration inspected. |
| Export key/manifest state | Background service :318 selects configured history secret; :132–210 tracks payload/checkpoints/wrapped key/hashes; :1238–1282 crypto-shreds before provider deletion. An old DB can resurrect pre-expiry key state; reconcile current deletion/expiry independently. |
| Export integrity/delivery | Background service :1629–1693 verifies token, manifest and aggregate bytes/hash/count. Final aggregate check can fail after earlier bytes were yielded; validate the complete recovered file separately and never publish a partial artifact as verified. |
| Workers/schedulers | Background service :1383–1459 claims org-scoped leases and resumes checkpoints. `scripts/inventory-history-export-worker.ts:38–45,104–111,133–166` requires org/worker, bounds work; `--expire` actively shreds/deletes. Also inventory provider/payment/payroll/fiscal/notification/invitation workers actually enabled in the chosen deployment. |
| Incident control | `services/assurance/assurance-incident.service.ts:629–727` tenant-scoped transitions, current source hash and active same-org assignment; :298–318,351–368 waiver evidence/expiry and separate reviewer. These can retain evidence but do not certify recovery. |
| App and auth configuration | Recover exact candidate/configuration, secret versions, domain/cookie/session context, access policies and worker scheduler topology. Revalidate membership and post-snapshot revocations; do not reuse backup sessions blindly. |
| Offline/external recent work | Record queued terminal evidence and external operations since recovered watermark. Reconcile without double posting, notification resend or replaying real money movement. Offline/provider workflows remain separately gated. |

## Execution sequence for the future rehearsal

1. Complete identity sheet; inspect current tool and cleanup. Verify source ownership, target absence and explicit source selection without exposing credentials. Stop if any ambiguity, live-data inclusion or mismatched fingerprint exists.
2. Isolate fixture environment, freeze synthetic writers and capture independent controls/watermarks. Disable live scheduler and outbound credentials/egress. Securely retain source/object manifests and sanitized evidence outside the script's temporary dump directory.
3. Run the reviewed dump/restore into the newly created owned target, retaining it for verification. Save actual command with credentials redacted, start/end timestamps, tool status and dump hash. A script READY is only its limited structural result.
4. With workers stopped, verify migration/schema state, each fixture count, every required relationship, independent P03/domain totals and tenant boundaries. Restore object/files inventory and verify permitted decrypt/hash/length checks; reject absent or inconsistent keys/objects.
5. Reconcile post-snapshot revocation, consent, module, expiry/deletion and completed external-operation facts against authoritative retained evidence. If these cannot be recovered, keep affected access and workers disabled. Never silently resurrect a grant, session, crypto-shredded export or completed payment/send.
6. Execute V3/V4 access cases from [TRUST_BLOCKERS](TRUST_BLOCKERS.md), including legacy direct-static paths and actual delivery routes. Record role/tenant/location/locale/route and denial results without user secrets.
7. Resume one bounded fixture-only worker. Prove checkpoint continuation, stale-lease takeover, duplicate replay, retry/dead-letter, missing/corrupt object and expiry cleanup. Record zero live outbound side effects and reconciled event/ledger/object counts.
8. Measure usable recovery and lost-work bounds. Independent reviewer must accept financial/data/access/object/worker outcomes before any reopening decision. Keep deployment qualification separate from a successful local exercise.
9. Quarantine failures. Preserve sanitized diagnostics; do not overwrite source, reset a shared database or erase failed evidence. Inspect actual catalog after tool cleanup failure. Before manual drop, reverify exact host/instance/name, creation provenance, namespace and absence of unrelated users; only remove the owned rehearsal target. For filesystem cleanup, verify resolved paths remain inside the owned namespace and use native literal-path commands.

## Measurement and evidence template

- **RPO:** reference incident/cutoff time minus latest independently verified recovered transaction watermark. Report DB, objects, terminal queues and external evidence separately; use the weakest required recovery point after reconciliation. Backup schedule alone is not measured RPO.
- **RTO:** declared interruption/containment start until reviewer-approved usable service for the named scope, including access, balances, attachments and controlled workers. Record pg_restore duration separately; it is not service RTO.
- Record start/cutoff/recovered watermark/end in UTC, clock source, lost transaction/object count, unresolved relationships/variances, allowed/denied case outcomes, worker backlog/replay counts, provider-side-effect attempts and exact cleanup state.
- Evidence state must distinguish source, mocked tests, real database, rendered/browser, provider, customer, expert and operational results. Attach source/config/fixture/object-manifest hashes, command exits and named reviewer decisions. A skipped test or missing object is not PASS.

No measured RPO/RTO, backup availability, legal retention conclusion, production readiness or support promise is made by this protocol. P17 owns execution; P18 and later gates own pilot admission.

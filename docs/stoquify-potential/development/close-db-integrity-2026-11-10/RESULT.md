# Hardened close: database integrity review

The reviewed close-record scope gaps are fixed and qualified on isolated PostgreSQL 17 databases. Migration `20261110190000_close_scope_integrity` is the additive 123rd migration. Fresh replay, a populated predecessor upgrade, older-client compatibility, corrupt-data rejection and the existing monthly-close regression passed. This is local database qualification; production deployment remains blocked by the separate release and environment requirements.

The machine-readable admission is [FINAL_QUALIFICATION.json](FINAL_QUALIFICATION.json). The successful database execution is [pg-attempt-99a87606d0/pg-RESULT.json](pg-attempt-99a87606d0/pg-RESULT.json). Earlier unsuccessful attempts remain preserved.

## Findings and implemented controls

Existing single-ID foreign keys did not require a close record and its referenced parent to share an organization, accounting period and close run. Service checks provided important authority controls, but legacy or direct database writes could bypass that structural alignment. Mutable scope identifiers could also move historical close records into another cohort.

The product changes are confined to [the Prisma schema](../../../../prisma/schema.prisma), [the new migration](../../../../prisma/migrations/20261110190000_close_scope_integrity/migration.sql) and the appended [migration catalog](../../../../prisma/migration-catalog-manifest.json). Existing application service and UI files were not changed by this task. Pre-existing workspace edits are preserved.

| Control | Result |
| --- | --- |
| Fourteen composite foreign keys | Enforce fiscal-year/period tenant alignment, run/period alignment, all six core child/run edges, and optional checklist/finding/evidence/review references within the same close scope. |
| Six supplemental unique indexes | Supply exact parent tuples for those foreign keys; the existing accounting-period tuple is reused. |
| Seven identity guards | Freeze record ID, organization, period and applicable close-run ID on the seven core close tables, including otherwise coherent reparenting. |
| Existing deletion and retention rules | All 26 original core foreign keys remain. Nullable associations, valid SET NULL actions and unretained cascades continue to work. Existing retained-byte protections remain enforced. |
| Legitimate updates | Status, ownership, resolution, comments and stale/source metadata remain writable. A valid same-organization fiscal-year edit to an OPEN period remains allowed. |

Prisma explicitly models the supplemental foreign keys through named relations. Existing ordinary relation fields are retained. The unchanged fresh-replay certification gate accepts the resulting schema with its existing intentional residual drift and zero unexpected drift; no exception or gate was widened for this migration.

Actor eligibility, delegated accountant authority, module access, fresh authentication, session revocation and workflow decisions remain service controls. No local-user foreign key was added to historical or external owner identifiers. This packet qualifies the stated close-scope invariants and parent lineage, rather than every table or financial invariant in the platform.

## Migration behavior

The migration obtains a deterministic nine-table ACCESS EXCLUSIVE lock cohort, then checks all fourteen parent relationships. Any existing inconsistency raises PostgreSQL `23514` with category/count detail before the new indexes, foreign keys or triggers are installed. It does not repair, delete, relabel or regenerate legacy records or retained documents.

The DDL is explicitly transactional. Lock acquisition has a five-second timeout, and statements have a 120-second timeout. The statement timeout is not a guarantee that the entire migration finishes in 120 seconds. Successful deployment requires a planned window with writers paused and target-scale timing for index creation and validation. The small synthetic databases do not establish production-size migration duration or availability.

All first 122 catalog entries and SQL files remain unchanged. [CATALOG_ADMISSION.json](CATALOG_ADMISSION.json) records the append and manual operational review; the lexical risk scan alone is not production approval.

| Input | SHA256 |
| --- | --- |
| Current schema | `937754a6034b37b82c98957ebb9b70f612659d40af562967151595562acc6ef0` |
| New migration SQL | `334b580ac161ed37b6eccd6bc33234b3aabd0d6935215d60d6dd3318166b53e7` |
| Catalog identity, 123 migrations | `968c1f6c7c45f26a8eb8068b551e67450142fccc119b84528e4f4424c64a2e66` |

## Verification results

| Evidence class | Executed result | Receipt |
| --- | --- | --- |
| Source inspection | Schema, SQL, current close controls, migration helpers and qualification inputs reviewed. Independent read-only reviews found no remaining concrete blocker within the stated scope. | [INTEGRITY_CASE_PLAN.md](INTEGRITY_CASE_PLAN.md), source and final admission |
| Mocked unit/service/action tests | 472 passed across five suites; zero failed, skipped or todo. | [unit-eb48f1b56b/verification.json](unit-eb48f1b56b/verification.json) |
| Static checks | Whole-project TypeScript passed with no emitted output or incremental cache. Focused lint passed on four accounting services with zero errors and warnings. | [static-0694cd6a62/verification.json](static-0694cd6a62/verification.json) |
| Real PostgreSQL cases | 20 passed: 12 structural cases and eight existing monthly-close cases; zero failed, skipped or todo. | [pg-attempt-99a87606d0/pg-tests.summary.json](pg-attempt-99a87606d0/pg-tests.summary.json) |
| Fresh migration replay | All 123 migrations deployed twice; exact history and unchanged certification gate passed. | [pg-attempt-99a87606d0/pg-fresh123.json](pg-attempt-99a87606d0/pg-fresh123.json) |
| Populated upgrade | A fresh 122-migration database was populated, upgraded to 123 twice and certified. Exact fixture rows, retained document bytes and all original history rows were preserved. | [pg-attempt-99a87606d0/pg-CLEAN_UPGRADE.json](pg-attempt-99a87606d0/pg-CLEAN_UPGRADE.json) |
| Older-client writes | The qualified 122-client wrote a valid draft run and legacy null-retention export against schema 123. A wrong-period child was rejected with `P2003`, with no negative row-count change. | [pg-attempt-99a87606d0/pg-OLD_WRITER_COMPATIBILITY.json](pg-attempt-99a87606d0/pg-OLD_WRITER_COMPATIBILITY.json) |
| Corrupt predecessor upgrade | Fourteen distinct legacy mismatch categories were detected. Direct exact-SQL diagnosis returned `23514` and all fourteen expected counts, then rolled back. Actual Prisma deployment also rejected the upgrade. Fixture rows, retained bytes, schema and all original history rows remained unchanged. | [pg-attempt-99a87606d0/pg-DIRTY_UPGRADE_REJECTION.json](pg-attempt-99a87606d0/pg-DIRTY_UPGRADE_REJECTION.json) |
| Authenticated interface/browser | Not executed in this packet. Historical browser results are not presented as verification of this migration. | — |
| Build, hosted recovery and production deployment | Not executed or qualified in this packet. | — |

The initial `npm run agent:workflow:check` passed. The reviewed database invocation was `node docs/stoquify-potential/development/close-db-integrity-2026-11-10/pg-integrity-qualification.cjs run`. Exact underlying commands, arguments, configurations, exit codes and output digests are retained in the linked static/unit receipts and database execution records. These custom runners were inspected for their effects and explicit targets before execution; they do not substitute for the broader production release gates.

The twelve structural cases verify exact foreign-key names and SQLSTATEs for all fourteen parent edges, all six optional-reference updates, 34 immutable-identity attempts, referenced parent drift, permitted updates, optional deletion behavior, unretained run/period/organization cascades and retained custody. An actual concurrent INSERT is observed waiting on the exact deleting parent transaction; after that deletion commits, the INSERT is rejected and no orphan persists. This proves the tested interleaving, rather than every possible concurrency ordering.

Structural and upgrade fixtures use synthetic OPEN/DRAFT records and an explicitly uncertified DRAFT custody sentinel. They do not manufacture certified financial states. Separately, the eight monthly cases earn internal opening, collection, reconciliation, approval, pack certification and period-seal transitions through the current services from synthetic provider observations. They also test denial, replay, fault rollback, concurrent claims and retained recovery. Their internal certification is not upstream provider authentication or statutory approval.

After migration, the SQL inventory is 149 user triggers, 231 CHECK constraints and 77 public functions, unchanged through the real database cases.

## Isolation, evidence and corrected attempts

The successful run used three new, previously absent databases on the explicitly owned local cluster:

- `stoquify_replay_close_monthly_20261110_99a87606d0`
- `stoquify_replay_close_integrity_upgrade_20261110_99a87606d0`
- `stoquify_replay_close_integrity_corrupt_20261110_99a87606d0`

No existing database was reset or dropped. The owned cluster stopped successfully. The deliberately corrupt target retains its unfinished Prisma migration row as failure evidence; it was not resolved or cleared to obtain a pass.

Current and predecessor Prisma clients were verified in private contexts. Runtime checks use byte-identical client copies whose generated environment paths stay inside the owned context and are absent at import; database constructors also disable those paths. Four owned canary probes verified the old and current client boundaries without database connections. Root/shared generated clients and qualified originals remain unchanged. Application environment files, application startup and external delivery were excluded from the admitted run. Raw test results, synthetic credentials, snapshots and canonical documents remain in the private workspace context, with digests in public receipts.

The first overall database attempt failed because a parent-move negative fixture collided with an unrelated period uniqueness rule; its corrected fixture and stronger error reporting are documented in [PERIOD_FIXTURE_CORRECTION.md](PERIOD_FIXTURE_CORRECTION.md). The next attempt passed the 20 cases, populated upgrade and old writer, then failed the runner's assumption that Prisma retained a detailed failure log. The corrected independent diagnosis is documented in [PRISMA_REJECTION_DIAGNOSTIC.md](PRISMA_REJECTION_DIAGNOSTIC.md). Prisma's original exception remains unavailable; its rejection and the driver's exact cause are explicitly separate evidence.

The earlier behavioral unit pass is preserved but excluded from the environment-isolation claim. A subsequent invocation stopped at parsing before executing tests. [UNIT_ENV_ISOLATION_SUPPLEMENT.json](UNIT_ENV_ISOLATION_SUPPLEMENT.json) identifies the admitted repeat. Counts above describe the admitted runs once; unsuccessful or superseded runs are not added to them.

One offline admission attempt also stopped before writing a final record because it incorrectly expected a generic `passed` field in raw monthly evidence. That evidence retains phase-specific facts, while Jest records pass/fail status. The corrected validator checks both against their actual formats; the passing database run was not repeated or changed. [OFFLINE_ADMISSION_FAILURE_a55.json](OFFLINE_ADMISSION_FAILURE_a55.json) preserves that validator failure and its source preimage.

## Remaining release boundaries

No database-integrity blocker remains in the qualified scope. A corrupt deployment target will intentionally block this migration and require a separately reviewed repair plan. A failed SQL transaction rolls back its DDL, while Prisma may retain an unfinished history record. After a successful deployment, reverting source files alone does not reverse the database; use the existing reviewed recovery or forward-fix process.

Production host and HTTPS domain remain undecided. A new source-bound release artifact, hosted database adoption and recovery evidence, target-scale migration rehearsal, live email/invitation and worker configuration, domain acceptance and existing global release gates remain necessary. Live customer statement delivery and accountant invitations remain required pilot features, but no messages were sent here. Earlier sealed artifacts are historical and do not include this migration. The next development step is to build and qualify a release candidate containing these exact schema and migration inputs.

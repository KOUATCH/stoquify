# Local Development Migration History Diagnostic

Generated: 2026-07-27  
Database classification: `LOCAL_DEVELOPMENT_ONLY`  
Database name: `dbakesman`  
Status: `RECONCILED_AND_QUARANTINED_FROM_RELEASE_EVIDENCE`

## Finding

The local database contains an unfinished `_prisma_migrations` row for `20260727110000_offline_pos_sync_foundation`:

- `started_at` is present;
- `finished_at` is null;
- `rolled_back_at` is null;
- `applied_steps_count` is 0;
- a migration error log is present;
- the log hash is `sha256:b747a379c7a35539c2af5af51be0389498e58c0cbb4bb3b5adf0780662a1459d`;
- a redacted boolean check confirms the failure reports that `POSOfflineDeviceStatus` already exists.

The enum and `pos_offline_devices` table existed before migration execution reached its first step. The preceding four migrations completed at 2026-07-27 07:12 UTC. The two later repository migrations remain pending.

## Prisma status limitation observed

`npx prisma migrate status` reports only these migrations as pending:

- `20260727143000_country_adapter_pilot_foundation`
- `20260727170000_ai_copilot_proposal_guardrails`

It does not surface the unfinished offline-POS row in its summary. Therefore that command alone is not sufficient evidence that this local database has a clean migration history.

## Direct history-gate follow-up

The new `prisma:migration:history:health` negative proof independently confirmed:

- one unfinished migration: `20260727110000_offline_pos_sync_foundation`;
- three repository migrations without successful rows;
- one genuine checksum mismatch: `20260619120000_backfill_purchase_receive_permission`;
- zero unknown successful migrations;
- zero duplicate successful migration rows.

The checksum mismatch matches none of the current raw, LF-normalized, or CRLF-normalized file digests, so it is classified as SQL-content drift rather than a Windows line-ending artifact. The migration file and database history were not altered.

## Decision

- No migration resolve, reset, deploy, schema mutation, or data mutation was executed during this diagnostic.
- `dbakesman` is quarantined from release, migration-certification, and production-readiness evidence.
- Development may continue only with the understanding that this database is schema-first/drifted and not proof that the retained migration history can reproduce the schema.
- Do not run `prisma migrate resolve --applied` against this database without a snapshot and a complete object-by-object equivalence audit for every enum, table, index, and foreign key in the offline-POS migration.
- Preferred recovery is to export any needed development data, create a disposable replacement development database, establish an approved baseline, and replay the retained migrations under a reviewed runbook. This is a separate destructive operation and is not authorized by this diagnostic.
- Production B03 must use its own approved target, backup/restore evidence, and protected migration job. This local database must not be reused as that target.

## Evidence basis

- Read-only `npx prisma migrate status`
- Read-only query of `_prisma_migrations`
- Read-only PostgreSQL catalog lookup for selected offline-POS objects
- Hash/boolean inspection of the retained migration log without printing its contents
- Repository migration: `prisma/migrations/20260727110000_offline_pos_sync_foundation/migration.sql`

## Completion statement

The previously unexplained state transition is now explained and classified. The database itself is not repaired; it is explicitly excluded from release evidence until a separately authorized recovery or replacement is completed.

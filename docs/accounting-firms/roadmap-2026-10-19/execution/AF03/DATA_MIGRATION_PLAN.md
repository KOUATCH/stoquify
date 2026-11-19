# AF03 additive migration and rollback plan

## Scope

Add four domain tables, status enum, supporting composite unique keys on existing users/mandates, tenant foreign keys, date/identity checks, partial active-identity indexes and retained-history/lifecycle guards. No existing record update, name-based backfill, user relocation, entitlement, permission or consent change. Existing Prisma consumers remain compatible. Custom PostgreSQL guards and partial indexes are documented in migration SQL because Prisma cannot fully express them.

## Rehearsal

Use a dedicated runner with explicit owned cluster directory, loopback host/port and fresh AF03 database names. Verify SHOW data_directory against the owned directory. Refuse existing databases and production NODE_ENV. Set all Prisma connection variables explicitly to the fresh target. Never derive the target from application configuration.

Rehearse (1) clean catalog apply and second deploy replay, (2) populated predecessor catalog followed by AF03 upgrade, (3) legacy SQL reads/writes and existing resolver tests against the expanded schema, (4) negative tenant/identity/date/lifecycle cases, concurrent identity claims, transaction rollback, immutable links/history and the revoked-mandate fence. Preserve named disposable databases and logs for inspection; stop only the owned server afterward.

## Activation and rollback

AF03 is dormant: no endpoint, worker, rollout flag or enrollment is activated. Keep creation/enrollment inaccessible. The revoked-only database fence prevents accidental links from gaining access with old code. Leave additive data and migration history intact on code rollback; do not run destructive down SQL. Existing unlinked grants continue under existing access controls.

Before future live enrollment: AF04 must enforce fresh intersections in every delegated read/write/export and demonstrate revoked/suspended/concurrent failures; replace the temporary database fence only in a separately reviewed migration. AF05 must then use protected transactions, tenant permissions, existing outbox/event controls and idempotency. Rollback after this future activation requires a reader version retaining managed checks, or explicitly disabling managed mandates before older readers return. Never unlink to restore legacy access.

## Operations

Observe constraint errors, rejected state transitions, duplicate active identities and attempted linked-grant reactivation. Owners: accounting domain engineering for valid lifecycle commands, IAM for future access enforcement, database/release operator for authorized promotion. Large existing unique-index creation may lock writes and must be measured on a representative approved staging copy before production promotion. Synthetic local timing is not a production capacity guarantee. Retention/purge needs a separate reviewed policy; no generic cascade deletion of managed history.

## Results

Execution results and exact catalog/hash evidence are recorded in RESULT.md and its dated run directory after rehearsal. This plan itself is not migration readiness evidence.

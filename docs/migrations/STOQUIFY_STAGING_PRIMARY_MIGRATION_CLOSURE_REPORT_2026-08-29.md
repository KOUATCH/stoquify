# Stoquify Staging-Primary Migration Closure Report

Date: 2026-08-29
Environment: `staging-primary`
Decision: **READY - NO MIGRATION OR RESOLVE ACTION REQUIRED**

## Outcome

The migration issue is closed for the only controlled target declared in `docs/migrations/Database Migration Info.docx`.

The target is populated, locally hosted, and currently has all 80 repository migrations recorded with matching checksums. It has no pending, unfinished, unknown, duplicate-success, or checksum-mismatched migrations. The baseline bridge is already part of its matching history. Running the baseline again or marking it resolved would therefore be incorrect.

The correct action is `NO_ACTION_CURRENT`.

## Supplied ownership and control information

- Database owner: Kouatchoua Mark
- Migration maker: Tchami Jennifer
- Independent checker: Yonga Sprinfield
- Hosting classification: local
- Existing business data: yes, confirmed through a redacted aggregate table profile
- Documented backup/PITR state: enabled
- Documented credential method: CI secret
- Preferred first target: staging

The database connection itself was never printed or retained. The sole configured local PostgreSQL target was represented by the stable redacted reference `db-6074d3e925d2`.

## Migration verification

- Immutable catalog: ready, 80 migrations
- Manifested migration mutation: none
- New/unmanifested migrations: none
- Current target history: 80/80
- Pending migrations: zero
- Unfinished or rolled-back migrations: zero
- Unknown successful migrations: zero
- Duplicate successful rows: zero
- Checksum mismatches: zero
- Prisma schema validation: passed
- Prisma migration status: up to date
- Focused migration-control tests: 53/53 passed across seven suites

## Recovery rehearsal

The previous `Never` restore-test state has been closed.

A consistent PostgreSQL logical backup was created from the populated source without mutating it. The backup was restored into a new restore-only local database. Verification proved:

- 80/80 migration history on the restored database;
- identical source and restored schema-diff fingerprints;
- identical presence and row counts for organizations, users, accounts, sessions, chart of accounts, journals, journal entries, fiscal years, and accounting periods; and
- successful Prisma migration status on the restored database.

The temporary dump was deleted after hashing. The verified restore database and every failed/superseded rehearsal database were also deleted after validation, so no additional populated business-data copy remains. The restore can be reproduced with `npm run prisma:restore:rehearse -- --database stoquify_restore_<unique_name> ...`.

## Permanent controls added

- Immutable migration catalog with raw, canonical LF, and canonical CRLF hashes.
- Fail-closed rejection of new timestamp collisions and applied-file mutations.
- Full-history integrity separated from target-pending destructive risk.
- Automatic baseline execution blocked for existing databases.
- Automatic `prisma migrate resolve` prohibited.
- Historical approval identity separated from mutable release state.
- Current 80-migration empty replay and second-run no-op certification.
- Reusable local restore rehearsal that verifies history, schema, and auth/accounting aggregate profiles and removes restored data by default.
- Updated production migration runbook and package command.

## Actions deliberately not taken

- No migration was deployed because none is pending.
- No baseline SQL was executed.
- No `prisma migrate resolve`, reset, seed, rollback, or history rewrite was performed.
- No human approval was generated or signed by automation.
- No production certification is claimed because the supplied inventory declares only `staging-primary`.
- Functional login and accounting workflow smokes were not run because no deployment occurred; they remain mandatory after any future target mutation.

## Closure conditions

The database-level issue is resolved for `staging-primary`. To make the result operationally permanent:

1. Review and merge the migration-scoped working-tree changes on a clean candidate.
2. Keep catalog integrity, history health, and pending-risk checks mandatory in CI.
3. Before adding another database, create a new redacted census and independently select its route.
4. For future deployments, require backup/restore evidence and post-deployment auth/accounting smokes before promotion.

Final status: **migration history healthy, recovery rehearsed, no database action pending, permanent preventive controls implemented.**

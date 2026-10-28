# Prisma Migration History Health

Generated: 2026-08-08T20:21:11.890Z
Mode: `report`
Status: `blocked`

## Summary

- Checks ready: 7/8
- Repository migrations: 48
- Completed history rows: 48
- Unfinished history rows: 0
- Rolled-back history rows: 5
- Secret values printed: no
- Migration logs printed: no

## Target

- Database configured: yes
- Target class: `local`
- History query succeeded: yes

## Checks

- ready: database_url_configured
- ready: migration_catalog_present
- ready: migration_history_query_succeeded
- ready: migration_history_has_no_unfinished_rows
- ready: all_repository_migrations_successfully_applied
- blocked: applied_migration_checksums_match_repository
- ready: database_has_no_unknown_successful_migrations
- ready: database_has_no_duplicate_successful_migrations

## Findings

- Unfinished: none
- Missing: none
- Checksum mismatches: 20260619120000_backfill_purchase_receive_permission
- Unknown successful migrations: none
- Duplicate successful migrations: none

## Blockers

- applied_migration_checksums_match_repository

## Safety

- This gate performs a read-only query of `_prisma_migrations`.
- It does not print or retain the database URL or migration error logs.
- It compares successful history rows with the exact repository migration file checksums.
- It does not resolve, apply, roll back, or mutate a migration.

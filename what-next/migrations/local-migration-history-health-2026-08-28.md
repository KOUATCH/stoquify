# Prisma Migration History Health

Generated: 2026-08-28T17:42:19.262Z
Mode: `fail`
Status: `ready`

## Summary

- Checks ready: 9/9
- Repository migrations: 80
- Completed history rows: 80
- Unfinished history rows: 0
- Rolled-back history rows: 0
- Secret values printed: no
- Migration logs printed: no

## Target

- Database configured: yes
- Target class: `local`
- History query succeeded: yes
- Checksum approval registry valid: yes
- Checksum approvals: 0

## Checks

- ready: database_url_configured
- ready: migration_catalog_present
- ready: migration_checksum_approval_registry_valid
- ready: migration_history_query_succeeded
- ready: migration_history_has_no_unfinished_rows
- ready: all_repository_migrations_successfully_applied
- ready: applied_migration_checksums_match_repository
- ready: database_has_no_unknown_successful_migrations
- ready: database_has_no_duplicate_successful_migrations

## Findings

- Unfinished: none
- Missing: none
- Checksum mismatches: none
- Approved checksum mismatches: none
- Stale checksum approvals: none
- Unknown successful migrations: none
- Duplicate successful migrations: none

## Blockers

- None

## Safety

- This gate performs a read-only query of `_prisma_migrations`.
- It does not print or retain the database URL or migration error logs.
- It compares successful history rows with the exact repository migration file checksums.
- A legacy mismatch is accepted only when an approval matches the migration name, exact database checksum, and an exact current repository checksum.
- It does not resolve, apply, roll back, or mutate a migration.

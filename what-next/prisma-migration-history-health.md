# Prisma Migration History Health

Generated: 2026-07-27T16:16:06.504Z
Mode: `report`
Status: `blocked`

## Summary

- Checks ready: 5/8
- Repository migrations: 41
- Completed history rows: 38
- Unfinished history rows: 1
- Rolled-back history rows: 1
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
- blocked: migration_history_has_no_unfinished_rows
- blocked: all_repository_migrations_successfully_applied
- blocked: applied_migration_checksums_match_repository
- ready: database_has_no_unknown_successful_migrations
- ready: database_has_no_duplicate_successful_migrations

## Findings

- Unfinished: 20260727110000_offline_pos_sync_foundation
- Missing: 20260727110000_offline_pos_sync_foundation, 20260727143000_country_adapter_pilot_foundation, 20260727170000_ai_copilot_proposal_guardrails
- Checksum mismatches: 20260619120000_backfill_purchase_receive_permission
- Unknown successful migrations: none
- Duplicate successful migrations: none

## Blockers

- migration_history_has_no_unfinished_rows
- all_repository_migrations_successfully_applied
- applied_migration_checksums_match_repository

## Safety

- This gate performs a read-only query of `_prisma_migrations`.
- It does not print or retain the database URL or migration error logs.
- It compares successful history rows with the exact repository migration file checksums.
- It does not resolve, apply, roll back, or mutate a migration.

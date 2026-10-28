# Prisma Migration History Health

Generated: 2026-08-09T08:11:11.244Z
Mode: `report`
Status: `blocked`

## Summary

- Checks ready: 6/8
- Repository migrations: 53
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
- blocked: all_repository_migrations_successfully_applied
- blocked: applied_migration_checksums_match_repository
- ready: database_has_no_unknown_successful_migrations
- ready: database_has_no_duplicate_successful_migrations

## Findings

- Unfinished: none
- Missing: 20260809100000_customer_receivable_document_foundation, 20260809113000_customer_statement_snapshot_foundation, 20260809130000_customer_statement_external_access, 20260809143000_customer_statement_delivery_referral, 20260809160000_accountant_client_invite_onboarding
- Checksum mismatches: 20260619120000_backfill_purchase_receive_permission
- Unknown successful migrations: none
- Duplicate successful migrations: none

## Blockers

- all_repository_migrations_successfully_applied
- applied_migration_checksums_match_repository

## Safety

- This gate performs a read-only query of `_prisma_migrations`.
- It does not print or retain the database URL or migration error logs.
- It compares successful history rows with the exact repository migration file checksums.
- It does not resolve, apply, roll back, or mutate a migration.

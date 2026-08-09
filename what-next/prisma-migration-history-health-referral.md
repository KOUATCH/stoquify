# Prisma Migration History Health

Generated: 2026-08-09T12:29:24.422Z
Mode: `report`
Status: `blocked`

## Summary

- Checks ready: 7/9
- Repository migrations: 62
- Completed history rows: 48
- Unfinished history rows: 0
- Rolled-back history rows: 5
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
- blocked: all_repository_migrations_successfully_applied
- blocked: applied_migration_checksums_match_repository
- ready: database_has_no_unknown_successful_migrations
- ready: database_has_no_duplicate_successful_migrations

## Findings

- Unfinished: none
- Missing: 20260528124341_refine_item_barcode, 20260611120000_payment_provider_reference_uniqueness, 20260611130000_accounting_auth_baseline_bridge, 20260618160000_payroll_foundation_bridge, 20260618161000_ap_stock_count_foundation_bridge, 20260726140000_business_event_foundation_bridge, 20260730150000_organization_onboarding_entitlement_bridge, 20260809100000_customer_receivable_document_foundation, 20260809113000_customer_statement_snapshot_foundation, 20260809130000_customer_statement_external_access, 20260809143000_customer_statement_delivery_referral, 20260809160000_accountant_client_invite_onboarding, 20260809170000_referral_accounting_source_types, 20260809180000_accounting_enum_completion
- Checksum mismatches: 20260619120000_backfill_purchase_receive_permission
- Approved checksum mismatches: none
- Stale checksum approvals: none
- Unknown successful migrations: none
- Duplicate successful migrations: none

## Blockers

- all_repository_migrations_successfully_applied
- applied_migration_checksums_match_repository

## Safety

- This gate performs a read-only query of `_prisma_migrations`.
- It does not print or retain the database URL or migration error logs.
- It compares successful history rows with the exact repository migration file checksums.
- A legacy mismatch is accepted only when an approval matches the migration name, exact database checksum, and an exact current repository checksum.
- It does not resolve, apply, roll back, or mutate a migration.

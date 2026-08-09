SELECT migration_name, checksum, started_at, finished_at, rolled_back_at, applied_steps_count
FROM "_prisma_migrations"
WHERE migration_name = '20260630090000_payment_reconciliation_foundation';

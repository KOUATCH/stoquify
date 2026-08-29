# Prisma Fresh Replay Certification

- Status: **READY_WITH_INTENTIONAL_RESIDUAL_DRIFT**
- Database: `stoquify_replay_migration_control_20260828_v2` (local dedicated replay database)
- Catalog/applied migrations: 80/80
- Residual drift statements: 226
- Unexpected structural drift: 0
- Drift SHA-256: `bc6bde503763d8c8d0063ca7c50731f89a56afc43a6717727d24add1dc6f6593`

## Migration History

- Missing: 0
- Unknown: 0
- Unfinished or rolled back: 0
- Checksum mismatches: 0

## Allowed Residual Drift

The gate permits only metadata-only index/foreign-key renames, stronger database-side foreign keys and timestamp defaults, and the explicitly retained legacy production evidence tables/type. It rejects missing tables, enums, columns, indexes, or any other structural change.

- retained_database_foreign_key: 12
- retained_database_timestamp_default: 7
- retained_legacy_evidence_table: 3
- retained_legacy_evidence_enum: 1
- metadata_foreign_key_rename: 54
- metadata_index_rename: 149

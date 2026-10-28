# Prisma Fresh Replay Certification

- Status: **READY_WITH_INTENTIONAL_RESIDUAL_DRIFT**
- Database: `stoquify_referral_baseline_rebuild_20260809` (local dedicated replay database)
- Catalog/applied migrations: 62/62
- Residual drift statements: 164
- Unexpected structural drift: 0
- Drift SHA-256: `89bf8e8ab54f587007ebce4d3260a8cf9e22164b29feb6b92eaa14566a0560e2`

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
- metadata_foreign_key_rename: 30
- metadata_index_rename: 111

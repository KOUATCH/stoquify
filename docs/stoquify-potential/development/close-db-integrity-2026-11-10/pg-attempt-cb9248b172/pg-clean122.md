# Prisma Fresh Replay Certification

- Status: **READY_WITH_INTENTIONAL_RESIDUAL_DRIFT**
- Database: `stoquify_replay_close_integrity_upgrade_20261110_cb9248b172` (local dedicated replay database)
- Catalog/applied migrations: 122/122
- Residual drift statements: 240
- Unexpected structural drift: 0
- Drift SHA-256: `c2d489d6bc2a4e577d9ecb5b885a8fa7824236c7b757588ef1107dd436f25121`

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
- metadata_foreign_key_rename: 64
- metadata_index_rename: 153

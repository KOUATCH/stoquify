# Local PostgreSQL Restore Rehearsal

Generated: 2026-08-29T08:15:38.600Z
Status: `READY`

## Scope

- Source: `db-6074d3e925d2` (local, populated)
- Restore database: `stoquify_restore_staging_primary_20260829_v5`
- Restore database retained for inspection: no
- Temporary dump retained: no
- Secrets retained or printed: no

## Verification

- Backup created: yes
- Backup bytes: 4712768
- Backup SHA-256 recorded: yes
- History ready: yes
- Applied migrations: 80/80
- Schema-diff fingerprint preserved: yes
- Auth/accounting table profile preserved: yes
- Source profile proves populated data: yes
- Prisma migration status ready: yes

## Safety

- The source database was queried and dumped read-only.
- The rehearsal created a new restore-only local database and did not overwrite an existing database.
- No migration, resolve, reset, drop, seed, or data mutation ran against the source.
- This is recovery and structural-integrity evidence, not a functional login or accounting certification.

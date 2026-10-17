# Local PostgreSQL Restore Rehearsal

Generated: 2026-09-30T20:58:49.084Z
Status: `READY`

## Scope

- Source: `db-85b3c42dd313` (local, populated)
- Restore database: `stoquify_restore_local_remediation_20260930_run01`
- Restore database retained for inspection: yes
- Temporary dump retained: no
- Secrets retained or printed: no

## Verification

- Backup created: yes
- Backup bytes: 2165735
- Backup SHA-256 recorded: yes
- History ready: yes
- Applied migrations: 87/87
- Schema-diff fingerprint preserved: yes
- Auth/accounting table profile preserved: yes
- Source profile proves populated data: yes
- Prisma migration status ready: yes

## Safety

- The source database was queried and dumped read-only.
- The rehearsal created a new restore-only local database and did not overwrite an existing database.
- No migration, resolve, reset, drop, seed, or data mutation ran against the source.
- This is recovery and structural-integrity evidence, not a functional login or accounting certification.

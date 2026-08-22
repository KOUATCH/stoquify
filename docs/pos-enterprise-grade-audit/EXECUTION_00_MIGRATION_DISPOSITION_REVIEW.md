# G0 Migration Disposition Review

Date: 2026-08-17  
Migration: `prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql`  
Decision: **PRODUCTION TARGET REJECTED PENDING EXTERNAL EVIDENCE**

## Executive conclusion

The migration file must remain immutable. It is already applied to the configured local PostgreSQL development database, which reports all 67 repository migrations applied. However, the production release gate correctly remains blocked because 13 destructive clauses have no human-authored exact-finding-hash approvals and the target-specific reconciliation evidence is absent.

Local success proves only that the local development history is coherent. It does not prove the state of a production or staging database, the safety of dropping authentication data, backup availability, restore viability, or authentication continuity.

## Evidence established

| Evidence | Result | Scope |
| --- | --- | --- |
| `npx prisma migrate status` | PASS; 67 migrations, local schema up to date | Configured local development database only |
| Migration safety gate | FAIL; 13 findings, 0 approvals | Repository release control |
| Migration checksum | `2fde92f4ad0cbb1a2a517b12e71c38997dc4956c9d57d70ff1ae0c636ff2f191` | Current repository migration |
| Existing reconciliation bundle | Incomplete | Backup/restore and human/target evidence absent |
| Secret exposure | None observed | Captured commands and reports |

## Destructive consequences requiring independent review

- Remove the legacy `auth_sessions` table and all rows, indexes, triggers and constraints.
- Remove ten authentication/provider token and identity fields from `accounts`.
- Remove two legacy session fields from `sessions`.
- Remove `emailVerified` from `users`.

The exact 13 finding hashes are retained in `EXECUTION_00_GATE_EVIDENCE.json` and the repository review packet. A migration-wide approval or rule-level wildcard is insufficient.

## Target-specific decision tree

### Verified empty target

Use `EMPTY_TARGET_EXECUTE` only when an accountable checker confirms the target is empty, the migration guard behaves as expected, the exact checksum is deployed, authentication smoke tests are prepared, and every exact finding is approved.

### Existing database with application data

Do not execute the bridge. Use `EXISTING_TARGET_RESOLVE_ONLY` only after:

1. Clone or restore the authoritative target into an isolated environment.
2. Profile every affected column/table and record one disposition for each finding.
3. Capture encrypted backup identity and prove restoration to a separate target.
4. Prove the target already has the compatible replacement schema and authentication behavior.
5. Rehearse the Prisma-supported resolve-only adoption on the clone.
6. Prove only `_prisma_migrations` changed and all application data/control totals remained stable.
7. Obtain independent maker-checker approval and a tested fix-forward/recovery plan.

### Target already records the migration as applied

Use `ALREADY_APPLIED_VERIFY` only when authoritative migration history and checksum match the repository, no failed/unfinished row exists, and authentication continuity is proven. The repository gate still needs exact-finding-hash review so future targets cannot execute the destructive file silently.

### Evidence unavailable or contradictory

Use `REJECT_TARGET`. This is the current production disposition.

## Missing evidence

- Named production/staging target and exact deployed Git/app/schema versions.
- Affected-data profile and all D-001 through D-013 dispositions.
- Backup provider, backup/snapshot identifier, encryption and retention evidence.
- Independent restore test with accepted RPO/RTO.
- Authentication/login/session continuity test results.
- Resolve-only clone rehearsal and before/after checksums/control totals.
- Named maker, checker, DBA/SRE and release authority.
- One manually authored registry record per exact finding hash.

## Safe next action

An accountable operator supplies the target reference and backup/restore evidence to the existing reconciliation bundle. A named checker then selects one target-specific path. Until that happens, keep deployment blocked and continue no further than read-only local verification and approval preparation.

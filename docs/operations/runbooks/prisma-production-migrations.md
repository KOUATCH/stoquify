# Prisma Production Migrations

This runbook governs automated Prisma migration deployment for Stoquify. The objective is to apply committed migrations before a production application build without allowing local builds, ordinary previews, stale approvals, or unreviewed destructive SQL to mutate a database.

## Execution matrix

| Environment | Default action | Database requirement |
| --- | --- | --- |
| Local or CI policy check | Verify immutable catalog, scan unmanifested migration delta, and skip deployment | None |
| Vercel Preview | Scan and skip deployment | None; previews must not share and migrate Production |
| Vercel Production | Scan and run `prisma migrate deploy` | Non-local PostgreSQL `DATABASE_URL` |
| Explicit staging | Deploy only with `AQSTOQFLOW_DEPLOY_MIGRATIONS=1` and `AQSTOQFLOW_DATABASE_TARGET=staging` | Non-local PostgreSQL `DATABASE_URL` |
| Explicit preview | Deploy only with `AQSTOQFLOW_DEPLOY_MIGRATIONS=1` and `AQSTOQFLOW_DATABASE_TARGET=preview-isolated` | Isolated non-production PostgreSQL `DATABASE_URL` |

The gate does not read `.env`. Release credentials must be injected through the deployment provider or controlled CI environment.

## Release sequence

1. Add `prisma/schema.prisma` and every new `prisma/migrations/*/migration.sql` without editing any manifested migration.
2. Run `npm run prisma:migration:safety:gate`. Unmanifested migrations are the active static risk scope; destructive findings remain blocked.
3. Run `npm run prisma:migration:risk:review` and send the generated full-catalog packet to the accountable human reviewer when a new destructive finding exists.
4. The reviewer manually authors one registry entry per reviewed finding in `prisma/migration-risk-approvals.json`; generators and templates never write approvals.
5. After the migration and any approval have passed review, run `npm run prisma:migration:catalog:write` and include the deterministic manifest update in the same reviewed change.
6. Run `npm run prisma:migration:catalog:gate`, `npm run prisma:migration:safety:gate`, and `npm run policy:gates` before merging.
7. For a full empty-database rehearsal, run `node scripts/prisma-fresh-replay-runner.js --mode create --database stoquify_replay_<unique_local_name> --out what-next/migrations/<certificate>.md --json-out what-next/migrations/<certificate>.json`. The runner refuses non-local and non-replay database names, deploys twice, and performs schema-drift certification.
8. For a populated local restore rehearsal, run `node scripts/prisma-local-restore-rehearsal.js --database stoquify_restore_<unique_local_name> --out what-next/migrations/<restore-report>.md --json-out what-next/migrations/<restore-report>.json`. It reads and dumps the source without mutation, restores only to a new local restore-only database, verifies history/schema/auth-accounting table counts, removes the temporary dump, and deletes the verified clone by default. Use `--retain-database` only when an accountable operator explicitly needs the clone for further inspection.
9. Confirm the deployment environment owns a non-local PostgreSQL `DATABASE_URL`, target attestation where required, and dedicated release secrets.
10. The safe deploy preflight queries `_prisma_migrations` read-only, proves applied-history integrity, calculates the exact pending set, and scans destructive risk only in that set.
11. If the baseline bridge is pending on a database with completed migration history, automation stops with `baseline_bridge_manual_adoption_required`. Follow the controlled existing-database path below.
12. The build runs the release-secret preflight, safe migration deploy, direct post-deploy history health, lint, and the application build. Any failed check stops publication.
13. Archive the deployment readiness report, catalog result, pre/post history evidence, exact pending set, referenced approvals, and post-deploy smoke evidence.

Prisma documents `migrate deploy` as the production/staging command and recommends running it in CI/CD rather than by temporarily placing a production URL on a developer machine. See [Prisma migrate deploy](https://www.prisma.io/docs/cli/migrate/deploy) and [deploying database changes](https://docs.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate).

## Control-plane boundaries

The migration controls intentionally separate two decisions:

- **Full-history integrity** covers the entire repository and target history. It blocks catalog mutation, invalid manifest state, checksum divergence, unfinished rows, unknown successful migrations, duplicate successes, and invalid/stale/revoked approvals.
- **Target-pending risk** covers only migrations that the verified target would execute. Destructive SQL in that exact set requires an approval; historical destructive SQL remains visible in full-catalog review evidence but does not block a target that already applied it with an accepted checksum.

The local safety command does not authorize deployment. It verifies the immutable manifest and scans only unmanifested catalog changes. Production and opted-in staging/preview execution additionally require the target-history phase.

## Migration hash contract

`prisma/migration-catalog-manifest.json` uses hash contract `stoquify-migration-sql-sha256-v1`:

Its machine-readable contract is `prisma/migration-catalog-manifest.schema.json`.

- canonical LF SHA-256 is the approval identity;
- raw-byte SHA-256 is the transport-integrity identity;
- canonical CRLF SHA-256 is retained for cross-checkout history compatibility; and
- every manifest entry includes the full migration name, path, byte length, and all three hashes.

The exact existing `20260818120000` timestamp collision is grandfathered in `prisma/migration-catalog-exceptions.json`. Do not rename those applied migrations. Every new duplicate timestamp prefix fails the catalog gate.

## Destructive SQL approvals

The gate blocks DROP, TRUNCATE, DELETE, column-type changes, and table/column rename patterns unless every finding has its own valid approval in `prisma/migration-risk-approvals.json`. Each decision is bound to the canonical migration hash and the finding hash derived from the exact clause and stated consequence.

```json
{
  "migration": "prisma/migrations/<timestamp>_<name>/migration.sql",
  "migrationSha256": "<64 lowercase hex characters from the review packet>",
  "findingSha256": "<64 lowercase hex characters from the review packet>",
  "rule": "drop_column",
  "humanAuthored": true,
  "consequenceAcknowledged": true,
  "approvedBy": "<accountable reviewer>",
  "reviewerRole": "<accountable role>",
  "reason": "<target-specific compatibility, backup, recovery, and fix-forward rationale>",
  "approvedAt": "YYYY-MM-DDTHH:mm:ssZ",
  "expiresAt": null,
  "revocation": null
}
```

`humanAuthored: true` and `consequenceAcknowledged: true` are reviewer attestations; placeholders and legacy migration-wide rule arrays are rejected. Changing the SQL after approval invalidates the approval. An optional `expiresAt` makes time-bounded approval explicit.

To revoke without erasing the audit trail, the same human-controlled record receives a `revocation` object with `humanAuthored: true`, `revokedBy`, `revokedAt`, and `reason`. Revoked entries never satisfy the gate.

Do not approve a destructive migration until data backfill, lock impact, compatibility window, backup/restore evidence, and fix-forward steps have been reviewed. Approval validity is bound to immutable SQL and its evidence decision. Mutable application/schema/source-commit snapshots belong in a release manifest; unrelated later source changes must not silently rewrite historical approval truth.

## Baseline bridge paths

`20260611130000_accounting_auth_baseline_bridge` is baseline-only.

### Existing compatible database

If the baseline bridge is pending and any repository migration is already completed on the target, ordinary deployment is blocked. Do not bypass the check and do not automate `prisma migrate resolve`.

Required controlled action:

1. classify the redacted target and prove post-baseline schema/data compatibility;
2. profile every destructive source field/table;
3. capture backup/PITR evidence and complete an isolated restore rehearsal;
4. rehearse resolve-only metadata adoption on a restored clone;
5. prove application table counts/checksums and auth/accounting behavior are unchanged;
6. obtain named maker and independent checker approval; and
7. execute `prisma migrate resolve --applied` manually in the controlled window, then rerun history and schema verification.

### Genuinely empty database

An empty target has zero completed migration rows. The baseline can be in the pending set, but its 13 destructive findings still require exact-hash approval backed by a current full-chain replay, zero-row boundary proof, failure injection, restore rehearsal, and auth/accounting smoke evidence.

If a target matches neither path, stop and create additive expand/backfill/verify/contract migrations.

## Failure handling

- If the safety gate fails, do not bypass it. Correct the migration or add a reviewed exact-hash approval.
- If `prisma migrate deploy` fails, Vercel must not publish the new application build. Inspect the failed migration and database logs without copying credentials into tickets or reports.
- Prisma does not generate down migrations. Prefer a reviewed fix-forward migration. Use `prisma migrate resolve` only after the database state and recovery decision are independently verified.
- A schema migration may be backward compatible while the application rolls forward. Destructive cleanup should normally be separated into a later release after all old code is gone.

## Verification commands

```powershell
npm run prisma:migration:safety:gate
npm run prisma:migration:catalog:gate
npm run prisma:migration:risk:review
npm run prisma:migration:release:preflight
npm run policy:gates
```

The release preflight intentionally fails outside an environment that securely injects a non-local production `DATABASE_URL`. Never make it pass by copying production credentials into a local `.env` file.

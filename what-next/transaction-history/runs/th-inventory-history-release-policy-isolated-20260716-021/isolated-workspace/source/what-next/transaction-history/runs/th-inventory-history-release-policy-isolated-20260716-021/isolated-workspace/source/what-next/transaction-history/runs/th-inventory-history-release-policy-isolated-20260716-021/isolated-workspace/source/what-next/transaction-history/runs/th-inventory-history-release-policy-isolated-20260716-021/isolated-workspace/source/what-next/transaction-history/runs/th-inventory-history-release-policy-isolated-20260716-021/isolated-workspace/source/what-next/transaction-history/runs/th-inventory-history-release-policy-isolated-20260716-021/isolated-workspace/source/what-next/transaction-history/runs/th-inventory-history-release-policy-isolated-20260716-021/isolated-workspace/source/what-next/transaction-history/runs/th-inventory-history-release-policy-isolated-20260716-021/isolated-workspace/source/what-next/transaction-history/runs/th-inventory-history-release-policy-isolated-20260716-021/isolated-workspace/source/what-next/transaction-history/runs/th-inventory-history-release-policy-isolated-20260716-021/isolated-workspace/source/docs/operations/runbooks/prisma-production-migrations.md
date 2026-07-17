# Prisma Production Migrations

This runbook governs automated Prisma migration deployment for Stoquify. The objective is to apply committed migrations before a production application build without allowing local builds, ordinary previews, stale approvals, or unreviewed destructive SQL to mutate a database.

## Execution matrix

| Environment | Default action | Database requirement |
| --- | --- | --- |
| Local or CI policy check | Scan and skip deployment | None |
| Vercel Preview | Scan and skip deployment | None; previews must not share and migrate Production |
| Vercel Production | Scan and run `prisma migrate deploy` | Non-local PostgreSQL `DATABASE_URL` |
| Explicit staging | Deploy only with `AQSTOQFLOW_DEPLOY_MIGRATIONS=1` and `AQSTOQFLOW_DATABASE_TARGET=staging` | Non-local PostgreSQL `DATABASE_URL` |
| Explicit preview | Deploy only with `AQSTOQFLOW_DEPLOY_MIGRATIONS=1` and `AQSTOQFLOW_DATABASE_TARGET=preview-isolated` | Isolated non-production PostgreSQL `DATABASE_URL` |

The gate does not read `.env`. Release credentials must be injected through the deployment provider or controlled CI environment.

## Release sequence

1. Commit `prisma/schema.prisma`, every new `prisma/migrations/*/migration.sql`, and any required exact-hash risk approval together.
2. Run `npm run prisma:migration:safety:gate`. The report must show all checks ready and zero unapproved risk findings.
3. Run `npm run policy:gates` and complete review before merging.
4. Confirm Vercel Production owns a non-local PostgreSQL `DATABASE_URL` and the dedicated release secrets.
5. Merge the approved commit. Vercel invokes `npm run build`.
6. The build runs the release-secret preflight, then `prisma:migrate:deploy:safe`, then lint and the application build. A failed preflight or migration stops the deployment.
7. Archive `what-next/prisma-migration-deployment-readiness.md` and its JSON companion with the release evidence.

Prisma documents `migrate deploy` as the production/staging command and recommends running it in CI/CD rather than by temporarily placing a production URL on a developer machine. See [Prisma migrate deploy](https://www.prisma.io/docs/cli/migrate/deploy) and [deploying database changes](https://docs.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate).

## Destructive SQL approvals

The gate blocks DROP, TRUNCATE, DELETE, column-type changes, and table/column rename patterns unless an approval in `prisma/migration-risk-approvals.json` matches the exact migration path, SHA-256 file hash, and risk rule.

```json
{
  "migration": "prisma/migrations/<timestamp>_<name>/migration.sql",
  "sha256": "<64 lowercase hex characters>",
  "rules": ["drop_column"],
  "approvedBy": "<accountable reviewer>",
  "reason": "<backfill, compatibility, backup, and rollback evidence>",
  "approvedAt": "YYYY-MM-DD"
}
```

Changing the SQL after approval invalidates the approval. Do not approve a destructive migration until data backfill, lock impact, compatibility window, backup/restore evidence, and fix-forward steps have been reviewed.

## Failure handling

- If the safety gate fails, do not bypass it. Correct the migration or add a reviewed exact-hash approval.
- If `prisma migrate deploy` fails, Vercel must not publish the new application build. Inspect the failed migration and database logs without copying credentials into tickets or reports.
- Prisma does not generate down migrations. Prefer a reviewed fix-forward migration. Use `prisma migrate resolve` only after the database state and recovery decision are independently verified.
- A schema migration may be backward compatible while the application rolls forward. Destructive cleanup should normally be separated into a later release after all old code is gone.

## Verification commands

```powershell
npm run prisma:migration:safety:gate
npm run prisma:migration:release:preflight
npm run policy:gates
```

The release preflight intentionally fails outside an environment that securely injects a non-local production `DATABASE_URL`. Never make it pass by copying production credentials into a local `.env` file.

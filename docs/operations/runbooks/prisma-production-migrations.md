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

1. Commit `prisma/schema.prisma` and every new `prisma/migrations/*/migration.sql`.
2. Run `npm run prisma:migration:risk:review` and send the generated packet to the accountable human reviewer when destructive findings exist.
3. The reviewer manually authors one registry entry per reviewed finding in `prisma/migration-risk-approvals.json`; generators and templates never write approvals.
4. Run `npm run prisma:migration:safety:gate`. The report must show all checks ready and zero unapproved, stale, expired, or revoked risk findings.
5. Run `npm run policy:gates` and complete review before merging.
6. Confirm Vercel Production owns a non-local PostgreSQL `DATABASE_URL` and the dedicated release secrets.
7. Merge the approved commit. Vercel invokes `npm run build`.
8. The build runs the release-secret preflight, then `prisma:migrate:deploy:safe`, then lint and the application build. A failed preflight or migration stops the deployment.
9. Archive `what-next/prisma-migration-deployment-readiness.md`, its JSON companion, and the exact review packet with the release evidence.

Prisma documents `migrate deploy` as the production/staging command and recommends running it in CI/CD rather than by temporarily placing a production URL on a developer machine. See [Prisma migrate deploy](https://www.prisma.io/docs/cli/migrate/deploy) and [deploying database changes](https://docs.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate).

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

Do not approve a destructive migration until data backfill, lock impact, compatibility window, backup/restore evidence, and fix-forward steps have been reviewed.

## Failure handling

- If the safety gate fails, do not bypass it. Correct the migration or add a reviewed exact-hash approval.
- If `prisma migrate deploy` fails, Vercel must not publish the new application build. Inspect the failed migration and database logs without copying credentials into tickets or reports.
- Prisma does not generate down migrations. Prefer a reviewed fix-forward migration. Use `prisma migrate resolve` only after the database state and recovery decision are independently verified.
- A schema migration may be backward compatible while the application rolls forward. Destructive cleanup should normally be separated into a later release after all old code is gone.

## Verification commands

```powershell
npm run prisma:migration:safety:gate
npm run prisma:migration:risk:review
npm run prisma:migration:release:preflight
npm run policy:gates
```

The release preflight intentionally fails outside an environment that securely injects a non-local production `DATABASE_URL`. Never make it pass by copying production credentials into a local `.env` file.

# Payroll Immutability Migration Deploy Failure Reproduction

Date: 2026-08-12

Target: `localhost/stockflow_immutability_nonempty_test_20260812`

Secret database URL values printed: no.

## Reproduction Sequence

1. Create a new, dedicated local PostgreSQL database.
2. Run `prisma db push --skip-generate`, which creates the current schema without Prisma migration history.
3. Run `prisma migrate deploy` against that now non-empty schema.

The schema push completed successfully. The subsequent migration deploy failed with exit code `1` and Prisma error `P3005`.

## Full Redacted Prisma Migrate Deploy Standard Output

```text
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "stockflow_immutability_nonempty_test_20260812", schema "public" at "localhost:5432"

62 migrations found in prisma/migrations
```

## Full Redacted Prisma Migrate Deploy Standard Error

```text
Loaded Prisma config from prisma.config.ts.

Prisma config detected, skipping environment variable loading.
Error: P3005

The database schema is not empty. Read more about how to baseline an existing production database: https://pris.ly/d/migrate-baseline
```

## Diagnosis

No migration SQL failed. A separate empty-database control run applied all 62 migrations successfully. The failure was caused only by preparing the test database with `prisma db push` before asking Prisma Migrate to deploy into it. That created a non-empty, unbaselined schema, which `migrate deploy` correctly rejected.

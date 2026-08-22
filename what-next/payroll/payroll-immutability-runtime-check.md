# Payroll Immutability Runtime Check

Generated: 2026-08-22T08:00:48.406Z
Mode: `fail`
Status: `blocked`

## Safety

- Database: `stockflow_immutability_test`
- Host: `localhost`
- Secret URL values are not printed.

## Summary

- Required triggers present: 0/9
- Forbidden mutation checks blocked: 0/0
- Allowed lifecycle checks passed: 0/0
- Blockers: 1

## Trigger Catalog


## Forbidden Mutation Checks


## Allowed Lifecycle Checks


## Blockers

- runtime_query: P6001: InvalidDatasourceError: Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`

## Safety Notes

- Requires a dedicated non-production DB URL.
- Applies Prisma migrations to the selected DB unless `--skip-migrate` is supplied.
- Creates synthetic payroll rows inside a transaction that is deliberately rolled back.

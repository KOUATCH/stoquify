# Corrupt-upgrade diagnostic correction

The immutable `pg-attempt-cb9248b172/pg-RESULT.json` records an unsuccessful overall qualification. Its fresh 123-migration replay, all twenty real PostgreSQL cases, populated 122-to-123 preservation checks and older-client compatibility checks passed. The final corrupt-data migration was rejected, with the expected unfinished migration row and no partial schema or fixture changes, but the qualification stopped when it required that row's `logs` field to be a string. The field was null.

The recorded Prisma subprocess exited with code 1 and reported an aborted transaction. It did not retain the original PostgreSQL exception or its count-only detail. This is an observed limitation of the migration-tool diagnostic in this explicit-transaction case; that output alone does not establish the specific preflight rejection reason. No product migration, schema, existing receipt or failed target was changed to hide this result.

The reviewed runner was corrected to collect two distinct forms of evidence on a newly created corrupt test database:

1. Submit the exact catalog-bound migration SQL through the native PostgreSQL driver. Require SQLSTATE `23514`, the exact preflight message and all fourteen detail counts to match an independent census. Roll back, then verify unchanged fixture rows, retained bytes, schema fingerprint, SQL inventory and all 122 migration-history rows.
2. Run the actual Prisma migration deployment. Require a nonzero exit, unchanged fixture rows and schema, the exact original 122 history rows, and one unfinished migration record with the new SQL checksum. Preserve that record without resolving or deleting it. Do not claim Prisma retained the original exception.

The first direct submission is a controlled negative test against known corrupt synthetic fixtures. It is not an operational instruction to submit a migration to an arbitrary database for diagnosis: on clean data, that SQL would commit its DDL. Production diagnostics and any repair require a separately reviewed target and plan.

The runner preimage is retained as `pg-attempt-cb9248b172/pg-integrity-qualification.before-direct-diagnostic.cjs`, SHA256 `37dc94db5e3c08a17ad9187bca15568eabced291928282abae5d73344f3495bf`. The corrected runner SHA256 is `da3d109cd7f73ce953137e46e9fb383b030802d33277e33905355a42480c918c`.

The separate first-attempt test-fixture issue is documented in [PERIOD_FIXTURE_CORRECTION.md](PERIOD_FIXTURE_CORRECTION.md). The runtime client isolation correction is documented in [UNIT_ENV_ISOLATION_SUPPLEMENT.json](UNIT_ENV_ISOLATION_SUPPLEMENT.json). Earlier outcomes remain preserved and are not added to the final admitted test count.

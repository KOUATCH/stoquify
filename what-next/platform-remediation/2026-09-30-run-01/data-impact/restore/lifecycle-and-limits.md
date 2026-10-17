# Retained local restore and proof lifecycle

Created target: `stoquify_restore_local_remediation_20260930_run01`.

The guarded restore orchestrator created this new database during this run after verifying that it did not already exist. It was derived from the same configured loopback source fingerprint used by the read-only R09 scan. No source migration, seed, reset, resolve, data update or database drop was run. The source dump was connection-enforced read-only. The temporary custom-format dump was deleted by the existing guarded cleanup routine.

The restore completed in **290.865 seconds**, including a **5.321-second dump** and **76.444-second restore**. It preserved the **87/87 migration history**, Prisma migration-status readiness, source/restored schema-diff fingerprints and nine auth/accounting table count profiles. Matching schema-diff fingerprints do not establish absence of schema drift; matching row counts do not prove every row's business correctness. This local wall-clock rehearsal is not a deployed RTO/RPO or PITR guarantee.

The retained database is available for explicitly scoped local testing. It is not an application release target. Further application smoke tests must continue to use the dedicated database URL and prevent workers or provider integrations from delivering copied or synthetic outbox messages externally.

## Payroll concurrency proof

The reviewed `scripts/payroll-trust-spine-postgres-certification.js` was executed through its exported runner only after a connection verified the exact expected `current_database()`. `PAYROLL_IMMUTABILITY_DATABASE_URL` was set explicitly for the runner and restored afterward; the default/test database fallback was not used. No prepare/reset wrapper ran.

All three SQL checks passed:

- Concurrent approval produced one atomic winner and one serialization loser (`40001`), retaining exactly one transition, approval event, outbox entry and approval audit.
- Duplicate evidence was rejected (`23505`) without changing the committed result.
- Injected failure after compare-and-set rolled back the run change and all approval artifacts, leaving the tested run REVIEWED at version 2.

The certificate deliberately leaves its setup and successful proof evidence on the disposable target. Aggregate counts changed from 0 to **2 synthetic organizations, 2 synthetic periods, 2 synthetic runs and 1 synthetic transition**. Nonfixture organization count remained **3**, nonfixture payroll-run count **24**, and journal-entry count **141**. These count checks and inspected fixture-targeted SQL support preservation; they are not a byte-for-byte audit of every restored row.

This proof covers database concurrency and rollback, not the full protected application action, payroll calculation, country qualification, statutory filing or payment finality. The synthetic run's country capability remains expert-review-required.

## Cleanup state

The database remains **intentionally retained** for follow-on inspection/smoke tests. No cleanup or certification script has dropped it. Do not rerun the restore with the same target name: its no-overwrite guard should reject that. When testing has finished, cleanup must target only this exact database after confirming that no task or process still needs it. The source must never be used as the cleanup target. No database URL, password, cookie, backup contents or real record identifiers are included in these reports.

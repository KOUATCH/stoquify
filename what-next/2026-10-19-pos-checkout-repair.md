# POS checkout database repair — 19 October 2026

## Cause and result

The active local application used a newer Prisma schema than its database. PostgreSQL logged `column accounting_periods.controlVersion does not exist` for checkout-period queries. The database had 87 applied migrations and 12 pending migrations, including `20261017090000_period_close_control` and its close-source dependencies.

Target: `localhost:5432/stoquify_replay_next_20260830`. This was a local database repair; application source and unrelated working-tree changes were preserved.

After backing up the database, the 12 pending migrations were rehearsed on `stoquify_local_pos_repair_20261019`, then applied successfully to the active local database. Final read-only inspection confirmed 99 applied migrations, no pending migrations, and the expected close-source and period-control objects. No active close assessments or certified exports existed at the pre-application impact check.

## Evidence

- Source inspection: checkout lifecycle, sale commit, accounting-period reads, migration SQL, command registry and migration workflow.
- Workflow check: `npm run agent:workflow:check` passed.
- Real PostgreSQL rehearsal: restored the populated backup to the isolated database, then applied all pending migrations successfully.
- Real PostgreSQL checkout test: `node .codex-tmp/pos-schema-repair-20261019/run-test.cjs` — 1 test passed. The copied failing request completed for 67,644.56 XAF; retrying it preserved a single sale commit, payment and shift transaction.
- Mocked unit tests: not run; no application code changed.
- Browser inspection: observed the retained attempt and recovery block before repair. Post-repair browser verification could not complete because the browser connection timed out. No live checkout was submitted by this repair.
- Active database after repair: original order `POS-TERM-CERT-001-20261019-RVAZ3` remains `DRAFT` / `PENDING`, with no commit result. The retained cash request is 70,000 XAF. Original shift and drawer balances remained 145,200 XAF.

## Retained artifacts and recovery

- Backup: `.codex-tmp/pos-schema-repair-20261019/before.dump` (private local database contents; do not commit).
- Rehearsal record: `.codex-tmp/pos-schema-repair-20261019/rehearsal.json`.
- Application record: `.codex-tmp/pos-schema-repair-20261019/applied.json`.
- Isolated regression: `.codex-tmp/pos-schema-repair-20261019/rehearsal.test.ts`.
- Read-only diagnostic: `.codex-tmp/pos-checkout-diagnose.cjs`.

The backup was successfully restored for rehearsal. Any later rollback should restore to a separate database and account for writes made after this snapshot; do not overwrite the active database or remove migration-history records as a shortcut.

Return to the retained POS attempt, check the previous result, and use the original-request retry after reviewing the displayed payment. Keep the retained request so retries preserve its idempotency identity.

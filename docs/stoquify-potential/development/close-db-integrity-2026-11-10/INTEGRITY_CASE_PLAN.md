# Database scope-integrity qualification cases

Prepared for root review. The case author has not executed a database, application, migration or Jest test. A syntax-only TypeScript transpilation reports zero diagnostics; it is not database evidence.

## Fresh migrated target

`scope-integrity.postgres.test.ts` requires explicitly injected `INTEGRITY_CLOSE_POSTGRES_URL` and `INTEGRITY_CLOSE_DATABASE_NAME`, exactly localhost:58033, public schema, and `stoquify_replay_close_monthly_20261110_<10hex>`. The root-owned runner creates a new absent database and freezes both case and helper files. Twelve explicit cases combine with the previous eight earned monthly cases for twenty cases; no skipped/todo contract is intended.

The case uses a native PostgreSQL client so negative checks assert actual SQLSTATE and constraint names, rather than a Prisma wrapper's outer error code. It seeds only synthetic OPEN periods, DRAFT close runs, ordinary findings/reviews/comments and an explicitly uncertified DRAFT retained-document custody sentinel. It does not manufacture READY/T4/SIGNED/CERTIFIED financial states.

Exact twelve phase names:

1. `metadata-contract-preserved`: fourteen validated scoped FKs, six unique indexes and seven enabled BEFORE UPDATE row triggers have the approved columns/actions/function. All twenty-six original core foreign keys retain their original CASCADE/SET NULL actions.
2. `nullable-and-aligned-links`: nullable optional links and aligned multiple comment links remain accepted.
3. `cross-scope-inserts-rejected`: all fourteen scoped parent edges reject an existing but foreign parent with SQLSTATE23503 and the exact expected constraint name; fixture snapshots remain unchanged.
4. `optional-link-updates-rejected`: the six nullable associations reject a foreign existing target, preserving all facts.
5. `core-identities-immutable`: each core table rejects id, organization, period, run and otherwise coherent whole-cohort moves with SQLSTATE23514. The old canonical-export guard is not relied upon here: the tested export has null retained bytes.
6. `parent-scope-drift-rejected`: fiscal-year/period/run parent changes cannot invalidate referenced tenant cohorts.
7. `ordinary-workflow-updates-allowed`: status, historical owner strings, resolution/comment fields and stale metadata remain writable. A legitimate same-organization fiscal-year edit to an OPEN period is allowed.
8. `checklist-and-finding-delete-null-links`: original optional SET NULL actions clear only nullable IDs, preserving required scope and unrelated links.
9. `evidence-and-review-delete-null-links`: the other optional parent deletions preserve the same contract.
10. `nonretained-cascades-preserved`: run, period and organization cascades remain supported for unretained draft graphs, with foreign cohorts untouched.
11. `retained-custody-preserved`: canonical DRAFT bytes/receipt facts cannot change or disappear through direct or parent deletion. Stale metadata remains writable; historical null receipts cannot be reconstructed by update.
12. `concurrent-parent-delete-reference-rejected`: an actual concurrent finding INSERT waits on the exact deleting PostgreSQL PID, observed through `pg_blocking_pids`. The parent deletion commits first, then the new reference fails with SQLSTATE23503. No timer selects the winner; no orphan child persists, and existing optional references clear safely.

Full ordered row snapshots remain in process memory or the root's private evidence context. The suite's private JSON contains only fixed phase labels, booleans and counts. Its top flags are `syntheticScopeInputs:true`, `syntheticDraftCustodySentinel:true`, `financialTerminalStatesSeeded:false`, `noProviderOrBrowserCalls:true`. The parent publishes a stricter phase/status projection. Original provider authenticity, statutory approval, hosted operations and browser behavior are outside this test.

## Populated predecessor upgrade protocol

`scope-fixtures.cjs` is inert on import: no environment lookup, connection, application import, migration or test execution. The parent supplies its exact native PostgreSQL client.

- `makeFixture(sql,{dirty:false})` inserts two synthetic organizations, three internally coherent OPEN/DRAFT graphs (two periods in one organization and one foreign cohort), a legacy null-retention receipt and an uncertified canonical DRAFT custody sentinel. It returns private identifiers and original retained bytes.
- `snapshotFixture(sql,fixture)` returns deterministic ordered JSON rows for organizations, fiscal years, periods, all seven core close tables, and their source revisions/change provenance. The parent captures this privately before migration and compares exact bytes afterward; no source row is repaired or rewritten by this helper.
- `countScopeViolations(sql)` independently checks the fourteen approved parent tuples and returns category/count only. It does not parse migration SQL.
- `makeFixture(sql,{dirty:true})` additionally inserts fourteen separate inconsistent rows permitted by predecessor122: one for each scoped edge, with valid existing single-ID parents. Every violation category must be positive before testing upgrade rejection. The original clean graphs and retained bytes remain present.

The parent owns clean122→123 deployment twice and current schema certification; exact graph/retained-byte preservation; rejected dirty upgrade; before/after DDL and first122-history comparison; and cleanup. A failed Prisma deployment may append an unfinished migration row while its SQL transaction rolls back. Preserve that failed target and use a different absent target for any later qualification.

All supplementary metadata constants are independent expected contracts derived from the approved design. No application database is inferred, reset or dropped. Existing data-loss, retention, module, authority and migration gates remain intact.

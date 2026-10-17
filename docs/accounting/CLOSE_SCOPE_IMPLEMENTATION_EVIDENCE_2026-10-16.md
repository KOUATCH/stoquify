# Close scope implementation evidence

Scope: phases 0 and 1 only. Contract: [CLOSE_CONTROL_CONTRACT.md](CLOSE_CONTROL_CONTRACT.md).

## Changes

- Added a versioned tenant/period/date/cutoff/currency scope and hash.
- Added a read-only payment close collector; the operational dashboard and its notification behavior remain unchanged.
- Resolved explicit portal periods before financial queries; rejected foreign periods and contradictory dates.
- Separated economic dates from record arrival dates in statement, payroll, purchasing, fiscal and event evidence. Supplied the same cutoff to ledger and inventory collection.
- Retained unresolved earlier-period and unassigned payment obligations; labelled organization controls in close provenance and data-trust findings.
- Persisted scope in CloseRun metadata and verified its inclusion in the existing canonical close-pack hash.
- Preserved historical collection-receipt verification while admitting the new collector source.
- Added bounded unit and isolated PostgreSQL test configurations and a guarded fresh-target runner.

## Executed verification

| Evidence class | Command / result | Limits |
|---|---|---|
| Source/workflow | `npm run agent:workflow:check`; final `node scripts/verify-agent-workflow-contract.js`: passed | 196 package scripts remain outside the existing reviewed manifest |
| Unit/mocked | `node node_modules/jest/bin/jest.js --config jest.close-scope.config.cjs --runInBand`: **10 suites, 320 tests passed** | Persistence mocked; no application dotenv or Next config |
| TypeScript | `node node_modules/typescript/bin/tsc --project tsconfig.close-scope.json --pretty false`: **passed** | Selected source roots and their imported dependencies; no emit/incremental output; not a whole-repository check |
| Real PostgreSQL | `node scripts/run-close-scope-postgres.cjs` with explicit isolated target: **1 suite, 5 tests passed** | Existing migrations + synthetic fixtures only; no application database reads/writes |
| Diff formatting | `git diff --check` on touched tracked service/test files: **passed** | Git reported existing CRLF normalization notices; no whitespace errors |
| Browser/rendered | Not run | No UI changes or browser certification claimed |
| Build/deployment | Not run | No application build, seed or schema promotion command executed |

The final PostgreSQL target was `stoquify_local_close_scope_20261016_6bde09d0` on local PostgreSQL. The runner verified `current_database()` before tests. The earlier payment-only rehearsal passed 3 tests on `stoquify_local_close_scope_20261016_ff6fe175`. Both were newly created, not reset or copied from application data, and are retained for inspection. No connection credentials are stored here.

The first sandboxed connection attempt failed with local-socket `EACCES` before database creation. The reviewed runner then ran with authorized local socket access. The final five database tests exercised inclusive boundaries and one-millisecond exclusions, late import/cutoff handling, multiple currencies retained as separate records, foreign-period rejection, unchanged organization-wide summary behavior, more than 12 scoped runs, the real accountant-portal queries, unassigned and prior-period suspense, archived-account evidence, and post-cutoff signature rejection.

## Preservation and remaining work

The starting checkout already had 483 tracked modified files and extensive untracked work. Changes were applied surgically; no checkout/reset, staging, commit or cleanup of unrelated work was performed. Existing close ordering, invalidation and certification service edits were retained. In particular, the pre-existing close-pack service diff and period-service diff were unchanged by this implementation.

No application migration or business-data change was made. The runner creates databases only for tests. Reverting this slice requires reverting its own hunks/new files; do not revert entire shared service files to HEAD because that would discard prior edits.

Phase 2 account-by-account coverage/no-activity proof and phase 3 concurrency/freshness assurance remain outstanding, as do later accounting-policy and reconciliation roadmap phases. A recording cutoff does not reconstruct historical mutable row state. These results establish the implemented scope behavior, not full close readiness or statutory certification.

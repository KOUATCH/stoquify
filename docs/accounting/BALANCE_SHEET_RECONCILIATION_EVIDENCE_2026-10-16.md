# Phase 6 execution evidence — 2026-10-16

Scope: account/currency balance-sheet supporting schedules and close readiness. Existing working-tree edits, including Phases 0–5, were preserved. No staging, commit, application database migration, reset, seed or deployment was performed. Observed HEAD: `f41145e431150ec5161aabbfdfe70d392ecbfed1`. Whole-file diffs contain earlier work and are not Phase 6 change counts.

## Source inspection and command review

Read current repository workflow, qualified skill routing, command registry, test lanes, command definitions, Prisma configuration and disposable-target helper/configuration. The dated graph action report (2026-08-09) remains architectural context; current services/schema govern behavior. Reused the existing protected-action boundary, exact Decimal arithmetic, canonical hashing, independently approved bank-evidence lifecycle pattern and Phase 3 source revision guard.

`npm run agent:workflow:check`: **passed**; 196 scripts remain outside the reviewed manifest. The runner validates references/fingerprints without executing application commands. Dedicated unit, TypeScript, generator and PostgreSQL commands were separately inspected for side effects and targets. No registry fingerprints were refreshed.

The implementation uses independently reviewed supporting schedules. It does not claim automated extraction or authenticity verification of each underlying AR/AP, inventory, asset, tax or payroll source. The [behavior contract](BALANCE_SHEET_RECONCILIATION.md) states the account population, currency/sign conventions, source-change policy and rollout limits.

## Owned implementation

- Four new `services/accounting/balance-sheet-*.ts` files: strict schedule contract/arithmetic, actual ledger source collection, retained evidence lifecycle and required account/currency coverage.
- `actions/accounting/balance-sheet-evidence.actions.ts`: server-owned tenant/actor, fresh authentication, existing close permissions and module enforcement.
- Additive Prisma model/composite relationships and `20261016230000_balance_sheet_evidence` migration: retention, independent approval, tenant constraints, source invalidation and contract-upgrade invalidation of existing close runs.
- Narrow portal/close integration: ledger blockers, dedicated checklist, explicit findings, receipts, retained metadata, source inventory and hashed trust-pack contents.
- New pure/action and PostgreSQL suites; narrow additions to existing portal/close tests, bounded unit configuration and focused TypeScript includes.
- Behavior contract, this execution report and shared close-contract reference.

## Mocked and pure verification

`node node_modules/jest/bin/jest.js --config jest.close-scope.config.cjs --runInBand --noStackTrace`: **19 suites / 427 tests passed**.

Includes the existing 406 tests plus 21 added cases: exact opening/gross-flow/closing comparisons, per-item roll-forwards, offsetting errors, negative natural balances, explicit zero-activity shape, invalid amounts, duplicate references, document/authority binding, protected actions, portal certification denial and independent close findings/receipt/metadata persistence. A balanced trial balance cannot conceal missing balance-sheet support.

This lane mocks persistence/authentication boundaries; it does not establish actual lock behavior or live session enforcement. `node scripts/generate-close-test-client.cjs` generated only the ignored test client; application client files/processes were not regenerated or stopped.

`node node_modules/typescript/bin/tsc -p tsconfig.close-scope.json --pretty false`: **passed**. Scoped `git diff --check` passed with Windows line-ending notices. No full application build was run.

## Real PostgreSQL verification

Runner: `node scripts/run-close-scope-postgres.cjs`, with an explicit fresh localhost/public-schema `CLOSE_TEST_DATABASE_URL`. It refuses existing targets, creates a new database, overrides Prisma connection variables, deploys migrations, checks `current_database()` and runs only synthetic fixtures. Credentials are used to construct the disposable target; connection strings are not printed. Local access escalation is limited to that new target. No prior database is reset, reused or deleted.

Completed verification on 2026-10-17 against fresh target `stoquify_local_close_scope_20261017_fa1345e7`: migrations applied, database identity verified, **6 suites / 56 tests passed** (73.229 seconds). The ignored local transcript is `.test-artifacts/close-coverage/phase6-postgres-20261017.log`.

The earlier target `stoquify_local_close_scope_20261016_805fb4e9` was retained. Its executor session became unavailable before a final result was captured, so that attempt is not counted as passing and its database was not reused. The completed run used a separately created target. An additional whitespace/conflict-marker scan passed for all 11 new Phase 6 source, test, migration and documentation files.

The 14 new database cases exercise independent approval, actual portal integration, debit/credit-normal accounts, normal nonzero liabilities/equity/contra-assets, gross movements, active unused and archived accounts, summary-parent exclusion, currency separation, coexisting approvals, posted and unposted registered source changes, supplier-ledger changes, explicit zero-activity denial after net-zero transactions, tenant/fresh-auth/permission/replay/retention controls, replacement/revocation/cutoff behavior and source commit/rollback races. Race tests observe an actual PostgreSQL blocking relationship before releasing the writer. Earlier Phases 1–5 suites remain included.

Fixtures establish the specific reconciliation controls, not every unrelated close domain or end-to-end statutory certification. Application-contract upgrade invalidation is source-reviewed migration behavior; no application upgrade was executed.

## Rendered checks and release limits

No browser/rendered checks, live session tests, external document verification, production-load testing or statutory certification. No dedicated schedule entry/import screen was added. API actions and existing portal/close findings carry the new control. Supporting schedules remain independently reviewed attestations with software-checked arithmetic; references/hashes do not prove external authenticity on their own.

Population queries read full applicable history; global registered source changes deliberately require broad re-review. Production-volume cost and contention need normal release evaluation. Apply schema/code through release controls, preserve historic proof, prepare and approve the required schedules, then rerun close. Existing bank and domain-specific exceptions remain separately enforceable.

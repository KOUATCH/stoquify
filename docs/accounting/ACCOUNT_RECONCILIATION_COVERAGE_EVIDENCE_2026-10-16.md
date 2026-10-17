# Phase 2 execution evidence — 2026-10-16

Scope: per-account payment reconciliation coverage and explicit independently reviewed no-activity evidence. Baseline commit: `fe540161f9fa53c149cc662759567cacc1dbd136`, with extensive pre-existing working-tree changes preserved. No staging, commit, deployment, application migration, application seed, or application database query was performed.

## Owned implementation

- `services/reconciliation/account-close-coverage.ts`: interval union/gaps and hash-bound no-activity eligibility.
- `services/reconciliation/account-close-coverage.service.ts`: complete tenant/account population, period/source queries, coverage matrix and blockers.
- `services/reconciliation/no-activity-evidence.service.ts` and `actions/payments/no-activity-evidence.actions.ts`: protected proposal, read, independent approval, revocation, replay handling and close invalidation.
- `prisma/schema.prisma` and `prisma/migrations/20261016150000_reconciliation_no_activity_evidence/migration.sql`: additive retained-evidence model, tenant foreign keys, independent-review checks, immutable payload/lifecycle trigger, and indexes.
- Narrow integration hunks in `services/reconciliation/payment-close-evidence.service.ts`, `services/accounting/data-trust.service.ts`, `services/accounting/close-assurance.service.ts`, and the source registry in `services/accounting/close-assurance-pack.service.ts`.
- Bounded tests/configuration, test-client generator, and scoped ignored artifact path. Existing files' unrelated edits remain intact.

## Source inspection

Read the repository workflow, skill routing, command registry and test lanes; inspected current service/action/schema/migration patterns and existing graph evidence. Applied the installed ECC security-review skill to the new action/evidence boundary. Ran `npm run agent:workflow:check` successfully before application verification. The registry reported 196 package scripts outside its reviewed manifest; none were implicitly authorized by that result.

Confirmed inclusive close/statement endpoints versus exclusive reconciliation-run endpoints; current account status does not establish historical applicability; existing catalog/close-period/provider locks and source invalidation were reused. Account coverage is persisted as `AUDIT_LOG` control evidence, not misrepresented as a posted reconciliation certificate. Existing signed-run certificates retain their own evidence classification.

## Mocked and pure verification

Command: `node node_modules/jest/bin/jest.js --config jest.close-scope.config.cjs --runInBand --noStackTrace`.

Final result: **12 suites / 334 tests passed.** The focused TypeScript command below also passed. Scoped `git diff --check` passed; Git emitted only existing Windows line-ending conversion notices. Whole-file diff totals include earlier work and are not this task's change count.

The bounded lane uses SWC directly, an inert server-only module, mocked persistence and isolated generated Prisma types/runtime. It does not load Next config, dotenv setup, or the application test bootstrap. Authentication is mocked in the action-boundary suite; the suite verifies guard configuration and server-owned context propagation, not live session infrastructure.

Coverage includes interval gaps and exact boundaries, multiple-account masking, archived accounts, partial statements/signoffs, missing explicit no-activity proof, maker/checker separation, altered evidence, recording cutoff, revoked evidence, late activity, obligations, currency mismatch, collection failure, action input/tenant/assurance checks, portal blockers, close findings/evidence, and close-pack hash inclusion/classification. Existing Phase 1 regression suites remain included.

Focused compilation command: `node node_modules/typescript/bin/tsc -p tsconfig.close-scope.json --pretty false`; no emit or incremental cache. This includes the new protected actions and transitive service dependencies; it is not a full repository build.

## Real PostgreSQL verification

Runner: `node scripts/run-close-scope-postgres.cjs`, with explicit `CLOSE_TEST_DATABASE_URL` constructed from local server credentials and a new random database name. The helper replaces the application database name before opening a connection. The runner validates localhost, exact disposable-name pattern and `schema=public`, refuses existing targets, overrides Prisma connection variables, applies migrations, checks `current_database()`, and runs only synthetic fixtures. No reset or cleanup was executed.

Final database: `stoquify_local_close_scope_20261016_51540841`. **2 suites / 10 tests passed.**

Real database evidence covers existing tenant/date/cutoff regressions, two-account completeness in close and portal, durable proposal/read/replay, permission and freshness denials at the service boundary, self-approval/foreign-tenant denial, independent approval, atomic invalidation of a ready close, payload/deletion protection, composite tenant FKs, SQL independent-review constraints, post-approval activity rejection, retained irreversible revocation, and source recheck immediately before approval with unchanged proposal after rejection. It does not simulate every concurrent writer or constitute full Phase 3 race certification.

Retained earlier isolated databases:

- `stoquify_local_close_scope_20261016_376c7c7e`: migrations applied; new test setup failed because synthetic users lacked organization IDs. Existing five scope tests passed. Fixture corrected; target retained.
- `stoquify_local_close_scope_20261016_9126d6c7`: 2 suites / 9 tests passed before the final index-name alignment and extra approval-recheck test.

No existing test database was reused, reset or dropped. Database socket execution used the sandbox's escalation mechanism only for these reviewed disposable local targets.

## Generated client and rollout limits

The default Prisma generator encountered Windows `EPERM` renaming the shared engine DLL. No process was stopped to release that lock. `node scripts/generate-close-test-client.cjs` instead generated Prisma Client 6.19.3 from the current schema into ignored `.test-artifacts/close-coverage/client`. Both Jest lanes and the focused TypeScript config explicitly use that client. Run this generator before these lanes on another checkout. It writes a copied schema/client only and executes no migration or seed.

The application client and application database still require normal release preparation. The new schema has only been migrated on disposable targets. No browser/rendered checks, live authentication tests, production checks, external bank-document verification, or statutory certification were performed. No new review form was implemented. See [the Phase 2 contract](ACCOUNT_RECONCILIATION_COVERAGE.md) for conservative lifecycle applicability and deferred work.

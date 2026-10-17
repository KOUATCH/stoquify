# Phase 5 execution evidence — 2026-10-16

Scope: bank opening/closing balance reconciliation and close readiness. Existing edits were preserved; no staging, commit, application database migration, reset, seed or deployment was performed. Observed HEAD: `f41145e431150ec5161aabbfdfe70d392ecbfed1`. Whole-file diffs include earlier work and are not Phase 5 change counts.

## Source inspection and command review

Read the repository workflow, qualified skill routing, command registry, test lanes and dedicated test runner/configuration/helper definitions. Reused ECC security-review guidance, the protected action boundary, retained no-activity evidence pattern, exact Decimal arithmetic, tenant-composite relationships and Phase 3 source revision locks/triggers. Existing architecture graph evidence is dated 2026-08-09; current service/schema source governs behavior.

`npm run agent:workflow:check` failed for preexisting fingerprint drift in `test:ecc:pilots` → `services/pos/__tests__/checkout-lifecycle.service.test.ts`. The check reported 196 unclassified scripts. The POS edit and registry fingerprint were left unchanged. Dedicated commands below were inspected for their own side effects and target restrictions; this report does not claim the repository workflow gate is green.

The source inspection established that imported statement lines already have immutability protections but the statement model lacks independently reviewed opening/closing balances. The implementation adds retained evidence without modifying those existing statement protections. Source rows include cumulative posted ledger history, so matching all period transactions cannot conceal an opening balance discrepancy.

## Owned implementation

- New bank contract, source collector, evidence lifecycle and per-account close collector under `services/reconciliation/bank-balance-*.ts`.
- Protected propose/decide/read actions in `actions/payments/bank-balance-evidence.actions.ts`.
- Additive schema/model and migration `20261016220000_bank_balance_evidence` with tenant foreign keys, immutable retained payload, independent approval checks, source invalidation and legacy close-contract invalidation.
- Narrow portal/close changes: high blockers, payment findings/checklist state, retained receipts, metadata and hashed trust-pack evidence.
- Pure arithmetic/schema tests, action-boundary tests, portal/close integration assertions, and real PostgreSQL lifecycle/source/concurrency tests. Bounded unit configuration and focused TypeScript includes updated.
- Dedicated PostgreSQL runner overall test-process deadline extended from 180 to 300 seconds as the suite expanded, with explicit child-process error reporting. Per-test and application transaction limits remain unchanged.
- [Behavior and rollout contract](BANK_BALANCE_RECONCILIATION.md), this report and the shared close contract cross-reference.

## Mocked and pure verification

Command: `node node_modules/jest/bin/jest.js --config jest.close-scope.config.cjs --runInBand --noStackTrace`.

The first run passed 405 tests and exposed one integration failure: a bank checklist could fail while the run remained READY when no corresponding finding was present. Added explicit bank findings and filtered duplicate portal blockers. Both broad reruns passed **17 suites / 406 tests**. After the final provenance-only source-table inventory addition, the affected close suite was rerun with `--runTestsByPath services/accounting/__tests__/close-assurance.service.test.ts`: **1 suite / 154 tests passed**. These 154 are a subset of the 406, not additional tests.

Coverage includes exact opening/closing/roll-forward arithmetic, one-cent mismatches, signed timing items, carried outstanding payments, overdrafts, invalid amounts, strict authority fields, canonical hashes, protected action policies and assurance binding, portal bank blockers and close receipt/metadata/run status. These tests mock persistence and authentication boundaries; they do not prove PostgreSQL locking or a live session.

`node scripts/generate-close-test-client.cjs` generated only the ignored isolated test client. The application client DLL/process was not regenerated or stopped. Focused compile command: `node node_modules/typescript/bin/tsc -p tsconfig.close-scope.json --pretty false`: **passed**. The subsequent source-only change added table names to the provenance inventory and passed the affected close suite above. A full application build was not run.

Scoped `git diff --check` passed with Windows line-ending notices; new files separately passed trailing-whitespace inspection.

## Real PostgreSQL verification

Runner: `node scripts/run-close-scope-postgres.cjs`, with an explicitly constructed fresh localhost/public-schema `CLOSE_TEST_DATABASE_URL`. The reviewed helper refuses an existing target, creates a uniquely named database, overrides Prisma connection variables, deploys migrations, verifies `current_database()` and runs synthetic fixtures. Connection strings were not printed. Local connection escalation was limited to new disposable targets. Prior targets and application data were preserved.

- `stoquify_local_close_scope_20261016_61b24484`: migration and identity checks passed; 4 suites passed and the new bank suite had four fixture failures (**32 passed / 4 failed tests**). Those fixtures attempted prohibited updates to immutable statement evidence. Corrected them to append statement lines or create a separate statement, retaining the existing protection.
- `stoquify_local_close_scope_20261016_b356111a`: migration and identity checks passed. During concurrent unit/TypeScript verification, an earlier Phase 2 fixture exceeded its existing five-second transaction limit (5,413 ms); dependent fixture tests then failed. The runner ended before a complete Jest summary. This is not a passing run. The subsequent database run is executed without competing verification commands and with the longer overall test-process deadline described above.
- `stoquify_local_close_scope_20261016_9a9516dc`: migration and identity checks passed; **5 suites / 42 tests passed**, including all 16 new bank tests and the commit/rollback race cases. Application transaction limits were unchanged.

The new bank suite covers independent approval, missing/pending proof, exact balances, unbalanced proposals, stale source rejection, timing derived from posted lines, duplicate/matched timing denial, tenant/permission/fresh-auth denial, replay, retention/foreign-key/independence constraints, revocation invalidation, missing/shared mappings, currency/sign/period mismatch, ledger and bank-identity changes, replacement proposals, recording cutoff and approval racing an actual source commit or rollback. The concurrency cases observe a real PostgreSQL lock before releasing the source writer. Existing Phases 1–4 suites remain included.

All targets remain retained without reuse, reset or deletion. The fixtures exercise real bank/portal persistence, constraints, revision invalidation and locks; they do not establish every unrelated close domain or end-to-end statutory certification. Legacy application-assessment invalidation is source-reviewed migration behavior, not an application migration executed in this task.

## Rendered checks and release limits

No browser/rendered checks, live authentication sessions, external bank verification, production-load testing or statutory compliance certification. Existing findings/portal integration and backend actions are implemented; a dedicated bank evidence entry screen is outside this slice. One exact-period statement, dedicated ledger mapping and same-currency evidence are required; unsupported situations block rather than assume a balance. Full-population ledger queries and tenant revision contention need production-volume evaluation through normal release controls.

Apply the migration and code through the release workflow, retain prior proof, gather independently reviewed bank balances and reassess affected close evidence. Do not rely on pre-Phase-5 certificates as proof of the new control.

# P04-R03 native verification

Final retry02 passed on 2026-11-04: **43/43 tests, 0 failed, 0 skipped**. All 121 current migrations replayed into a new local PostgreSQL 17 cluster and checksum-verified. The 5,208 captured application/recipe inputs and copied/current migration files remained unchanged through execution.

Executed command: node plans/stoquify-production-readiness-2026-10-28/execution/P04-R03/qualification-20261104-r1/database/run-native-retry02.cjs, after hash-bound independent recipe review and approved loopback-capable escalation. No dependency installation/build/production work.

Actual nine item-action exports, current RBAC and item/inventory services executed against real PostgreSQL. Coverage: all 9 fresh permission-revocation denials, all 9 unauthenticated transport denials, all 9 authorized positive paths, 8 foreign-item denials, actor-tenant list despite forged org, second stock permission, successful nonzero SUBMITTED adjustment/line (no posted inventory/ledger), actual stock downstream rejection rolling back prior policy update, approved stock and duplicate-SKU business messages, foreign related-record Prisma error, and fixed synthetic database-trigger exception/atomic rollback.

43 observations contain 32 denial/rollback state pairs equal across 24 named business relation groups in both synthetic tenants.25 security-audit rows were intentionally added across these denied calls and counted separately.34 total before/after pairs also include forged-list scoping and intended successful stock changes. No blanket claim that every failure response causes zero writes: existing post-commit cache failures are separately characterized by the parent unit suite.

Better Auth getSession, Next headers/cache and server-only transports are stubbed. Session rows are real fixtures; expiry/revocation/signature/cookie-cache/HTTP/browser behavior is not certified. This is not whole-database zero-write, provider/hosted or production acceptance. Permission/module/transaction behavior was not modified by this verification.

Final owned target: stoquify_local_p04_r03_20261104_r3, 127.0.0.1:57553, PID 1740, under .codex-tmp/p04r03-qualification-20261104-r3/postgres. Remaining client sessions: 0. Cluster stopped cleanly and port released. Synthetic data retained. Historical runner/config remain exact; test source is archived as item-errors-retry02.postgres.test.ts.source.txt with relocation/hash receipt, preventing accidental default test execution. A repeat requires a fresh reviewed target/output identity.

Attempts retained:
- Initial: sandbox EACCES before CREATE DATABASE/migrations/tests. Host ended owned process; absence confirmed. Clean shutdown not proven; initial-cleanup.json records that limit.
- Retry01: 121 migrations succeeded; all 43 tests failed in the snapshot helper before action invocation because inventory_levels lacks organizationId. Fixed only its tenant predicate through items; all 24 predicates reviewed. Cluster stopped cleanly. Failed executed test/receipts retained.
- Retry02: all 43 passed, source/migrations stable, clean cleanup.

Evidence hashes:
- native-result-retry02.json: 3e0b792b58a4fb09ecc6ee499043d38acfbeb77c513deee09a389fc2fb79b0c4
- native-jest-retry02.json: cccebd4fe16c8702a3afbc5963d4d14d2fe78d348c05dab1040967a6bfdf123d
- native-observations-retry02.json: 8c25281e880c48ef1a93dae56edb52041152bb760ac11476cab97d1e94cdfe19
- item-errors-retry02.postgres.test.ts.source.txt: 37d393a208d360bf5b03ce6f2d42ed661f1406d86ee0846c223f358115f525e8

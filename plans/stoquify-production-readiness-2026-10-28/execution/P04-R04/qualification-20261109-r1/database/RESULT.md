# P04-R04 native verification

Passed on 9 November 2026: **34/34 tests, zero failures/skips**, in one fresh local PostgreSQL 17 target. All **121 current migrations** replayed and checksum-verified. **5,209 application/recipe inputs** and copied/current migration files remained unchanged through execution.

Executed command: node plans/stoquify-production-readiness-2026-10-28/execution/P04-R04/qualification-20261109-r1/database/run-native.cjs after hash-bound independent recipe review and approved loopback-capable escalation. No initial sandbox retry was needed. No dependency installation, application build, production configuration, commit, push or deployment.

Actual sibling listItemsAction, current listItemsSchema, requirePermission/RBAC and item query service executed against real PostgreSQL. Both object and positional inputs pass authorization, forged-organization scoping, search/pagination, empty result and permission restoration tests. Four own and foreign relation filters, four search fields, active status and three sorting modes remain functional. Invalid pagination fails before transport access. An actual Prisma P2022 query failure was induced by renaming one fixed column in this owned database, restored in finally; client error detail remains safe.

All **36 state pairs** were equal across **24 named business relation groups** scoped to both synthetic tenants. The 36 observations contain **9 denied/failed responses and 27 authorized read responses**. **4 intentional security-audit additions** for missing permissions were checked separately; admitted reads and other failures added none. This is selected-state evidence, not whole-database zero-write certification. Fixtures and transient schema changes are deliberate test setup/recovery, not unauthorized application mutations.

Better Auth getSession and Next headers/cache/server-only transport are stubbed. Session rows are real fixtures, and actor/role permission reads are real. Signed-cookie transport, session expiry/revocation, browser restoration, hosted providers and production behavior are not qualified. No permission/module/query-service scope was changed by this verification.

Owned target: stoquify_local_p04_r04_20261109_r1 at 127.0.0.1:55501, PID 22660, under .codex-tmp/p04r04-qualification-20261109-r1/postgres. Remaining clients: zero. Cluster stopped cleanly and port released; synthetic data retained. Prior R01/R02/R03 fixtures were not reset. Executed source is archived inertly as list-items.postgres.test.ts.source.txt with relocation/hash receipt. A repeat needs a new reviewed target/output identity.

See [machine summary](evidence-summary.json), [runner receipt](native-result.json), [Jest assertions](native-jest.json), [state observations](native-observations.json), [recipe](RECIPE.md) and [test relocation](test-source-relocation.json).

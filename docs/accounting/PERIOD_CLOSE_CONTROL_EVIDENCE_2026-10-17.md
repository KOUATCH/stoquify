# Phase 7 execution evidence — 2026-10-17

Scope: current independent close approval, period sealing, controlled reopening, retained audit receipts and regression tests. Existing changes, including Phases 0–6, are preserved. No staging, commit, seed, application schema promotion or deployment is part of this work. The repository has extensive earlier edits; whole-file Git diffs are not Phase 7 change counts. Pre-edit copies of modified implementation/configuration files are retained in ignored `.test-artifacts/close-coverage/phase7-before/`.

Verification observed HEAD `b044764248f1ac47705371c235c2ba273dd973a7`. Final hashes of 15 implementation, schema, test and configuration files are retained in ignored `.test-artifacts/close-coverage/phase7-source-hashes.json`; this records the working files used for verification, including existing edits.

## Source inspection

Read the current ECC workflow, qualified skill routing, command registry, test lanes and verification definitions. Applied ECC security-review to the existing protected-action, permission, tenant and fresh-session boundaries. Consulted the dated action graph (including Community 104's settings test node); current period, posting, certification, source-revision and audit code determines actual behavior. Read the design master for the existing close form's hidden version field; no visual redesign or new reopening screen was introduced.

`npm run agent:workflow:check` passed with 196 package scripts outside the reviewed manifest. The check did not execute application/database commands. Dedicated generation, unit, TypeScript and PostgreSQL commands were separately reviewed. No command-registry hashes were refreshed.

## Owned implementation

- `services/accounting/period-control.service.ts`: strict transition inputs, independent retained approval validation, source/order/row locks, reopen authorization, version checks and replay handling.
- `services/accounting/periods.service.ts`: replace READY-only sealing with approved close, retain receipt, set lock markers and audit atomically.
- `services/accounting/close-assurance-pack.service.ts`: reject invalid/future authentication and missing certifier identity; recheck freshness before persistence after elapsed lock/collection time.
- `actions/accounting/settings.actions.ts`: verified server-owned assurance for close and new protected reopening action.
- Existing accounting setup page: submit the displayed period version.
- Prisma schema and additive `20261017090000_period_close_control`: immutable receipts, tenant/version constraints, controlled period transitions, scope/retention and journal-write guards.
- Existing period/pack unit tests, new period-control unit/action/database suites, scoped Jest/TypeScript includes and behavior documentation.
- Dedicated database runner: extend only the overall Jest-process timeout from five to fifteen minutes after an observed timeout; individual test, transaction and lock-wait limits remain unchanged.

See [the behavior contract](PERIOD_CLOSE_CONTROL.md) for lifecycle semantics, role separation, lock order, legacy periods and rollout limits.

## Mocked/pure tests and static checks

First unit run: 22 suites, 478 passed and 8 failed tests. Failures were old query-shape expectations for the previous latest-nonvoided selection; those expectations were corrected for the new latest-assessment lookup. Final bounded unit command `node node_modules/jest/bin/jest.js --config jest.close-scope.config.cjs --runInBand --noStackTrace`: **22 suites / 489 tests passed** (121.308 seconds). Transcript: ignored `.test-artifacts/close-coverage/phase7-unit.log`.

The bounded generation helper exited without diagnostics before completion. Direct generation of the same ignored test schema subsequently succeeded with Prisma 6.19.3. No application client was regenerated. Scoped `git diff --check` passed with a Windows line-ending notice; a whitespace/conflict-marker scan passed for seven new files. `node node_modules/typescript/bin/tsc -p tsconfig.close-scope.json --pretty false`: **passed**.

## Real PostgreSQL tests

Dedicated runner creates a new localhost database, applies migrations only there, verifies its identity and runs synthetic fixtures. First target: `stoquify_local_close_scope_20261017_e0258ca6`; migration and identity checks passed, but 16 new tests failed during journal fixture setup (`nameEn` was missing), and the overall runner subsequently timed out without a full-suite result. Corrected the journal fixture and its header memo field against the current Prisma schema.

Rerun target: `stoquify_local_close_scope_20261017_06cc7353`. Migrations applied and identity verified; **7 suites / 72 tests passed** (144.324 seconds), including all 16 new Phase 7 cases and the 56 earlier regressions. The new suite also verified the applied migration checksum against the current SQL file. Final transcript: ignored `.test-artifacts/close-coverage/phase7-postgres-final.log`. Both targets are retained; no existing database is reset, reused or dropped.

The new tests cover clean-ledger/READY denial; approved seal and immutable receipt; reopening and stale evidence; same/changed request replay including replay after a later close; version, tenant, permission and authentication denial; raw period-state and journal-write bypass; open draft deletion; stale/self/mismatched/newer/ambiguous approvals; journal commit/rollback races; audit-failure rollback; concurrent closes/reopens; and a writer waiting behind close. Tests observe actual PostgreSQL blocking relationships. Certified artifacts in this suite are synthetic fixtures that isolate the period transition; existing pack-service tests cover certification logic separately.

## Limits and release

No browser/rendered tests, full application build, live-session revocation test, application database migration, production-load test or statutory certification. The existing close form carries version context; reopening is exposed through the protected action, with no dedicated screen. Operational activity is not globally frozen: database guards enforce the ledger/period boundary.

A validated seal preserves its approval; reopening and financial source changes invalidate it. Reopening requires correction, refreshed reconciliations, a new assessment and new independent certification before reclosure. Roll out schema and matching code through release controls; preserve receipt history when planning rollback. Never remove guards or restore old approval merely to force a close through.

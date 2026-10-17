# Phase 3 execution evidence — 2026-10-16

Scope: close publication races and transactional stale-evidence invalidation. Baseline `fe540161f9fa53c149cc662759567cacc1dbd136`, with extensive existing edits preserved. No staging, commit, deployment, application migration, seed, reset or application database query.

## Owned changes and inspection

- New `services/accounting/close-source-revision.service.ts`: revision parsing, isolation enforcement, lock barrier, latest-assessment publication guard.
- New `prisma/migrations/20261016180000_close_source_publication_guard/migration.sql` and additive `CloseSourceRevision` / `CloseSourceChange` schema models.
- Narrow integration changes to `close-assurance.service.ts`, `close-assurance-pack.service.ts` and their unit suites.
- New `tests/postgres/close-scope/close-publication.postgres.test.ts` and [Phase 3 contract](CLOSE_PUBLICATION_RACE_SAFETY.md).

Read current workflow, skill routing, command registry and test lanes. Inspected current services, schema, migrations, guards and runner; consulted dated graph evidence without treating it as live behavior. `npm run agent:workflow:check` passed; its 196 unclassified scripts were not implicitly authorized. Build was not run because it includes migration side effects. Source review identified selected payroll pilot audit rows as authoritative evidence; ordinary audit outputs remain excluded.

## Mocked/pure tests and compilation

`node node_modules/jest/bin/jest.js --config jest.close-scope.config.cjs --runInBand --noStackTrace`: **12 suites / 337 tests passed**. Includes denial before persistence when publication guard rejects, missing/changed revision denying certified export with committed invalidation, and prior Phase 1/2 regressions. Persistence is mocked; these results do not prove database locking. An initial overlap with test-client generation caused missing enum imports; rerun after generation completed passed.

`node node_modules/typescript/bin/tsc -p tsconfig.close-scope.json --pretty false`: passed. Focused no-emit compilation, not a full application build. Scoped `git diff --check` passed with only informational Windows line-ending notices.

## Real PostgreSQL tests

Final database: `stoquify_local_close_scope_20261016_93f6dcd8`. Migration and identity checks passed. **3 suites / 21 tests passed**.

The reviewed `scripts/run-close-scope-postgres.cjs` permits only a new localhost/public-schema database with the exact disposable-name pattern, refuses existing targets, overrides all Prisma connection variables, applies migrations and uses synthetic fixtures. Local credentials constructed a different database URL before opening a connection; connection strings were not printed. Sandbox escalation enabled local sockets only for these disposable targets.

The new suite uses the real revision helper/publication guard and database persistence. Promise barriers and observed PostgreSQL lock waits establish concurrent ordering. Coverage: source commit during collection; latest/unambiguous selection; atomic rollback; writer waiting behind publication then invalidating it; certifier observing a source commit after waiting despite an earlier read; retained export invalidation without hash changes; ordinary audit/close outputs versus pilot evidence/failed close events; rejection of snapshot isolation; child-source parent lookup; tenant separation and all-period invalidation.

Prior scope/account-coverage database suites remain included. New races exercise production guard functions with synthetic run/export fixtures, not every domain condition of an entire certified-pack request. Mocked service tests establish full-service integration. No browser/rendered UI, live authentication, production-load or statutory certification checks were performed.

Earlier retained Phase 3 databases: `stoquify_local_close_scope_20261016_cb144997` (18 passed / 1 fixture failure: missing event occurredAt, corrected); `stoquify_local_close_scope_20261016_ff6a91b0` (20 passed before the audit-backed source case). No target was reused, reset or deleted.

## Release limits

`node scripts/generate-close-test-client.cjs` generated an isolated client into ignored `.test-artifacts/close-coverage/client`. Application client generation remains release work. Only disposable databases received the migration. Rollout invalidates legacy active assessments/certified exports and requires reassessment. Organization-level write serialization, conservative invalidation volume and domain-lock retries require deployment monitoring; these bounded tests are not a throughput certification.

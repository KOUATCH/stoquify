# Scope and execution review

18 October 2026. Owned continuation: P02 database reader verification and P06 current authenticated operator flow. Follow AGENTS.md, docs/ecc/WORKFLOW.md, skill-routing.md, command-registry.json, test-lanes.md and the P12 gap register. ECC security-review and verification-loop were read and applied within these project boundaries. No generic broad build, install, global lint/test, production query or later prompt.

## Baseline and command safety

BASELINE.json captures HEAD, inherited dirty/untracked inventory and selected raw hashes before the new test. Existing August graph relationships and P12's SOURCE_REVIEW.json locate POS commit/queue/authority boundaries; graph age and historical lines are not behavioral proof. Current analytics reader/projection, RBAC, shared protect, module entitlement/catalog, audit logging, POS queue/panel/action/fixture, schema and dedicated execution helpers were inspected. No graph regeneration.

Workflow definition, absent pre/post hooks, complete fs/path/crypto runner and registry entry were read before executing workflow.cjs. The wrapper invokes only fixed `npm.cmd run agent:workflow:check` and preserves the exit. PASS, exit 0, 196 package scripts outside the reviewed manifest. This does not classify the new task-specific commands: their side effects are reviewed below.

prepare-evidence.cjs reads Git/files, captures selected hashes and copies seven previously inspected P06 runners to this new packet, changing only owned directory prefix, date and app port. The first workflow attempt preceded completion of this long-running capture and could not find the wrapper; no workflow/app/DB operation occurred on that attempt. After capture completed, the inspected workflow wrapper ran successfully. Existing historical helpers/evidence were not overwritten.

## Disposable PostgreSQL and client provenance

`node docs/retention/execution/P02-P06-verification-2026-10-18/database.cjs create` creates a random new `.codex-tmp/retention-p02-p06-refresh-*` directory and `stoquify_pos_audit_20261018_*` database. PostgreSQL 17 binaries are already installed. Record identity in DATABASE_TARGET.json before startup; validate directory containment, exact prefix/name/user and localhost before all later operations. Bind PostgreSQL to 127.0.0.1 on a newly selected port. No .env or ambient database URL is read; no existing cluster/data is cloned, reset or deleted. The retained cluster uses trust authentication only within this loopback synthetic envelope.

Initialization, pg_ctl startup, createdb, datamodel-to-empty SQL generation and psql application each retain real exit/log records. SQL is generated from the current schema copied inside the owned directory and applied only to the recorded new database. SCHEMA_PROVENANCE.json hashes source and SQL. This is **datamodel bootstrap, not full migration-history/custom-trigger qualification**. Default database runtime durability is retained; initialization was allowed to finish, not killed or forced past its sync step. Read-only process checks identified the owned initialization processes; unrelated database processes were not stopped.

`database.cjs client-shape` compares the installed client's datamodel with current repository schema using local Prisma migrate diff with two datamodel inputs, no database introspection. Raw schema bytes differ (format/order); result is an empty migration, exit 0. No client generation, dependency change or repository schema formatting was performed. Exact arguments in client-shape.execution.json.

## P02 tests

`node docs/retention/execution/P02-P06-verification-2026-10-18/checks.cjs p02-unit` selects the inspected three-suite jest.retention-outcomes.config.cjs, installed SWC, no Next application config/dotenv/global setup; 65 tests passed, no skips. Database/session/module dependencies in this older suite are mocked; that run is M evidence only.

`node docs/retention/execution/P02-P06-verification-2026-10-18/retention-db.cjs` uses a clean OS-variable allowlist and explicit recorded target, NODE_ENV=test and opt-in. New jest.retention-db.cjs selects only services/analytics/__tests__/retention-outcomes.postgres.test.ts, uses SWC and the inspected server-only shim, and has **no global Jest setup or Prisma mock**. Real reader, scalar projection, persisted actor/roles, RBAC permission decisions, module configuration/entitlement, audit writes and PostgreSQL transactions run against the disposable database.

Only `next/headers` and `auth.api.getSession` are stubbed to provide an explicit session subject for the internal service. This is not Better Auth cookie/session transport or session-revocation proof. Authority changes to actual users, organizations, roles and grants are persisted and read by production RBAC/module code. The separate P06 browser journey exercises actual credential sign-in and authenticated actions. No new application endpoint was added for testing.

The installed generated Prisma client references a schema-relative `.env` path. The test/browser helper's database authority does not depend on that file: every Prisma instance receives the recorded URL explicitly, and the application separately blocks ambient dotenv key values before imports. No environment values are dumped into evidence. The Jest configuration itself does not load application configuration; this is not a claim that every dependency has no environment-file lookup.

Synthetic source records are deliberately seeded into POSCommitResult and BusinessEvent; these verify the **reader**, not financial writer atomicity, real sales or customer adoption. Independent expected counts cover finalized/uncertain/duplicate/conflicting and reversed outcomes, tenant/site filters, timestamp/recording boundaries, no sensitive payload leakage, caps (1,000 then 1,001), invalid windows and UNKNOWN provenance. New random organizations isolate cases; retained records stay only in the disposable target.

Snapshot probe wraps only the transaction callback timing: the real first query runs, a separate Prisma client commits a backdated eligible correction, then the real second query runs. No query result is fabricated. PostgreSQL SHOW confirms repeatable read; the correction is absent inside that snapshot and present on the next report. Rollback probe writes then aborts a real transaction and verifies no outcome appears.

Failure probe obtains pg_backend_pid inside **its own** reader transaction, then a separate connection in the same owned database calls parameterized pg_terminate_backend for that exact PID. It never stops a server or selects an arbitrary process. Initial run: 17 passed/one failed because PostgreSQL has no pg_terminate_backend(bigint) overload. The retained server log confirms the test-probe error. Added explicit integer cast in the test; final run 18/18 passed, zero skips. Final test requires actual termination, rejection of the reader and a successful subsequent read. No production reader change or weakened assertion.

## P06 runtime

`database.cjs browser-fixture` invokes the current retained operator fixture with explicit absolute evidence output and database opt-in. Jest's inherited setup is inspected; this fixture explicitly unmocks Prisma and creates real synthetic user/account/role/device/till/shift/zero-tax accounting records. Fixture creation is one setup case, not an economic operation test. Existing fixtures/financial services are reused without edits.

`node .../application.cjs` starts the actual installed Next 15.5.27 on 127.0.0.1:3192, only against the recorded target. It clears ambient variables and predefines dotenv key names with empty values before Next reads files; no ambient secret value is copied or printed. Auth secret is generated in memory. dev-app-safe.js allocates unique build output and a per-session tsconfig; Next's tsconfig message refers to that isolated file. No npm predev, build, migration-promotion or seed hook runs. APPLICATION_TARGET.json and APPLICATION.log identify the session.

`checks.cjs operator`, `checks.cjs server-close`, and `checks.cjs read-states` launch inspected local Playwright scripts with clean environment. Each script verifies origin and synthetic fixture; DB readers use explicit recorded URL. Browser contexts block external origins. Operator signing keys are ephemeral fixture material, not production enrollment. Browser queue injection calls the current production helper; actual sign-in and server actions perform ingestion. Lost-response injection waits for the actual persisted event before dropping the acknowledgement. Assertions compare original event bytes/identity and unchanged commit/payment/stock/journal/posting/shift state.

Server-close check depends on the completed operator run's persisted server blockers and uses a new authenticated browser with an empty local queue. Read-state check injects remote read failures in a separate French 390px browser, retains local-only synthetic evidence, and never sends it. EN desktop/FR mobile, keyboard retry, anonymous login redirect, tenant spoofing and expired/revoked-device conflict paths are scoped browser evidence; they are not a comprehensive accessibility/device/security certification.

Production economic replay remains gated by NODE_ENV=test plus its separate explicit replay opt-in. The real app runs development mode and this continuation does not enable that opt-in. No complete offline startup, browser key enrollment, policy renewal, multi-device pre-upload close barrier, provider operation or customer pilot is implemented.

## Cleanup and evidence retention

Stop only the owned Next session, then `database.cjs stop` for the recorded cluster. `check-cleanup.cjs` probes only its two ports; retain final CLEANUP.json. Synthetic database directory, isolated build output and evidence remain for review; no unrelated process or data is deleted. Final source/status validation records unexpected concurrent drift rather than reverting it. Historical P12 and later-prompt rows remain untouched; only dated P02/P06 notices and their register rows may change.

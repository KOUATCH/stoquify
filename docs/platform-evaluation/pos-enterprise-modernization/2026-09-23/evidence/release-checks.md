# POS check safety and execution guidance

Date: 2026-09-23. This reviewer inspected scripts and test setup; no gates, typecheck, build, database tests, or browser checks were run by this reviewer. Commands below are recommendations, not passed results.

## Source-only gates

The following scripts use filesystem source/report operations and do not connect to a database or payment provider. Give explicit run-specific output paths to preserve previous reports. Static substring/regex checks are useful ratchets but do not prove runtime authorization, transaction, or concurrency correctness.

```powershell
node scripts/offline-pos-fiscal-replay-gate.js --mode fail --out what-next/pos-enterprise-modernization/2026-09-23/evidence/offline-gate.md --json-out what-next/pos-enterprise-modernization/2026-09-23/evidence/offline-gate.json
node scripts/payment-cash-truth-gate.js --mode fail --out what-next/pos-enterprise-modernization/2026-09-23/evidence/payment-gate.md --json-out what-next/pos-enterprise-modernization/2026-09-23/evidence/payment-gate.json
node scripts/inventory-boundary-gate.js --mode fail --out what-next/pos-enterprise-modernization/2026-09-23/evidence/inventory-gate.md --json-out what-next/pos-enterprise-modernization/2026-09-23/evidence/inventory-gate.json
node scripts/service-boundary-gate.js --mode fail --out what-next/pos-enterprise-modernization/2026-09-23/evidence/service-gate.md --json-out what-next/pos-enterprise-modernization/2026-09-23/evidence/service-gate.json
node scripts/workflow-assurance-release-gate.js --mode fail --out what-next/pos-enterprise-modernization/2026-09-23/evidence/workflow-gate.md --json-out what-next/pos-enterprise-modernization/2026-09-23/evidence/workflow-gate.json
node scripts/public-receipt-token-config-gate.js --mode fail --release auto --out what-next/pos-enterprise-modernization/2026-09-23/evidence/receipt-config-gate.md --json-out what-next/pos-enterprise-modernization/2026-09-23/evidence/receipt-config-gate.json
```

Receipt configuration gate inspects secret configuration without network/database access. `--release auto` applies release-only checks only when configured production/release signals exist; a local pass is not a production-secret readiness certificate. Do not print secret values. `--release on` is a separate explicit production-readiness assessment, not a way to create secrets.

Existing POS governance gates inspect prior contract/approval artifacts in `docs/pos-enterprise-grade-audit/`. They support `--no-write` and should not overwrite governance evidence or be represented as current runtime certification:

```powershell
node scripts/pos-g1-contract-gate.js --mode fail --no-write
node scripts/pos-enterprise-program-gate.js --mode fail --no-write
```

`workflow-assurance-runtime-table-check.js --mode fail` is different: it resolves DATABASE_URL (including dotenv fallback) and performs read-only table/migration-history queries. Inspect the sanitized target identity first. It does not deploy migrations or repair missing tables. Its output proves only listed runtime objects/history presence.

## Test/build execution limits

- `npm run typecheck` runs `tsc --noEmit --pretty false`; no migration or application startup in script.
- Scoped ESLint performs source analysis; do not apply `--fix` to unrelated shared work.
- `npm run prisma:validate` validates schema configuration, not a database migration or runtime compatibility proof.
- The main `npm run build` runs `release:secrets:preflight`, then `prisma:migrate:deploy:safe`; **do not use it for incidental verification**.
- `npm run build:app` runs `scripts/build-app-safe.js`: process inspection, possible recursive cleanup of validated workspace `.next`, then child Next build. It does not deploy a migration. Preserve shared artifacts by using wrapper `--skip-clean` and a distinct `NEXT_DIST_DIR` supported by next.config. The wrapper still inspects `.next`; do not terminate another owner's dev/build processes or override orphan guards merely to get a pass.
- A Windows standalone symlink packaging failure was recorded in an earlier public-page task. Compilation alone is not full build success; collect final exit code and packaging outcome.
- Generic E2E or seeded smoke scripts may deploy/seed before execution. POS receipt browser smoke is not permission to send receipts. Inspect fixture setup/provider mode before running any such script.

Jest loads next.config and environment files. POS mock suites are safe only after confirming tests do not unmock DB. Known configuration-startup workaround used in prior successful local POS runs:

```powershell
$env:TS_NODE_TRANSPILE_ONLY = 'true'
$env:TS_NODE_COMPILER_OPTIONS = '{"moduleResolution":"node"}'
node node_modules/jest/bin/jest.js --runInBand --roots services/pos/__tests__ --runTestsByPath services/pos/__tests__/checkout-lifecycle.service.test.ts services/pos/__tests__/commit-recovery.service.test.ts --silent
```

Use the actual changed/related test paths and record command, target/revision, exit status, counts, duration and skipped cases. This environment workaround changes the Jest TypeScript config loader; it does not replace the separate project typecheck.

## Existing PostgreSQL suites and safe isolation

| Suite | Opt-in and target requirements | Side effects / limitations |
| --- | --- | --- |
| `checkout-lifecycle.postgres.test.ts` | `RUN_POS_LIFECYCLE_POSTGRES=1`; DATABASE_URL hostname exactly `localhost`, schema exactly `codex_pos_lifecycle_20260920` | Creates a fresh schema; deliberately fails if it exists. Copies nine `public` table definitions with defaults, adds primary keys, clones enums; inserts isolated fixtures; drops only schema it created. Requires a known disposable database with compatible public baseline. Copied tables omit normal foreign keys/unique indexes/triggers, so this proves narrow lease/retirement/race behavior only. |
| `pos-commit-result.postgres.test.ts` | `RUN_POS_COMMIT_POSTGRES_CERTIFICATION=1`; local host and schema `codex_pos_commit_result_cert_20260817` | Expects already provisioned tables/constraints. Creates fixture organizations/users/orders and races registry claims; disconnects but does not remove fixture/schema. Tests registry constraints/result transaction behavior, not end-to-end commitPOSSale. |
| `pos-shift-close.postgres.test.ts` | `RUN_POS_SHIFT_CLOSE_POSTGRES_CERTIFICATION=1`; independently set and verify disposable target/schema `codex_pos_shift_close_cert_20260719` | Creates fixtures, invokes close, injects/drops named failure functions/triggers. Existing test only checks schema inside failure injection, after earlier fixture writes: **not safe with ambient DATABASE_URL**. Adjacent stock/accounting/fiscal services are mocked. No fixture cleanup except trigger cleanup. |

Do not point these suites at the user's active database, even if its hostname is localhost. A local hostname is not disposable-ownership proof. Do not provision by invoking repository-wide migration deployment or resetting a shared database. Safe options are an already identified disposable test database, or a separately authorized isolated database/schema with exact current schema/required indexes and explicit ownership recorded before any DDL. Record sanitized host/port/database/schema, fixture origin and teardown policy; omit credentials.

No local PostgreSQL availability or credentials were inspected by this reviewer, so availability is **not established**. If no disposable target can be identified, mark real-database checks blocked, with full financial release claims withheld. Do not count opt-in skipped PostgreSQL tests as passed concurrency tests.

## Browser matrix and read-only boundaries

`route-inventory.json` records 13 source-verified localized page patterns (26 EN/FR targets), divided into four direct POS surfaces and nine downstream evidence landing pages. It also identifies receipt/media APIs and the stale non-page route. Capture actual outcomes in the parent verification matrix, including permission/module denied/loading/empty states; a protected denial is not a rendered-data pass.

Prioritize checkout, terminal, drawer and cash-history layouts at desktop/tablet/mobile, then downstream read-only surfaces. Preserve original retained request. Checking an attempt is read-only; reviewing a cart is a scoped draft revalidation and still must not click Charge. Do not exercise refund/void, receipt send, close/sign, real provider operations or live sale as browser test data. Real workflow completion, duplicate submission and fault injection require isolated fixtures/provider simulations. Record missing hardware/provider accessibility and mobile evidence explicitly.

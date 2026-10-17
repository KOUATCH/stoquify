# Phase 4 execution evidence — 2026-10-16

Scope: separate normal unpaid AP obligations from reconciliation/control exceptions. Existing working-tree edits were preserved; no staging, commit, application database access, reset, seed or deployment was performed. Observed verification HEAD: `f41145e431150ec5161aabbfdfe70d392ecbfed1`. Whole-file diffs include earlier work and are not this task's change count.

## Source inspection

Read current workflow, qualified skill routing, command registry, test lanes and command/helper definitions. `npm run agent:workflow:check` passed (196 unclassified scripts; no application/database commands executed by that check). Applied installed ECC security-review guidance to financial provenance, tenant scope and fail-closed collection. Existing graph action node `accounting_close_assurance_actions_ts` and its community 6 helped identify the public close boundary; the graph is dated 2026-08-09, and current service source governs behavior.

Confirmed the false positive in `data-trust.service.ts`: POSTED, PAYMENT_PENDING and DISPUTED invoices shared the same medium-severity open-items blocker. Reused current `ap-history-financial.ts` allocation/credit/supplier-ledger validation rather than replacing payment accounting. Existing payment-exception, provider coverage, suspense, supplier-payment posting and payroll reconciliation guards remain active.

## Owned implementation

- `services/accounting/close-payable-balances.service.ts`: complete scoped invoice population, evidenced balance classification, per-currency context, cutoff checks, explicit reasons and tenant-bound result hash.
- Narrow changes to `data-trust.service.ts`: replace generic open-invoice blocker with explicit AP exceptions; expose classification in portal and hashed trust-pack output.
- Narrow changes to `close-assurance.service.ts`: classification receipt and retained CloseRun metadata.
- `prisma/migrations/20261016200000_close_payable_sources/migration.sql`: source revision triggers on supplier-ledger and match-exception rows; revision upgrade for organizations with retained close runs.
- New classifier unit suite and PostgreSQL suite; additions to existing portal/close tests and the bounded unit configuration. Existing AP financial/allocation tests are included unchanged.
- [Behavior and rollout contract](CLOSE_PAYABLE_BALANCE_CLASSIFICATION.md), this report and close-contract cross-reference.

## Mocked and pure verification

Command: `node node_modules/jest/bin/jest.js --config jest.close-scope.config.cjs --runInBand --noStackTrace`.

Final result: **15 suites / 385 tests passed**. Includes prior Phases 1–3, classifier cases for due/overdue/unknown maturity, archives, partial payments, credits/zero/negative balances, disputes, missing ledger evidence, PAID mismatch, matching approval expiry, multiple currencies, cutoff and collection failure. Portal tests prove normal unpaid amounts alone preserve T4/certified eligibility, while AP exceptions block. Close tests prove classification receipt/metadata persistence. Trust-pack tests check inclusion in the JSON payload.

The first attempt caught an extra parenthesis in the new predicate (14 suites / 367 tests passed; one suite could not load). It was corrected before database testing and final verification. No failures were suppressed.

This lane mocks persistence; it does not prove PostgreSQL transaction behavior or live authentication. `node scripts/generate-close-test-client.cjs` regenerated only the ignored isolated test client. No application client DLL/process was modified or stopped.

Focused compile: `node node_modules/typescript/bin/tsc -p tsconfig.close-scope.json --pretty false`: **passed** on final source. Scoped `git diff --check` passed with only Windows line-ending notices; new implementation files were separately checked for trailing whitespace. Compilation is separate from a full application build; build was not run.

## Real PostgreSQL verification

Runner: `node scripts/run-close-scope-postgres.cjs` with an explicit fresh localhost/public-schema `CLOSE_TEST_DATABASE_URL`. The reviewed helper creates a uniquely named target, refuses existing databases, overrides all Prisma connection variables, deploys migrations, checks `current_database()` and uses synthetic fixtures. Credentials were read only to construct the disposable target before connecting; connection strings were not printed. Local socket access used sandbox escalation for the disposable target only.

Final Phase 4 target `stoquify_local_close_scope_20261016_df344ee8`: migration and identity checks passed; **4 suites / 26 tests passed** on final source. Initial retained target `stoquify_local_close_scope_20261016_fc7472e1` also passed 4 suites / 26 tests before the final result-binding/readability refinements.

Five new real-database tests prove:

1. Normal/overdue/archived obligations remain nonblocking for AP, with separate EUR/XAF amounts.
2. Disputes, unexplained paid amounts and missing supplier-ledger evidence produce high AP exceptions alongside a normal invoice.
3. Opening and late-imported in-period obligations are retained; foreign/future/post-cutoff invoices are excluded.
4. A supplier-ledger source change invalidates a READY close; rollback leaves it current.
5. An explicit match exception blocks classification and invalidates a READY close.

Prior Phase 1–3 database suites remain included. These tests use real collector/portal persistence and source triggers. Synthetic batches intentionally do not establish every unrelated ledger control; the AP tests assert purchasing readiness and AP findings, not full end-to-end statutory certification. Upgrade invalidation of preexisting application assessments is source-reviewed migration behavior; no application migration was run. All disposable targets remain retained, with no reuse, reset or deletion.

## Not run / release limits

No browser/rendered checks, live sessions, external bank verification, production-load checks or statutory compliance certification. The new per-invoice detail is available in retained data/export evidence; no new UI form was added. Later mutations with insufficient historical reconstruction remain exceptions. Production-volume complete-population queries and existing tenant revision contention require normal rollout monitoring. Deploy code/migration through release controls and reassess affected close evidence before relying on prior certificates.

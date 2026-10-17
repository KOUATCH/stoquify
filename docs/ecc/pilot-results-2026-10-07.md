# ECC / UIUX bounded pilot results — 2026-10-07

**Result: 10 existing suites, 123 tests passed across two scoped runs.** This establishes current local mocked-unit, pure-function, static-contract and jsdom component evidence. It does not complete Phase D1/D2 browser, real-PostgreSQL or independent domain-review acceptance.

Scope comes from Phase D1/D2 of [the configuration blueprint](./stoquify-codex-ecc-uiux-configuration-blueprint-2026-10-07.md). No application, domain-service, schema or migration source was changed for this pilot. The new `jest.ecc-pilots.config.cjs` makes the existing selected tests reproducible without the full repository crawl. There is no claimed before/after product improvement, new vulnerability discovery or causal measurement of ECC effectiveness.

Observed checkout HEAD: `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`; tests used the shared working tree, not a clean-checkout certification. Runtime metadata: Node `22.17.0`, Next `15.5.18`, Jest `30.4.2`, jest-environment-jsdom `30.4.1`, Prisma client `6.19.3`.

## Test-lane construction and safety inspection

The pilot config uses the installed `next/jest` with **no `dir` option**. The installed implementation was inspected: Next configuration, environment-file loading and TypeScript configuration loading occur only inside its `options.dir` branch. This lane keeps the installed Next/SWC Jest transform, its `server-only` mapping and the existing `jest.setup.ts`, with explicit test roots and exact test matches. It does not load the root `jest.config.ts`, `next.config` or application `.env` through Next/Jest. The selected transform does not invoke Babel configuration.

Node handles security/service/static contracts; jsdom handles the selected React components. `jest.setup.ts` globally mocks Prisma, and selected domain tests additionally provide their own mock clients or transaction objects. Authentication and password-recovery calls are mocked in the component suites. Reviewed tests do not launch migration, seed, deployment or database runners. Generated Prisma types/decimal implementation remain runtime prerequisites. These are reviewed test boundaries, not an operating-system network sandbox; any future import/setup change requires another side-effect review.

The initial eight-suite run used:

```powershell
node node_modules/jest/bin/jest.js --config jest.ecc-pilots.config.cjs --runInBand --no-cache
```

Result: **8 suites passed, 98 tests passed, 0 snapshots; 32.794 seconds.** Two additional inspected suites were then added to the config and run separately:

```powershell
node node_modules/jest/bin/jest.js --config jest.ecc-pilots.config.cjs --selectProjects ecc-unit --runInBand --no-cache --runTestsByPath services/accounting/__tests__/close-assurance-current-proof.test.ts services/payroll/__tests__/payroll-immutability-migration.test.ts
```

Result: **2 suites passed, 25 tests passed, 0 snapshots; 1.569 seconds.** The first command now selects all ten suites. The 123-test total is the sum of these two non-overlapping runs; it is not a claimed single full-lane run after expansion.

## Evidence matrix

| Existing target | Outcome | Evidence class and what it establishes | Remaining boundary |
|---|---|---|---|
| `lib/security/__tests__/rbac.test.ts` | Passed | Mocked server unit: live-session request, revocation, current grants, authority lookup failure, stable subject identity, cross-organization rejection | Live session service, database policy and full action inventory |
| `services/pos/__tests__/checkout-lifecycle.service.test.ts` | Passed | Mocked transaction unit: lease ownership, lost compare-and-set, retained pending request, interruption recovery, stock revalidation and preservation of uncertain financial work | Actual transaction isolation, overlapping database writers, browser-tab recovery |
| `services/purchasing/__tests__/payment-release-evidence.test.ts` | Passed | Mocked evidence reader plus real schema/hash logic: source links, missing evidence, duplicate records, identity/terms injection and database-error propagation | Complete payment-command replay, rollback and real-bank settlement |
| `services/inventory/__tests__/inventory-stock-event.service.test.ts` | Passed | Mocked inventory kernel: source-bound movements, fractional allocation, closed-period rejection, conflicting idempotency, required conflict evidence and close-invalidation handoff | Real PostgreSQL concurrency/rollback and producer completeness |
| `scripts/__tests__/public-color-contract.test.js` | Passed | Static source contract: canonical product/public/auth token bindings and action shade | Computed browser colors, contrast in each state and visual regressions |
| `components/dashboard/__tests__/DashboardRouteState.test.tsx` | Passed | jsdom component: permission-recovery links, EN/FR copy, single main landmark, loading status | Browser rendering, keyboard task completion and assistive technology |
| `components/auth/__tests__/LoginSubmissionSafety.test.tsx` | Passed | React static render/jsdom with mocked auth: POST fallback, disabled pre-hydration credentials, controlled submission and preserved rejected form | Real hydration, network/auth integration and successful navigation |
| `components/auth/v2/__tests__/PasswordRecoveryForms.test.tsx` | Passed | jsdom with mocked server actions: EN/FR recovery, uncertain-response draft preservation, focused feedback, duplicate suppression, malformed-link handling and truthful completion | Real token lifecycle, mail delivery, live error/timeout behavior |
| `services/accounting/__tests__/close-assurance-current-proof.test.ts` | Passed | Pure decision model: stale proof, missing/current exports, reopened findings, unavailable evidence and private source identifier suppression | Atomic source invalidation, tenant-scoped query completeness and rendered stale-state propagation |
| `services/payroll/__tests__/payroll-immutability-migration.test.ts` | Passed | Static SQL-text contract: expected immutability trigger definitions, forward lifecycle terms and append-only evidence definitions | Migration replay and actual trigger enforcement on a database |

## Findings accepted into the configuration work

1. **Verification must select a lane by effects.** The blueprint already identified that `build` migrates and several E2E scripts migrate/seed. These commands were not used. A narrow explicit pilot lane is now available; it does not replace existing financial/database release gates.
2. **Critical business services need coverage visibility.** The default coverage list omitted `services/**` in the inspected baseline. This is a configuration finding handed to the main implementation; these pilot runs intentionally do not collect or claim a coverage percentage.
3. **Domain controls already exist and should be preserved.** Passing targeted tests support retaining trusted authority, reviewed commands, replay identity, evidence linkage and truthful pending/stale/recovery states. There is no justified application rewrite or new generic abstraction from these results.
4. **Evidence classes must remain separate.** Mocking a transaction is useful for control flow; SQL text assertions are useful for migration contract drift. Neither proves actual concurrent writes, rollback, immutable rows, live authentication, accessibility conformance or deployed worker operation.

The isolated config is the only code/config addition owned by this pilot. No application defect was discovered by these test results. Prior audit findings are not counted as new incremental ECC discoveries. Accepted unique findings attributable to a second independent review, review-time improvement and rework reduction remain unmeasured.

## Disposable PostgreSQL diagnosis

Read-only tool metadata found `docker`, `podman`, `psql`, `pg_ctl` and `initdb` **not on PATH**. This does not prove that no PostgreSQL server exists; no database connection or service probe was attempted and no environment secrets were read or printed.

Existing facilities were inspected as source only:

- `scripts/prisma-local-fresh-bootstrap.js`: validates a named local target, creates a database and runs migrations. It requires separately verified local connection details and ownership.
- `scripts/ui-workflow-postgres-target.cjs`: requires a local hostname, a constrained `stoquify_local_ui_workflow_*` name, a non-production process and a target distinct from the application database.
- `scripts/with-payroll-immutability-test-db.js`: resolves explicit test URLs or a local source. Its ability to resolve a URL does not establish a disposable database in this session.
- `scripts/run-purchase-receiving-postgres-tests.js`: creates/drops a certification schema and executes mutation fixtures. It was not safe to infer target ownership from the filename, so it was not run.

Required next evidence: provision or positively identify a disposable local PostgreSQL instance and an explicitly owned test database; inspect the selected runner and migration/reset effects; verify the resolved target before any mutation; then run isolated AP/POS concurrency, inventory rollback, payroll trigger and close-invalidation tests. Do not seed or reset a shared application database.

## Phase D acceptance still open

- Real-DB simultaneous-writer, rollback, actual trigger and persisted replay evidence.
- Rendered desktop/mobile EN/FR journeys, focus/keyboard completion, responsive overflow, reduced motion, visual/contrast checks and screen-reader result. jsdom success does not satisfy them. Browser/host diagnosis is handled separately by the main implementation.
- Independent financial/domain reviewer acceptance of the declared AP/POS pilot.
- A measured established-process review followed by a deduplicated ECC/UIUX review. Current results are a baseline, not a controlled tool-effectiveness experiment.

Owner roles: backend/financial engineer for database evidence; frontend/QA and designer for rendered states; independent domain reviewer for financial acceptance; development-tooling maintainer for lane/config drift. No recurring automation, deployment or remote branch-policy change was activated by this pilot.

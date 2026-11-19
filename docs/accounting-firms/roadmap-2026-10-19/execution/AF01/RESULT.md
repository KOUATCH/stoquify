# AF01 result: portfolio read model

**Status: VERIFIED for the AF01 read-model scope.**  
**Completed:** 19 October 2026. **Executor:** Codex in the existing working tree.  
**Source baseline:** `6ee84a90c760d2864f6aef672d8b393ac2b65971`, plus this uncommitted change and preserved pre-existing landing/onboarding/retention edits.  
**Run evidence:** [2026-10-19-run-01](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF01/2026-10-19-run-01>). **Contract:** [PORTFOLIO_READ_CONTRACT.md](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF01/PORTFOLIO_READ_CONTRACT.md>).

## Outcome

The accountant portfolio now has bounded continuation and search, current server-owned proof, and explicit historical score semantics. It reuses the existing client mandate, permission, account-state, module-entitlement, period-selection, assessment-order and proof-grade logic.

The current action accepts actor-bound page input and returns each client's independently selected period, assessment-as-of time, snapshot checked-at time, canonical proof state/grade/blockers, and page-local coverage. The existing page has minimal continuation/restart links and historical-score labels; the full portfolio UX remains AF02.

**Verification:** 6 mocked/pure service suites with **231 tests**, 1 jsdom component suite with **5 tests**, and 1 real PostgreSQL suite with **6 tests** passed. Focused TypeScript checking passed. All **99 existing migrations** applied successfully to the fresh disposable test databases. No application database or production schema was changed.

## Baseline refresh and reuse decisions

The original gaps remained present: the portfolio read at most 100 grants, returned no continuation, and selected stored scores from nonvoided runs by asOf. Its single production caller was the protected accountant-access action. The existing work desk supplied the active-member/current-role/module/before-and-after access pattern; portfolio reads retain READ capability so READ_ONLY mandates remain eligible.

The September graph's accountant-access action node (community 58) was useful for discovery but did not establish current behavior. Current callers and source were inspected directly. No applicable nested AGENTS override was found in the touched service/action/component paths.

No new firm identity, engagement schema, financial table, index, score algorithm or permission system was added. The private close-period selector was extracted for both readers, with an ID tie-break for equal period start dates. The assessment-selection overlay was extracted for consistent detail/portfolio proof. Database aggregate counts feed the existing proof function; they do not create a parallel grade algorithm.

Saved source revision remains provenance. A global revision mismatch by itself is not treated as period-specific staleness; existing source invalidation/publication semantics remain authoritative. No mutating revision/publication helper or fallback assessment is called by portfolio reads.

## Owned implementation

| Area | Files and change |
|---|---|
| Boundary and DTO | [accountant-access.actions.ts](<E:/ohada saas/Focused projects/stoquify/actions/accounting/accountant-access.actions.ts:37>), [accountant-access.schemas.ts](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-access.schemas.ts>), [accountant-access.service.ts](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-access.service.ts>) — protected actor context, strict bounded input, compatible entry-point export/type |
| Portfolio orchestration | [accountant-portfolio.service.ts](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-portfolio.service.ts:80>) — grant-ID seek paging, scoped cursor, active membership/current RBAC, module reads, bounded sequential snapshots and final access rechecks |
| Proof projection | [accountant-portfolio-proof.service.ts](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-portfolio-proof.service.ts:10>) — canonical per-client period/run, unsampled aggregates, parameterized retained-export count |
| Shared close logic | [close-period-selection.service.ts](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-period-selection.service.ts:12>), [close-assurance-current-proof.ts](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance-current-proof.ts:44>), [close-assessment-order.service.ts](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assessment-order.service.ts:18>), [close-assurance.service.ts](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance.service.ts:2858>) — shared selection/proof semantics; existing dashboard tests retained |
| Consumer compatibility | [AccountantPortfolio.tsx](<E:/ohada saas/Focused projects/stoquify/components/accounting/AccountantPortfolio.tsx>), [portfolio route](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/accountant-portfolio/page.tsx>) — page-only counts, empty-page continuation, query forwarding and historical labels; no layout redesign |
| Regressions | [portfolio service tests](<E:/ohada saas/Focused projects/stoquify/services/accounting/__tests__/accountant-portfolio.service.test.ts>), [proof tests](<E:/ohada saas/Focused projects/stoquify/services/accounting/__tests__/accountant-portfolio-proof.service.test.ts>), [component tests](<E:/ohada saas/Focused projects/stoquify/components/accounting/__tests__/AccountantPortfolio.test.tsx>), [PostgreSQL tests](<E:/ohada saas/Focused projects/stoquify/services/accounting/__tests__/accountant-portfolio.postgres.test.ts>) |
| Existing test transition | [accountant-access.service.test.ts](<E:/ohada saas/Focused projects/stoquify/services/accounting/__tests__/accountant-access.service.test.ts>) — obsolete user-ID-only portfolio test replaced by dedicated contract and authorization regressions |
| Verification tooling | [unit/component config](<E:/ohada saas/Focused projects/stoquify/jest.accountant-portfolio.config.cjs>), [focused TypeScript config](<E:/ohada saas/Focused projects/stoquify/tsconfig.accountant-portfolio.json>), [PostgreSQL config](<E:/ohada saas/Focused projects/stoquify/jest.accountant-portfolio-postgres.config.cjs>), [guarded PostgreSQL runner](<E:/ohada saas/Focused projects/stoquify/scripts/run-accountant-portfolio-postgres.cjs>) |

## Acceptance criteria

| Criterion | Result | Evidence |
|---|---|---|
| AF01-AC1: 101+ grants traversable; truthful counts/coverage | PASS | Mocked and real **105-client, six-page** traversal. At most 20 returned clients and 21 candidate positions per query. Empty denied pages preserve continuation. No global total is fabricated. |
| AF01-AC2: stale/absent/superseded/ambiguous certification never appears current | PASS | Stored 100/CERTIFIED fixtures with stale metadata, absent exports/evidence, tied/voided assessments; latest adverse RUNNING run retained. Aggregate/detail grade parity and real stale snapshot transition tested. |
| AF01-AC3: canonical close proof agrees for equivalent client/period/snapshot | PASS for read-model semantics | Shared period and assessment-selection helpers, existing close-dashboard regressions, pure aggregate/full-detail equality and real persisted relation parity. Full portal/browser rendering was not exercised and is not claimed. |
| AF01-AC4: access denials expose no client names/proof | PASS | Mocked actor/home/search/page-size cursor mismatches, active-role/home-module loss and first-client revocation during fan-out. Real committed revocation after snapshot, expired/scheduled/inactive/malformed-scope grants, client-module loss, home-role loss and cross-home denial. |
| AF01-AC5: mocked tests and separate disposable PostgreSQL evidence | PASS | 231 service/pure + 5 component tests; 6 real PostgreSQL tests; 99 migrations applied to fresh disposable databases; query and snapshot evidence retained. |

These are phase gates, not production, accessibility, legal, accounting or security certification. AF16 release qualification has not run.

## Verification commands and evidence lanes

The command registry, current runner/config definitions, lifecycle hooks and imported test setup were inspected before execution. Custom direct lanes were reviewed explicitly; no registry fingerprints were changed.

| Lane | Actual invocation/result |
|---|---|
| Workflow contract | `npm run agent:workflow:check` — exit 0; 196 scripts remain unclassified. [Log](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF01/2026-10-19-run-01/workflow-check.log>). |
| Mocked/pure + jsdom | `node node_modules/jest/bin/jest.js --config jest.accountant-portfolio.config.cjs --runInBand --no-cache --json --outputFile docs/accounting-firms/roadmap-2026-10-19/execution/AF01/2026-10-19-run-01/unit-component-rerun.json` — exit 0; 7 suites/236 tests. [Results](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF01/2026-10-19-run-01/unit-component-rerun.json>). No Next app config, dotenv or application DB is loaded by this lane. |
| Focused types | `node --max-old-space-size=8192 node_modules/typescript/bin/tsc -p tsconfig.accountant-portfolio.json --pretty false` — exit 0, no diagnostics; config disables incremental output. [Log](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF01/2026-10-19-run-01/typecheck-focused.log>). |
| Full repository types | `node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false` — exit 2; 17 TS2737 errors in the existing `services/onboarding/__tests__/fixtures/opening-position-contract.ts` because the repository target is ES2017. No diagnostics in AF01 production files. Unrelated fixture edits were preserved. [Log](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF01/2026-10-19-run-01/typecheck.log>). |
| PostgreSQL | With the AF01-owned cluster running and `AF01_CLUSTER_DIR` set to its absolute path: `node scripts/run-accountant-portfolio-postgres.cjs stoquify_local_af01_20261019_r2` — exit 0. The runner verifies the cluster data directory, refuses an existing database, runs migration deploy only against the fresh target and executes the six synthetic tests. [Test results](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF01/2026-10-19-run-01/stoquify_local_af01_20261019_r2-tests.json>), [migration log](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF01/2026-10-19-run-01/stoquify_local_af01_20261019_r2-migrations.log>), [target identity](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF01/2026-10-19-run-01/stoquify_local_af01_20261019_r2-target.json>). |
| Diff hygiene | `git diff --check --` the owned tracked source/test/consumer files — exit 0. Only CRLF normalization warnings, no whitespace errors. |
| Browser/rendered product | NOT RUN. jsdom checks English/French text, encoded navigation links, empty-page continuation and focusability; it is not an authenticated browser or responsive-layout certification. AF02 owns the richer UI and rendered validation. |

The real-database suite injects an actual PrismaClient into the application's database import. Authorization, module queries and proof queries execute on PostgreSQL. A wrapper around the actual proof function schedules the competing writer for the revocation test; it does not replace query results. Event publication is a fail-fast test seam because the read path must never publish an event.

### Failures and recoveries retained

- Initial component run failed on Lucide's ES-module entry. The bounded test config now maps the installed CommonJS entry; rerun passed. The first JSON is retained.
- The configured local server was unavailable. A new sandbox-owned cluster started, but loopback/host isolation prevented the verification process from reaching it. Its starter was cancelled. No application connection was repurposed.
- An approval-controlled host cluster was then created under the task's visualization workspace, bound only to 127.0.0.1:55441. No approval was rejected.
- Database run r1 applied all migrations and passed three tests; an attempt to spy on a nonconfigurable SWC export prevented the revocation fixture, and a following fixture assumed that revocation. The scheduling wrapper and independent module-denial fixture corrected the harness. Fresh database r2 passed all six tests. The r1 database and logs were retained, not reset.
- The successful host test server was explicitly stopped after verification. No persistent application or production service was started or modified.

## Query and snapshot evidence

[Measured JSON](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF01/2026-10-19-run-01/stoquify_local_af01_20261019_r2-query-evidence.json>) records:

- 105 clients traversed through six pages with maximum page size 20.
- 1,941 SQL statements, including authorization/module checks and transaction setup, across the complete traversal.
- Approximately **4.71 seconds** for that traversal on the isolated local PostgreSQL 17.5 fixture; maximum logged individual query duration **16 ms**.
- No INSERT/UPDATE/DELETE during the measured portfolio read.
- An independent connection committed invalidation while a RepeatableRead snapshot remained open: the existing snapshot stayed CURRENT/certified and a new snapshot returned STALE/blocked.

This fixture has mostly clients without a close assessment and one populated proof case. It does not establish production p95, large-history performance or a service-level objective. The relatively high authorization query count is explicit; batching or indexes require measured representative evidence in AF16, not speculative optimization here.

## Data, rollout and rollback

No application schema migration, backfill, new financial entity or index is needed. The SQL migration exercise prepared synthetic test databases using existing migrations only.

Roll out the protected action, service/DTO, shared helpers and existing consumers as one coherent application artifact. First confirm target firms and clients have the applicable accounting/close-assurance read entitlements. The change intentionally stops returning client metadata when current mandate, tenant or entitlement checks deny access.

Observe page latency/error rates, empty-page continuation failures, unexpected denied clients and canonical proof disagreement using existing safe operational telemetry. Do not log raw client evidence or cursor contents.

For rollback, revert only owned AF01 hunks/files together or disable the new consumer through the existing release mechanism. Keep historical-score labels truthful; do not restore a current-proof claim based on the stored score. Preserve grants, source history and financial records. No data reversal is necessary.

## Review lenses and remaining limits

- Architecture/backend: existing action and service entry point reused; read-only projection extracted without invoking assessment collectors.
- Database: per-client RepeatableRead, bounded result/aggregate shapes, real snapshot/race evidence; no schema/index change.
- IAM/privacy: trusted actor context, refreshed same-home permissions and explicit client mandates, entitlement/retention evaluator reuse, redacted denials.
- Accounting/evidence: historical score retained, current evidence grade/selection shared with detail, no financial writes.
- Frontend/workflow/localization: minimal compatible continuation and historical labels, EN/FR component checks; full browser work remains AF02.
- QA/operations: focused services, component, type and real-DB evidence separated; repeatable guarded runner and retained failed attempts.
- Country/statutory rules, AI/provider egress, payroll/POS changes, pricing/billing/engagement commercialization: not applicable; no behavior in these areas was changed.

The full repository type check still has the unrelated fixture errors above. Browser acceptance and production performance/release assurance remain outside this phase. **Next planned phase: AF02**, using this DTO; it was not started automatically.


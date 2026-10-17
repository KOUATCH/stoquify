# Sales dashboard phase 6 verification

Date: 2026-10-11. Baseline HEAD: `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`. Local implementation only; no commit or deployment. Existing phases 0–5 and unrelated working-tree changes preserved.

## Delivered scope

- An attention queue below the performance KPIs, initially showing up to three findings with a disclosure for the remainder. Objective signals: overdue current AR per currency, nonzero saved daily cash variances, and currently low/out-of-stock products sold in the selected sales population.
- Reuses the existing authorized AR/product results through one shared React Query key per source/scope/revision. Cash adds one separately protected bounded read. Each finding includes amount or quantity, reason, location, source time/timezone and an authorized destination. Stable source ordering and source-key deduplication; no invented urgency, loss or replenishment quantities.
- Explicit partial assessment for missing/restricted/failed sources, incomplete saved-day coverage and unknown stock. No all-healthy claim on an empty list. Failed or revoked results stop supplying findings. Cash source uses the same reports/sales permission pair as Daily report; AR and stock retain their independent finance/inventory gates.
- Controlled CSV export of the **summary and full daily trend**, with an explicit exclusion of record search/pagination and finance/product panels. The same newly read report supplies both displayed totals and CSV. In-flight older dashboard queries are cancelled before installing the export result; late responses after scope/organization unmount cannot download.
- Server checks reports.export + reports.read + sales.read, trusted tenant, strict scope, sales module observation and five-minute fresh auth. Reuses export safety policy, watermark and durable audit. The file is withheld on audit or reconciliation failure. Metadata includes source, organization/location, dates and half-open instants, status/channel, currency/timezone, checked/generated time and watermark. Exact decimal strings, BOM UTF-8, escaped quotes and formula-prefix neutralization. No customer identities in the file.

## Owned files

New production:

- `services/analytics/sales-cash-attention.service.ts`
- `services/analytics/sales-performance-export.service.ts`
- `actions/analytics/sales-export.actions.ts`
- `lib/analytics/sales-attention.ts`
- `hooks/analytics/useSalesInsight.ts`
- `components/analytics/SalesAttentionQueue.tsx`
- `components/analytics/SalesPerformanceExport.tsx`

Integration changes: existing phase-owned `sales-insights.actions.ts`, `sales-performance.actions.ts`, `sales-insights-scope.ts`, `SalesPerformanceDashboard.tsx`, `SalesInsightsPanels.tsx`, EN/FR message namespaces and sales page contract. New four phase-6 test suites plus a dashboard refresh/key-collision regression. Unrelated changes in these files and elsewhere remain intact.

## Source inspection

Reviewed current workflow/command registry and runner before execution; UI master/page contract and existing ActionQueueItem; report, AR, stock, safe action, fresh-auth and controlled-export implementations. The recovered original plan identifies phase 6 as attention queue plus scoped export and release verification. No external dependency or migration is necessary.

Reused project UI/UX Pro Max and ECC security-review guidance from earlier phases. Focused UX search `action queue partial data progressive disclosure` returned bulk actions, autoplay and heading balance from ux-guidelines.csv. The first two are irrelevant and were rejected; existing dashboard wrapping, localized primitives and native disclosure govern this change. No replacement design system or agent delegation.

Cash read: active tenant and owned location validated before evidence, date-only saved report bounds, 1,001-row sentinel with refusal above 1,000, repeatable-read. Existing product/AR capacity limits remain unchanged. Cash coverage uses selected day count times scoped location count, including locations without saved reports. Provisional reports remain labelled provisional. Operational evidence is not immutable accounting assurance.

Export: strict read-action tenant guard precedes service use; service also reevaluates export policy before file release. Denied policy decisions are audited outside a transaction that would be rolled back by throwing. Allowed export audit must succeed before release. Audit is the only added write; sales, cash, stock and accounting records are not modified. Summary/trend generation is bounded to the existing 366-day range, one trend row per day. No client-supplied total, permission, row count, customer identity or arbitrary filename is trusted.

## Executed checks

| Check | Result | Evidence class |
| --- | --- | --- |
| `npm run agent:workflow:check` | Passed; 198 package scripts unclassified | Workflow contract only |
| Final combined targeted regression | **13 suites / 115 tests passed**, 39.122 s | Pure/mocked Prisma and auth; jsdom components |
| Scoped TypeScript, including transitive imports | **0 diagnostics**, no emit/incremental writes | Static, not repository-wide |
| ESLint on all 12 affected production files | Passed | Static |
| `git diff --check` on tracked owned integration files | Passed | Whitespace |

Exact regression command:

```powershell
node node_modules/jest/bin/jest.js --config jest.payroll-trust-spine.config.cjs --runInBand --no-cache --runTestsByPath services/analytics/__tests__/sales-phase-six.test.ts actions/analytics/__tests__/sales-phase-six.actions.test.ts components/analytics/__tests__/sales-attention-queue.test.tsx components/analytics/__tests__/sales-performance-export.test.tsx services/analytics/__tests__/sales-insights.test.ts actions/analytics/__tests__/sales-insights.actions.test.ts components/analytics/__tests__/sales-insights-panels.test.tsx services/analytics/__tests__/sales-performance.test.ts actions/analytics/__tests__/sales-performance.actions.test.ts components/analytics/__tests__/sales-performance-dashboard.test.tsx components/analytics/__tests__/daily-sales-dashboard.test.tsx services/accounting/__tests__/ar-open-item.service.test.ts services/analytics/__tests__/completed-sales-evidence.test.ts
```

The selected Jest config, setup, server-only shim and named imports were inspected. Application Prisma is mocked; no environment loader, seeding or real database runner. Initial runs exposed the queue test's ESM icon import and reset IntersectionObserver setup; local icon and Next Link mocks fixed the harness without changing production behavior. Browser review exposed colliding sibling keys during refresh; distinct component prefixes fixed the implementation and a regression test now covers one instance of each panel after refresh.

Static command: direct installed ESLint with no `--fix` over the new/integrated production files. TypeScript uses the compiler API and current tsconfig, with four roots (`sales-export.actions.ts`, `sales-insights.actions.ts`, `sales-performance.actions.ts`, `SalesPerformanceDashboard.tsx`), transitive imports, `noEmit: true`, `incremental: false`. Registry-unlisted command definitions were reviewed for filesystem-only effects before execution. No broad build/migrate/seed invoked.

## Browser evidence

Existing authenticated Super Admin session, tenant `rds_org_001`, local app `http://localhost:3000`. No credentials collected, fixture rows inserted or user roles changed.

- EN performance scope September 1–30, all locations: 6 orders, 1,686,522.94 XAF. Queue shows overdue AR 197,201.25 XAF, matching the current receivables panel. Cash evidence is explicitly partial. No low-stock signal was present in this existing dataset.
- Refresh retains one attention queue and one export control. Keyboard Tab from queue refresh reaches the receivable link. Default browser CSS width 927, document client/scroll width 916: no document overflow at that width.
- Receivable link opens `/en/dashboard/finance/receivables/history`; browser Back restores the full sales query string. Destination visibly reports the organization-wide AR history and rounded 197,201 XAF; the queue retains the exact decimal source value.
- Export click is safely refused with the localized recent-authentication recovery message. Existing session exceeds five minutes. Successful actual file download was **not** verified; the session was not bypassed or replaced. Successful generation, audit failure, stale authentication, permission denial, reconciliation, formula safety, decimal precision and stale UI response are covered by mocked tests.
- FR mobile: the initial session-loading state stalled; one reload recovered the report. The final page shows localized queue reasons, 197 201,25 XAF, timestamps, broader-destination explanation and partial cash coverage. Queue refresh completes with the same evidence. A long export label initially clipped at the narrowest width; adding max-width and normal text wrapping fixed it. Final button client/scroll width both 238 at CSS inner width 282; document client/scroll width both 271. At CSS inner width 391, document client/scroll width both 380. IAB viewport requests 390/540 produced CSS widths 282/391 respectively; these are measured widths, not assumed device dimensions. Temporary viewport override reset.
- Final screenshot: `C:/Users/J COMPUTER/.codex/visualizations/2026/10/11/01a12b04-d704-7140-8a30-f8957f1b40e4/sales-phase-6-mobile-fr.jpg`. It shows the queue, partial assessment, overdue amount, destination and checked time. The final change after the 115-test run was only export-button wrapping classes; rendered sizing was rechecked at both mobile widths.

## Remaining release gates

No explicitly disposable PostgreSQL target was established. Real SQL joins/aggregation, tenant/location isolation, snapshot concurrency and durable audit rollback tests remain unexecuted. Existing app browser reads do not replace those fixture tests. Representative small/large database performance measurements, payload/load baselines and EXPLAIN plans remain unexecuted. Bounded source reads and mock assertions are not a load certification.

Restricted finance/stock role browser sessions, saved nonzero cash and low-stock browser fixtures, full screen-reader/accessibility audit and a successful fresh-session download remain release prerequisites. EN/FR unit tests are separate from rendered evidence. No deployment or production-readiness certification is claimed.

Rollback: remove phase-6 queue/export mounts, actions/services/helper and owned message namespaces; restore the original local insight hook and omit the additive location-name select/canExport capability if desired. Preserve phases 0–5 and unrelated edits. No schema or business-record rollback is required; retain any already-written export audit evidence.

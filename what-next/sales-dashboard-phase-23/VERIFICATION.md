# Sales dashboard phases 2 and 3

Date: 2026-10-11. Baseline: `6f7f6741cabfdeff61989a40455d6f3ea37b33c9` with pre-existing working-tree edits, including phases 0/1. Scope: performance trends/comparisons and sales records/drill-through. Phases 4–6, schema changes, data mutations and deployment are excluded. No commit made.

## Delivered

- Separate Performance and Daily report views, validated URL filters, reload/Back behavior and organization-scope invalidation. Hydration shows a neutral loading state before choosing the bookmarked view.
- Today, Yesterday, Last 7 days, This month, bounded custom range; location, completed/delivered status and POS/delivery population filters.
- Decimal-safe value/count/average, absolute and percentage change, explicit comparison windows, current-day cutoff at the server instant and equivalent previous local clock time. Zero/negative percentage baselines and ambiguous comparison times are unavailable.
- Grouped database daily trend, factual summary, exact-value table, keyboard date selections and KPI-to-record focus.
- 25-row keyset pages ordered by date and ID, record-only number/customer search, and separately authorized read-only detail dialog. Customer names/search require `customers.read`; customer name lookups also bind the tenant, and no contact details or balances are selected.
- EN/FR copy and existing dashboard tokens. Source definitions and query budget are in the [sales contract](../../design-system/stoquify/pages/sales.md).

The optional hourly view is not included: single-day selection shows its daily total and source records. Collections, receivables, margin and attention queues remain later phases.

## Owned files and preservation

New production files: `components/analytics/SalesDashboard.tsx`, `SalesPerformanceDashboard.tsx`; `hooks/analytics/useSalesDashboardScope.ts`; `lib/analytics/sales-performance-scope.ts`; `services/analytics/sales-performance-period.ts`, `sales-performance.service.ts`; `actions/analytics/sales-performance.actions.ts`.

Changed existing files: sales `SalesClientPage.tsx`, new `salesPerformance` namespace in each EN/FR message file, the sales page contract and one design-master row. Added three focused test files. Updated three calls in the existing sales route test from `SalesPage()` to `SalesPage({})` to match the existing required Next.js props contract; production route authorization was unchanged. That test and route had no pre-existing diff when inspected. Other modifications in message files and throughout the repository were preserved.

## Source inspection

Read current workflow, command registry, test lanes, UI constitution, design master, component registry and sales contract. Existing component graph nodes in communities 8 (analytics) and 243 (sales re-export) were used for discovery, with current source overriding dated graph behavior.

Reused protected actions, server RBAC helpers, local-day boundaries, repeatable-read transactions, dashboard classes and the shared dialog. Existing shared sales analytics loads line/payment arrays and converts amounts to numbers; the new view uses a focused grouped read without changing that shared contract. SQL table/column mappings and existing organization/date indexes were checked in the Prisma schema. All SQL values are parameters. UTC timestamp boundaries are explicit; no dynamic SQL identifier comes from input.

UI/UX Pro Max focused chart search returned category/radar guidance, which was not adopted for a time series. Its relevant exact-value table and non-color-access guidance was applied. No palette, dependency or framework changes.

## Executed checks

| Check | Result | Evidence class |
| --- | --- | --- |
| `npm run agent:workflow:check` | Pass; 198 scripts outside manifest | Workflow contract only |
| Final combined regression after all production edits | 6 suites / 46 tests passed in 27.285 seconds | Mocked service/auth, jsdom and route assertions |
| New service, action, component and sales route tests | 4 suites / 30 tests passed | Mocked Prisma/auth + jsdom |
| Existing daily dashboard suite | 15 tests passed | Mocked component regression |
| Existing sales route catalog audit | 1 test passed | Source/catalog assertion |
| Final service/component rerun | 2 suites / 22 tests passed | Mocked regression after scope validation and customer lookup changes |
| Targeted ESLint | Pass | Static |
| Scoped TypeScript roots with transitive dependencies, `incremental:false`, `noEmit:true` | Zero diagnostics | Static, not whole-repository certification |
| Owned tracked diff whitespace check | Pass; CRLF normalization warnings only | Diff hygiene |

The first component run exposed ESM-only next-intl/lucide imports under the existing Jest runner. The test now follows the existing daily suite's mocked translation/icon pattern and verifies actual EN/FR message keys. The first broader route run exposed the stale no-props invocation described above. Both were corrected and rerun; failed attempts are not counted as passing evidence.

Reviewed explicit commands (no build, migration or seed):

```powershell
node node_modules/jest/bin/jest.js --config jest.payroll-trust-spine.config.cjs --runInBand --no-cache --runTestsByPath services/analytics/__tests__/sales-performance.test.ts actions/analytics/__tests__/sales-performance.actions.test.ts components/analytics/__tests__/sales-performance-dashboard.test.tsx components/analytics/__tests__/daily-sales-dashboard.test.tsx 'app/[locale]/(dashboard)/dashboard/sales/__tests__/page.test.tsx' 'app/[locale]/(dashboard)/dashboard/sales/__tests__/route-audit.test.ts'

node node_modules/jest/bin/jest.js --config jest.payroll-trust-spine.config.cjs --runInBand --no-cache --runTestsByPath services/analytics/__tests__/sales-performance.test.ts components/analytics/__tests__/sales-performance-dashboard.test.tsx

node node_modules/eslint/bin/eslint.js components/analytics/SalesDashboard.tsx components/analytics/SalesPerformanceDashboard.tsx hooks/analytics/useSalesDashboardScope.ts lib/analytics/sales-performance-scope.ts services/analytics/sales-performance.service.ts services/analytics/sales-performance-period.ts actions/analytics/sales-performance.actions.ts 'app/[locale]/(dashboard)/dashboard/sales/SalesClientPage.tsx'
```

The TypeScript compiler API was run through a Node here-string, reading `tsconfig.json`, overriding include to those eight production roots and exclude to `[]`, creating a program with `{...config.options, incremental:false, noEmit:true}`, and failing on any `ts.getPreEmitDiagnostics(program)` result. It neither loads application environment nor emits build metadata.

Assertions cover fixture reconciliation, decimal values beyond Number's exact integer range, zero baselines, no-order averages, 366-day query bounds, local midnight/month/DST/partial periods, invalid scopes, SQL parameter populations, record-only search, cursor predicates, tenant denial, direct-detail authorization, customer projection limits, translated messages, URL history, stale-scope hiding, refresh/denial behavior and keyboard chart selection.

## Rendered browser observations

Target: existing authenticated `http://localhost:3000` app; existing SUPER ADMIN in `rds_org_001`. No login credentials extracted, fixture data created or order/payment mutations performed.

- EN Performance read loaded two current-week orders totalling 749,307.38 XAF; displayed records 354,112.88 + 395,194.50 reconcile to that total.
- A source-order dialog loaded date, statuses and monetary fields independently. Close returned keyboard focus to its invoking record button.
- September custom range reloaded from its URL with 6 orders totalling 1,686,522.94 XAF. Two nonzero date buckets (1,057,687.88 and 628,835.06) reconcile to that total; the other recorded-day buckets are zero.
- Searching a displayed order suffix reduced the table to one record while retaining the 6-order headline and trend. The search scope was visible in the URL.
- Keyboard Enter on September 24 selected a one-day scope, cleared record search, and loaded four orders totalling 628,835.06 XAF. Browser Back restored the monthly scope.
- Same-scope background refresh retained the original checked timestamp and labelled itself as refreshing. New scope displayed loading instead of stale figures. A development reload was needed once while a request remained pending; the reloaded custom scope then succeeded without runtime error logs.
- FR mobile rendered translated filters, localized exact decimals, wrapping copy and controls. KPI inspection focused the Documents de vente heading. Requested viewport override: 390 x 844; the in-app browser's observed `innerWidth` was 282 and document width 271, with no page-level horizontal overflow. Wide records use their labelled scroll region. Desktop used the default in-app browser surface. These are sampled rendered checks, not exhaustive accessibility certification.

Screenshots are local under `C:/Users/J COMPUTER/.codex/visualizations/2026/10/11/01a12b04-d704-7140-8a30-f8957f1b40e4/`: `sales-phase-23-performance.jpg` and `sales-phase-23-mobile-fr.jpg`.

## Outstanding release evidence

Dedicated disposable-PostgreSQL fixture tests, concurrent-update pagination experiments, representative large-data EXPLAIN/timing/payload benchmarks, restricted-role browser sessions and full accessibility testing were not run. The existing app successfully executed the new read path, but that does not certify fixture isolation, permissions in a real restricted session or large-data performance. No disposable target was established; none was inferred from the application connection. Pagination beyond 25 rows is verified through mocked query/cursor tests, not the six-record browser example.

The phase 0–3 production release gate remains open until those database/performance/accessibility and role-specific checks are complete. Do not treat this implementation report as production authorization.

Rollback: restore the route client to the phase-1 daily component, remove only the new performance files/message namespace and revert the owned contract edits. No database rollback is required. Preserve unrelated changes and the working phases 0/1 implementation.

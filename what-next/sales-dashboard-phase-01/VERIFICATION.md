# Sales dashboard phases 0 and 1

Date: 2026-10-11. Source baseline: `6f7f6741cabfdeff61989a40455d6f3ea37b33c9` plus the existing dirty working tree. No commit, migration, seed or application-data mutation performed. Later phases have not started.

## Implementation

- Phase 0: [sales page contract](../../design-system/stoquify/pages/sales.md) records metric definitions, saved-report precedence, tenant/permission boundaries, timezone semantics, fixtures and later-phase dependencies. Added its entry to the existing design master.
- Phase 1: URL-backed date/location selection on the sales route; organization-local Today/Yesterday; invalid-link reset; empty-report recovery; bounded latest-activity lookup; calculation disclosure; explicit refresh state; EN/FR copy.
- Latest activity requires both existing report and sales permissions. The tenant comes from the protected server context (including the existing superuser selection policy); a location must belong to that tenant. Saved zero days exclude live orders for that day. Replies from superseded requests cannot navigate the current scope.
- The POS link requires the active organization's POS permission; destination authorization remains independent.

Owned source: `SalesClientPage.tsx`, `CompleteIntegratedDailySalesDashboard.tsx`, new `useDailySalesScope.ts`, `useDailySalesReport.ts`, `daily-sales.actions.ts`, `daily-sales-read.service.ts`, their three focused test files, and new keys under `dailySalesReport` in EN/FR messages. Existing message edits and all unrelated working-tree changes were preserved. Documentation ownership is the new sales page contract, one master-table row and this report.

## Source inspection

Read project workflow, command registry, test-lane guidance, design master/constitution, active reporting and permission paths. Existing graph evidence was checked for discovery, then current source inspected because graphs were stale. Reused current components, semantic tokens, protected actions and repeatable-read service transactions. No new dependencies or schema.

Commands/configuration/setup were inspected before execution. The explicit Jest runner uses mocked persistence, not a real database. The TypeScript check below disables emit and incremental metadata. `npm run build` was not used because it includes migration deployment.

## Executed verification

| Check | Result | Evidence class |
| --- | --- | --- |
| `npm run agent:workflow:check` | Pass; 198 scripts outside the reviewed manifest reported | Repository workflow contract |
| Focused Jest command below | 3 suites, 49 tests passed | Mocked service/action and jsdom component |
| Component suite rerun after final request-staleness/POS-organization changes | 1 suite, 15 tests passed | Mocked component |
| Targeted ESLint command below | Exit 0, no findings | Static |
| TypeScript compiler API, six production roots and transitive dependencies | Exit 0; owned diagnostics 0, dependency diagnostics 0 | Static scoped typecheck, not whole-repository certification |
| `git diff --check` on owned tracked files/messages | Exit 0; route CRLF normalization warning only | Diff hygiene |

```powershell
node node_modules/jest/bin/jest.js --config jest.payroll-trust-spine.config.cjs --runInBand --no-cache --runTestsByPath services/analytics/__tests__/daily-sales-read.test.ts actions/analytics/__tests__/daily-sales.actions.test.ts components/analytics/__tests__/daily-sales-dashboard.test.tsx

node node_modules/jest/bin/jest.js --config jest.payroll-trust-spine.config.cjs --runInBand --no-cache --runTestsByPath components/analytics/__tests__/daily-sales-dashboard.test.tsx

node node_modules/eslint/bin/eslint.js components/analytics/CompleteIntegratedDailySalesDashboard.tsx hooks/analytics/useDailySalesScope.ts hooks/analytics/useDailySalesReport.ts services/analytics/daily-sales-read.service.ts actions/analytics/daily-sales.actions.ts 'app/[locale]/(dashboard)/dashboard/sales/SalesClientPage.tsx'
```

The TypeScript check passed this JavaScript to Node via a PowerShell here-string:

```javascript
const ts = require('typescript'), path = require('path');
const roots = ['components/analytics/CompleteIntegratedDailySalesDashboard.tsx', 'hooks/analytics/useDailySalesScope.ts', 'hooks/analytics/useDailySalesReport.ts', 'services/analytics/daily-sales-read.service.ts', 'actions/analytics/daily-sales.actions.ts', 'app/[locale]/(dashboard)/dashboard/sales/SalesClientPage.tsx'];
const source = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
const config = ts.parseJsonConfigFileContent({...source.config, include: roots, exclude: []}, ts.sys, process.cwd());
const program = ts.createProgram(config.fileNames, {...config.options, incremental: false, noEmit: true});
const diagnostics = ts.getPreEmitDiagnostics(program);
const owned = new Set(roots.map(file => path.resolve(file).toLowerCase()));
const current = diagnostics.filter(d => !d.file || owned.has(path.resolve(d.file.fileName).toLowerCase()));
console.log(ts.formatDiagnosticsWithColorAndContext(current, {getCanonicalFileName: f => f, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n'}));
console.log(JSON.stringify({ownedDiagnostics: current.length, dependencyDiagnostics: diagnostics.length - current.length}));
process.exitCode = current.length ? 1 : 0;
```

Test coverage includes impossible/duplicate URL scopes, cross-organization bookmarks, URL history, preserving unrelated query/hash, scope loading versus refresh, permissions, foreign locations, saved-zero precedence, 366-day bounds, no-result versus error, stale latest replies, focus recovery and organization-local day arithmetic including DST.

## Rendered browser evidence

Target: existing authenticated localhost application, `/en/dashboard/sales` and `/fr/dashboard/sales`. Role: existing SUPER ADMIN session; organization `rds_org_001`, Akwa Flagship Store. No credentials were extracted and no fixtures were created.

- EN desktop viewport override 1440 x 1000: Today and Yesterday update the URL; changing scope hides prior figures while loading. Latest activity moved the empty October 11 report to September 24 with one order. Reload retained September 24. Today followed by browser Back restored the September 24 report and figures.
- An impossible February 30 URL displayed invalid-filter recovery. Reset returned to the current-day default report with working empty-state actions.
- Keyboard Enter expanded the calculation disclosure with visible focus.
- FR viewport override 390 x 844: translated controls and zero/unavailable distinctions rendered; empty-state actions wrapped and remained readable. Keyboard Tab reached the POS link with visible focus. No POS transaction was performed. Viewport override reset after testing.
- Local development server briefly became unavailable during the first browser pass. A subsequent start attempt encountered an occupied port and did not launch another server. No process was killed; the existing server recovered and the relevant checks were completed on a fresh tab.
- Desktop screenshot capture was clipped by the browser host; mobile viewport screenshots captured successfully. A full-page mobile capture failed; normal viewport captures were used. These are visual samples, not exhaustive accessibility certification.

Screenshots saved locally in `C:/Users/J COMPUTER/.codex/visualizations/2026/10/11/01a12b04-d704-7140-8a30-f8957f1b40e4/`:
`sales-phase-01-desktop.jpg`, `sales-phase-01-mobile-fr.jpg`, `sales-phase-01-mobile-recovery.jpg`.

## Not run and next gate

Dedicated real-PostgreSQL fixtures, concurrency/rollback tests, query-plan/load measurements and restricted-role browser sessions were not run. Live application reads do not substitute for those checks. Permission denials and foreign-tenant cases were verified with mocked tests. No disposable database target was established in this task; do not infer one from the application's connection. Before production certification or later data-heavy phases, establish that target and verify stored/zero/retained-location fixtures and query performance there.

Rollback is scoped removal of these phase-owned source additions and message keys. No database rollback is needed. Do not reset whole files that contain unrelated edits.

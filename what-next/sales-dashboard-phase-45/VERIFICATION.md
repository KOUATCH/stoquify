# Sales dashboard phases 4 and 5

Date: 2026-10-11. Baseline HEAD: `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`. Local implementation, no commit or deployment. The working tree already contained phases 0–3 and many unrelated changes; they were preserved.

## Delivered

Phase 4 adds independently authorized collections and current receivables panels. Collections separates confirmed dated receipts, processed refunds, settlement reversals, net recorded collections, method shares, and original credit issued. Receivables uses the authoritative AR open-item lifecycle reader, excludes terminal documents from open totals, separates currencies and links to the AR evidence history.

Phase 5 adds product value/comparison/quantity, a single-unit quantity sort, current available stock/status, original stock-issue contribution/margin with evidence coverage, inactive and prior-only products, and product links. The complete bounded result is paginated in groups of 25. Line/order value differences and each time basis are visible. Missing stock/cost/timing evidence stays unavailable.

The [sales contract](../../design-system/stoquify/pages/sales.md) records population definitions, authorization, limits and remaining release evidence. Phase 6 remains out of scope.

## Owned changes

- New production: `actions/analytics/sales-insights.actions.ts`; `services/analytics/sales-insights-scope.ts`, `sales-collections.service.ts`, `sales-products.service.ts`; `components/analytics/SalesInsightsPanels.tsx`.
- Integration: the existing phase-2/3 `SalesPerformanceDashboard.tsx` mounts the panels after records. Its previous test isolates that child; the new child has separate interaction/state tests.
- Shared readers: `ar-open-item.service.ts` gains optional same-tenant source-location filtering, a document capacity bound and an allocation-query opt-out. `completed-sales-evidence.ts` gains explicit optional line tie-out, cost-access and movement-cap controls. Their original caller defaults are preserved. These two files had no pre-existing diff at inspection.
- EN/FR: added only `salesInsights` and amended the existing performance filter help. Other message changes were preserved.
- Three new test files, sales page contract and this verification record.

## Source inspection

Read workflow, skill routing, command registry, test lanes, design master, sales contract, UI constitution and component registry. Used dated graphify analytics component discovery (community 8); inspected current services, Prisma relations, posting and permission controls before behavioral conclusions.

Reused `getCustomerAROpenItems` and `completedSalesEvidence`, including the latter's original-stock-issue quantity, cost, location and provenance checks. The older item report itself converts decimals to Number and uses full-day comparison; the new adapter retains exact strings and the performance view's partial-period comparison instead. The broader finance dashboard uses capped populations and different balance/time definitions, so its aggregate result was not reused or modified.

Inspected customer settlement posting: it writes allocations/ledger entries, not Payment rows. The collections adapter counts scoped allocations once and does not sum settlement headers or ledger entries again. Inspected POS refunds and voids; cancelled payments/void activity are explicitly excluded from this operational receipt population. This is not a bank reconciliation or immutable cash-flow statement.

Security review: protected reports/sales actions, strict input schemas, session tenant binding, existing finance permission alternatives, separate inventory-items/inventory-levels/profitability capabilities. No restricted source service call; no customer/contact/bank/card details in aggregate payloads. Every related sale, inventory level/location and product is scoped to the same organization. All data operations are reads inside repeatable-read transactions.

Skills applied: project UI/UX Pro Max focused `data table sorting empty states` search (ux-guidelines.csv) and ECC security-review. Adopted empty-state guidance and labelled horizontal table scrolling; rejected unrelated bulk-edit guidance. No palette/framework/dependency change or delegated agent work.

## Executed verification

| Check | Result | Evidence class |
| --- | --- | --- |
| `npm run agent:workflow:check` | Passed; 198 package scripts remain outside reviewed manifest | Workflow only |
| Combined regression below | 9 suites, 89 tests passed, 42.764 s | Mocked Prisma/auth, pure calculations and jsdom |
| Final panel regression after cached-amount fix and added regression | 1 suite, 8 tests passed, 8.932 s | Mocked actions and jsdom |
| Scoped TypeScript including transitive dependencies, no emit/incremental | Zero diagnostics | Static; not repository-wide certification |
| Targeted ESLint, including final panel rerun | Passed | Static |
| Owned tracked `git diff --check` | Passed | Whitespace only |

There are 90 unique passing tests across the combined run and final panel rerun (the final run replaces the prior 7 panel cases with 8). Tests cover scoped payment dates, tender shares, credit exclusion, later settlements and reversals, missing timestamps, latest versus initial receivable balances, terminal states, missing lifecycle evidence, tenant/capability denial, stock reservations and incomplete location coverage, missing original costs, line/order reconciliation, inactive/prior-only products, capacity failures, EN/FR, independent failures, stale-organization hiding, refresh/denial, unit sorting and exact-decimal pagination.

Initial panel tests failed because the fixture used identical product and SKU strings, making text selectors ambiguous; the fixture was corrected. During development hot reload, a cached response lacked the newly added credit amount and the formatter threw. The final formatter treats absent cached amounts as unavailable; a regression covers this case. Fresh page loads and later browser interactions succeeded. These failed attempts are not passing evidence.

Commands were reviewed against the manifest and their current runners/setup before execution. The explicit Jest lane uses existing SWC transforms, the server-only shim and `jest.setup.ts` persistence mocks. No application environment, database setup, build or migration command was invoked as verification.

```powershell
node node_modules/jest/bin/jest.js --config jest.payroll-trust-spine.config.cjs --runInBand --no-cache --runTestsByPath services/analytics/__tests__/sales-insights.test.ts actions/analytics/__tests__/sales-insights.actions.test.ts components/analytics/__tests__/sales-insights-panels.test.tsx services/accounting/__tests__/ar-open-item.service.test.ts services/analytics/__tests__/completed-sales-evidence.test.ts services/analytics/__tests__/sales-performance.test.ts actions/analytics/__tests__/sales-performance.actions.test.ts components/analytics/__tests__/sales-performance-dashboard.test.tsx components/analytics/__tests__/daily-sales-dashboard.test.tsx

node node_modules/jest/bin/jest.js --config jest.payroll-trust-spine.config.cjs --runInBand --no-cache --runTestsByPath components/analytics/__tests__/sales-insights-panels.test.tsx

node node_modules/eslint/bin/eslint.js actions/analytics/sales-insights.actions.ts components/analytics/SalesInsightsPanels.tsx components/analytics/SalesPerformanceDashboard.tsx services/analytics/sales-insights-scope.ts services/analytics/sales-collections.service.ts services/analytics/sales-products.service.ts services/analytics/completed-sales-evidence.ts services/accounting/ar-open-item.service.ts
```

TypeScript used the installed compiler API through a Node here-string: read `tsconfig.json`, set include to the new action, panel, performance dashboard and two new read services; exclude `[]`; create the program with `noEmit:true, incremental:false`; fail on `getPreEmitDiagnostics`. The scope helper and two shared readers are transitive dependencies. No metadata emitted.

## Browser observations

Existing authenticated SUPER ADMIN, organization `rds_org_001`, localhost:3000. No credentials extracted, records seeded or business mutations performed. The existing application executed real read queries; this is distinct from controlled PostgreSQL fixture testing.

- EN custom September 1–30: six sales, 1,686,522.94 XAF receipts; cash share 100%; zero dated refunds/reversals and zero credit issued. Product lines reconcile to order value with zero difference.
- Current receivables: three open posted documents, 197,201.25 XAF outstanding and overdue, with their own current checked time. The evidence link targets the existing AR history route.
- Product table: 13 products. Selecting `btl` enables quantity sorting; the order becomes dishwashing liquid 112, body lotion 77, cleaner 22. Mixed-unit quantity sorting is disabled.
- Refresh retains the previous checked time with a visible refreshing message. Keyboard Tab reaches the receipt-method region and unit/sort controls with visible focus.
- FR mobile: translated disclosures, product names and exact decimal formatting; controls stack and remain reachable. Product table intentionally scrolls horizontally within its labelled region. Requested 390×844, observed innerWidth 282/documentWidth 271 in this IAB; no page-level horizontal overflow.
- Desktop checked at default and wide breakpoints. Requested 1920×1080, observed innerWidth 1391/documentWidth 1380; collections/receivables use two columns. Native screenshot scaling differs from CSS viewport measurements. Temporary viewport override reset.

Saved browser evidence under `C:/Users/J COMPUTER/.codex/visualizations/2026/10/11/01a12b04-d704-7140-8a30-f8957f1b40e4/`: `sales-phase-45-desktop.jpg`, `sales-phase-45-mobile-fr.jpg`. These are sampled visual/focus checks, not exhaustive accessibility certification.

## Not run / remaining release evidence

No dedicated disposable-PostgreSQL fixture suite, concurrent-update/transaction proof, representative large-data EXPLAIN/timing tests, real restricted-role browser session or full accessibility audit. No disposable database target was established; the existing application connection was not repurposed for fixture writes. Mocks do not certify persistence isolation or role revocation in a real session. Read capacity limits fail closed and do not establish large-tenant performance.

The existing phases 0–3 release limitations also remain. Implementation is locally verified, not a production release authorization.

Rollback: remove the panel mount and the new insight files/namespace/tests; revert only the owned optional shared-reader and contract hunks. Preserve phases 0–3 and unrelated changes. No schema/data rollback is required.

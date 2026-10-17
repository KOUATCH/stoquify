# Receivables/payables dashboard: phases 0–1

Date: 2026-10-12. Source baseline: `6f7f6741` plus the existing dirty working tree. Implementation scope: phase 0 meaning/access contracts and phase 1 scoped data foundation. The user additionally approved connecting the existing pages now with a small UI scope extension. This document records that implementation; it does not mark later phases complete.

## Phase 0: frozen meaning and boundaries

| Question | Contract / authoritative source |
| --- | --- |
| What remains owed by customers? | `getCustomerAROpenItems`, current posted lifecycle, open/partial documents only. No customer cached-balance or legacy capped order aggregate. |
| What remains owed to suppliers? | `resolveAPHistoryFinancials`, invoice ledger evidence plus verified allocations and credit notes. Operational AP evidence; not GL certification. |
| How is money represented? | Decimal strings throughout aggregation and transport, independently grouped by invoice currency. No implicit FX conversion or mixed-currency grand total. |
| Which date is being measured? | Current invoice position at server read time. No activity-period filter or caller-controlled historical as-of value. |
| How is aging measured? | Organization-local calendar days: not overdue (due today/future), 1–30, 31–60, 61–90, over 90; missing dates remain unknown. This dashboard recalculates calendar aging rather than inheriting elapsed-hours aging from older history summaries. |
| What is due soon? | Today is day 0. Next 7 is days 1–7; next 30 is days 1–30. The latter windows overlap and must not be added together. |
| What counts as outstanding? | Positive remaining recognized invoice amounts. AR allocated amount includes existing lifecycle settlement/initial-paid treatment; it is not a separate period cash-receipts measure. |
| What happens to unknown evidence? | Keep the unverified AP invoice visible; suppress all affected currency totals. Missing due dates contribute to outstanding/unknown aging, never overdue or due-soon figures. |
| What does location mean? | AR source sale; AP source purchase order. Unassigned AP invoices appear only in All locations. The displayed unassigned count is organization-wide, before currency selection, and is not an outstanding-only amount/count. |
| What does complete mean? | Complete queried source population within the explicit bound, not proof that every business obligation has been entered or reconciled. No documents and all-settled documents are different states. Source document count is before currency filtering. |
| What is freshness? | `checkedAt` is server snapshot evaluation time, not source ingestion time. A content revision guards pagination; changed evidence requires restarting from page 1. |

### Access and privacy

| Request | Existing authorization reused | Data allowed |
| --- | --- | --- |
| AR position | `finance.receivables.read` or `finance.read` | Scoped AR invoice rows/aggregates and organization location choices |
| AP position | `finance.payables.read`, `finance.read` or `purchasing.ap.invoice.view`, plus purchasing module enforcement | Scoped AP invoice rows/aggregates; no execution capability inferred |
| AR receipts activity | AR access plus an existing payments-view alternative | Independent receipt-period report; restricted response before queries if payment access is absent |

Trusted actor/organization come from server RBAC. Input schemas reject caller authority, extra fields, and historical/period arguments on balance requests. Recheck authorization and actor/organization after reads. The old broad finance action now rejects receivables/payables views before loading finance/payroll data. Other finance views retain their existing behavior.

Existing Customer AR History, AP History/workbench, approval, execution, ledger recovery and reconciliation remain authoritative destinations. History currently opens broader organization scope; no unsupported location filter is silently passed.

## Phase 1: implemented foundation

- `services/finance/open-items-dashboard.contract.ts`: strict scope, typed decimal-string response, evidence/coverage and pagination contracts.
- `services/finance/open-items-dashboard.service.ts`: one repeatable-read transaction per current balance snapshot; full bounded population before table paging; per-currency aging/due summaries.
- Bounds: 1,000 source documents and AP evidence limits of 10,000 records per queried evidence category; overflow fails without returning partial totals. AR retains its canonical reader's own evidence bounds. Narrow location where possible; larger scopes require future query work, not silently raised limits.
- AP resolver returns exact per-invoice balances and accepts optional evidence bounds without changing existing callers' default behavior.
- Table search/bucket filters affect records only. Currency/location scope applies to summaries and records; stable due-date/id ordering and content revision protect subsequent pages.
- Separate AR receipt action reuses sales collection logic by receipt processing/settlement dates, independently of invoice position. Pending payments are excluded; processed refunds and settlement reversals reduce net receipts; missing processing times make net unavailable. Credit-issued sales reads are skipped. The receipt-period panel is not yet connected in the minimal page UI.
- `useOpenItemsDashboard`: actor/organization/permission/scope query key, no retained cache after failed reads, 30-second refresh and explicit workspace/session invalidation.
- Both route access wrappers remain; their allowed render now uses the focused EN/FR invoice dashboard. Cards, aging, location selector, invoice table, pagination and existing-workflow links are connected.

### Owned changes and preservation

New contract/service/action/hook/component, their scoped tests/configurations, and these page/data contracts are owned by this task. Existing AP financial resolver, sales collections service, legacy finance action/tests, the two route files and design master receive only necessary changes. In particular, pre-existing edits to `FinanceSpecializedLedgerSurfaces.tsx`, the broad finance service, reconciliation surfaces, sales work and other files remain intact. No staging, commits, migrations, seeds, payment execution or reminders.

## Verification and continuation gates

Commands are manually reviewed against `docs/ecc/command-registry.json` and actual definitions/configurations. The new Jest lane uses direct SWC transformation and mocked persistence, no Next configuration/env/bootstrap or database runner. TypeScript uses `noEmit` and `incremental: false`; scoped ESLint loads the existing lint configuration. These commands do not constitute a release build.

Executed results are recorded below after final verification. Real PostgreSQL snapshot/concurrency/rollback evidence requires an explicitly identified disposable target. Browser acceptance requires authenticated AR/AP roles, EN/FR, desktop and mobile widths, keyboard focus/table scrolling, location/pagination, missing evidence, empty, denied/module-locked, failed refresh and workspace-change states.

Later phases must build queues, detailed filtering/drill-downs and independent receipts UI on this foundation, preserve approval/execution/reconciliation controls, and close database/browser acceptance gaps before release. Do not treat mocked transaction options as proof of real transaction behavior.

Rollback: revert only these task-owned files/hunks and reconnect the old presentation only after retaining the scoped access boundary. Do not restore the broad AR/AP payload exposure. No schema or data rollback is needed.

## Evidence results

### Source and static checks

- `npm run agent:workflow:check`: passed before implementation and at completion; 198 package scripts remain outside the reviewed manifest. Registry definitions and new runner effects were reviewed; no hashes were refreshed to bypass a failure.
- `node node_modules/typescript/bin/tsc -p tsconfig.open-items-dashboard.json --noEmit --incremental false`: passed after fixing the access-state union and narrowing optional action-error metadata.
- `node node_modules/eslint/bin/eslint.js services/finance/open-items-dashboard.contract.ts services/finance/open-items-dashboard.service.ts actions/finance/open-items-dashboard.actions.ts hooks/finance/useOpenItemsDashboard.ts components/finance/OpenItemsDashboard.tsx services/purchasing/ap-history-financial.ts services/analytics/sales-collections.service.ts actions/finance/finance-dashboard.actions.ts`: passed.
- `git diff --check -- actions/finance/finance-dashboard.actions.ts actions/finance/__tests__/finance-dashboard.actions.test.ts services/purchasing/ap-history-financial.ts 'app/[locale]/(dashboard)/dashboard/finance/receivables/page.tsx' 'app/[locale]/(dashboard)/dashboard/finance/payables/page.tsx'`: passed (Git reported only CRLF normalization notices).

### Mocked/pure/component checks

`node node_modules/jest/bin/jest.js --config jest.open-items-dashboard.config.cjs --runInBand --no-cache`: **8 suites, 68 tests passed**. Includes pre-existing AP financial/allocation integrity regression tests and the legacy action boundary, plus new source-scope, money, aging, revision, module/access, collection isolation, EN/FR presentation and cache invalidation tests. Two initial component assertions used an ambiguous region selector; the selector was corrected to the labelled invoice region. After the final TypeScript narrowing fix, the hook suite was rerun separately.

### Rendered observations

Browser: local in-app browser, existing **SUPER ADMIN** session in **Wilkinson - Feeney 001**. Initial navigation timed out but subsequently loaded successfully; it was not treated as a passing result until the rendered page was inspected.

- `/en/dashboard/finance/receivables`: default browser viewport, screenshot/accessible tree inspected. Current outstanding and overdue both **197,201.25 XAF**; visible invoice amounts **55,226.25 + 65,733.75 + 76,241.25** tie to that total. All three are in the over-90-day bucket. This proves the displayed fixture relationship, not independent database reconciliation.
- `/fr/dashboard/finance/receivables`: narrow viewport, French decimal/date/label rendering and wrapping inspected. Requested viewport override was 390×844; the runtime's DOM reported 282 CSS pixels wide with document width 271. No page-level horizontal overflow was observed. The invoice scroll region was focused by keyboard; ArrowRight advanced horizontal scroll (table content 484, container 190 CSS pixels).
- Changing the French location selector to **Main onboarding branch** showed an explicit no-source-documents explanation and no outstanding rows, without carrying the previous location's figures.
- `/en/dashboard/finance/payables`: purchasing access denied by existing module enforcement, before invoice reads. This initially appeared as a generic error; a typed module-lock reason and shared locked-module presentation were added.
- `/fr/dashboard/finance/payables`: French module-locked state rendered and visually inspected at the narrow viewport. Module settings were not changed. Successful AP data rendering remains unverified in an enabled organization; AP success/unverified cases have mocked coverage only.
- Temporary viewport override was reset. No reminders, approvals, payments or financial records were modified.

### Remaining gates

No disposable PostgreSQL integration/concurrency/rollback tests were run, and no migration/build/seed command ran. Browser reads used the existing local application; they are not integration-suite certification. Restricted-role browser denial, enabled-module AP success, browser multi-page revision conflicts and a full accessibility audit remain open. Phases 0–1 implementation and the approved minimal page connection are delivered with those explicit verification limits; later phases and release acceptance are not certified.

# Accounting Financial Reporting Suite — Implementation Report

Date: 2026-08-01  
Status: implemented and focused verification passed

## Outcome

Stoquify now has a canonical Accounting Financial Reports suite at:

`/dashboard/accounting/reports/financial-statements`

The suite adds:

- a period-first Financial Reports hub;
- a posted-ledger Profit & Loss statement;
- a transparent management EBITDA subtotal and reconciliation;
- a cumulative Balance Sheet with an accounting-equation check;
- compact Overview, Profit & Loss, and Balance Sheet views;
- collapsible, internally scrollable account detail instead of one unending report page;
- explicit source, classification, redaction, and certification disclosures.

## Prompt-Architect Decisions

The AqStoqFlow prompt-architect contract materially constrained this work:

- operational sales-order and cash-drawer analytics were not reused as accounting truth;
- the service-owned posted ledger was implemented before the UI;
- Profit & Loss uses selected-period activity, while the Balance Sheet is cumulative through period end;
- EBITDA is labelled as a management performance measure, not a statutory OHADA subtotal;
- a true cash-flow statement, exports, schema changes, and certified SYSCOHADA presentation were explicitly deferred until their required mapping and control contracts exist.

The execution-ready refined prompt is saved at:

`what-next/accounting-financial-reporting-suite-execution-prompt-2026-08-01.md`

## Architecture and Accounting Semantics

### Source of truth

- Journal entry statuses: `POSTED` and `REVERSED` only, matching the existing Trial Balance contract.
- Every period, account, journal line, settings, and organization lookup is organization-scoped.
- The selected period is resolved with an organization-bound `findFirst`; cross-tenant or unavailable period identifiers fail before ledger reads.
- Aggregation occurs in the accounting service, not the page or client.

### Profit & Loss

- Window: selected accounting period.
- Revenue contribution: revenue less contra-revenue.
- Cost of sales: explicit `COGS`, `COST_OF_GOODS_SOLD`, `COST_OF_SALES`, and `INVENTORY_VARIANCE` mapping keys.
- Depreciation/amortization, finance cost, and income tax: explicit mapping-key categories.
- Remaining expense accounts are conservatively treated as operating expenses and disclosed as review candidates.

### Management EBITDA

Formula shown to users:

`Net income + income tax + finance costs + depreciation and amortization`

The UI exposes:

- the formula;
- each reconciliation amount;
- the number of explicit EBITDA-category account mappings;
- all active expense accounts currently using the operating-expense fallback;
- finance-team mapping guidance.

### Balance Sheet

- Window: all posted/reversed activity through the selected period end date.
- Assets include contra-asset deductions.
- Liabilities and equity retain their natural credit-balance presentation.
- Revenue less expenses accumulated through the selected end date is shown separately as accumulated earnings.
- The report shows the exact Assets minus Liabilities-and-Equity difference and a reconciled/review-required state.

## Security and Trust Controls

- Route guard: `checkPermission("accounting.reports.read")`.
- Action guard: `protect` with `accounting.reports.read` and `FinancialStatements` audit resource.
- Tenant isolation is repeated at service query boundaries.
- No contact, authentication, person-level payroll, or provider-secret fields enter the read model.
- No new export endpoint was added; the existing fresh-auth, audit, watermark, and integrity controls remain the only accounting export path.
- The page says `Internal management report · not a certified OHADA filing` and repeats that boundary in the EBITDA guidance.

This boundary follows the official OHADA description of AUDCIF/SYSCOHADA as governing accounting standards, chart of accounts, recordkeeping, and financial-statement presentation. It also follows the IFRS Foundation's published position that IFRS 18 does not define EBITDA because there is no consensus on what it represents.

Primary references:

- OHADA AUDCIF: `https://www.ohada.org/pt-pt/ato-uniforme-relativo-a-legislacao-contabil-e-informacoes-financeiras-audcif/`
- IFRS 18 Effects Analysis: `https://www.ifrs.org/content/dam/ifrs/publications/amendments/english/2024/effect-analysis-ifrs18-april2024.pdf`

## UX Delivered

- Three URL-addressable report views: Overview, Profit & Loss, and Balance Sheet.
- Accounting-period selector that preserves the active view.
- Four decision cards: revenue, management EBITDA, net income, and balance state.
- EBITDA bridge and mapping-review panel.
- Compact statement sections with account details collapsed by default.
- Account tables use bounded vertical scrolling and sticky headers.
- Responsive controls and three-view navigation.
- The Accounting overview now links directly to Financial Reports.
- The already-dirty global sidebar was intentionally left untouched.

## Verification

| Check | Result |
|---|---|
| Financial statement service tests | PASS — 3/3 |
| Financial report route tests | PASS — 3/3 |
| Targeted ESLint/parser check for changed runtime/test files | PASS |
| Service boundary gate | PASS — 0 active violations |
| Report trust/export gate | PASS — 17/17 ready, 0 blockers |
| Regulatory hardcode gate | PASS — 0 active findings |
| Authenticated Overview route | PASS — HTTP 200 |
| Authenticated Profit & Loss route | PASS — HTTP 200 |
| Authenticated Balance Sheet route | PASS — HTTP 200 |
| Browser console/page errors | PASS — none |
| 390px horizontal page overflow | PASS — none |
| Full TypeScript check | BLOCKED by unrelated dirty syntax at `services/cash-command/cash-command.service.ts:29` |

The full TypeScript run reached an unrelated pre-existing malformed import in the dirty Cash Command service. That file was not changed because it is outside this task. The targeted parser check, Jest compilation, and authenticated Next.js route rendering all passed for the financial-reporting slice.

The report trust gate refreshed its standard tracked readiness artifacts:

- `what-next/report-trust-export-readiness.md`
- `what-next/report-trust-export-readiness.json`

## Browser Evidence

- `what-next/evidence/accounting-financial-reports-2026-08-01/desktop.png`
- `what-next/evidence/accounting-financial-reports-2026-08-01/mobile.png`

Authenticated browser assertions:

- the internal/OHADA certification disclosure is visible;
- Management EBITDA appears in the rendered page;
- the safe error panel is absent;
- all three report views render their expected content;
- no console errors were captured;
- no document-level horizontal overflow was detected on desktop or mobile.

## Files Added or Updated

- `services/accounting/financial-statements.service.ts`
- `services/accounting/__tests__/financial-statements.service.test.ts`
- `actions/accounting/reports.actions.ts`
- `app/[locale]/(dashboard)/dashboard/accounting/reports/financial-statements/page.tsx`
- `app/[locale]/(dashboard)/dashboard/accounting/reports/financial-statements/__tests__/page.test.tsx`
- `app/[locale]/(dashboard)/dashboard/accounting/page.tsx`
- `what-next/accounting-financial-reporting-suite-execution-prompt-2026-08-01.md`
- `what-next/accounting-financial-reporting-suite-implementation-2026-08-01.md`

## Intentional Limitations and Next Slices

1. Do not certify these internal statements as SYSCOHADA filings until expert-reviewed statement-line mappings, country-pack provenance, and Close & Assurance signatures exist.
2. Add controlled CSV/PDF exports only by extending the existing fresh-auth, watermark, audit, and content-hash export pipeline.
3. Add a true ledger cash-flow statement only after explicit cash-account and operating/investing/financing mapping contracts exist.
4. Resolve the unrelated Cash Command syntax conflict, then rerun the full repository TypeScript check.

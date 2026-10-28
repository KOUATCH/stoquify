# Finance final-two-section normalization

Date: 2026-08-13  
Reference: `/en/dashboard/finance/receivables`  
Result: implemented and browser-verified for every applicable Finance route

## Outcome

The 18-route Finance inventory now has an explicit normalization decision. Eleven applicable dashboards follow the Receivables closing-section contract:

1. The operational data section is a full-width row.
2. A full-width workflow section follows it immediately in DOM and visual order.
3. The workflow section is the last visible content section.
4. Wide desktop actions occupy one row for variable action counts, including six Payables actions.
5. Mobile actions wrap without document-level horizontal overflow.

No finance calculation, API, service, hook, read model, database, migration, permission, entitlement, evidence meaning, or workflow destination was changed.

## Route-classification matrix

| Route | Decision | Closing pair or evidence-backed reason |
|---|---|---|
| `/dashboard/finance` | `extract-and-normalize` | Payment mix → Overview workflows |
| `/dashboard/finance/analytics` | `extract-and-normalize` | Payment mix → Analytics workflows |
| `/dashboard/finance/cash-command` | `not applicable` | Service-owned command surface ends in drawer/module summaries; its permission-filtered priority board is operational content, not a navigation footer. |
| `/dashboard/finance/cash-drawer` | `not applicable` | Drawer/session/journal workbench has no closing data-plus-navigation-workflow pair. |
| `/dashboard/finance/cash-flow` | `extract-and-normalize` | Payment mix → Cash flow workflows |
| `/dashboard/finance/cash-payment-history` | `not applicable` | Paginated history workbench with filters, record details, and exception actions. |
| `/dashboard/finance/costs` | `extract-and-normalize` | Payment mix → Cost control workflows |
| `/dashboard/finance/payables` | `normalize` | Recent supplier disbursements → Payables workflows |
| `/dashboard/finance/payments` | `normalize` | Payment ledger stream → Payment workflows |
| `/dashboard/finance/profit-loss` | `extract-and-normalize` | Payment mix → Profitability workflows |
| `/dashboard/finance/profitability` | `extract-and-normalize` | Payment mix → Profitability workflows |
| `/dashboard/finance/receivables` | `already compliant` | Recent customer receipts → Receivables workflows |
| `/dashboard/finance/receivables/history` | `not applicable` | AR open-item history workbench with snapshot filters and record details. |
| `/dashboard/finance/reconciliation` | `not applicable` | Maker-checker, suspense, duplicate, proof, and reconciliation stages are workbench internals rather than navigation workflows. |
| `/dashboard/finance/retail` | `extract-and-normalize` | Payment mix → Retail finance workflows |
| `/dashboard/finance/sales` | `extract-and-normalize` | Payment mix → Sales finance workflows |
| `/dashboard/finance/stock-to-cash` | `not applicable` | Service-owned conversion/evidence surface exposes no compatible workflow footer. |
| `/dashboard/finance/tax-rates/create` | `not applicable` | Tax-rate creation form, not a dashboard with two compatible closing sections. |

The machine-readable matrix is in `what-next/finance-final-two-section-normalization.json`.

## Repository and graph evidence

- The worktree was already broadly dirty. Existing changes were preserved; no unrelated file was reverted or cleaned up.
- `graphify-out/graph_components.json` places `FinanceCommandCenterDashboard.tsx` in component community 20 and `FinanceSpecializedLedgerSurfaces.tsx` in community 3. History and reconciliation surfaces are separate communities (`CashPaymentHistoryWorkbench.tsx` community 7 and `PaymentReconciliationWorkbench.tsx` community 13). This supports normalizing two genuine shared families while leaving specialized workbenches intact.
- The eight command-center routes all compose `FinanceCommandCenterDashboard`.
- Payments, Receivables, and Payables all compose `FinanceSpecializedLedgerSurfaces`.

## Surgical implementation

### Shared command center

`components/finance/FinanceCommandCenterDashboard.tsx`

- Removed the five workflow links from inside the Payment mix card.
- Kept Payment mix as the full-width penultimate section.
- Added a view-specific, localized final workflow section for all eight consumers.
- Preserved the five labels, icons, localized destinations, and behavior without duplication.

### Specialized ledger family

`components/finance/FinanceSpecializedLedgerSurfaces.tsx`

- Exported and reused `FinanceWorkflowActionPanel` across both affected families.
- Made the operational and workflow cards explicit adjacent sibling sections for Payments, Receivables, and Payables.
- Replaced the fixed `xl:grid-cols-5` assumption with static production-safe Tailwind classes: `xl:grid-flow-col xl:grid-cols-none xl:auto-cols-fr`.
- Preserved a one-column mobile base and a two-column intermediate layout.
- Preserved Payables' canonical `/dashboard/purchases/payables/history` link and all six actions.
- Preserved payment ledger search, date/status/method filters, sorting, column controls, pagination, and empty states.

### Localization

`messages/en.json` and `messages/fr.json`

- Added complete English and French command-center workflow title/description keys.
- No English-only user-facing text was introduced.

## Focused regression coverage

The following passed:

- Finance/app Finance ESLint over every `.ts` and `.tsx` file: pass.
- Six Jest suites: pass.
- 33 tests: pass.
- Route matrix JSON and browser-evidence JSON parse validation: pass.

Coverage includes:

- all eight `FinanceCommandCenterDashboard` route configurations;
- Payments, Receivables, and Payables populated states;
- empty Receivables receipts state;
- correct operational → workflow DOM order and adjacency;
- workflow section last;
- variable-count desktop row classes;
- expected link counts and duplicate-link prevention;
- Payables AP-history destination;
- payment table pagination, filtering, sorting, and controls;
- unchanged reconciliation and cash-history workbench tests;
- all 18 route decisions exactly once.

## Typecheck attribution

`npm run typecheck` completed in 138.2 seconds and failed on unrelated existing worktree diagnostics. No diagnostic referenced either changed Finance component or the new route-matrix test. Existing failures include:

- generated `.next/types` for the dashboard sales page;
- accounting page call signatures;
- an assurance incident import and implicit-any parameters;
- inventory/settings page return and call signatures;
- notifications-demo module typing;
- inventory history `Buffer`/`BlobPart` typing;
- supplier E2E typing.

These files were documented and not modified for this task.

## Authenticated browser verification

Browser: authenticated Microsoft Edge session; Super Admin context observed.

Desktop:

- Requested override: 1440 × 1200.
- Measured CSS client width: 1781 because the authenticated profile applies zoom/scaling; this remains above the required 1440px minimum.
- All 11 applicable routes: operational and workflow sections share X = 296 and width = 1468.9px.
- All workflow buttons on every route share one Y-position.
- Payables recorded six links at Y = 1680.4.
- Every page recorded `scrollWidth = clientWidth = 1781`.

Mobile:

- Calibrated override: 328 × 844, producing a measured CSS client width of 391px.
- All 11 applicable routes: operational and workflow sections share X = 16 and width = 358.9px.
- Five-link workflows produced five mobile rows; Payables produced six.
- Every page recorded `scrollWidth = clientWidth = 391`.

All routes also recorded correct DOM order, direct adjacency, and a last-position workflow section. No browser console errors were captured.

Full measurements and representative screenshots are under `what-next/evidence/finance-final-two-section-normalization-2026-08-13/`.

## Controls and reviewer disposition

- Platform/frontend/design system: applicable; the two real shared component families own the change.
- Workflow UX/accessibility/localization: applicable; DOM/focus order matches visual order, touch targets are unchanged or improved, and bilingual keys are complete. This is evidence of the tested layout, not an accessibility certification.
- Finance/accounting/OHADA/internal controls: applicable as a preservation review; no amounts, aging, posting, tax, cash, reconciliation, or evidence semantics changed.
- Security/IAM/privacy/fraud: applicable as a preservation review; tenancy, RBAC, module entitlement, fresh-auth, maker-checker, and route guards were untouched.
- Data/database/migrations: not applicable; no data contract, persistence, precision, provenance, schema, or migration change.
- Backend/API/integration/provider boundaries: not applicable; no server or provider boundary changed.
- SRE/performance/cost: low impact; no dependency, request, polling, or bundle-level feature was added beyond reusing an already imported shared module.
- AI/agent governance: not applicable; no AI path or approval boundary changed.
- SaaS packaging/billing/growth: not applicable; no entitlement, package, billing, or commercial surface changed.

No legal, tax, accounting, security, privacy, accessibility, or release certification is claimed.

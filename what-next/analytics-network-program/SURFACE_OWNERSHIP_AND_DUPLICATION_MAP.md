# P0-02 Canonical Surface Ownership and Duplication Map

Date: 2026-08-30; reconciled 2026-09-02  
Program: `STOQUIFY-ANALYTICS-CONTROLLED-NETWORK`  
Work package: P0-02  
Status: development complete; G0 owner/design sign-off pending

## Acceptance refresh — 2026-09-02

The registry now explicitly maps all 53 declared target KPI identifiers to one semantic owner, source owner, and canonical drill-through route. The earlier seven entries were examples rather than complete coverage. All 12 route pages, their catalogs, sidebar entries, and named implementation paths exist. Purchase Order Analytics now references its dedicated route catalog instead of the sidebar as its catalog.

These are proposed ownership assignments for owner acceptance. The 13-week forecast, future reconciliation analysis, accountant advisory, and participation-cohort fields are target designs; route presence does not establish those features as implemented. Each surface also records the canonical job action owner and preserves source-domain write authority. P0-06 must verify individual runtime action, export, token, and grant boundaries.

The acceptance run exposed an alphabetical ordering failure in the Purchases submenu. The fix places Purchase Analytics before Purchase Orders with the same destinations and permissions. The dated acceptance packet records the test results and remaining owner decisions.

See [current acceptance packet](P0_02_P0_03_ACCEPTANCE_PACKET_2026-09-02.md) and [P0-03 remediation design](P0_03_ANALYTICAL_CONTEXT_REMEDIATION_DESIGN_2026-09-02.md).

## Decision

Stoquify will extend existing routes. It will not add a generic analytics overview for the Phase 1 jobs.

One surface owns the full definition and workflow for each recurring job. Other command surfaces may show a band, alert, or summary only when they reuse the canonical metric contract and link to the canonical route. They may not implement an independent formula or corrective write.

## Canonical job map

| Canonical route | Job owner | Full job | Secondary surfaces may show | Secondary surfaces must not do |
|---|---|---|---|---|
| `/dashboard/analytics` | Analytics/Business Pulse | Today’s cross-domain pulse and navigation | today bands and alerts | own 13-week cash, reconciliation workflow, multi-client triage, or participation cohorts |
| `/dashboard/daily-digest` | Dashboard/Daily Digest | Role-specific changes since last review | canonical metric changes | recompute source metrics or replace source workflow |
| `/dashboard/manager-action-center` | Manager Action Center | Permitted location-level operating actions | cash/reconciliation/inventory alert bands | claim tenant-wide ownership or show unauthorized locations |
| `/dashboard/owner-war-room` | Owner War Room | Tenant-wide cross-domain risk orientation | critical bands from canonical models | expose source line items or perform source corrections |
| `/dashboard/finance/analytics` | Finance Analytics | Historical finance performance | historical comparisons | own the forward 13-week forecast or exception SLA queue |
| `/dashboard/finance/cash-flow` | Finance/Cash Flow | Historical cash movements | actual cash movement | own forward runway, scenario, or projected deficit action |
| `/dashboard/finance/cash-command` | Finance/Cash Command | 13-week obligations, runway, deficit drivers, coverage, and actions | owner/accountant surfaces may show a runway band | create source writes or Phase 1 saved scenarios |
| `/dashboard/finance/reconciliation` | Payments/Reconciliation | Exposure, root cause, age, owner, SLA, evidence, and workflow | owner/accountant surfaces may show exposure bands | call unresolved exposure “loss” or grant new override authority |
| `/dashboard/finance/stock-to-cash` | Finance/Stock-to-Cash | Working capital tied up across stock and operating flow | cash/owner surfaces may show inventory exposure band | adjust inventory or own the 13-week forecast |
| `/dashboard/accounting/accountant-portfolio` | Accounting/Accountant Access | Active-consent client triage and next action | referral funnel may show aggregate activation | sum currencies, bypass per-row grants, or expose recipient PII |
| `/dashboard/analytics/referrals` | Growth Analytics/Referrals | Delivered-to-retained participation cohorts and event quality | accountant/pilot scorecards may show aggregate bands | expose recipients, cross-tenant benchmark, or reuse transactional consent for marketing |
| `/dashboard/purchase-orders/analytics` | Purchasing/Purchase Order Analytics | Supplier commitments, receipt/delivery evidence, and purchase risk | owner/cash surfaces may show commitment bands | publish ratings or permit supplier direct PO/AP/stock writes |

## Phase 1 route decisions

### Cash Forecast

- Extend `/dashboard/finance/cash-command`.
- Reuse `services/cash-command/`, BI evidence primitives, and source-domain drill-throughs.
- Finance/Cash Command owns `projected_closing_cash`, `minimum_cash_week`, `funding_gap`, `forecast_source_coverage`, and later `forecast_error`.
- Owner War Room and Accountant Portfolio may consume bands only after the contract is stable.

### Reconciliation Leakage

- Extend `/dashboard/finance/reconciliation`.
- Reuse the authoritative Payment Reconciliation workbench, runs, suspense, workflow, and evidence.
- Payments/Reconciliation owns `unreconciled_exposure`, root cause, age, owner/SLA, signed-run coverage, and resolution time.
- Other surfaces must use “exposure” until resolved evidence supports a loss/recovery classification.

### Accountant Advisory

- Extend `/dashboard/accounting/accountant-portfolio`.
- Accounting/Accountant Access owns row visibility, mandate health, and per-client authorization.
- Client monetary values remain within their currency. Firm-level summaries use counts and bands.
- Referral data is aggregate-only and cannot grant access to client facts.

## Presentation ownership rules

1. The canonical surface owns the full metric definition, explanation, filters, evidence, and authoritative workflow link.
2. A secondary surface may show only the canonical value, a policy-defined band, or an alert derived from that value.
3. Secondary surfaces include the canonical metric identifier and canonical route.
4. Secondary surfaces do not independently query and recompute the same business meaning.
5. Source-domain services retain fact ownership and all corrective writes.
6. Cross-currency amounts are not summed. Counts and bands are allowed when privacy and authorization permit.
7. Unknown, stale, partial, redacted, blocked, permission-denied, and entitlement-denied states remain visible.

## Consolidation and navigation decisions

- Keep Business Pulse as the cross-domain daily entry point.
- Keep Owner War Room as risk orientation, not another detailed cash/reconciliation workbench.
- Keep Daily Digest as change notification, not a metric source.
- Keep Finance Analytics and Cash Flow historical; route forward-looking decisions to Cash Command.
- Keep Payment Reconciliation as the only reconciliation exception workflow.
- Keep Accountant Portfolio as the only cross-client advisory surface.
- Extend Referral Funnel for participation cohorts; do not create a “marketplace growth” route.
- Down-rank or remove duplicated cards in later UX work only after canonical contracts exist and usage confirms safe consolidation.

## Evidence and remaining gate work

The machine-readable registry is `SURFACE_OWNERSHIP_REGISTRY.json`. Existing route catalogs and route tests must verify that each route exists and retains its current authorization boundary. P0-06 will separately reconcile route wrappers, actions, exports, tokens, APIs, permissions, and module entitlements. P0-02 does not certify access safety.

G0 sign-off remains pending from Product, UX Architecture, Finance, Payments, Accounting, Purchasing, and Data/BI role owners. Until then, the map is the development baseline and no existing route is deleted.

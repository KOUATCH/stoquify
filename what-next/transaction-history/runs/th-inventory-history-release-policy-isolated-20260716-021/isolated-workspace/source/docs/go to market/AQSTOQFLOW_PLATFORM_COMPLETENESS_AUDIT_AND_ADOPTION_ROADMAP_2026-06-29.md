# AQSTOQFLOW Platform Completeness Audit And Adoption Roadmap

Date: 2026-06-29
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`
Prompt source: user-provided whole-platform completeness audit prompt, executed in this workspace.
Mode: audit and roadmap only. No application code was intentionally changed.

## Executive Summary

AqStoqFlow is no longer a simple inventory/POS/accounting app. The repository now has a serious architecture spine for a ledger-first, evidence-backed OHADA SMB operating platform: tenant/RBAC controls, module catalog and entitlement observe/enforce hooks, service-boundary gates, inventory mutation gates, accounting source links, payment reconciliation services, payroll immutability, compliance evidence, workflow assurance, owner/manager command surfaces, and BI primitives.

The strongest product direction is clear:

> AqStoqFlow should become the daily trusted operating truth system for OHADA SMBs: cash, stock, payments, purchasing/AP, payroll, tax/compliance, accounting, close, evidence, and role-specific actions in one server-owned control plane.

The largest gap is not the absence of modules. It is uneven completion and activation. Many modules have schemas and services; fewer have fully certified role journeys, populated proof chains, universal BI trust labels, authenticated visual evidence, country-pack production provenance, and commercial subscription enforcement. The platform is strongest where proof, ledger, redaction, and policy gates are explicit. It is weakest where routes still look legacy/demo-like, control tables are not operationally populated, or module entitlement exists in observe mode rather than durable subscription state.

Current overall judgment:

- Product architecture: strong and coherent.
- Source-of-truth foundation: promising, not universal.
- Instant BI foundation: strong components and snapshots, but still needs a single certified daily habit.
- OHADA/SYSCOHADA readiness: credible direction, not blanket compliance.
- Majority-SMB adoption readiness: not yet. It needs a narrower certified wedge: owner daily truth, payment/AP proof, stock-to-cash, accountant close pack, offline POS, and onboarding/commercial packaging.

## Evidence Base

Evidence inspected in this run:

- `docs/go to market/`
- `what-next/`
- `what-next/payroll/`
- `innovation/`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/manifest.json`
- `prisma/schema.prisma`
- `package.json`
- `config/sidebar.ts`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`
- `services/_shared/protect.ts`
- Route inventory under `app/[locale]/(dashboard)/dashboard/`
- API inventory under `app/api/`
- Service, action, component, hook, lib, config, and test inventory.

Compact repository inventory from this audit:

| Area | Files | Tests |
| --- | ---: | ---: |
| `app/` | 204 | 4 |
| `actions/` | 147 | 38 |
| `services/` | 311 | 116 |
| `components/` | 241 | 19 |
| `hooks/` | 34 | 0 |
| `lib/` | 60 | 7 |
| `config/` | 5 | 1 |
| `scripts/` | 39 | 11 |
| `prisma/` | 23 | 0 |
| `what-next/` | 231 | 0 |
| `graphify-out/` | 931 | 0 |

Graph evidence:

- `graphify-out/GRAPH_REPORT.md` reports 4,121 nodes, 5,321 edges, and 135 communities from a 2026-06-14 rebuild.
- The graph highlights tenant defense, ledger-first operational posting, Auth/RBAC hardening, ledger-first OHADA operating spine, payment reconciliation workbench, connected SMB operations, compliance control plane, and POS delivery flow.
- The graph is useful architectural evidence, but it is not current enough to replace direct code inspection.

Verification run in this audit:

| Command | Result | Notes |
| --- | --- | --- |
| `npm run prisma:validate` | Passed | Prisma schema valid. |
| `npm run typecheck` | Passed | Full TypeScript check completed. |
| `npm run workflow:assurance:runtime-check` | Passed | 6/6 runtime tables and 2/2 migration rows present. |
| `npm run policy:gates` | Passed | Inventory boundary, service boundary, workflow assurance, payroll immutability, hard-delete, regulatory hardcode, demo trust, and raw-error gates all passed. |
| `npm run build:app` | Blocked | Timed out after 5 minutes with no useful output before timeout. Build readiness is not certified by this audit. |

## Platform-Level Scores

Scores use the requested 0-5 rubric.

| Platform dimension | Score | Status | Rationale |
| --- | ---: | --- | --- |
| Source-of-truth maturity | 3.5 | Mostly working | Strong schemas, services, source links, evidence hashes, and policy gates; still uneven across UI/routes and some operational control tables. |
| Instant BI maturity | 3.0 | Partial to mostly working | Owner War Room, Cash Command, Manager Action Center, snapshots, and BI primitives exist; needs one certified daily business confidence habit and universal proof drawers. |
| OHADA/SYSCOHADA readiness | 3.0 | Partial | Accounting/compliance/payroll country-pack architecture exists; legal/statutory production claims still require expert-reviewed provenance and country-by-country certification. |
| Accountant adoption readiness | 3.0 | Partial | Accounting, close, data trust, source links, and close pack services exist; close and evidence export need operational population and certified accountant journey. |
| Owner/manager adoption readiness | 3.2 | Partial to mostly working | Command surfaces are strong, but need tighter first viewport, proof drillthroughs, and fewer duplicate/legacy routes. |
| POS/cashier adoption readiness | 3.0 | Partial | Core POS and cash drawer are substantial; offline cashier fallback and field-resilience remain incomplete. |
| Finance/control readiness | 3.5 | Mostly working | Ledger posting, payment reconciliation services, payroll finance, AP controls, and gates are strong; AP/reconciliation operational activation remains a gap. |
| Security/RBAC readiness | 4.0 | Production-near | RBAC, tenant guards, fresh auth, safe errors, redaction, and policy gates are strong; durable module entitlements still need full commercial schema. |
| Offline/local operating resilience | 2.5 | Partial | Backend offline sync models/services/tests exist; active cashier offline selling and durable IndexedDB queue are not complete. |
| Commercial/package readiness | 2.2 | Partial | Module catalog and observe-mode entitlement exist; durable package/subscription/tenant entitlement/billing provider boundary is not implemented. |

## Module Status Matrix

| # | Module | Status | Score | Confidence | Source-of-truth maturity | BI readiness |
| ---: | --- | --- | ---: | --- | --- | --- |
| 1 | Platform shell, navigation, localization, design system | Partial | 3.0 | High | Mixed | Partial |
| 2 | Auth, tenant membership, RBAC, module entitlement | Mostly working | 4.0 | High | Mostly canonical | Partial |
| 3 | Organization, locations, users, teams, setup | Mostly working | 3.5 | Medium | Mostly canonical | Partial |
| 4 | POS, cashier, cash drawer, shifts, receipts, offline sync | Partial | 3.2 | High | Mixed | Partial |
| 5 | Inventory, stock movements, counts, adjustments, valuation | Mostly working | 3.7 | High | Mostly canonical | Partial |
| 6 | Sales, customers, receivables, customer ledger | Partial | 3.0 | Medium | Mixed | Partial |
| 7 | Purchasing, suppliers, AP, GRN, supplier ledger | Partial | 3.2 | High | Mixed | Partial |
| 8 | Payments, reconciliation, settlement proof, suspense | Partial | 3.5 | High | Mostly canonical | Partial |
| 9 | Accounting ledger, journals, posting rules, OHADA records | Mostly working | 3.8 | High | Mostly canonical | Partial |
| 10 | Cash command, owner war room, snapshots, role BI | Mostly working | 3.6 | High | Mostly canonical read models | Mostly working |
| 11 | Payroll, HR source data, payment/statutory/accounting | Mostly working | 3.8 | High | Mostly canonical | Partial |
| 12 | Compliance, country packs, tax/VAT/fiscal workflows | Partial | 3.1 | Medium | Mixed | Partial |
| 13 | Close assurance, close packs, accountant portal | Partial | 3.2 | High | Mixed to mostly canonical | Partial |
| 14 | AI/copilot, guardrails, redaction, recommendations | Prototype/demo | 1.8 | Medium | Mixed | Low |
| 15 | Notifications, error handling, observability, incidents | Partial to mostly working | 3.4 | High | Mostly canonical | Partial |
| 16 | Reporting/export/import, data quality, onboarding/demo | Partial | 2.8 | Medium | Mixed | Partial |
| 17 | Commercialization, packages, billing, tenant provisioning | Partial | 2.2 | High | UI/read-model/observe only | Low |
| 18 | Security, privacy, abuse resistance, release gates | Mostly working | 4.1 | High | Mostly canonical | Partial |

## Module Findings

### 1. Platform Shell, Navigation, Localization, Design System

What functions well:

- `config/sidebar.ts` has a clear section taxonomy: Command, Operations, Finance & Trust, People, Governance.
- Navigation includes module slugs and permissions.
- Shared dashboard/BI primitives exist and the UI reports show a strong intended product language: state, risk, action, proof.
- Robust route states and command-center components exist.

What is lacking:

- Route taxonomy still contains duplicate or legacy-feeling surfaces, including `cashDrawer` vs finance cash drawer, inventory items vs older items, purchases vs purchase-orders, and suppliersSystem.
- UI primitives are not uniformly adopted across payroll, purchase orders, customer detail, analytics, and settings.
- Authenticated screenshot/a11y certification is still not proven in this audit. `npm run build:app` timed out.
- Localization coverage is uneven; several authenticated surfaces still appear to use inline English.

Recommended next actions:

1. Create a route maturity registry: canonical, alias, legacy-hidden, demo-only, admin-only, deprecated.
2. Normalize the top five daily role journeys to the canonical command anatomy.
3. Add authenticated Playwright screenshot/a11y gates for owner, manager, accountant, cashier, payroll admin, and restricted user.
4. Add a hardcoded-copy scan for authenticated app/components.
5. Hide or gate demo and legacy routes from normal tenant navigation.

### 2. Auth, Tenant Membership, RBAC, Module Entitlement

What functions well:

- `lib/security/rbac.ts`, `services/_shared/protect.ts`, and related tests enforce tenant and permission boundaries.
- `protect()` supports permission checks, tenant guard, fresh auth, module gates, safe error envelopes, and correlation IDs.
- `services/modules/module-catalog.service.ts` defines module catalog dependencies and route prefixes.
- `services/modules/module-entitlement.service.ts` derives legacy/requested entitlements, evaluates allow/would-block/deny, and audits observe-mode decisions.
- Tests cover wildcard RBAC not bypassing entitlement, read-only behavior, tenant scope, and protected action behavior.

What is lacking:

- Durable subscription/package/tenant-entitlement schema is still not implemented; `Organization.requestedModules` is still a legacy/onboarding source.
- Module enforcement is not yet uniformly proven across routes, actions, APIs, reports, jobs, exports, and widgets.
- Commercial module states are not yet product-grade for upgrade, downgrade, trial, read-only, and historical access.

Recommended next actions:

1. Implement durable `TenantModuleEntitlement`, package, subscription, and entitlement event models.
2. Keep observe mode for broad surfaces; enforce high-risk writes first.
3. Add a module-surface inventory gate for route/action/API/export/job/report coverage.
4. Standardize locked, read-only, upgrade, suspended, and expired route states.
5. Backfill `Organization.requestedModules` into durable entitlements and deprecate it as an access input.

### 3. Organization, Locations, Users, Teams, Setup

What functions well:

- Services exist for organization, locations, users, roles, tax rates, units, brands, and categories.
- Tests cover role service organization boundaries, user lifecycle, location org-list actions, and role permission restrictions.
- Settings routes are represented in navigation and the setup layer is documented as foundational.

What is lacking:

- Setup completeness is not yet a single certified readiness contract across locations, terminals, taxes, journals, posting rules, users, modules, and country packs.
- Team/workforce management beyond payroll users is not a visibly mature module.
- Owner/admin onboarding to "ready to trade" is not yet certified with route smoke and data setup gates.

Recommended next actions:

1. Create a tenant setup readiness service that grades locations, roles, users, terminals, tax, accounting, modules, and country packs.
2. Put setup blockers into owner war room and manager action center.
3. Add onboarding/demo workspace tests for a first business launch path.
4. Make organization settings a source-of-truth setup control plane, not scattered settings pages.

### 4. POS, Cashier, Cash Drawer, Receipts, Offline Sync

What functions well:

- POS service covers locations, terminals, sessions, carts, sale commit, refunds, voids, receipt service, and drawer dashboard.
- Offline POS has serious backend primitives: device, batch, event, conflict, certificate models; sync service; local queue; server replay through `commitPOSSale`; focused tests.
- Cash drawer models and dashboard service exist.
- Accounting postings for sale, payment, refund, void are tested.

What is lacking:

- Offline POS is not yet a complete cashier-usable workflow. The 2026-06-28 offline audit states the active charge flow still calls direct commit and does not visibly fall back to offline enqueue on network/server failure.
- Local offline queue still uses `localStorage`; IndexedDB durable queue is not complete.
- Device signature verification/key rotation and conflict workbench remain incomplete.
- Offline tenders are not fully integrated with payment reconciliation and close enforcement.

Recommended next actions:

1. Wire active POS charge failure/offline detection to provisional offline sale capture.
2. Replace localStorage with IndexedDB-backed queue with leases, schema versioning, and recovery.
3. Complete device enrollment, revocation, signature verification, and key rotation.
4. Add offline operations workbench for conflicts, pending replay, certificates, and close blockers.
5. Connect offline tenders to payment reconciliation and cash drawer close.

### 5. Inventory, Stock Movements, Counts, Adjustments, Valuation

What functions well:

- Inventory schema covers items, levels, transactions, serials, adjustments, counts, transfers, lines, and valuation concerns.
- Inventory services cover stock events, reads, transfers, adjustments, counts, projection rebuild, reconciliation, valuation, close invalidation.
- `npm run policy:gates` confirmed inventory boundary gate has zero active direct stock mutation violations.
- Tests cover inventory movement transfer actions, service boundary, counts/adjustments, and stock mutation protections.

What is lacking:

- Inventory BI is not yet fully owner-facing as a certified stock-to-cash proof chain.
- Physical count confidence and shrinkage are not yet central daily habits.
- Valuation and close-impact evidence need stronger accountant-visible surfaces.

Recommended next actions:

1. Promote stock-to-cash proof to the owner first viewport.
2. Build inventory count confidence and variance action queue.
3. Add valuation proof drawer tied to ledger and close impact.
4. Add dashboard cards that separate system stock from physically verified stock.
5. Add route-level tests for count, transfer, adjustment, and valuation workbenches.

### 6. Sales, Customers, Receivables, Customer Ledger

What functions well:

- Schema covers SalesOrder, SalesOrderLine, DailySalesReport, DailySalesReportItem, DailySalesReportCashEvent, Customer, and CustomerLedgerEntry.
- Customer service includes management rows, summaries, detail analytics, legacy adapters, and customer ledger-related analytics.
- POS/sales data is tied to payments and accounting posting paths.
- Customer and dashboard action tests cover tenant scoping.

What is lacking:

- Receivables/customer cash pressure is not yet a central BI truth loop.
- Some customer/sales routes are older or split across route families.
- Sales module maturity is less obvious than POS/payment/accounting because AP/AR aging and customer cash pressure need stronger workflows.

Recommended next actions:

1. Build receivables aging and customer cash pressure into Cash Command/Owner War Room.
2. Normalize customer detail and sales surfaces to the command/evidence page anatomy.
3. Add customer ledger proof drillthroughs from receivables cards.
4. Clarify canonical route family for sales/customers.

### 7. Purchasing, Suppliers, AP, Goods Receipt, Supplier Ledger

What functions well:

- Purchase order service supports lifecycle, receiving, status changes, summary, attention list, analytics, CSV export, and form options.
- AP control service is large and finance-grade: supplier invoices, bank change requests, approvals, supplier payment release, and AP workbench.
- Schema covers SupplierInvoice, ThreeWayMatch, SupplierPayment, SupplierPaymentAllocation, SupplierLedgerEntry, SupplierBankAccount, and SupplierBankChangeRequest.
- AP reports and hidden-insights analysis identify received-not-invoiced and three-way match as high-value.

What is lacking:

- Local data evidence from 2026-06-28 showed supplier invoices / three-way matches / supplier payments were 0 / 0 / 0, despite purchase orders and goods receipts being populated.
- AP proof is designed but not yet operationally active as a daily workflow.
- Supplier bank-change fraud controls need highly visible owner/accountant review.

Recommended next actions:

1. Build AP invoice center and received-not-invoiced work queue.
2. Complete three-way match detail and variance resolution.
3. Connect supplier payment release to ledger, payment proof, and close.
4. Add supplier bank-change control cards and maker-checker alerts.
5. Put AP exposure in the daily business confidence brief.

### 8. Payments, Reconciliation, Settlement Proof, Suspense

What functions well:

- Payment and reconciliation schemas are extensive: Payment, PaymentRefund, ProviderAccount, StatementFile, StatementLine, PaymentTransaction, MatchRecord, SuspenseItem, ReconciliationRun, PaymentException, inbox items.
- Services exist for provider events, statement import, payment reconciliation workbench, reconciliation runs, certification, suspense assignment, suspense posting, and notifications.
- Tests cover provider event security, reconciliation actions, run service, certification, suspense workflows, payment proof drawer UI, and payment truth snapshots.
- Cash Command and snapshots consume payment truth.

What is lacking:

- Hidden-insights data showed zero provider payment transactions, statement lines, reconciliation runs, suspense, and exceptions in the local DB on 2026-06-28.
- The payment reconciliation moat is structurally present but not yet an operationally populated pilot.
- External provider integrations and bank/mobile money ingestion need controlled market-specific activation.

Recommended next actions:

1. Run a payment reconciliation pilot with one provider/bank statement format.
2. Populate provider accounts, statement imports, payment transactions, match records, suspense, exceptions, and signed run certificate.
3. Make payment proof drawer universal from Cash Command, Owner War Room, Finance, and Accountant Portal.
4. Add reconciliation freshness SLA and action routing.
5. Treat payment proof as the first go-to-market trust wedge.

### 9. Accounting Ledger, Journals, Posting Rules, OHADA Records

What functions well:

- Schema covers ChartOfAccount, Journal, JournalEntry, JournalEntryLine, LedgerPostingBatch, AccountingSourceLink, PostingRule, PostingRuleLine, LedgerAuditEvent, FiscalYear, AccountingPeriod.
- Accounting services include settings, accounts, journals, periods, posting rules, source links, posting service, reports, control center, data trust, close assurance, customer ledger, and default POS/AP/payroll posting rules.
- POS sale/payment/refund/void posting tests pass in the codebase.
- Graph and docs consistently identify ledger-first operating spine as a core architecture.

What is lacking:

- OHADA/SYSCOHADA readiness is architecture-supported but not certified as legal compliance for production.
- Posting rule coverage should become visible as setup readiness and close blockers.
- Accountant-facing source-link explorer and audit/event explorer are not yet fully productized.

Recommended next actions:

1. Build posting-rule readiness into setup and accountant portal.
2. Productize source-link and ledger audit explorer.
3. Create OHADA/SYSCOHADA configuration provenance registry with expert-review status.
4. Tie every financial dashboard number to source-link/evidence readiness.

### 10. Cash Command, Owner War Room, Snapshots, Role BI

What functions well:

- Services exist for tenant operating snapshots, branch snapshots, payment truth, inventory cash, close readiness, cash command, owner war room, manager action center, daily habit digest, stock-to-cash, and business signals.
- Recent payroll forecast slice added aggregate upcoming payroll/statutory obligations with fail-closed proof gates and redaction.
- Components provide BI cards, proof drawer hosts, action priority boards, trust legends, business truth zones, and command brief headers.
- Tests cover owner war room, cash command, manager action center, snapshot rebuild, and dashboard route state behavior.

What is lacking:

- There are several command surfaces; the product needs one certified first viewport.
- Not every card has universal proof drawer, evidence grade, freshness, blocker, and role-aware action contract.
- Some BI/analytics pages still risk looking like static/demo reporting if not explicitly proof-backed.

Recommended next actions:

1. Define one command-card contract for all role BI: value, evidence grade, freshness, blocker, redaction, proof subject, action route.
2. Make Daily Business Confidence Brief the first viewport.
3. Add role-specific variants for owner, manager, accountant, finance officer, cashier, payroll operator.
4. Promote proof drawer and unavailable states to every critical KPI.
5. Add product usage telemetry separate from audit logs.

### 11. Payroll, HR Source Data, Payment/Statutory/Accounting

What functions well:

- Payroll is one of the most developed modules: employee source data, contracts, compensation, rubriques, salary-change maker-checker, payment destination evidence, setup readiness, runs, payslips, declarations, payment batches, reconciliation, register, privacy, self-service, adapter registry, statutory scenario coverage, authority adapter execution, and payroll finance forecasts.
- Policy gates confirm payroll immutability runtime triggers: 9/9 present, 14/14 forbidden mutations blocked, 3/3 lifecycle checks allowed.
- Tests are extensive: 46 payroll-related test files by audit count.
- Privacy/redaction is first-class; person-level salary and payment data have explicit controls.

What is lacking:

- Final payroll production reports still mark full production blocked for statutory breadth and controlled pilot scope.
- Country-pack statutory expansion remains explicit expert-review territory.
- Local data evidence is still minimal sample volume for payroll.
- Payroll role UI is strong but not uniformly normalized to the shared command anatomy.

Recommended next actions:

1. Keep payroll as controlled-pilot until country-pack statutory coverage is expert-reviewed.
2. Complete authority adapter production proof and manual fallback evidence.
3. Keep payroll financial aggregates in command surfaces, with person-level redaction by default.
4. Normalize payroll UI to shared command primitives.
5. Certify payroll setup -> run -> payment -> declaration -> register -> close journey.

### 12. Compliance, Country Packs, Tax/VAT, Fiscal Workflows

What functions well:

- Compliance schema covers FiscalDocument, FiscalDocumentLine, FiscalSequence, ComplianceSubmission, ComplianceAdapterConfig, ComplianceEvidence.
- Compliance services include fiscal document creation, evidence, certification outbox, compliance center snapshot, country-pack hooks, adapter contracts, and adapters.
- Regulatory hardcode gate passed with zero active production regulatory hardcodes.
- Country-pack legal boundary is well understood in docs: do not hard-code statutory claims without expert-reviewed provenance.

What is lacking:

- Compliance proof volume appears small in local data.
- Country-pack production readiness is not complete across OHADA countries.
- Legal/tax claims still require explicit expert review and authority adapter certification.

Recommended next actions:

1. Create country-pack readiness matrix by country, tax type, authority adapter, evidence state, and expert-review status.
2. Build compliance evidence archive and submission queue.
3. Add fiscal rejection/retry/acceptance proof to owner/accountant daily brief.
4. Keep all statutory values in country packs or reviewed configuration.

### 13. Close Assurance, Close Packs, Accountant Portal

What functions well:

- Schema covers CloseRun, CloseChecklistItem, CloseAssuranceFinding, CloseEvidenceItem, ClosePackExport, AccountantReview, AccountantComment.
- Services exist for close assurance, close assurance pack, data trust, accountant portal actions, workflow assurance, snapshots, and stock-to-cash close state.
- Close assurance has strong architectural positioning and release gate alignment.

What is lacking:

- Hidden-insights local data showed close runs, close findings, and close evidence empty as of 2026-06-28.
- Posted ledger is not the same as certified close; the close habit must be operationally created.
- Accountant adoption needs a complete close pack and evidence export journey.

Recommended next actions:

1. Generate close readiness for active periods automatically or as a guided run.
2. Build close blocker drillthrough from owner/accountant surfaces.
3. Certify close pack export with evidence hashes, source links, reconciliation state, payroll/statutory status, and inventory valuation.
4. Add accountant review workflow as a daily/periodic habit.

### 14. AI/Copilot, Guardrails, Redaction, Recommendations

What functions well:

- The repo has signals, action queues, proof links, redaction services, and guarded business facts that can support an AI layer later.
- Product strategy correctly treats AI as useful only on trusted evidence.

What is lacking:

- No evidence from this audit proves an enterprise-grade AI copilot workflow is production-ready.
- Human approval, source grounding, safe action execution, and prompt/evidence contracts must be hardened before AI becomes central.

Recommended next actions:

1. Do not lead with AI in market positioning.
2. Build AI only after evidence/proof/action contracts are stable.
3. Start with read-only explanation and next-action summaries, not autonomous mutation.
4. Add strict source citations, redaction, permission checks, and human approval.

### 15. Notifications, Error Handling, Observability, Incidents

What functions well:

- Error handling gates passed: raw-error boundary has zero active unsafe findings.
- Workflow assurance runtime tables exist and policy gates pass.
- Assurance services include registry, scheduler, incidents, waivers, control tower, and incident detail.
- Signals and action queues exist.
- AuditLog and business event outbox exist.

What is lacking:

- Local hidden-insights report found workflow assurance definitions/runs/incidents empty as of 2026-06-28, despite runtime readiness.
- Product usage telemetry is not separated from audit logs; audit logs can be noisy.
- Notifications need a role/action/SLA loop connected to owner/manager/accountant habits.

Recommended next actions:

1. Seed/activate workflow assurance definitions and scheduled runs for pilot tenants.
2. Convert incidents into manager/owner/accountant action queues.
3. Add product telemetry taxonomy distinct from security/audit logs.
4. Add notification routing by role, severity, SLA, and proof link.

### 16. Reporting, Export/Import, Data Quality, Onboarding/Demo

What functions well:

- Reports, analytics, BI components, fiscal exports, close pack export, reconciliation certificates, payroll register export, payslip export, and CSV purchase export paths exist.
- Demo/report trust gate passed with zero active production-visible findings.
- UI onboarding/demo reports exist.

What is lacking:

- Export governance is uneven across modules.
- Demo mode, data provenance, and watermarks must be uniformly visible in authenticated dashboards.
- Data quality checks should become operational action items, not only reports.

Recommended next actions:

1. Create a unified export policy registry: permission, fresh auth, redaction, watermark, evidence, audit event.
2. Add data provenance badges to all analytics/reporting surfaces.
3. Build onboarding demo workspace with explicit demo data watermarking.
4. Promote data quality issues into action queues.

### 17. Commercialization, Packages, Billing, Tenant Provisioning

What functions well:

- Module catalog, route prefixes, permissions, dependencies, observe-mode entitlement, Module Control Center, and module reports exist.
- Platform architecture blueprint clearly states the need for package/subscription/entitlement records and provider-neutral billing.

What is lacking:

- Durable module package, package version, tenant subscription, tenant entitlement, billing mirror/event, upgrade request, and deactivation policy models are not implemented.
- Billing provider boundary is not production-ready.
- Downgrade read-only historical access is designed but not materially enforced through durable state.

Recommended next actions:

1. Implement durable package/subscription/entitlement schema and services.
2. Add internal/manual invoice provisioning first, then provider adapters.
3. Enforce read-only downgrade policy for regulated/financial modules.
4. Connect module control center to commercial lifecycle, not only requested modules.
5. Add onboarding package selection and upgrade request workflow.

### 18. Security, Privacy, Abuse Resistance, Release Gates

What functions well:

- Tenant/RBAC tests, permission compatibility, fresh auth, protected actions, audit logs, safe action responses, raw error gate, hard-delete gate, service boundary gate, regulatory hardcode gate, inventory boundary gate, and payroll immutability gate are strong.
- Export safety, redaction policy, moat guard, and security settings services exist.
- Critical permission categories and wildcard restrictions are tested.

What is lacking:

- Full abuse resistance still needs route/API rate limiting, product telemetry, security posture dashboard, secrets review, and authenticated e2e route proof.
- Security posture must become visible to owner/admin without exposing sensitive internals.

Recommended next actions:

1. Build security posture mini-brief for admins/owners.
2. Add route/API rate-limit and abuse tests for high-risk APIs.
3. Certify protected route screenshots and permission-denied states.
4. Create export/security audit evidence pack for accountants and enterprise buyers.

## Go-To-Market Implications

The platform should not enter the OHADA market as "ERP software." The strongest wedge is:

> Daily cash, stock, payment, payroll, tax, and accounting truth with proof.

Best early adoption wedge:

1. Owner Daily Truth: what cash/stock/payment/AP/payroll numbers can be trusted today.
2. Payment Reconciliation Proof: mobile money, cash, bank/card settlement proof and suspense.
3. AP Exposure: received goods not invoiced, supplier payment risk, bank-change fraud controls.
4. Stock-to-Cash: purchase receipt -> stock -> sale -> payment -> ledger -> close.
5. Accountant Close Pack: source links, reconciliation, statutory evidence, close blockers, exports.
6. Offline POS Reliability: cashier can continue safely when connectivity fails.

Best target segments:

- Retail shops
- Pharmacies
- Restaurants and bakeries
- Wholesale/distribution businesses
- Multi-branch SMBs
- Accountant-managed businesses
- Businesses with mobile money, cash drawer, and inventory leakage pain

Do not lead with AI or legal compliance. Lead with owner survival value: know the truth, stop leakage, close with proof, and become finance-ready.

## Stage-by-Stage Roadmap

| Stage | Goal | Modules touched | User value | Gates and exit criteria |
| ---: | --- | --- | --- | --- |
| 0 | Current-state truth inventory and release baseline | All modules | Founder knows what is real, partial, mock, blocked, and release-safe | Prisma, typecheck, policy gates pass; app build blocker resolved; route maturity registry created. |
| 1 | Tenant/RBAC/module/audit foundation hardening | Auth, RBAC, modules, settings, security | Safer multi-tenant platform and package-ready access | Durable entitlements implemented; route/action/API/export/job module inventory gate; locked/read-only states standardized. |
| 2 | Core SMB operating truth | POS, cash drawer, inventory, sales, purchases, customers, suppliers | Daily operations produce reliable source records | POS sale/refund/void, stock, GRN, AP, customer ledger, cash drawer tests pass; offline fallback first slice complete. |
| 3 | Finance trust layer | Accounting, payments, reconciliation, AP, payroll, tax, close | Business events become ledger/evidence/control proof | Payment reconciliation pilot populated; AP invoices/matches/payments active; payroll finance and statutory proofs fail closed; posting rule readiness visible. |
| 4 | Role-specific instant BI | Dashboard, owner war room, cash command, manager center, accountant portal, finance BI, cashier control | Each role sees what to do today and why | Daily Business Confidence Brief shipped; every critical card has evidence grade, freshness, blockers, redaction, proof, action route. |
| 5 | OHADA/country-pack adoption | Accounting, compliance, payroll, close, reports | Accountants can trust close/statutory evidence | Country-pack readiness matrix; expert-reviewed country packs; close packs; fiscal submission evidence archive; accountant review workflow. |
| 6 | Adoption and scale | Onboarding, demo workspace, offline POS, billing, packages, providers | Product can sell, onboard, and support real tenants | Durable packages/subscriptions; demo watermark; provider/bank pilot; offline queue with device trust; product telemetry. |
| 7 | AI copilot and predictive operations | BI, signals, evidence, actions, security | AI explains trusted evidence and recommends safe actions | Read-only grounded copilot first; source citations; redaction; RBAC; human approval; no autonomous mutation without controls. |

## Top 20 Prioritized Backlog

1. Resolve `npm run build:app` timeout and add build output capture to audit/release reporting.
2. Create route maturity registry and hide/gate legacy/demo routes.
3. Implement durable tenant module entitlement, package, subscription, entitlement-event, and billing-event schema.
4. Create universal command-card contract with evidence grade, freshness, blocker, redaction, proof subject, and action route.
5. Ship Daily Business Confidence Brief as the first viewport.
6. Start payment reconciliation pilot: provider account, statement import, transaction normalization, match/suspense, signed run.
7. Build AP exposure workbench: supplier invoice, received-not-invoiced, three-way match, payment release evidence.
8. Generate close readiness for active periods and surface close confidence in owner/accountant views.
9. Productize accounting source-link and audit/event explorer.
10. Make stock-to-cash proof chain owner-visible.
11. Wire active POS offline fallback to provisional sale capture.
12. Replace localStorage offline queue with IndexedDB and device lease/lock.
13. Complete offline POS device signature verification, revocation, and conflict workbench.
14. Add authenticated Playwright screenshots/a11y gates for core role journeys.
15. Normalize payroll, purchase orders, customer detail, settings, analytics, and legacy pages to shared command anatomy.
16. Create country-pack readiness matrix for OHADA/SYSCOHADA/tax/payroll/compliance with expert-review states.
17. Add compliance evidence archive and authority submission/retry/acceptance proof.
18. Activate workflow assurance definitions/runs/incidents for pilot tenants.
19. Create product usage telemetry separate from audit logs.
20. Build go-to-market onboarding package: demo workspace, owner setup checklist, accountant trust pack, and package selection.

## Unresolved Blockers And Verification Gaps

- App build readiness is not certified: `npm run build:app` timed out after 5 minutes.
- Authenticated visual route quality is not certified by this audit.
- Graph output is from 2026-06-14 and should be regenerated for final release planning.
- Local operational data evidence from 2026-06-28 showed key control tables empty for provider reconciliation, AP invoice/match/payment, close runs/findings/evidence, offline POS replay, and workflow assurance runtime activity.
- OHADA/SYSCOHADA and statutory claims require expert-reviewed country-pack provenance.
- Durable commercial entitlement/subscription/billing schema is still a design target, not an implemented source of truth.
- Product usage telemetry is not yet a separate adoption signal.

## Confidence

Overall confidence: Medium-high.

High confidence:

- The repo contains broad module implementations, extensive schema coverage, strong service boundaries, and passing policy gates.
- Security/RBAC/protected action and payroll immutability foundations are materially stronger than typical SMB SaaS prototypes.
- The architecture direction is coherent: ledger-first, evidence-backed, tenant-scoped, and role-aware.

Medium confidence:

- Module scores involving UI completeness, market adoption readiness, and data population. These need authenticated route smoke, build readiness, screenshots, and pilot tenant data.

Low confidence:

- Any claim of full OHADA statutory compliance or majority-market readiness. The platform is on the right path, but those claims need country-specific expert review and production-pilot evidence.

## Final Direction

AqStoqFlow should concentrate the next phase around one daily habit:

> Can I trust the business today, what is blocking trust, and who must act next?

The system already has many of the parts. The next win is integration and certification: fewer scattered dashboards, more proof-backed daily work, more role-specific action, and stronger operational activation of payment/AP/close/offline/commercialization loops.

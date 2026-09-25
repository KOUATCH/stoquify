# Stoquify Analytics, Marketplace, and Network-Effect Strategy

Date: 2026-08-29  
Assignment type: read-only product and architecture review  
Workspace: E:\ohada saas\Focused projects\stoquify  
Decision status: strategy recommendation, not legal, accounting, privacy, security, accessibility, or release certification

## 1. Executive verdict

Stoquify should deepen its evidence-backed analytical command surfaces and controlled collaboration loops before attempting a marketplace.

The repository already contains unusually valuable foundations for a trusted SMB operating network: a server-owned Business Pulse, evidence/freshness/provenance BI contracts, Cash Command, Stock-to-Cash, payment reconciliation, purchase-order analytics, close assurance, consent-expiring accountant access, accountant-client invitations, customer-statement external access, and an invite-only supplier PO acknowledgement boundary. Those foundations can create daily and weekly decision value without creating a new ledger or allowing an external participant to mutate authoritative records.

The best product sequence is:

1. Correct metric, access, currency, freshness, and evidence gaps.
2. Build three high-value decision surfaces from existing source-owned evidence:
   - Working Capital and 13-Week Cash Command.
   - Cash Leakage and Reconciliation Exception Control Tower.
   - Accountant Advisory and Network Portfolio.
3. Expand privacy-bounded referral and external-participation analytics.
4. Pilot an accountant-led distribution network and invite-only supplier/customer collaboration.
5. Introduce a verified partner directory or integration catalog only after named gates pass.
6. Consider a curated marketplace only after the network has recurring participation, verified identities, purpose-bound consent, moderation, dispute handling, support capacity, and measurable two-sided demand.

The marketplace verdict is therefore: no open marketplace now. Build the accountant-led referral and controlled collaboration network first. The initial network is a governed participation layer, not a public discovery, payment, lending, escrow, credit-scoring, or star-rating product.

## 2. Review method and evidence boundary

Live source wins over graphs and prior strategy documents. Graphs were used for navigation and dependency signals, not as current source truth.

Primary live evidence:

- Analytics route and access catalog: app/[locale]/(dashboard)/dashboard/analytics/.
- Business Pulse owner and contract: services/analytics/sales-analytics.service.ts and services/analytics/business-pulse-contracts.ts.
- Shared BI contracts and evidence adapter: services/bi/bi-contracts.ts and services/bi/bi-evidence-adapter.service.ts.
- Referral funnel: services/referrals/referral-funnel-read-model.service.ts, actions/referrals/referral-funnel.actions.ts, and components/referrals/ReferralFunnelDashboard.tsx.
- Accountant access and invitation: services/accounting/accountant-access.service.ts and services/accounting/accountant-client-invite.service.ts.
- Supplier participation: services/purchase-order/supplier-po-acknowledgement.service.ts.
- Purchase analytics: services/purchase-order/purchase-order.service.ts and what-next/purchase-order-analytics-modernization-2026-08-14.md.
- Modules and permissions: services/modules/module-catalog.service.ts, services/modules/module-entitlement.service.ts, config/sidebar.ts, and config/permissions.ts.
- External and referral records: prisma/schema.prisma and prisma/migrations/20260809143000_customer_statement_delivery_referral/.

Current-state and risk evidence:

- what-next/system-evaluation-2026-08-28-comprehensive-report.md.
- what-next/system-evaluation-2026-08-28-risk-register.md.
- what-next/system-evaluation-2026-08-28-blocker-matrix.json.
- what-next/module-surface-inventory.md and .json.
- what-next/external-readiness/referral-target-readiness-2026-08-10/.

Graph evidence:

- graphify-out/GRAPH_REPORT.md: repository-wide graph, dated 2026-06-14.
- graphify-out/POST_SLICE_438_GRAPH_REFRESH_2026-08-09.md: refreshed ordered graphs with 9,484 merged nodes and 14,371 edges.
- graphify-out/GRAPH_REPORT_app.md: FinanceRouteAccess is a major route hub; AnalyticsPage is isolated in app Community 34, suggesting a thin route boundary.
- graphify-out/GRAPH_REPORT_actions.md: analytics functions form action Community 8; purchase-order workflow is a distinct action community.
- graphify-out/GRAPH_REPORT_components.md: PaymentReconciliationWorkbench is Community 13 and StockToCashFlowDashboard is Community 69, supporting separate source workbenches composed by higher-level BI.

Evidence limitations:

- The working tree is dirty and includes unrelated user changes. No existing files were reverted or modified by this review.
- The latest system evaluation reports 9 of 12 release blocker families open. Strategy feasibility does not mean production readiness.
- Referral live delivery and accountant invitation delivery are blocked by release-secret and environment evidence.
- Cross-tenant benchmarking, marketplace identity, reputation, matching, disputes, payouts, and moderation are not current repository capabilities.

## 3. Current product truth

### 3.1 Capability inventory

| Capability | Classification | Repository truth and implications |
|---|---|---|
| Business Pulse route and command read model | implemented and source-verified | /dashboard/analytics loads getBusinessPulseCommandReadModel and renders BusinessPulseDashboard. It contains KPI cards, changes, actions, risks, drill-throughs, evidence grade, freshness, provenance, blockers, and redactions. |
| Shared BI primitives | implemented and source-verified | components/bi and services/bi define command briefs, KPI cards, action boards, evidence badges, trust states, partial/stale/blocked states, and proof drawers. Reuse them rather than creating new dashboard frameworks. |
| Sales, product, user, and dashboard analytics | implemented and source-verified | services/analytics/sales-analytics.service.ts computes sales, transactions, items, hourly/day trends, payments, product performance, POS/cash reconciliation, and user performance. |
| Business Pulse financial semantics | partial | BUSINESS_PULSE_CURRENCY is hard-coded to XAF and period computation uses server-local date helpers. Organization currency and timezone must become contract inputs before multi-country use. |
| Analytics route RBAC | implemented and source-verified | analytics route surfaces use reports.read/dashboard.read or analytics.read and return explicit permission/no-active-organization states. |
| Analytics module entitlement at route boundary | partial | The route catalog supports module metadata, but current analytics entries do not declare modules and withAnalyticsSurfaceAccess checks RBAC only. The 2026-08-28 surface inventory remains report-only and reports mixed observe/enforce truth. |
| Referral funnel | implemented and source-verified | Tenant-scoped, aggregate-only, all-time funnel for customer statements and accountant invites. Metrics are issued links, clicks, conversions, and invite activations. Raw contacts, request data, IP, and user-agent values are excluded. |
| Referral cohort/time/quality analytics | partial | Current scope is ALL_TIME only and lacks date cohorts, acceptance latency, first trusted value, retained activation, revenue attribution, delivery failure, or denominator-quality indicators. |
| Customer-statement referral foundation | implemented but operationally unverified | Prisma has immutable statement snapshots, access tokens/logs, recipient actions, deliveries/states, referral attributions/events, and consent-bound delivery. Live delivery is blocked in current release evidence. |
| Accountant access grants | implemented and source-verified | Grants are tenant-scoped, consent-bound, role-limited, effective-dated, expiring, revocable, event-recorded, and enforce READ/EXPORT/REVIEW capabilities. |
| Accountant-client invite loop | implemented but operationally unverified | Invitation, encrypted envelope, token acceptance, referral attribution, idempotency, business events, and consent evidence exist. Live delivery remains blocked. |
| Accountant portfolio | implemented and source-verified | The portfolio shows active consented clients, country/currency, latest close status, readiness, and blockers. It is a strong base for an advisory/network surface. |
| Supplier PO acknowledgement | implemented but operationally unverified | Invite-only token access, immutable envelope, access log, accept/reject/change proposal, buyer review, idempotency, hashes, and business events exist. Metadata identifies it as a supplier-po-acknowledgement pilot. |
| Supplier external mutation authority | implemented and source-verified boundary | Supplier responses are proposals. Buyer review accepts or rejects; external actions do not directly change PO, AP, stock, journal, or bank truth. Preserve this boundary. |
| Purchase-order analytics | implemented and source-verified | /dashboard/purchase-orders/analytics provides commitment, receipt, overdue, concentration, trend, status, supplier/location/item performance, open-order aging, bilingual copy, date scopes, tenant currency, and read-only drill-throughs. Historical status reconstruction is absent. |
| Cash Command and Stock-to-Cash | implemented and source-verified | Existing services compose tenant operating snapshots, payment truth, close readiness, inventory cash, payroll aggregates, module state, evidence grades, freshness, and action links. |
| Payment reconciliation and close assurance | implemented and source-verified, operationally unverified for production | Durable services, permissions, workbenches, exceptions, suspense, signoff, certificates, close blockers, provenance, and maker-checker concepts exist. Production evidence and broad release gates remain open. |
| Module catalog | implemented and source-verified | Nineteen modules include Analytics, Reports, Commercial Agents, Purchasing/AP, Accounting, Finance, Payment Reconciliation, and other source domains. Analytics recommends Reports. |
| Module entitlement enforcement | partial | The 2026-08-28 inventory reports 410 surfaces, 369 mapped, 5 unmapped, 79 missing-permission findings, 77 dashboard-only risks, and 293 enforcement candidates. Broad hard enforcement is not ready. |
| Commercial Agents | partial | A catalog boundary describes agent networks and revenue-channel operations, but this review found no complete partner directory, verification, lead routing, commission, dispute, or marketplace workflow. |
| General budgets, scenarios, and 13-week forecast | no repository evidence found | Prior strategy review found permissions and some payroll forecast evidence but no general forecast/scenario domain. A first deterministic read model can be read-only; governed saved scenarios require new records later. |
| Marketplace identity, discovery, matching, reputation, disputes, payouts, moderation | no repository evidence found | Do not represent existing Supplier, Customer, User, or AccountantAccessGrant records as a marketplace identity system. |
| Cross-tenant benchmarking | proposal-only | Previous strategy explicitly defers benchmarking until consent, anonymization, and privacy controls mature. |
| Production release readiness | blocked | The 2026-08-28 evaluation reports 3 of 12 blocker families ready, secrets at 5/21, and production rejected. New public participation must remain behind non-production or controlled pilot gates. |

### 3.2 Existing screen overlap

Stoquify already exposes Dashboard, Business Pulse, Finance Overview, Finance Analytics, Cash Command, Cash Flow, Profitability, Sales Analytics, Retail Dashboard, Stock-to-Cash, Purchase Analytics, Owner War Room, Manager Action Center, Daily Digest, Assurance Control Tower, Accountant Portal, Accountant Portfolio, and multiple reporting pages.

The product risk is not lack of pages; it is fragmented narrative and repeated summaries. The correct pattern is:

- One first-viewport command brief for each role.
- Source-owned read models.
- Shared evidence/freshness/provenance semantics.
- Drill-through to the authoritative workflow.
- No corrective mutations inside analytical surfaces.
- Consolidate or down-rank generic overview pages when a command screen fully covers the same job.

### 3.3 Missing or unreliable information

- Business Pulse currency and timezone are not organization-derived.
- Referral analytics are all-time and do not distinguish link issuance, actual delivery, unique human engagement, activated tenant, retained tenant, and paid expansion.
- Purchase-order analytics do not reconstruct historical status as of a past date.
- No general cash forecast assumption, saved scenario, approval, or actual-versus-forecast record exists.
- No universal customer lifecycle consent, segmentation, campaign, loyalty, or LTV domain exists.
- Supplier identity is tenant-owned; the same real supplier across tenants is not a verified shared network identity.
- Live external delivery, production secrets, provider readiness, real-cohort approval, and signed pilot evidence remain blocked.
- Uniform query snapshots, export manifests, freshness SLAs, lineage, retention, and production performance are partial.
- Module access truth is mixed, making premium packaging unsafe until pilot-scope surfaces are closed.

## 4. High-value analytical jobs

| Persona | Recurring decision | Current likely substitute | Highest-value analytical job |
|---|---|---|---|
| Owner/founder | Can we pay obligations and what must change today? | Bank balance, spreadsheet, calls, delayed accountant feedback | 13-week cash command with evidence coverage and actions |
| Branch/operations manager | Which branch exception will lose cash or service today? | WhatsApp, end-of-day calls, intuition | Branch control comparison and action queue |
| Inventory manager | What stock ties cash, risks stockout, or needs action? | Manual stock sheets and reorder intuition | Inventory-to-cash velocity |
| Buyer/procurement lead | Which commitments, suppliers, or receipts create risk? | PO spreadsheet and supplier calls | Supplier commitment and AP risk |
| Finance controller | Where is cash unreconciled or leaking? | Statement matching spreadsheet | Reconciliation exception control tower |
| Accountant/accounting firm | Which client needs intervention first? | Email, screenshots, exported spreadsheets | Multi-client advisory portfolio |
| Cash/POS supervisor | Which drawers, sessions, refunds, or payment rails are risky? | Till sheets and calls | Cash leakage and session exception queue |
| Sales/customer-success lead | Which customers owe, return, churn, or destroy margin? | Sales exports and intuition | Receivables and customer behavior |
| Supplier | What must I confirm, change, deliver, or resolve? | Phone and WhatsApp | Controlled collaboration status |
| Customer | What do I owe, dispute, promise, or retrieve? | Calls and manual statements | Statement/self-service status |
| Platform administrator | Which modules, external loops, providers, or tenants are unhealthy? | Logs and support tickets | Ecosystem operations control surface |
| Commercial/implementation partner | Which referred tenants are activated and need help? | CRM or spreadsheet | Privacy-bounded activation portfolio |

## 5. Analytical opportunity matrix

Scores are 1 low to 5 high. Risk is higher when the score is higher. Priority balances value, readiness, retention, referral/network leverage, and control risk.

| Rank | Screen | Value | Readiness | Trust | Retention | Referral | Network | Effort | Risk | Priority |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | Working Capital and 13-Week Cash Command | 5 | 4 | 4 | 5 | 3 | 2 | 4 | 3 | P0 |
| 2 | Cash Leakage and Reconciliation Exception Control Tower | 5 | 5 | 5 | 5 | 3 | 2 | 3 | 3 | P0 |
| 3 | Accountant Advisory and Network Portfolio | 5 | 4 | 5 | 5 | 5 | 5 | 3 | 4 | P0 |
| 4 | Inventory-to-Cash Velocity | 5 | 4 | 4 | 5 | 2 | 2 | 3 | 2 | P1 |
| 5 | Supplier Commitment and AP Risk | 5 | 5 | 5 | 5 | 4 | 4 | 3 | 4 | P1 |
| 6 | Receivables Collection and Customer Payment Behavior | 5 | 4 | 4 | 5 | 4 | 3 | 3 | 4 | P1 |
| 7 | Margin Leakage and Profitability Explanation | 5 | 3 | 3 | 4 | 2 | 1 | 4 | 4 | P1 |
| 8 | Branch Operating Control Comparison | 4 | 4 | 4 | 5 | 2 | 2 | 3 | 4 | P1 |
| 9 | Referral and External Participation Growth | 4 | 4 | 4 | 4 | 5 | 5 | 2 | 4 | P1 |
| 10 | Counterparty Collaboration Health | 4 | 3 | 4 | 5 | 4 | 5 | 4 | 5 | P2 |
| 11 | Close and Compliance Readiness Portfolio | 5 | 4 | 5 | 5 | 4 | 3 | 3 | 4 | P2 |
| 12 | Ecosystem Operations and Marketplace Health | 3 | 1 | 2 | 3 | 4 | 5 | 5 | 5 | Conditional |

## 6. Proposed analytical screen portfolio

All screens use organization currency, organization timezone, explicit location scope, ISO date boundaries, generatedAt, periodStart/periodEnd, evidence grade, freshness, confidence/coverage, blockers, redactions, source modules, and permission-aware drill-throughs. Monetary calculations use server-side Decimal or equivalent fixed-precision aggregation; presentation conversion occurs only after authoritative totals are computed.

All screens must render loading, empty, no-data, stale, partial, degraded, permission-denied, entitlement-denied, and safe-error states. They must support keyboard navigation, visible focus, semantic headings/tables, chart text alternatives, 200% zoom, reduced motion, EN/FR content parity, and a usable small-screen list/card alternative for wide tables.

### 6.1 Working Capital and 13-Week Cash Command

- Persona/job: owner and finance controller; accountant secondary. Decide which obligations can be met and what collection, purchasing, or payment-timing action is required.
- Cadence: daily, with weekly scenario review.
- Route: extend /dashboard/finance/cash-command; do not add another finance overview.
- Complements: Cash Command, Cash Flow, Stock-to-Cash, receivables, payables, payroll aggregate obligations, tax/compliance deadlines, purchase commitments, and reconciliation.
- Service owner: Finance/Cash Command composes source-owned facts; Accounting, Purchasing, Payroll, Inventory, and Payments remain authoritative.
- Contract: CashForecastCommandReadModel with weekly buckets, source coverage, baseline/approved scenario, inflow/outflow lines, opening/closing cash, minimum buffer, confidence, blockers, and drill-throughs.
- KPIs: projected closing cash; minimum cash week; funding gap; collection coverage; committed outflow; payroll/tax coverage; inventory cash exposure; forecast error. Closing cash equals opening cash plus trusted inflows minus trusted outflows. Forecast error equals absolute actual minus prior forecast divided by max of absolute actual and a configured materiality floor.
- UX: first viewport shows cash runway, first deficit week, top three drivers, evidence coverage, and three actions. Drill to AR, AP, PO, payroll, reconciliation, and source evidence.
- Controls: finance.cash-flow.read plus source permissions; Analytics/Finance entitlement; payroll person values redacted; saved/approved scenarios require maker-checker later.
- Instrumentation: weekly active decision-makers, action-click rate, scenario review completion, forecast coverage, forecast error, days to resolve projected deficit.
- Dependencies/risks: organization currency/timezone, source due dates, approved cash opening balance, no double counting across documents, forecast governance. Value 5, effort 4, confidence 4.

### 6.2 Cash Leakage and Reconciliation Exception Control Tower

- Persona/job: finance controller and cash/POS supervisor; owner/accountant secondary. Identify unreconciled cash, drawer variance, provider mismatch, duplicate references, fees, suspense, overrides, and aged exceptions.
- Cadence: intraday and daily close.
- Route: extend /dashboard/finance/reconciliation with an executive mode; reuse /exceptions and run detail drill-throughs.
- Service owner: Payments/Reconciliation. POS, Cash Drawer, Finance, and Accounting expose source facts.
- Contract: ReconciliationLeakageReadModel with exposure by rail/location/age/root cause, control state, owner, SLA, evidence grade, confidence, and authoritative action links.
- KPIs: unreconciled amount; open suspense; critical exception amount; aged exception amount; drawer variance; duplicate exposure; provider fee variance; signed-run coverage; median resolution time. Never label exposure as proven loss until resolved evidence supports that classification.
- UX: first viewport shows total exposure, trust state, aging, top root causes, owner/SLA queue, and “why flagged” evidence.
- Controls: payments.reconciliation.read; override/sign/export remain separate permissions with fresh auth and maker-checker. Redact provider credentials and sensitive account values.
- Instrumentation: exception-free close rate, median resolution time, manual matches per 100 transactions, repeat root cause, override rate, recovered amount after verified resolution.
- Dependencies/risks: source deduplication, provider completeness, consistent cutoff/timezone, loss versus exposure language. Value 5, effort 3, confidence 5.

### 6.3 Accountant Advisory and Network Portfolio

- Persona/job: accountant or accounting firm; owner secondary. Prioritize clients by close, reconciliation, cash, AP, evidence, and consent mandate risk.
- Cadence: daily during close periods and weekly otherwise.
- Route: extend /dashboard/accounting/accountant-portfolio.
- Service owner: Accounting/Accountant Access composes only client data allowed by an active, unexpired grant. Each source service retains ownership.
- Contract: AccountantAdvisoryPortfolioReadModel with one row per active grant, client identity, permission scope, currency, close readiness, critical blockers, reconciliation exposure, cash runway band, overdue AR/AP bands, evidence freshness, next action, and consent expiry.
- KPIs: clients needing action; critical blockers; close-ready clients; stale evidence clients; expiring mandates; accepted invites; activated clients; average time to first trusted value; client retention by accountant participation. Cross-client amounts are not summed across currencies.
- UX: first viewport shows client triage queue, mandate health, referral/activation funnel, and “request evidence” or “open client” actions. Firm-level aggregate metrics use counts and bands; raw client details require a per-client grant check.
- Controls: accounting.audit.read plus delegated grant capability; no cross-tenant identity merge; no raw PII in growth analytics; exports watermarked and scope-limited; revocation immediately removes access.
- Instrumentation: active accountants, clients per accountant, portfolio WAU, invite acceptance, activated organizations per accountant, time to first trusted value, multi-tenant accountant retention, portfolio-assisted close improvement.
- Dependencies/risks: live invitation delivery, signed consent, per-row authorization, notification reliability, privacy and accountant-firm verification. Value 5, effort 3, confidence 4.

### 6.4 Inventory-to-Cash Velocity

- Persona/job: inventory manager and owner. Decide what to reorder, transfer, discount through governed workflows, count, or stop buying.
- Cadence: daily/weekly.
- Route: extend /dashboard/finance/stock-to-cash with inventory decision mode.
- Service owner: Stock-to-Cash composes Inventory valuation/movement and Sales/Purchasing facts.
- Contract: InventoryCashVelocityReadModel by item/category/location with on-hand value, aging band, sales velocity, days of cover, stockout risk, negative stock, pending commitments, margin contribution, and evidence coverage.
- KPIs: inventory value; inventory days; turnover; dead-stock value; stockout-at-risk margin; negative-stock count; cash tied in open commitments. Use approved valuation policy; do not derive certified COGS from mutable item cost.
- UX/actions: capital map, dead-stock queue, reorder affordability, transfer candidate, count discrepancy. Link to item, movement, count, PO, and adjustment workflows.
- Controls: inventory.read/levels.read plus finance.read for cash views; no adjustment action in analytics; maker-checker remains in source workflow.
- Instrumentation: dead-stock reduction, stockout frequency, inventory days, action completion, time from signal to source workflow.
- Dependencies/risks: reliable valuation, aging lots, movement completeness, returns and negative stock. Value 5, effort 3, confidence 4.

### 6.5 Supplier Commitment and AP Risk

- Persona/job: buyer, procurement lead, finance controller. Decide which PO, receipt, invoice, bank change, match exception, or payment needs intervention.
- Cadence: daily.
- Route: extend /dashboard/purchase-orders/analytics and /dashboard/purchases/payables with shared supplier evidence drill-through.
- Service owner: Purchasing/AP; supplier acknowledgement remains collaboration input only.
- Contract: SupplierCommitmentRiskReadModel by supplier/order with open commitment, acknowledged amount/date, overdue receipt, received-not-invoiced, invoice-not-matched, payment due, concentration, bank-change risk, and evidence coverage.
- KPIs: open commitments; overdue commitments; acknowledgement rate; median acknowledgement time; on-time delivery evidence; received-not-invoiced; three-way-match exception amount; supplier concentration; payment-on-time rate. “Reliability” must remain transaction-backed and tenant-private.
- UX/actions: commitment exposure, supplier queue, delivery risk timeline, AP exception strip, review proposal, open receipt, match invoice, or route bank/payment approval.
- Controls: purchase read permissions; bank fields redacted; bank change/payment release use fresh auth, segregation of duties, and maker-checker. No public supplier rating.
- Instrumentation: supplier digital participation, acknowledgement latency, re-keying avoided, receipt cycle time, match exception rate, supplier inquiry reduction.
- Dependencies/risks: external identity, delivery status evidence, invoice lifecycle, notification delivery, defamatory scoring. Value 5, effort 3, confidence 5.

### 6.6 Receivables Collection and Customer Payment Behavior

- Persona/job: finance controller and sales/customer-success lead. Decide whom to contact, which promise is at risk, and what dispute or allocation blocks collection.
- Cadence: daily/weekly.
- Route: extend /dashboard/finance/receivables and customer statement pages.
- Service owner: Accounting Receivables/Customer Statement/Settlement.
- Contract: ReceivablesCollectionReadModel by customer/document with open balance, due/overdue days, promised date, dispute state, statement delivered/opened, settlement allocation, and next action.
- KPIs: overdue AR; DSO; current/30/60/90+ aging; promise kept rate; dispute aging; statement self-service rate; collection cycle time; repeat purchase and payment band. Do not claim creditworthiness or produce cross-tenant credit scores.
- UX/actions: collection priority queue, customer timeline, statement/self-service status, evidence drawer, send governed statement, record promise through authoritative workflow.
- Controls: finance.receivables.read/collect and statement permissions; transactional delivery is separate from marketing consent; contact/redaction rules by role.
- Instrumentation: collected amount after action, statement open-to-payment conversion, self-service containment, dispute resolution time, re-keying avoided.
- Dependencies/risks: due-date quality, opening balances, consent/delivery, customer identity duplication. Value 5, effort 3, confidence 4.

### 6.7 Margin Leakage and Profitability Explanation

- Persona/job: owner and finance controller. Decide which products, discounts, returns, fees, waste, or supplier costs are eroding margin.
- Cadence: weekly/monthly.
- Route: consolidate /dashboard/finance/profitability, /profit-loss, /costs, and /sales into one explanation hierarchy; retain accounting reports as authoritative.
- Service owner: Finance composes posted accounting actuals and clearly separated operational estimates.
- Contract: MarginExplanationReadModel with revenue, posted COGS, operating estimate, discounts, returns, payment fees, write-offs, price/cost variance, confidence, and source links.
- KPIs: gross margin, contribution margin, discount leakage, return cost, fee ratio, write-off exposure, price-cost variance. Each measure labels posted, operational, estimated, or unavailable.
- UX/actions: waterfall from revenue to contribution, top causes, period/location/product comparisons, source drill-through.
- Controls: finance.profitability.read and accounting reports where posted data is shown; no payroll person-level values; no “profit” certification from operational estimates.
- Instrumentation: weekly review, action conversion, unexplained variance rate, source coverage, margin improvement after governed action.
- Dependencies/risks: valuation method, taxes, returns, discounts, fee allocation, payroll and overhead allocation. Value 5, effort 4, confidence 3.

### 6.8 Branch Operating Control Comparison

- Persona/job: branch/operations manager and owner. Decide which branch needs support or control intervention.
- Cadence: daily/weekly.
- Route: extend Owner War Room or Manager Action Center; avoid a generic branch leaderboard.
- Service owner: Dashboard/Manager Action Center composes location-scoped source models.
- Contract: BranchControlComparisonReadModel with normalized sales, cash variance, stock exceptions, receiving delays, reconciliation, close/daily-close state, staffing coverage bands, and evidence completeness.
- KPIs: sales trend; transaction count; drawer variance; stockout/negative stock; overdue receipts; unreconciled amount; daily-close completion; action SLA. Show context and volume denominators; do not rank employees or branches on opaque scores.
- UX/actions: exception-first branch matrix, filters, peer-to-prior-period comparison, drill-through to branch workflow.
- Controls: location-scope RBAC, payroll redaction, no cross-tenant comparison, manager cannot view another branch without permission.
- Instrumentation: branch action closure, close timeliness, exception recurrence, manager WAU.
- Dependencies/risks: location mapping, timezone, size normalization, fairness and staff surveillance. Value 4, effort 3, confidence 4.

### 6.9 Referral and External Participation Growth

- Persona/job: growth/product operations, owner, accountant, implementation partner. Decide which invite source and onboarding intervention produces trusted activation.
- Cadence: weekly/monthly.
- Route: extend /dashboard/analytics/referrals.
- Service owner: Referrals owns attribution aggregates; source services own invitations, delivery, access, and activation events.
- Contract: ParticipationFunnelReadModel by source/campaign/cohort with issued, delivered, clicked, accepted, activated, first trusted value, retained, expanded, and privacy threshold status.
- KPIs: delivery rate; invite acceptance; activation; time to first trusted value; referral conversion; K-factor; activated organizations per referring organization; 30/90-day retention; revenue expansion attributable to participation.
- UX/actions: source funnel, cohort trend, drop-off diagnosis, delivery health, campaign comparison, pilot gates. Never expose recipient identity in aggregate growth views.
- Controls: analytics.read plus growth-specific permission; aggregate-only; minimum cohort threshold for sensitive breakdowns; purpose-bound consent; rate limits and anti-spam.
- Instrumentation: metrics are the product instrumentation; add event-quality and denominator completeness.
- Dependencies/risks: canonical activation event, delivery receipts, bot filtering, duplicate attribution, privacy, incentives. Value 4, effort 2, confidence 4.

### 6.10 Counterparty Collaboration Health

- Persona/job: buyer, finance controller, supplier, customer, accountant. Decide which external request, proposal, dispute, promise, acknowledgement, or missing evidence needs action.
- Cadence: daily.
- Route: a future /dashboard/collaboration surface only after supplier and customer pilots share a stable contract; until then embed status in PO and statement routes.
- Service owner: future Counterparty Collaboration service owns grants, disclosed envelopes, action proposals, and participation state only.
- Contract: CollaborationHealthReadModel with envelopes issued, external response, internal acceptance, SLA, dispute state, re-keying avoided, and evidence links.
- KPIs: digital participation; response time; external completion without re-keying; internal acceptance; cycle-time reduction; dispute aging; revoked/expired access; delivery failure.
- UX/actions: role-specific queue, shared timeline, explicit internal/external state, source workflow acceptance link.
- Controls: invite-only, token/identity binding, revocation, disclosure minimization, tenant isolation, malware scanning for future documents, no external direct mutation.
- Instrumentation: response/acceptance/cycle-time and support-deflection metrics.
- Dependencies/risks: shared identity, notifications, document security, support and disputes. Value 4, effort 4, confidence 3.

### 6.11 Close and Compliance Readiness Portfolio

- Persona/job: accountant, controller, owner. Decide which evidence, reconciliation, journal, fiscal, AP, payroll, or compliance blocker prevents close.
- Cadence: daily near close; monthly otherwise.
- Route: extend /dashboard/accounting/close and accountant portfolio; do not duplicate the Close Assurance Center.
- Service owner: Close Assurance composes source blocker evidence.
- Contract: CloseReadinessPortfolioReadModel with readiness, blockers by owner/domain, evidence coverage, aging, waivers, prior-period comparison, and action paths.
- KPIs: readiness; critical/high blockers; evidence unavailable; reconciliation signed coverage; source-link coverage; days to close; reopened periods; waiver aging.
- UX/actions: readiness radar, blocker queue, evidence drawer, assign/comment/review through governed flows.
- Controls: accounting.close.read; review/comment/sign/certify remain separate; certified language only after close pack controls.
- Instrumentation: days to close, blockers resolved before close, accountant engagement, evidence request response time.
- Dependencies/risks: production assurance evidence, waiver governance, statutory review. Value 5, effort 3, confidence 4.

### 6.12 Ecosystem Operations and Marketplace Health

- Persona/job: platform administrator and partner operations. Decide whether a controlled network pilot is healthy enough to expand.
- Cadence: weekly.
- Route: future /dashboard/admin/ecosystem; proposal-only.
- Service owner: future Ecosystem Operations service consumes privacy-safe aggregates; it never owns transactions.
- Contract: EcosystemHealthReadModel with verified participants, active relationships, invite supply/demand, match requests, response, disputes, abuse flags, support load, retention, revenue, and gate status.
- KPIs: active network participants; successful collaboration pairs; concentration; median response; dispute rate/time; spam/abuse; support hours; retention lift; contribution margin.
- UX/actions: go/no-go gates, cohort health, supply-demand balance, incident/abuse queue, rollback control.
- Controls: platform-only, strict aggregation, no unrestricted tenant financial access, immutable moderation/audit evidence, maker-checker for suspensions.
- Instrumentation: all marketplace health and safety metrics.
- Dependencies/risks: almost every missing marketplace capability. Value 3, effort 5, confidence 1. Do not build until Phase 3 pilot evidence exists.

## 7. Build-ready top-three specifications

### 7.1 Top 1 — Working Capital and 13-Week Cash Command

Target route: /dashboard/finance/cash-command, with a “13-week” mode.

Exact owner and boundary:

- Owning service: services/cash-command/ as composition owner.
- Authoritative sources: Finance cash accounts and AR/AP, Accounting posted entries, Purchasing commitments/invoices/payments, Payroll aggregate obligations, Compliance due obligations, Inventory cash snapshots, Payment Reconciliation.
- Analytics must not post, settle, approve, release, or alter any source record.

Initial contract:

| Field | Meaning |
|---|---|
| organizationId, generatedAt, timezone, currency | tenant and presentation boundary |
| periodStart, periodEnd, weekStartsOn | deterministic period semantics |
| scenario | baseline identifier, status, assumption version, approvedBy when persisted later |
| openingCash | amount, evidence grade, asOf, sources |
| weeks[13] | inflows, outflows, netMovement, closingCash, bufferVariance, coverage, blockers |
| drivers | ranked source-linked inflow/outflow drivers |
| actions | permission-aware recommended source workflows |
| provenance | source modules, source hashes/versions, generated time |
| state | ready, partial, stale, blocked, empty, error |

V1 implementation reuse:

- services/cash-command/cash-command-contracts.ts and cash-command service composition.
- services/snapshots tenant operating/payment/close/inventory snapshots.
- services/stock-to-cash/stock-to-cash-flow.service.ts.
- services/bi contracts and components/bi.
- Finance route access and existing CashCommandDashboard.

New records:

- V1: none required if baseline is an ephemeral deterministic read model and user-editable scenarios are out of scope.
- Later: CashForecastScenario, CashForecastAssumption, CashForecastSnapshot, CashForecastApproval, and CashForecastActualVariance with versioning, author, currency, timezone, source hash, effective dates, approval, and audit evidence.

Permissions and packaging:

- Read: finance.cash-flow.read or a new finance.forecast.read permission.
- Saved scenario: finance.forecast.manage.
- Approval: finance.forecast.approve with maker-checker.
- Package: Finance Intelligence premium; read-only summary may appear in Owner Command.

Initial tests:

- Unit formula tests including zero/negative values, date boundaries, precision, and no double counting.
- Contract tests for source completeness, evidence grades, stale/blocked propagation, and permission-safe actions.
- Integration tests with AR/AP/PO/payroll/reconciliation fixtures.
- RBAC/module negative tests and payroll redaction.
- EN/FR, currency/timezone, keyboard, mobile, chart-alt, loading/empty/stale/partial/degraded tests.
- Representative dataset p75 latency and query-count budget.

Acceptance criteria:

1. Thirteen deterministic week buckets use the organization timezone and currency.
2. Every amount resolves to source type, source identifier, evidence grade, freshness, and inclusion rule.
3. Duplicate obligations cannot appear in both PO commitment and posted AP without an explicit deduplication rule.
4. Missing opening cash or material source coverage blocks confidence rather than silently returning zero.
5. Payroll values are aggregate-only outside payroll.
6. Every recommended action routes to a permitted source workflow.
7. No mutation exists in the analytical contract.
8. Forecast error can be computed against a prior version once persisted scenarios are introduced.

### 7.2 Top 2 — Cash Leakage and Reconciliation Exception Control Tower

Target route: /dashboard/finance/reconciliation with Summary, Exceptions, Runs, and Root Causes modes.

Exact owner and boundary:

- Owning service: Payments/Reconciliation.
- Sources: provider statements, payment transactions, matches, suspense, exceptions, reconciliation runs/signoff/certificates, POS sessions/drawers, Finance payments, Accounting source links.
- “Leakage” is exposure until a resolved case classifies confirmed loss, recovered amount, fee, timing difference, or false positive.

Initial contract:

- generatedAt, period, currency, timezone, source coverage, evidence grade.
- totals: reconciled, unreconciled, suspense, critical exception, aged exposure, drawer variance, provider fees, signed-run coverage.
- rootCauses: code, count, exposure, recurrence, confidence, evidence.
- queue: case/run/source identifiers, state, severity, owner, SLA, age, money impact, next action.
- rail/location trends and comparison.
- redactions, blockers, freshness, permission-aware drill-through.

V1 reuse:

- components/finance/PaymentReconciliationWorkbench.tsx.
- payment reconciliation workbench services/schemas and actions.
- services/cash-command for drawer/provider signal composition.
- BI evidence/proof components and accounting close blockers.

New records:

- V1 should reuse existing exceptions, suspense, matches, run states, and audit/business-event records.
- Add a root-cause taxonomy/version only if existing exception reason fields cannot support stable grouping.
- Confirmed leakage classification must be an approved resolution property, not an analytics inference.

Permissions and packaging:

- Read: payments.reconciliation.read.
- Assign/resolve/match/override/sign/certificate: existing separate permissions.
- Package: Payment Reconciliation core; advanced root-cause trends in Finance Intelligence.

Initial tests and acceptance:

1. Amounts tie to the selected run/source population and currency.
2. Exposure and confirmed loss are never conflated.
3. Override, signoff, and certificate actions preserve fresh auth and segregation of duties.
4. Provider credentials and full sensitive account values never enter the read model.
5. Every queue item has an authoritative drill-through or an explicit unavailable/blocker state.
6. Repeated events and provider replays are idempotently represented.
7. Stale or incomplete provider ingestion makes the screen partial/blocked.
8. Unit, PostgreSQL integration, permission, contract, browser, accessibility, and failure-path tests pass.

### 7.3 Top 3 — Accountant Advisory and Network Portfolio

Target route: /dashboard/accounting/accountant-portfolio with Portfolio, Advisory Queue, Mandates, and Growth modes.

Exact owner and boundary:

- Owning service: Accounting/Accountant Access.
- Source access is resolved per client with resolveAccountantClientAccess and active consent grant.
- Referrals owns aggregate attribution; Close, Reconciliation, Finance, AP, and Evidence own their facts.
- No single query may bypass per-client grant checks for convenience.

Initial contract:

- accountant identity and verified-firm status if available.
- portfolio generatedAt and aggregate counts.
- client rows: grant ID/role/expiry, organization/country/currency, close readiness, blocker bands, reconciliation band, cash runway band, AR/AP risk bands, freshness, next action.
- growth: invites issued/delivered/accepted, activated tenants, time to first trusted value, retained activation, privacy boundary.
- cross-currency portfolio totals are forbidden; counts, percentages, and currency-separated bands are allowed.

V1 reuse:

- services/accounting/accountant-access.service.ts and accountant-client-invite.service.ts.
- actions/accounting/accountant-access.actions.ts.
- components/accounting/AccountantPortfolio.tsx.
- services/referrals/referral-funnel-read-model.service.ts.
- Close Assurance, Reconciliation, Cash Command, and AP read models.

New records:

- V1: no new identity merge. Reuse grant/invite/referral events.
- Required before a public verified directory: PartnerProfile, PartnerVerification, PartnerServiceCategory, PartnerServiceArea, PartnerConsent, ModerationCase, and immutable verification history.
- An accountant firm entity is a later decision; do not infer it by matching free-text firm names.

Permissions and packaging:

- Portfolio: accounting.audit.read plus active client grant.
- Invite: accounting.close.accountant.invite.
- Export/review: enforced by grant capability.
- Package: Accountant Portfolio; referring clients may receive a controlled activation offer with no hidden financial-data exchange.

Initial tests and acceptance:

1. Revoked, expired, future, inactive-tenant, or missing grants never expose client rows.
2. Read-only grants cannot export or request client work.
3. Each client row is scoped independently and shows only permitted aggregates.
4. No raw recipient contact, IP, user-agent, or statement payload enters growth analytics.
5. Cross-currency money is never summed.
6. Invitation acceptance, activation, and first trusted value are distinct events.
7. Every row includes consent expiry and a safe unavailable state when a source module is not entitled or not present.
8. Live invitation calls remain disabled until release secret, URL, provider, consent, and real-cohort gates pass.

## 8. Marketplace option comparison

| Model | Foundation | Cold start | Missing controls | Monetization | Network strength | Time to value | Verdict |
|---|---|---|---|---|---:|---|---|
| Open supplier marketplace | Supplier and PO records only | Severe two-sided | Shared identity, discovery, matching, catalog, order boundary, disputes, moderation, fraud, payouts, support | Take rate/listing | Potentially high | Long | reject |
| Invite-only supplier/customer collaboration network | Strongest external-action foundation | Low because tenants invite known parties | Delivery, verified identity, relationship grants, support/dispute policy, common action contract | Included/premium collaboration seats | High participation/data loop | Medium | pilot after named prerequisites |
| Verified accountant and implementation-partner directory | Accountant access/invites and Commercial Agents catalog | Moderate | Firm identity, verification, categories, service areas, moderation, conflicts, complaints | Subscription/qualified lead fee, no commission initially | Medium/high | Medium | pilot after named prerequisites |
| Accountant-led client acquisition and portfolio network | Strong | Low; accountants bring clients | Live delivery, firm verification, consent, partner operations, attribution quality | Accountant portfolio subscription, tenant activation package | High B2B2B | Short | build analytics now; pilot acquisition after prerequisites |
| Country-pack/compliance adapter marketplace | Country adapter concepts and compliance modules | High expert-supply | Package format, code signing, sandbox, review, liability, updates, rollback, qualified approval | Certification/revenue share | High ecosystem | Long | defer |
| Integration/provider catalog | Provider boundaries and reconciliation adapters | Moderate | Developer identity, scopes, secrets, sandbox, certification, versioning, SLAs, revocation | Integration fee/revenue share | Medium/high | Medium/long | defer; prepare catalog contract |
| Curated B2B counterparty discovery network | Transaction-backed supplier/customer facts | Severe trust and liquidity | Shared identity, consented discovery, matching, moderation, disputes, anti-bribery, privacy | Qualified introduction/subscription | High if liquid | Long | defer |
| No marketplace yet; deepen referrals/collaboration | Strongest fit | Minimal | Close current delivery/access/metric gaps | Module bundles, portfolio seats, collaboration premium | Builds prerequisite network | Short | build now |

### 8.1 Recommended narrow model

Recommend “no marketplace yet” as the commercial decision and “accountant-led, invite-only trusted collaboration network” as the product direction.

First controlled category:

- Accountants invite known clients into Stoquify.
- Clients explicitly consent to time-bound access.
- Accountants receive a governed multi-client advisory portfolio.
- Buyers invite known suppliers to acknowledge a specific PO envelope.
- Suppliers submit proposals; the buyer remains the decision authority.
- Customer statement recipients use self-service around a specific signed statement.

Participant model:

- Closed invitations only.
- No public listing by default.
- Verified accountant/partner directory may later expose firm name, approved categories, service area, languages, and verified status only.
- Transaction performance remains tenant-private unless purpose-bound disclosure is explicitly approved.

Transaction boundary:

- Stoquify owns invitations, scoped access, disclosed envelopes, proposal/action state, evidence, and audit.
- Accounting, Purchase Order, AP, Inventory, Payment, Settlement, and other source services accept or reject business mutations.
- No marketplace payment, escrow, lending, credit scoring, payout, or public reputation.

Dispute and support:

- Initial supplier/customer disputes remain within the source document workflow.
- Partner-directory complaints require a platform moderation case, evidence, response window, maker-checker suspension, appeal, retention, and auditable closure before directory launch.

Monetization:

- Accountant Portfolio subscription by active client band.
- Finance Intelligence and Collaboration modules for tenants.
- Verified partner subscription after verification operations are proven.
- Integration/country-pack revenue share only after technical and expert-review frameworks exist.
- Avoid take rates until Stoquify controls an actual marketplace transaction and has legal/accounting review.

Go/no-go gates:

1. Pilot access surfaces have no unresolved permission/module gaps.
2. Live delivery secrets, HTTPS origin, provider sandbox, retries, abuse limits, and alerting pass.
3. Consent and revocation are signed/auditable and independently reviewed.
4. Accountant/partner and external participant identity controls are approved.
5. At least one closed cohort proves repeat participation and retention lift.
6. Support, incident, dispute, moderation, and rollback owners are staffed.
7. Privacy retention/redaction and cross-tenant isolation tests pass.
8. No critical release blocker affects the pilot path.
9. The network produces recurring participant value without public discovery.
10. Marketplace expansion has measured two-sided demand, not only internal enthusiasm.

## 9. Network and referral-loop architecture

### 9.1 Primary loop — Accountant-led client network

- Actors: accountant/firm, client owner, Stoquify.
- Trigger: accountant or client initiates a consent-bound invitation.
- Value: client gains setup, close, reconciliation, and advisory support; accountant gains a governed portfolio and less evidence chasing; Stoquify gains a multi-role activated tenant.
- Invite: token-bound email first; no contact list upload or automatic outreach.
- Activation: invitation accepted plus organization activation plus first trusted value event, such as first reconciled run, posted report, or close-readiness result.
- Recurring value: advisory queue, consent mandate health, client evidence requests, close improvement.
- Reinforcement: a productive accountant adds more clients; more clients make the portfolio more valuable; better evidence reduces service cost.
- Cold start: recruit a small number of accounting firms with existing clients and assisted onboarding.
- Drop-offs: delivery failure, consent fear, missing setup, low source coverage, accountant inactivity.
- Incentive: portfolio seats, onboarding credits, or service tooling based on activated/retained clients, never raw invite volume.
- Abuse controls: rate limits, verified sender, consent proof, suppression/revocation, no purchased lists, anomaly detection, anti-self-referral rules.
- Privacy: each client row requires a current grant; firm aggregate excludes raw contacts and financial cross-client totals.
- Events: invite.issued, delivered, clicked, accepted, organization.activated, trusted_value.achieved, grant.revoked/expired, portfolio.action.completed.
- Metrics: acceptance, activation, time to first trusted value, clients per active accountant, 30/90-day retention, K-factor, portfolio WAU, close-cycle improvement.
- Shutdown: pause if complaint/spam threshold, cross-tenant exposure, delivery abuse, consent failure, or no retention lift.

This is a true network effect only when each additional active client increases the accountant’s portfolio value and each additional active accountant improves client acquisition/support. Simple invitation conversion alone is a referral channel.

### 9.2 Secondary loop — Buyer/supplier controlled transaction participation

- Trigger: buyer issues a trusted PO envelope to a known supplier.
- Value: supplier can accept/reject/propose change; buyer gains planning evidence and avoids re-keying.
- Activation: valid supplier response followed by buyer review.
- Recurring value: repeated acknowledgements, delivery notices, invoice/status exchange later.
- Reinforcement: participation improves buyer planning and supplier service; active suppliers are invited into more controlled transactions.
- Cold start: top suppliers by PO volume; assisted first response.
- Drop-offs: delivery failure, unclear proposal state, no buyer response, identity mismatch.
- Incentive: faster confirmation and fewer status calls, not public ranking or pay-to-play.
- Abuse/privacy: invite-only scope, token expiry/revocation, proposal rate limits, tenant-private performance, no direct PO/AP mutation.
- Events/metrics: invite issued/accessed, proposal submitted, buyer accepted/rejected, response latency, digital participation, no-re-key rate, cycle-time reduction, disputes.
- Shutdown: token abuse, material impersonation, unresolved proposal backlog, or source-boundary bypass.

This becomes a network effect only after the same verified supplier can safely participate with multiple tenants through explicit relationships. The current tenant-specific invite loop is valuable collaboration and switching cost, not yet a cross-tenant network effect.

### 9.3 Secondary loop — Customer statement/self-service referral

- Trigger: merchant sends a consented signed statement.
- Value: customer retrieves evidence, disputes or promises through governed actions; merchant reduces calls and accelerates collection.
- Activation: verified statement access plus a meaningful self-service action; business referral activation is a separate event.
- Reinforcement: trusted self-service improves merchant outcomes and word-of-mouth.
- Cold start: email-first statements to a consented cohort.
- Abuse/privacy: no marketing without separate consent, token expiry/revocation, rate limits, aggregate analytics, no public balance exposure.
- Metrics: delivered/opened/actioned, self-service containment, promise/dispute completion, payment conversion, referred organization activation.
- Shutdown: delivery/consent failure, abnormal access, complaint rate, or no containment/collection benefit.

This is mainly product-led referral until referred businesses create reciprocal value for existing participants.

### 9.4 Secondary loop — Implementation partner reusable onboarding

- Trigger: verified partner applies an approved country/module onboarding template.
- Value: tenant reaches trusted value faster; partner serves more tenants; Stoquify improves activation.
- Activation: import/control totals pass, setup milestones complete, first trusted value achieved.
- Reinforcement: better templates lower partner delivery cost and improve tenant outcomes.
- Cold start: internal templates and two verified partners.
- Abuse/privacy: signed template versions, tenant preview/approval, least privilege, no credential sharing, audit and rollback.
- Metrics: activation time, import exception rate, retained tenants, clients per partner, template success, support hours.
- Shutdown: data loss, unauthorized configuration, high rollback, or unresolved support load.

This can become an ecosystem network effect when reusable partner assets increase platform value for tenants and tenant demand attracts qualified partners.

## 10. Dependency-ordered roadmap

### Phase 0 — Evidence and metric corrections

- Scope: organization currency/timezone in Business Pulse; referral event taxonomy and cohort dates; source coverage/freshness; pilot-scope permission/module inventory; duplicate-dashboard ownership map.
- Owners: Data/BI, Finance, Security/Modules, Product Analytics.
- Success: no hard-coded Business Pulse currency; deterministic time boundaries; distinct issued/delivered/clicked/accepted/activated/trusted-value events; zero pilot-scope access gaps.
- Gates: unit/contract/RBAC tests, data-owner signoff, privacy review of event payloads.
- Exit/rollback: feature flags; retain current aggregate funnel if new taxonomy fails quality checks.
- Packaging: internal foundation.
- Non-goals: marketplace, cross-tenant benchmark, prediction, public reputation.

### Phase 1 — Highest-value analytical screens

- Scope: top-three screens, delivered sequentially or with a WIP limit that does not compete with release blocker closure.
- Owners: Cash Command, Payments/Reconciliation, Accountant Access, BI platform.
- Success: role WAU, action click/completion, source coverage, exception resolution time, forecast review, accountant portfolio engagement.
- Gates: source-owner contracts, RBAC/module negative tests, redaction, EN/FR, accessibility, representative-data performance, rollback flag.
- Exit: down-rank/consolidate overlapping generic screens after usage evidence.
- Packaging: Finance Intelligence, Reconciliation, Accountant Portfolio.
- Non-goals: write actions in analytics, saved AI recommendations, public external access expansion.

### Phase 2 — Referral and counterparty collaboration expansion

- Scope: cohort funnel, first trusted value, delivery health, supplier response analytics, customer self-service containment.
- Prerequisites: release secret/provider sandbox gates, consent, alerts, abuse controls, signed pilot cohort.
- Owners: Referrals/Growth, Accounting Statements, Purchase Order, Security/Privacy, SRE.
- Success: invite acceptance, activation, time to trusted value, supplier/customer digital participation, no-re-key rate, complaint rate within approved limit.
- Gates: token/replay/abuse tests, provider failure drills, privacy retention, support runbook, kill switch.
- Rollback: disable live sends and new invites; preserve source records and audit.
- Packaging: Collaboration add-on; referral analytics internal/partner.
- Non-goals: public discovery, cross-tenant matching, star ratings.

### Phase 3 — Controlled accountant/supplier/partner network pilot

- Scope: verified closed cohort, accountant portfolio loop, supplier participation, two implementation partners.
- Prerequisites: Phase 2 metrics, identity verification, moderation/support owners, pilot authorization, no critical path blocker.
- Success: retained multi-tenant accountants, recurring supplier participation, measurable cycle-time/support savings, retention lift.
- Gates: verification, conflict/complaint process, maker-checker suspensions, penetration/privacy testing, incident rehearsal.
- Rollback: revoke directory visibility/invitations, retain audit, keep internal tenant workflows.
- Packaging: partner tier and collaboration seats.
- Non-goals: take rate, marketplace payment, lending, public reputation.

### Phase 4 — Curated marketplace only if gates pass

- Scope: one category only, likely verified accountants/implementation partners; controlled profiles and inquiry, no financial-data disclosure.
- Prerequisites: demonstrated supply/demand, partner verification, discovery policy, matching, moderation, dispute/appeal, support/cost model, legal/accounting/privacy/security review.
- Success: qualified inquiry conversion, time to match, dispute rate/time, tenant activation/retention lift, positive contribution margin.
- Gates: executive go/no-go and independent control review.
- Rollback: remove discovery and inquiry; preserve existing direct grants and portfolios.
- Packaging: partner subscription or qualified lead fee.
- Non-goals: supplier goods marketplace, escrow, credit scoring, public transaction ratings.

### Phase 5 — Privacy-safe benchmarking

- Scope: opt-in cohorts with minimum thresholds, anonymization, anti-reidentification tests, permitted metric definitions, withdrawal.
- Prerequisites: explicit consent, privacy impact assessment, qualified review, cohort thresholds, aggregation/noise policy, data-retention controls.
- Success: benchmark adoption and action value without privacy incident or reidentification risk.
- Rollback: withdraw dataset/metric and invalidate cached exports.
- Packaging: premium advisory benchmark.
- Non-goals: public league tables, employee ranking, raw cross-tenant disclosure.

## 11. Monetization and packaging

| Package | Included value | Boundary |
|---|---|---|
| Operating Core | Business Pulse summary and source drill-through | Operational evidence only |
| Finance Intelligence | 13-week cash, margin explanation, AR/AP/inventory cash | Requires source modules and controlled metric contracts |
| Payment Reconciliation | Exception control tower, root-cause trends, certificates | Override/sign/export permissions remain separate |
| Accountant Portfolio | Multi-client advisory, close/readiness, invites, mandate health | Per-client consent grant; no cross-currency aggregate |
| Collaboration Network | Statement self-service, supplier PO participation, collaboration analytics | Invite-only; external actions are proposals |
| Partner/Directory later | Verified profile, categories, service area, controlled inquiry | No public financial performance or star ratings |
| Adapter Ecosystem later | Approved integration/country-pack packages | Signing, sandbox, review, version/rollback required |

Commercial rules:

- Entitlement must be enforced at server read/action boundaries, not sidebar-only.
- Source modules remain required dependencies.
- Read-only plans must never permit write actions through analytical drill-throughs.
- Pricing experiments use cohort-level product instrumentation, not financial-data resale.
- Never monetize hidden disclosure of tenant or counterparty data.

## 12. Risk register

| ID | Risk | Level | Control and exit criterion |
|---|---|---|---|
| AMN-01 | Analytics becomes a second ledger | Critical | Source-owned records and formulas; read-only composition; tie-out tests |
| AMN-02 | Cross-tenant data leak through accountant/partner views | Critical | Per-client grant checks, tenant filters, negative tests, revocation |
| AMN-03 | Hard-coded currency/timezone misstates decisions | High | Organization-derived semantics and boundary tests |
| AMN-04 | “Leakage,” “profit,” or “reliability” overclaims evidence | High | Evidence grades, controlled terminology, source proof, qualified review where needed |
| AMN-05 | Referral analytics expose identity or enable spam | Critical | Aggregate-only contracts, purpose consent, thresholds, rate limits, suppression |
| AMN-06 | External response changes authoritative truth | Critical | Proposal/acceptance boundary and idempotent source-service validation |
| AMN-07 | Marketplace impersonation/fraud/fake reviews | Critical | Do not launch open marketplace; verification/moderation gates; no public ratings |
| AMN-08 | Module/RBAC gaps enable unpaid or unauthorized access | Critical | Pilot-scope surface ratchet and server entitlement checks |
| AMN-09 | Duplicate dashboards reduce adoption | High | Command-screen ownership map and route consolidation |
| AMN-10 | Forecast produces false confidence | High | Deterministic assumptions, coverage/confidence, scenarios, actual-vs-forecast |
| AMN-11 | Supplier/customer scoring becomes defamatory or discriminatory | Critical | Tenant-private transaction facts, explainable bands, no public score |
| AMN-12 | Provider delivery/alerts fail silently | Critical | Sandbox proof, retries, idempotency, heartbeat, alerts, kill switch |
| AMN-13 | Partner support and disputes overwhelm operations | High | Closed cohort, staffing/SLA/cost gates, rollback |
| AMN-14 | Cross-tenant benchmark reidentifies firms | Critical | Defer; opt-in, minimum cohorts, anonymization and qualified privacy review |
| AMN-15 | Feature work displaces current blocker closure | High | Phase 0 first, WIP limit, feature flags, explicit release dependency |

## 13. Metrics tree

North-star outcome: weekly active organizations completing at least one evidence-backed decision/action with retained multi-role participation.

- Decision value
  - decision-screen WAU by role
  - action click-through and authoritative action completion
  - time from signal to resolution
  - forecast error and evidence coverage
  - close/reconciliation/collection cycle-time reduction
- Trust and control
  - percentage of metrics with current provenance/freshness
  - blocked/partial/stale rate
  - unexplained variance
  - permission/entitlement denial correctness
  - override, complaint, dispute, and incident rate
- Collaboration
  - supplier/customer digital participation
  - external actions completed without staff re-keying
  - acknowledgement/response/dispute time
  - self-service containment
- Referral and network
  - invite delivery/acceptance/activation
  - time to first trusted value
  - activated organizations per referrer
  - active clients per accountant
  - K-factor equals invites per active organization times acceptance times activation
  - 30/90-day retention by network participation
- Commercial
  - attach rate by module
  - expansion attributable to participation
  - partner-sourced activated revenue
  - support cost and contribution margin

Guardrail metrics:

- zero cross-tenant exposure
- zero unapproved public financial disclosure
- spam/complaint and token-abuse below approved thresholds
- no source mutation from analytics
- no external action bypassing source authority
- no marketplace expansion while a critical gate is open

## 14. First 30, 60, and 90 days

### Days 1–30

1. Approve the screen ownership map and retire duplicate-screen proposals.
2. Fix Business Pulse currency/timezone contract and verify organization semantics.
3. Define the metric registry for forecast, leakage exposure, activation, and first trusted value.
4. Add date cohorts and event-quality fields to the referral read-model design; preserve aggregate-only output.
5. Close pilot-scope module/RBAC findings for the three target routes.
6. Produce read-model contracts and source-owner signoff for the top three screens.
7. Define provider/consent/abuse gates for accountant and statement invites.

### Days 31–60

1. Build and test Working Capital read-only baseline behind a feature flag.
2. Build Reconciliation root-cause/exposure mode from existing exception/suspense data.
3. Extend Accountant Portfolio with per-client advisory bands and consent-expiry actions.
4. Add instrumentation for action completion, evidence coverage, latency, and robust states.
5. Run EN/FR, keyboard, screen-reader, phone/tablet, permission, and performance evidence on the three routes.

### Days 61–90

1. Pilot the top three screens with internal/non-production or approved cohort boundaries.
2. Measure weekly use, action completion, decision time, and trust failures.
3. Rehearse accountant invitation and supplier acknowledgement only if delivery/security gates pass.
4. Review whether participation improves retention and reduces re-keying/support.
5. Decide Phase 2 go/no-go. Do not authorize a directory or marketplace on feature completion alone.

## 15. Assumptions and unresolved questions

Assumptions:

- The current repository is the product truth; historical reports are advisory.
- Existing source services can expose stable read-only contracts without changing their mutation authority.
- “Network folder” means docs/network for published report copies.
- The first market is OHADA-aware SMBs and their existing accountants/suppliers, not anonymous public participants.

Unresolved:

1. Which pilot countries, tenant currencies, and timezones are approved?
2. What is the canonical “first trusted value” event for each acquisition path?
3. Which provider sandbox and live delivery channels are approved?
4. Who verifies accountant/partner identity and handles complaints/appeals?
5. What data-retention and erasure rules apply to referral and external access evidence?
6. Which forecast assumptions may users edit, and who approves them?
7. What minimum cohort and anti-reidentification policy would a future benchmark require?
8. Which existing dashboard routes should be consolidated or down-ranked?
9. What p75 latency and representative data-volume budgets apply?
10. What legal/accounting treatment applies to future partner fees or revenue share?

Reviewer lenses not directly applicable:

- Lending, escrow, marketplace payments, and credit scoring: not applicable because they are explicitly excluded pending separate regulated-provider and qualified reviews.
- Public reputation/rating design: not applicable because the recommendation rejects it.
- AI prediction: not applicable to the first sequence; deterministic explainable analytics are the required foundation.

## 16. Do now / pilot next / defer / reject

| Decision | Items |
|---|---|
| Do now | Metric/access corrections; top-three read-model contracts; Business Pulse currency/timezone; referral cohort taxonomy; dashboard ownership/consolidation; read-only screen implementation after source-owner approval |
| Pilot next | Accountant-led client loop; invite-only supplier acknowledgement expansion; customer statement self-service; implementation-partner templates; privacy-bounded participation analytics |
| Defer | Verified partner directory; integration catalog; country-pack adapter ecosystem; shared supplier identity; cross-tenant benchmark; curated B2B discovery |
| Reject | Open supplier marketplace now; public financial/reliability scores; unaudited star ratings; data resale; marketplace payments/escrow/lending/credit scoring without separate review; analytics-side source mutations |

## 17. Verification record

The final command results are recorded after artifact generation. Strategy recommendations remain bounded by the current dirty worktree and production no-go evidence.

| Command | Result |
|---|---|
| git status --short | passed; confirmed dirty worktree and preserved unrelated changes |
| rg --files app actions services components hooks lib config prisma graphify-out what-next | passed; repository inventory available |
| rg -n -i analytics/referral/marketplace/accountant/supplier/counterparty/benchmark/commercial agent | passed; source foundations and missing marketplace domain verified |
| npm run prisma:validate | passed; prisma/schema.prisma is valid |
| npm run policy:gates | failed closed at statutory:country-pack:gate; 11/12 checks ready, source_artifact_expert_approval remains blocked. The first sandboxed attempt hit EPERM while creating a temporary report file; the approved rerun cleared that environment issue and reached the substantive expert-approval blocker. |

## 18. Final board decision

Stoquify’s differentiated opportunity is not a generic marketplace layered on top of an ERP. It is a trust-preserving operating network where each participant receives just enough verified context to complete a controlled action, while the tenant’s source services remain authoritative.

Build the analytical habit first. Use accountants as the primary B2B2B distribution and retention loop. Use supplier PO acknowledgements and customer statements as narrow, transaction-bound participation loops. Earn the right to add discovery later through verified identities, repeat participation, safe support operations, and measurable retention. Until those gates pass, “marketplace” should remain a roadmap option, not a product claim.

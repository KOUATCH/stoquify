Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

Permanent reviewers:

- Principal enterprise/platform architect: preserve domain ownership, dependency order, tenancy boundaries, modularity, and explicit integration contracts.
- Staff backend/domain and integration engineer: protect server-owned business truth, transactional boundaries, APIs, events, idempotency, concurrency, and provider failure handling.
- Principal data/database and migration architect: protect schema integrity, monetary precision, provenance, retention, backfills, rollback safety, and zero-loss migrations.
- Principal application-security, IAM, privacy, and abuse-resistance architect: enforce tenant isolation, RBAC, entitlement, fresh auth, segregation of duties, redaction, secrets safety, auditability, and least privilege.
- Senior frontend and design-systems engineer: define maintainable, responsive, state-complete surfaces aligned with server contracts.
- Principal workflow/service designer, accessibility specialist, and localization/content strategist: validate end-to-end journeys, dense-workflow ergonomics, WCAG behavior, bilingual copy, recoverability, and human factors.
- Principal product strategist and business-process analyst: connect user outcomes, lifecycle states, operating procedures, prioritization, and measurable product value.
- Principal quality engineer and release-assurance lead: define proportionate unit, integration, contract, migration, browser, accessibility, failure-path, rollback, and evidence-producing release gates.
- Principal SRE/DevSecOps, observability, resilience, and performance engineer: cover deployment, availability, queues/workers, telemetry, alerting, incident recovery, capacity, latency, and cost.
- Principal SaaS platform, packaging, billing, growth, customer-success, and product-operations strategist: protect module lifecycle, entitlement, pricing boundaries, adoption, supportability, and sustainable commercialization.

Activate these domain reviewers:

- Analytics, BI, metric-governance, experimentation, and decision-support specialist.
- Purchasing, supplier-risk, AP, maker-checker, and payment-controls specialist.
- Accounting close, ledger, fiscal-document, reporting, and accountant-portal specialist.
- Payments, settlement, suspense, exception, and reconciliation specialist.
- Audit, evidence, records-governance, privacy, and data-quality specialist.
- Customer lifecycle, product-led growth, referral, partnership, and marketplace strategist.
- API, webhook, business-event/outbox, messaging, import/export, and third-party boundary specialist.
- Change-management, documentation, training, support, rollout, and operational-readiness specialist.

Workspace:

`E:\ohada saas\Focused projects\stoquify`

Domain:

Analytics, decision-support screens, counterparty collaboration, referral growth, marketplace strategy, and network effects.

Mission:

Analyze the current Stoquify repository and propose a prioritized portfolio of analytical screens and product loops that create measurable daily operating value, increase multi-role retention, make trusted collaboration easier, encourage responsible referrals, and—only if repository evidence and control readiness justify it—establish a credible path toward a curated marketplace or counterparty network.

Do not assume that an open marketplace is the correct answer. Compare marketplace, verified directory, counterparty collaboration network, accountant-led distribution, integration catalog, and country-pack/compliance ecosystem models. Recommend the smallest defensible model that builds on Stoquify’s current assets.

This is an analysis and product-architecture assignment. Do not implement code, modify the schema, create migrations, or change production behavior.

Repository-specific starting hypotheses to verify, not blindly accept:

- Stoquify already has an Analytics module and Business Pulse command read model.
- A privacy-bounded referral attribution funnel exists for customer-statement delivery and accountant-client invites.
- Accountant access, accountant-client invitations, and a multi-client accountant portfolio exist.
- Customer statements provide signed external access and recipient actions.
- Supplier PO acknowledgements provide a controlled external participation foundation.
- Purchasing/AP, payment reconciliation, close assurance, inventory, POS, finance, and accounting contain evidence suitable for higher-value decision screens.
- The module catalog includes Analytics, Reports, Commercial Agents, Purchasing/AP, Accounting, and other potentially relevant commercial boundaries.
- Existing strategy documents propose a counterparty trust network and warn against attempting a marketplace before participation, privacy, identity, and trust foundations are mature.
- Current source may be newer than graph reports and earlier strategy reports. Live source wins where evidence conflicts.

Operating principles:

1. Inspect before proposing.
2. Distinguish repository truth from strategy documents and new proposals.
3. Prefer service-owned analytical read models over component-side aggregation.
4. Every analytical screen must help a named user make a decision or complete an action. Reject decorative analytics.
5. Preserve domain ownership. Analytics may compose source truth but must not become a second ledger, inventory engine, referral ledger, supplier authority, or accounting authority.
6. Do not automatically merge identities or data across tenants.
7. Do not recommend cross-tenant benchmarking without explicit consent, minimum cohort thresholds, anonymization, anti-reidentification controls, and qualified privacy review.
8. Treat supplier/customer/accountant participation as proposed external actions. Existing internal services must accept or reject any resulting business mutation.
9. Reputation must be based on permissioned, transaction-backed evidence. Do not introduce unaudited star ratings, public financial exposure, or defamatory scoring.
10. Keep OHADA, statutory, tax, accounting, and country-specific configuration outside hard-coded analytics logic.
11. Preserve tenant isolation, RBAC, module entitlements, redaction, audit evidence, idempotency, safe errors, and maker-checker controls.
12. Account for the dirty worktree. Do not modify or revert unrelated user changes.

Tasks:

### 1. Establish current repository truth

Inspect the named evidence and produce a capability inventory covering:

- Existing analytics routes, read models, metrics, reports, command surfaces, drill-throughs, actions, permissions, and module entitlements.
- Existing referral sources, events, funnel stages, consent records, external access flows, attribution limitations, and pilot-readiness blockers.
- Existing accountant-client, customer-statement, supplier, purchase-order acknowledgement, commercial-agent, and counterparty collaboration foundations.
- Existing data useful for working capital, profitability, stock performance, cash conversion, receivables, payables, supplier performance, customer behavior, reconciliation, compliance, close readiness, and operational risk.
- Existing duplicated or overlapping dashboards.
- Missing data, unreliable data, stale models, blocked workflows, and control gaps.

Classify every finding as:

- `implemented and source-verified`
- `implemented but operationally unverified`
- `partial`
- `proposal-only`
- `blocked`
- `no repository evidence found`

For every material claim, cite the route, service, action, model, component, test, graph node/community, or report that supports it.

### 2. Identify high-value analytical jobs

Evaluate the decision-support needs of:

- Owner/founder
- Branch or operations manager
- Inventory manager
- Buyer/procurement lead
- Finance controller
- Accountant or accounting firm
- Cash/POS supervisor
- Sales or customer-success lead
- Supplier
- Customer
- Platform administrator
- Commercial agent or implementation partner

Identify recurring decisions currently handled through spreadsheets, delayed accountant feedback, phone calls, WhatsApp, manual reconciliation, or intuition.

Rank analytical opportunities using:

- Frequency of the decision
- Financial or operational impact
- Time saved
- Error or fraud reduction
- Data readiness
- Explainability and trust
- Ability to drive an immediate action
- Cross-module leverage
- Retention/stickiness potential
- Referral potential
- Network-effect potential
- Monetization potential
- Implementation effort
- Security/privacy/control risk

### 3. Propose analytical screens

Propose 8–12 analytical screens. They may extend existing surfaces or introduce new ones only when a distinct user job and service boundary justify it.

For every proposed screen specify:

- Working name
- Primary persona and secondary personas
- User problem and decision supported
- Why the user would return daily, weekly, or monthly
- Existing route to extend or proposed route
- Existing capabilities it replaces, consolidates, or complements
- Required source services and authoritative records
- Proposed service-owned read-model contract
- KPI definitions and formulas
- Currency, date, location, organization, and timezone semantics
- Provenance, evidence grade, freshness, and confidence requirements
- Visual hierarchy and first-viewport content
- Filters, comparisons, drill-throughs, and recommended actions
- Links to authoritative source workflows
- RBAC permission and module-entitlement requirements
- Redaction and segregation-of-duty requirements
- Empty, loading, stale, partial, degraded, permission-denied, entitlement-denied, error, and no-data states
- Responsive behavior, accessibility, and English/French content requirements
- Product instrumentation and adoption metrics
- Implementation dependencies and principal risks
- Estimated value, effort, and confidence score

Prioritize screens that turn trusted Stoquify evidence into action, such as—but not limited to:

- Working-capital and 13-week cash command
- Margin leakage and profitability explanation
- Inventory-to-cash velocity and dead-stock exposure
- Supplier commitment, delivery, concentration, and AP-risk intelligence
- Receivables collection and customer-payment behavior
- Accountant multi-client advisory and close-readiness portfolio
- Branch performance and operational-control comparison
- Referral, invitation, external-participation, and activation analytics
- Counterparty collaboration health
- Marketplace or partner ecosystem operations, if justified

These are candidate areas, not mandatory conclusions.

Select the top three screens and make their specifications build-ready. Include the exact likely service owner, read-model boundary, existing code to reuse, required new records if any, route placement, initial test strategy, and acceptance criteria.

### 4. Evaluate marketplace models

Compare at least these models:

1. Open supplier marketplace
2. Invite-only supplier/customer collaboration network
3. Verified accountant and implementation-partner directory
4. Accountant-led client acquisition and portfolio network
5. Country-pack/compliance adapter marketplace
6. Integration/provider catalog
7. Curated B2B counterparty discovery network
8. No marketplace yet—deepen referral and collaboration loops first

For each model assess:

- Participant supply and demand
- Cold-start problem
- Existing repository foundations
- Missing identity, consent, verification, discovery, matching, transaction, dispute, reputation, payout, and moderation capabilities
- Domain ownership
- OHADA/accounting implications
- Data-sharing and privacy risks
- Fraud, impersonation, collusion, spam, bribery, and fake-review risks
- Operational and customer-support burden
- Monetization model
- Network-effect strength
- Time to credible value
- Go/no-go gates

Provide a clear verdict:

- `build now`
- `pilot after named prerequisites`
- `defer`
- `reject`

If a marketplace is recommended, define its narrow first category, controlled participant model, onboarding and verification process, discovery rules, transaction boundary, dispute process, evidence model, monetization, and exit/rollback strategy.

Do not recommend marketplace payments, lending, credit scoring, escrow, public reputation, or cross-tenant financial-data disclosure without a separate regulated-provider, legal, security, privacy, fraud, and accounting review.

### 5. Design network effects and referral loops

Design one primary and up to three secondary loops. Consider:

- Accountant invites client → client activates Stoquify → accountant gains a governed portfolio view → accountant invites more clients.
- Buyer sends trusted PO envelope → supplier responds digitally → buyer gains better planning evidence → supplier is invited into more controlled transactions.
- Merchant sends a trusted statement or receipt → customer uses self-service → customer or related business activates Stoquify.
- Implementation partner configures reusable onboarding templates → activation becomes faster → the partner can serve more tenants.
- Country-pack or integration contributor expands local usefulness → more tenants adopt → contributor demand increases.

For every loop define:

- Actors
- Trigger
- Value received by each actor
- Share/invite mechanism
- Activation event
- Recurring value
- Loop reinforcement
- Cold-start intervention
- Drop-off points
- Incentive design
- Abuse controls
- Consent and privacy boundary
- Evidence and event model
- Success metrics
- Failure and shutdown criteria

Include quantitative definitions where possible:

- Invite acceptance rate
- Activation rate
- Time to first trusted value
- Referral conversion rate
- Activated organizations per referring organization
- Supplier/customer digital participation rate
- Accountant clients per active accountant
- Multi-tenant accountant retention
- Viral coefficient/K-factor
- Self-service containment rate
- Percentage of external actions completed without staff re-keying
- Transaction cycle-time reduction
- Dispute-resolution time
- Retention by network participation
- Revenue expansion attributable to network participation

Distinguish true network effects from ordinary referrals, integrations, switching costs, and product-led acquisition.

### 6. Define the recommended product sequence

Create a dependency-ordered roadmap:

- Phase 0: evidence and metric corrections
- Phase 1: highest-value analytical screens using existing trusted data
- Phase 2: referral and counterparty collaboration expansion
- Phase 3: controlled accountant/supplier/partner network pilot
- Phase 4: curated marketplace only if go/no-go gates pass
- Phase 5: privacy-safe benchmarking only after consent and anonymization controls mature

For each phase include:

- Scope
- Prerequisites
- Deliverables
- Owners
- Success metrics
- Control gates
- Rollback or exit criteria
- Commercial packaging
- Explicit non-goals

Do not run multiple high-risk phases in parallel.

### 7. Produce a final recommendation

End with:

1. Executive verdict
2. Current product-truth summary
3. Analytical opportunity matrix
4. Proposed screen portfolio
5. Build-ready top-three screen specifications
6. Marketplace option comparison
7. Recommended marketplace/network decision
8. Network and referral-loop architecture
9. Phased roadmap
10. Monetization and packaging recommendations
11. Risk register
12. Metrics tree
13. First 30-, 60-, and 90-day actions
14. Explicit assumptions and unresolved questions
15. `Do now / pilot next / defer / reject` decision table

Evidence to inspect:

Architecture and current-state evidence:

- `graphify-out/manifest.json`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/GRAPH_REPORT_app.md`
- `graphify-out/GRAPH_REPORT_actions.md`
- `graphify-out/GRAPH_REPORT_components.md`
- `graphify-out/GRAPH_REPORT_hooks.md`
- `graphify-out/GRAPH_REPORT_types.md`
- `graphify-out/POST_SLICE_438_GRAPH_REFRESH_2026-08-09.md`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`
- `what-next/system-evaluation-2026-08-28-comprehensive-report.md`
- `what-next/system-evaluation-2026-08-28-blocker-matrix.json`
- `what-next/system-evaluation-2026-08-28-risk-register.md`

Product and strategy evidence:

- `what-next/stoquify-five-vital-capabilities-strategy-review-2026-08-14.md`
- `what-next/OHADA_SMB_HIDDEN_INSIGHTS_EXECUTION_ROADMAP_2026-06-28.md`
- `docs/product/platform-insights/KONTAVA_PLATFORM_VALUE_MOAT_AUDIT_RUN_2026-06-23.md`
- `docs/product/proposals/moat/KONTAVA_CROSS_BOUNDARY_PROPOSAL_TO_EXECUTION_ANALYSIS_2026-06-20.md`
- `docs/product/innovation/KONTAVA_BI_BENCHMARK_PRESENTATION_PROMPT_2026-06-22.md`
- `what-next/AQSTOQFLOW_PLATFORM_OPERATING_GUIDE_AND_COMMAND_CENTER_REVIEW_2026-06-26.md`

Analytics and module boundaries:

- `config/sidebar.ts`
- `config/permissions.ts`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`
- `app/[locale]/(dashboard)/dashboard/analytics/`
- `services/analytics/`
- `services/bi/`
- `components/analytics/`
- `components/bi/`
- `actions/analytics/`
- focused analytics tests

Referral and external-participation foundations:

- `services/referrals/referral-attribution.service.ts`
- `services/referrals/referral-funnel-read-model.service.ts`
- `actions/referrals/referral-funnel.actions.ts`
- `components/referrals/ReferralFunnelDashboard.tsx`
- `app/[locale]/(dashboard)/dashboard/analytics/referrals/page.tsx`
- referral models in `prisma/schema.prisma`
- `prisma/migrations/20260809143000_customer_statement_delivery_referral/`
- `what-next/external-readiness/referral-target-readiness-2026-08-10/`

Accountant, customer, and supplier foundations:

- `services/accounting/accountant-access.service.ts`
- `services/accounting/accountant-client-invite.service.ts`
- `components/accounting/AccountantPortfolio.tsx`
- `app/[locale]/(dashboard)/dashboard/accounting/accountant-portfolio/`
- customer statement, receivable, settlement, and delivery services
- `services/supplier/`
- `services/purchase-order/supplier-po-acknowledgement.service.ts`
- `components/purchase-orders/SupplierPoAcknowledgementWorkbench.tsx`
- supplier, purchase-order, accountant, customer-statement, and access models in `prisma/schema.prisma`

Inspect relevant routes, actions, services, components, tests, permissions, module slugs, migrations, and recent reports discovered during the analysis. Do not rely only on the named files.

Expected artifacts:

Save:

- `what-next/STOQUIFY_ANALYTICS_MARKETPLACE_NETWORK_EFFECT_STRATEGY_2026-08-29.md`
- `what-next/STOQUIFY_ANALYTICS_MARKETPLACE_OPPORTUNITY_REGISTRY_2026-08-29.json`

The JSON registry should contain machine-readable records for:

- Existing capabilities
- Proposed screens
- KPI definitions
- Source owners
- Marketplace options
- Network loops
- Dependencies
- Scores
- Risks
- Go/no-go gates
- Roadmap phases

Verification commands:

Use focused commands proportionate to a read-only strategy review. Record each as passed, failed, skipped, timed out, or blocked.

```powershell
git status --short
rg --files app actions services components hooks lib config prisma graphify-out what-next
rg -n -i "analytics|referral|marketplace|accountant|supplier|counterparty|benchmark|commercial agent" app actions services components config prisma what-next
npm run prisma:validate
npm run policy:gates
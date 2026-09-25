# Solafide vs Stoquify: Competitive Strategy and Launch-Readiness Audit

**Audit date:** 10 September 2026  
**Workspace:** `E:\ohada saas\Focused projects\stoquify`  
**Scope:** public Solafide platform evidence, current Stoquify repository evidence, product strategy, controls, launch readiness, and market differentiation.

## Executive decision

Stoquify should not try to win by matching Solafide feature-for-feature. Solafide currently has the stronger public first impression, simpler commercial story, broader advertised ERP surface, AI-led positioning, and accountant-partner distribution narrative.

Stoquify's better path is to become the **evidence-backed operating and close platform for OHADA multi-location SMEs and their accountants**: the place where sales, stock, cash, purchasing, payroll, reconciliation, approvals, and external evidence are resolved with trustworthy provenance.

The recommended market wedge is a Cameroon trading, distribution, or retail SME with 10–100 employees, 1–5 locations, frequent inventory/cash movement, and an internal or external accountant. This is a pilot hypothesis, not observed market data.

The strategy is conditional:

1. Fix financial-truth and module-authority defects before promoting analytics or charging for them.
2. Turn existing foundations into three visibly excellent workflows: accountant-client evidence resolution, one role-aware daily resolution queue, and payment-to-ledger reconciliation with proof.
3. Match Solafide's onboarding, bilingual, local-payment, partner, and public-proof advantages.
4. Lead with verifiable control and resolution outcomes, not another broad “all-in-one ERP” claim.

There is no evidence in this audit of product-market fit, retention, production reliability, regulatory certification, or an achieved network effect for either platform.

## Evidence boundary

### Solafide

The public review covered the [homepage](https://solafideonline.com/), [features](https://solafideonline.com/features/), [French features](https://solafideonline.com/fr/features/), [pricing](https://solafideonline.com/fr/pricing/), [demo](https://solafideonline.com/demo/), [support center](https://solafideonline.com/support/), [security page](https://solafideonline.com/security/), [about page](https://solafideonline.com/about/), [API documentation](https://solafideonline.com/api-docs/), [developer API page](https://solafideonline.com/fr/developers/), [retail page](https://solafideonline.com/retail/), [industry pages](https://solafideonline.com/industries/), [case studies](https://solafideonline.com/case-studies/), and [partner/certification material](https://solafideonline.com/partners/).

An authenticated Solafide browser session was visible locally, but direct browser inspection was blocked by the browser layer's usage limit. No authenticated workflow, tenant record, or private business data was copied or changed. Therefore, Solafide application behavior, performance, permissions, offline replay, and production integrations remain unverified.

### Stoquify

The review used current source discovery, the canonical Graphify outputs, and dated repository reports. The primary internal evidence is:

- [Current competitive audit](../what-next/2026-09-06-ohada-product-competitive-audit.md)
- [Enterprise execution roadmap](../what-next/2026-09-06-stoquify-enterprise-execution-roadmap.md)
- [Enterprise first-30-days plan](../what-next/2026-09-06-stoquify-enterprise-first-30-days.md)
- [UI capability/value assessment](../what-next/ui-missing-capabilities-value-assessment.md)
- [Application graph](../graphify-out/graph_app.json)
- [Action graph](../graphify-out/graph_actions.json)
- [Component graph](../graphify-out/graph_components.json)
- [Hook graph](../graphify-out/graph_hooks.json)
- [Type graph](../graphify-out/graph_types.json)

The repository was materially dirty. Findings are about the inspected working tree and are not a frozen release-candidate assessment.

Evidence labels:

- **Source-confirmed:** traced to current source or an existing explicit artifact.
- **Reproduced:** executed with a bounded synthetic scenario.
- **Advertised:** stated by Solafide publicly.
- **Observed public:** visible on public pages without authenticated product access.
- **Inferred:** likely consequence requiring user or production validation.
- **Hypothesis:** strategic proposal requiring an experiment.

## 1. Solafide system and product analysis

### What Solafide is selling

Solafide presents itself as an African, AI-powered, OHADA-compliant ERP rather than only an accounting package. Its public surfaces combine:

- accounting, journals, financial statements, taxes, assets, cash books, and bank reconciliation;
- invoicing, CRM, receivables, collections, recurring invoices, and payment plans;
- purchasing, goods receipts, three-way matching, expenses, and procurement;
- inventory, multi-warehouse operation, stock transactions, and reorder intelligence;
- manufacturing, BOM, MRP, work orders, and production costing;
- HR, payroll, attendance, leave, employee self-service, and biometric integration;
- analytics, AI assistant, dashboards, forecasts, and custom reports;
- multi-entity and accounting-firm mode;
- role-based access, MFA, audit trail, PWA/offline operation, and industry add-ons.

This breadth is publicly visible in the [feature catalog](https://solafideonline.com/features/) and reinforced by the [support center's module structure](https://solafideonline.com/support/).

### Solafide strengths

| Strength | Why it matters | Evidence status |
|---|---|---|
| Clear African/OHADA positioning | Immediately explains who the product is for and why it is locally relevant. | Observed public |
| Broad product surface | Gives a buyer one vendor story across accounting, operations, HR, inventory, and industry needs. | Advertised; runtime unverified |
| Low-friction commercial promise | XAF pricing, free entry, no-card language, and local payment messaging reduce purchase anxiety. | Public pricing/marketing; pricing consistency needs verification |
| Bilingual AI narrative | Natural-language English/French interaction is memorable and easy to demonstrate. | Advertised |
| Onboarding story | “Set up in minutes,” import assistance, guided setup, demo, support content, and a five-day path create a strong activation narrative. | Advertised/public documentation |
| Offline/PWA message | Addresses real connectivity concerns and avoids an app-store barrier. | Advertised; sync semantics unverified |
| Accountant distribution | Free practice access, recurring commissions, partner certification, and client visibility create a potentially powerful channel. | Advertised |
| Public proof content | Case studies and quantified outcomes make the product feel more mature than an unproven software page. | Public claims; independently unverified |
| Developer narrative | Scoped keys, sandbox, signed webhooks, idempotency, rate limits, SDKs, and API pricing create an ecosystem-ready impression. | Advertised/documented at a high level |
| Industry packaging | Retail, manufacturing, healthcare, services, and add-ons help buyers recognize themselves in the product. | Advertised |

### Solafide weaknesses and risks

| Weakness/risk | Analysis | Confidence |
|---|---|---|
| Claim density exceeds independent proof | The site uses strong claims such as “only,” “complete,” “bank-level,” 99.9% uptime, ISO 27001, SOC 2, 17 countries, 100+ users, and quantified ROI. Public pages do not establish certificates, SLA history, audit reports, or independent validation. | High |
| Public metrics are inconsistent | Different surfaces use “100+ businesses,” “100+ active users,” “hundreds,” and “thousands.” These may describe different denominators, but the distinction is not explained. | High |
| Trial and pricing messages need reconciliation | The homepage says permanent free trial; the demo page says 30 days; the retail page says 14 days. The pricing page also displays introductory and later prices that need careful interpretation. | High |
| Payment availability may be inconsistent | Public pricing says mobile money is accepted, while a checkout page states online card/mobile-money payment is coming soon and bank transfer is currently used. | High |
| Certifications are asserted, not evidenced | Security pages list ISO 27001 and SOC 2, but no certificate scope, audit date, trust report, subprocessor list, or downloadable evidence was visible in the public review. | High |
| Offline semantics are underspecified | Public material says sales, attendance, expenses, and POS can be recorded offline and sync automatically. It does not explain conflict resolution, duplicate prevention, fiscal sequencing, device loss, partial sync, or recovery ownership. | High |
| Documentation is uneven | The support center says POS and manufacturing are not covered in the printed manual, and accounting-firm mode is not yet covered there. This does not prove missing functionality, but it increases implementation and support risk. | Medium-high |
| API documentation is shallow | The public API pages show endpoints and positioning, but not enough schema, webhook event catalog, versioning, error model, pagination, reconciliation semantics, or country-specific integration evidence for enterprise due diligence. | Medium-high |
| Broad ERP surface may hide depth gaps | Accounting, manufacturing, payroll, CRM, POS, AI, and offline operation are difficult to make production-deep simultaneously. The public site does not reveal depth by workflow or failure mode. | Medium |
| French localization is incomplete in places | The French site contains visible English labels and mixed-language feature sections. This weakens the promise of a fully bilingual experience. | Medium-high |
| Network claims are not established | Partner counts, customer counts, testimonials, and referral programs indicate distribution intent, not a measured network effect. | High |
| Competitive copy risk | Much of the public message is easy for another ERP to imitate: AI, all-in-one, OHADA, offline, multi-entity, and dashboards. | High |

### Solafide system-level assessment

Solafide's strongest system design, as publicly presented, is its **surface coherence**: local market message, feature breadth, low-friction entry, AI explanation, partner route, and support content reinforce one another. Its main unresolved system risk is **depth and proof across the boundaries where financial, offline, payroll, provider, security, and statutory correctness meet**.

## 2. Stoquify current-state analysis

### Source-backed strengths

The current Stoquify evidence base shows a deeper control-oriented foundation than its public positioning currently communicates:

| Stoquify foundation | Evidence and implication |
|---|---|
| Financial and operational source ownership | POS sale, inventory posting, payment posting, purchase receiving, AP, payroll, and close services are represented as domain-owned workflows. |
| Tenant and access boundary | Organization-scoped services, RBAC, module grants, fresh authorization, and route/action permission vocabulary are present. |
| Financial safety | Decimal monetary handling, idempotency fields, optimistic inventory locking, soft-delete/history preservation, audit models, and transaction-oriented posting patterns are represented in the schema and services. |
| Reconciliation workbench | Payment ingestion, matching, suspense, exception, sign-off, worker, and evidence concepts exist. A generic adapter is not live-provider proof, but it is a stronger control foundation than a simple payment list. |
| Accountant and external collaboration | Accountant access, client portfolio, customer statements, supplier acknowledgement, controlled proposals, revocation, and evidence-request primitives exist. |
| Payroll trust chain | Employee identity, contracts, compensation, attendance, leave, readiness, payroll runs, payslips, payment evidence, and declarations are represented. Country scope still requires qualified review. |
| Offline POS foundation | Local queue, sequencing, replay, authoritative sale service, inventory posting, and selected tests exist. Field connectivity and fiscal-device behavior remain unverified. |
| Assurance and close orientation | Close readiness, accountant portal, control center, immutable evidence, and exports support an enterprise trust story. |
| Modular platform direction | Module lifecycle, entitlement, navigation, operational dependencies, and package strategy are more deliberate than a collection of standalone dashboards. |

The current Graphify outputs are useful for tracing these relationships, but they are dated and inferential in places. Current source and focused tests remain authoritative.

### Verified or known Stoquify concerns

The latest internal audit reproduced or source-confirmed several issues:

1. **Financial analytics correctness:** an examined sales analytics path counted a completed 100 sale plus an unfinished 900 draft cart as 1,000 in reported sales.
2. **Analytics authority:** a route wrapper could reach an analytics data callback without a corresponding module-entitlement decision in the examined path.
3. **Country payroll evidence:** the Cameroon country gate remained blocked on qualified source-artifact approval; OHADA accounting scope was not treated as proof of uniform payroll coverage.
4. **Fragmented daily work:** Dashboard, Analytics, Daily Digest, Manager Action Center, Owner War Room, and specialist workbenches create multiple operating entry points.
5. **Technical evidence ergonomics:** an approval flow exposed an evidence hash as a manual user input rather than binding evidence behind an understandable business action.
6. **External delivery/value:** supplier, customer, accountant, referral, and notification primitives exist, but delivery recovery and productive repeated participation are not fully proven.
7. **Missing cross-module retrieval:** the shared shell's search is primarily navigation search; a bounded business-record search was recommended.

These findings are not evidence that Stoquify is unsafe in every path or that Solafide is free of equivalent issues. They identify the work required to make Stoquify's trust promise credible.

## 3. Comparative scorecard

Scores are strategic judgments, not product certifications. 1 = weak/unclear, 5 = strong/evidenced.

| Dimension | Solafide | Stoquify | Current leader | Interpretation |
|---|---:|---:|---|---|
| Public positioning | 5 | 2 | Solafide | Solafide explains itself faster and more simply. |
| Advertised breadth | 5 | 4 | Solafide | Solafide advertises more categories; Stoquify has many foundations but a less unified public catalog. |
| OHADA accounting story | 5 | 4 | Solafide public / close | Both require expert verification; Stoquify shows stronger internal control emphasis. |
| Financial evidence and close assurance | 3 | 5 | Stoquify potential | Stoquify has richer internal primitives; defects must be closed and demonstrated. |
| POS/inventory control depth | 3 | 4 | Stoquify potential | Stoquify's source ownership and consistency controls are promising; field evidence is missing. |
| Offline proof | 2 | 3 | Unclear | Both make claims; neither has sufficient public field proof in this audit. |
| Payroll/local statutory depth | 3 | 3 | Unclear | Solafide advertises local payroll; Stoquify has a trust chain but country review is incomplete. |
| Accountant distribution | 5 | 3 | Solafide | Solafide has the clearer commission/certification/channel package. |
| Onboarding and time-to-value | 5 | 2 | Solafide | Stoquify's first-run journey and migration story need productization. |
| AI discoverability | 5 | 2 | Solafide | Solafide makes AI a headline capability. Stoquify should use AI selectively behind controls. |
| API/ecosystem message | 4 | 3 | Solafide public | Solafide presents a developer story; depth remains unverified. |
| Access/control model | 3 | 5 | Stoquify potential | Stoquify has explicit entitlement and tenant controls, with known enforcement gaps to close. |
| Collaboration with evidence | 3 | 5 | Stoquify potential | Accountant, customer, supplier, and close evidence flows are a potential moat. |
| Public trust proof | 4 | 2 | Solafide | Solafide has testimonials and quantified case studies; Stoquify needs measurable pilot proof. |
| Pricing clarity | 3 | 4 potential | Unclear | Solafide is locally priced but publicly inconsistent; Stoquify needs a transparent outcome-based model. |
| Enterprise readiness proof | 2 | 3 | Unclear | Solafide claims certifications; Stoquify has controls and gates but limited external/runtime evidence. |

## 4. Solafide big wins versus Stoquify big wins

### Solafide's big wins

1. **Category ownership in the buyer's mind.** “AI-powered OHADA ERP for African businesses” is immediately understandable.
2. **Commercial accessibility.** XAF pricing, local payment language, low entry price, and no-card messaging reduce friction.
3. **Accountant-led distribution.** The partner program can compound acquisition if commission economics, certification quality, and client outcomes are real.
4. **Feature breadth as a buying shortcut.** A buyer can imagine replacing several tools with one platform.
5. **AI as a demonstration hook.** Natural-language questions are easy to show in a sales call and easy for non-accountants to understand.
6. **Public onboarding and support.** Demo, manuals, feature pages, local language, and day-by-day onboarding create confidence before login.
7. **Visible social proof.** Case studies with time, payment, and inventory outcomes provide a marketable narrative even though they require independent validation.
8. **Partner/ecosystem intent.** API pages, certification, reseller tracks, and industry add-ons signal future extensibility and distribution.

### Stoquify's big wins

1. **A stronger potential trust spine.** Stoquify is designed around source-owned business truth, posting, evidence, audit, reconciliation, close, and bounded corrections.
2. **Cross-workflow accountability.** The product can connect operations to the people, approvals, evidence, payments, and ledger outcomes that explain what happened.
3. **Enterprise-grade boundary vocabulary.** Tenant isolation, RBAC, module entitlement, fresh authorization, revocation, redaction, maker-checker, and release gates are explicit design concerns.
4. **Accountant-client resolution opportunity.** An accountant work desk can make Stoquify valuable to both the business and the professional who influences software selection.
5. **Reconciliation as a concrete moat.** A verified path from external settlement to sale, stock, supplier payment, or payroll obligation is more defensible than a generic AI assistant.
6. **Role-aware resolution rather than dashboard accumulation.** Daily Digest, Manager Action Center, Owner War Room, action queues, and specialist workbenches can become one accountable operating loop.
7. **Governed external participation.** Supplier proposals and customer statements can create collaboration without allowing third parties to mutate authoritative financial truth.
8. **Offline and inventory consistency controls.** Local queue/replay, optimistic inventory locking, idempotency, and authoritative posting are foundations for a high-trust POS story.
9. **A credible path to “prove, then act.”** Stoquify can differentiate by showing what is known, what is unresolved, what evidence supports it, and what action is authorized.

Stoquify's wins are not yet market wins. They become wins only when the product closes known defects, demonstrates task completion, and produces pilot evidence that buyers can understand.

## 5. What Stoquify is lacking

### P0: trust blockers

- Correct authoritative sales metrics and local currency/time interpretation.
- Enforce entitlement and authorization on every analytics route, action, and export.
- Complete qualified country-specific payroll scope and evidence before making statutory automation claims.
- Prove no duplicate or unexplained financial effect across POS, payments, reconciliation, AP, payroll, and offline replay.
- Bind evidence to business actions so ordinary users do not manipulate technical hashes or opaque artifacts.
- Establish a candidate-bound release and recovery baseline for the first pilot workflows.

### P1: adoption blockers

- One role-aware daily resolution queue.
- Accountant-client evidence work desk.
- Payment-to-ledger reconciliation with proof.
- Reliable delivery status, retry, consent, revocation, and recovery for external collaboration.
- Business-record search across customers, items, purchase orders, and other safe initial domains.
- Guided onboarding and migration with opening-balance, stock, AR, AP, and payroll checks.
- Stronger public landing, demo, pricing, support, and bilingual first impression.

### P2: differentiation opportunities

- Financial “why” explanations linking metric → source event → evidence → permitted action.
- Close-assurance center that accountants can use across a client portfolio.
- Cash-aware replenishment and stock-transfer recommendations with explainable assumptions.
- Customer statement and supplier collaboration that resolve real work without requiring every counterparty to become a full user.
- Narrow AI copilots for search, explanation, anomaly triage, and draft preparation, with deterministic data and human approval.
- Accountant certification, implementation playbooks, and partner economics.

### P3: defer

- Broad manufacturing parity before the initial wedge is validated.
- Public marketplace, ratings, cross-company benchmarking, or credit scoring.
- Custody, lending, or autonomous financial actions.
- Generic AI accountant or payroll agent.
- More executive dashboards that do not close a source workflow.

## 6. Strategy to lead the market

### Positioning

Recommended message:

> Stoquify helps OHADA businesses know what happened, what is still unresolved, and what can safely be done next—from stock and sales to cash, payroll, and close.

This message is narrower and more defensible than “another complete AI ERP.” Solafide should be matched on local relevance, ease, language, pricing access, and breadth where necessary, but Stoquify should win the trust-and-resolution layer.

### Product sequence

| Priority | Product move | Why now | Exit evidence |
|---|---|---|---|
| 1 | Correct financial analytics and access enforcement | False numbers or bypassable entitlement destroy every later claim. | Negative tests, source-linked fixtures, zero unauthorized downstream reads. |
| 2 | One role-aware daily resolution queue | Converts many existing surfaces into a daily habit. | ≥80% unassisted next-task discovery in role tests; lower median completion time. |
| 3 | Accountant-client evidence desk | Strong buyer/channel wedge and recurring operational value. | Repeated missing-evidence requests resolved with consent, audit, and time improvement. |
| 4 | Payment-to-ledger reconciliation proof | Concrete financial outcome and strong differentiation. | Reconciled sample periods, exception recovery, no unexplained differences, false-match rate tracked. |
| 5 | Guided migration and launch onboarding | Reduces the largest barrier to switching from spreadsheets or incumbents. | Validated opening balances, stock, AR/AP, payroll checks, reversible cutover plan. |
| 6 | Partner and public proof system | Matches Solafide's distribution and trust advantages. | Qualified accountant cohort, case studies based on measured outcomes, support cost known. |

### Commercial strategy

- Do not compete solely on lowest monthly price.
- Offer a simple core package for operational truth and a transparent premium package for accountant collaboration, reconciliation, close assurance, and advanced controls.
- Keep external participation cheap or free where it increases workflow completion.
- Use XAF and local payment options if operationally supportable.
- Make limits, support, migration, data export, and provider fees explicit.
- Build an accountant implementation and certification route, but tie rewards to retained productive use rather than registration volume.

### Distribution strategy

1. Recruit a small group of respected Cameroon accountants and run a measured client work-desk pilot.
2. Start with one inventory-heavy vertical where stock, cash, purchasing, and reconciliation pain is frequent.
3. Use customer outcomes—reconciled periods, stockout reduction, close time, exception resolution—not feature count as proof.
4. Add suppliers and customers only when delivery, consent, and recovery are dependable.

## 7. Roadmap

### 0–30 days: trust and market focus

- Close the sales analytics and analytics-entitlement defects.
- Freeze the initial customer profile and five representative role tasks.
- Define one source-linked message for the resolution queue.
- Define accountant-client evidence desk scope with one cooperating firm.
- Begin qualified Cameroon payroll review without claiming approval.
- Establish baseline activation, task time, reconciliation, delivery, and support metrics.
- Rewrite public positioning around evidence-backed resolution.

### 31–90 days: first useful workflows

- Ship the daily resolution queue inside existing dashboard primitives.
- Complete the bounded accountant-client work desk.
- Complete one statement/provider reconciliation lane, using manual import if live rails are unavailable.
- Add safe delivery/retry/revocation status for one channel.
- Run role-based browser, accessibility, French, mobile, and failure-path tests.
- Pilot with a small accountable cohort; do not launch a public network.

### 3–6 months: repeated use and proof

- Prove four weeks of repeated operational use.
- Prove at least two reviewed payroll cycles if qualified country evidence exists.
- Add customer statement or supplier collaboration according to measured demand.
- Complete migration proof and assisted onboarding.
- Publish only verified case-study outcomes.
- Decide whether the accountant or operations workflow is the primary acquisition loop.

### 6–12 months: defensibility and scale

- Expand country packs only after country-specific review, support, and evidence.
- Add explainable cash-aware replenishment and forecasting.
- Harden provider, API, webhooks, observability, restore, and support operations.
- Formalize accountant/reseller certification.
- Reassess network-effect claims using repeated useful collaboration, not invitations or registrations.

## 8. Metrics and decision gates

Track:

- time from signup/import to first completed role-relevant task;
- completion rate and median time for five representative tasks;
- organizations completing expected work on time;
- week-4 and week-8 retained productive use;
- reconciled periods and false accepted matches;
- unexplained financial differences and duplicate effects;
- unresolved exception age and recovery time;
- stockout-days and inventory correction rate;
- payroll correction count and unexplained payroll difference;
- delivery success, unknown outcomes, retry age, and duplicate sends;
- accountant/client evidence resolution time;
- support minutes per active organization;
- onboarding correction cost;
- retained paid conversion;
- delivered invitation → useful task → retained organization;
- repeated completed collaboration per existing relationship.

Launch must be blocked if:

- authoritative numbers disagree with source facts;
- module or tenant authority is bypassable;
- country statutory scope is claimed without qualified evidence;
- reconciliation produces unexplained differences;
- offline replay can duplicate or lose financial effects;
- external delivery status is presented as recipient receipt without proof;
- production recovery ownership and evidence are unknown.

## 9. Additional strategic observations

### AI

Solafide's AI is a strong acquisition hook but not automatically a moat. Stoquify should use AI for search, explanation, triage, and draft preparation while keeping posting, approvals, reconciliation decisions, payroll finalization, and external actions deterministic and human-authorized.

### Embedded finance

Financing could become valuable after Stoquify has reliable transaction, inventory, cash, and payroll evidence. It should initially be a partner-mediated referral or data-consent layer, not lending, custody, underwriting, or autonomous repayment inside the core platform.

### Network effects

Accountant-client, supplier, and customer participation can create distribution and workflow value, but the claim must be tested. Measure whether existing relationships complete useful work faster or more reliably as additional independently consented counterparties participate. Do not call invitations, page views, or registrations a network effect.

### Feature breadth

Stoquify should resist a breadth race. A smaller number of trustworthy, connected workflows can outperform a larger catalog if onboarding and task completion are materially better.

### Market vulnerability

Solafide's public claims create an opening: buyers may eventually ask for certificate evidence, country-specific depth, offline recovery details, API contracts, exportability, and proof that reports reconcile to source facts. Stoquify should be ready with a defensible evidence room, not merely a competing landing page.

## 10. Final recommendation

Stoquify should enter the market as the **trustworthy operating evidence and close layer for OHADA SMEs**, beginning with inventory-heavy Cameroon businesses and their accountants.

Solafide's biggest wins are message clarity, pricing accessibility, breadth, AI demonstration, onboarding, public proof, and partner distribution. Stoquify should match the customer-facing quality of those advantages.

Stoquify's biggest potential wins are financial truth, reconciliation proof, close assurance, role-aware resolution, accountant collaboration, controlled external participation, and explicit enterprise boundaries. Stoquify should sharpen these into visible, measured workflows.

The market-leadership decision should be revisited after the first pilot cohort. Leadership is credible only if Stoquify can demonstrate faster resolution, fewer unexplained financial differences, dependable reconciliation, lower onboarding friction, and repeated accountant/client use.

## Appendix A: public Solafide evidence register

| Source | Main evidence used |
|---|---|
| [Homepage](https://solafideonline.com/) | OHADA, AI, XAF, mobile money, trial, workflow examples, country/user claims, security claims, partner program |
| [Feature catalog](https://solafideonline.com/features/) | Accounting, AI, sales, purchasing, inventory, manufacturing, payroll, analytics, multi-entity, security, offline, add-ons |
| [French feature catalog](https://solafideonline.com/fr/features/) | French positioning and mixed-language/localization observations |
| [Pricing](https://solafideonline.com/fr/pricing/) | Plan limits, XAF prices, entities/users/transactions, API and AI inclusion, trial/pricing claims |
| [Demo](https://solafideonline.com/demo/) | 30-day trial, guided demo, onboarding, dashboard and AI preview |
| [Support](https://solafideonline.com/support/) | Manuals, feature coverage, POS/manufacturing/accounting-firm documentation gaps, release notes |
| [Security](https://solafideonline.com/security/) | Encryption, backups, RBAC/MFA, audit, GDPR, ISO 27001, SOC 2, uptime claims |
| [API docs](https://solafideonline.com/api-docs/) | Invoice, inventory, customer, reports endpoints and bearer-key model |
| [Developer API](https://solafideonline.com/fr/developers/) | Sandbox, scoped keys, webhooks, SDKs, rate limits, idempotency, API pricing |
| [Retail](https://solafideonline.com/retail/) | POS, inventory, e-commerce, loyalty, multi-store, 14-day trial claim |
| [Case studies](https://solafideonline.com/case-studies/) | Quantified customer outcomes and named examples; not independently verified |
| [Partners](https://solafideonline.com/partners/) | Accountant/reseller/referral tracks, commissions, certification and local payouts |

## Appendix B: local Stoquify evidence register

| Source | Main evidence used |
|---|---|
| [Competitive audit](../what-next/2026-09-06-ohada-product-competitive-audit.md) | Current capability map, reproduced F1/F2, opportunity ranking, evidence limits, roadmap |
| [Execution roadmap](../what-next/2026-09-06-stoquify-enterprise-execution-roadmap.md) | Current-state matrix, package ordering, trust path, pilot assumptions |
| [First 30 days](../what-next/2026-09-06-stoquify-enterprise-first-30-days.md) | Near-term focus and traceability |
| [UI capability assessment](../what-next/ui-missing-capabilities-value-assessment.md) | Business-record search, delivery exceptions, audit explorer, reconciliation recovery, access-request gaps |
| [Schema](../prisma/schema.prisma) | Tenant, audit, precision, idempotency, optimistic locking, MFA, and historical preservation foundations |
| [Sidebar](../config/sidebar.ts) | Existing Dashboard, Analytics, Daily Digest, Manager Action Center, Owner War Room, Finance, reconciliation, purchasing, and accounting entry points |
| [POS services](../services/pos/) | POS and offline-oriented service/test surface |
| [Reconciliation services](../services/reconciliation/) | Payment-reconciliation workbench, matching, suspense, and evidence surface |
| [Accounting services](../services/accounting/) | Posting, close, statements, accountant access, and financial reporting surface |
| [Payroll services](../services/payroll/) | Payroll controls, readiness, payment and declaration-related surface |
| [Module services](../services/modules/) | Module entitlement and lifecycle surface |

## Appendix C: unresolved questions

- Which Solafide claims are backed by independently reviewable evidence?
- What exact countries, payroll profiles, tax rules, payment rails, and statutory reports are operational today?
- Does Solafide's offline sync provide deterministic idempotency, conflict resolution, and recovery?
- What is Stoquify's actual first-run activation and completion rate?
- Which Stoquify workflow produces the strongest repeated value for accountants and multi-location operators?
- What price and package can support onboarding, support, provider, and country-maintenance costs?
- Which external evidence and professional approvals are required before launch claims can be made?

## Audit conclusion

The winning product is not the one with the longest module list. It is the one that helps an OHADA business complete important work with less uncertainty, fewer corrections, clearer accountability, and stronger evidence. Solafide currently sells that future more clearly. Stoquify has the opportunity to build the more trusted version, but only if it closes its own correctness gaps and turns its control architecture into simple, observable customer outcomes.

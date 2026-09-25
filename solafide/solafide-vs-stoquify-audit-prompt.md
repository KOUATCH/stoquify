Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

Permanent reviewers:

- Principal enterprise/platform architect.
- Staff backend/domain and integration engineer.
- Principal data/database and migration architect.
- Principal application-security, IAM, privacy, and abuse-resistance architect.
- Senior frontend and design-systems engineer.
- Principal workflow/service designer, accessibility specialist, and localization/content strategist.
- Principal product strategist and business-process analyst.
- Principal quality engineer and release-assurance lead.
- Principal SRE/DevSecOps, observability, resilience, and performance engineer.
- Principal SaaS platform, packaging, billing, growth, customer-success, and product-operations strategist.

Activate the full trust/domain roster because this is a broad platform, market, and enterprise-readiness review:

- OHADA accounting, finance, treasury, reconciliation, fraud-risk, and internal-controls specialist.
- OHADA/SYSCOHADA statutory, tax, payroll, labor, privacy, country-pack, and regulatory-compliance specialist.
- Audit, evidence, records-governance, and data-quality specialist.
- POS, inventory, offline-first, and distributed-consistency specialist.
- Purchasing, supplier-risk, AP, maker-checker, and payment-controls specialist.
- HRIS, payroll, attendance, employee-privacy, and self-service specialist.
- Payments, mobile-money, provider-integration, settlement, suspense, exception, and reconciliation specialist.
- Accounting close, ledger, fiscal-document, reporting, and accountant-portal specialist.
- Analytics, BI, metric-governance, experimentation, and decision-support specialist.
- AI/agent systems, model-risk, evaluation, prompt-injection defense, human-approval, and cost-governance specialist.
- API, webhook, business-event/outbox, messaging, import/export, and third-party-boundary specialist.
- Change-management, documentation, training, support, rollout, and operational-readiness specialist.

Project:
Stoquify / AqStoqFlow.

Workspace:
`E:\ohada saas\Focused projects\stoquify`

Review type:
External platform analysis, competitive strategy, product-gap assessment, enterprise-readiness review, and market-entry recommendation.

Primary competitor:
Solafide / SOAS ERP — `https://solafideonline.com`

Mission:
Conduct a thorough, evidence-led comparative analysis of Solafide and Stoquify. Determine where Solafide is genuinely stronger, where Stoquify is genuinely stronger, which apparent advantages are only marketing claims, what Stoquify currently lacks, what must be improved before launch, and which focused product and go-to-market strategy could allow Stoquify to lead in its target market.

Do not produce a generic feature checklist. Compare the two platforms through real business jobs, operating workflows, trust requirements, buyer outcomes, adoption friction, and defensible differentiation.

Operating rules:

- Inspect Solafide’s current public website and publicly accessible product surfaces.
- Use the homepage, feature pages, pricing, demo, support center, security/compliance pages, API documentation, integrations, partner program, certification program, case studies, blog, and English/French versions where available.
- If an interactive demo is publicly accessible without registration, inspect it.
- Do not create an account, submit personal data, start a trial, contact sales, or perform any external mutation unless the user has explicitly authorized it and provided appropriate credentials.
- Distinguish clearly between:
  - publicly advertised claim;
  - publicly observable behavior;
  - documentation-supported capability;
  - independently verified behavior;
  - unverified vendor claim;
  - inference;
  - recommendation.
- Record the URL, page title, access date, language, and evidence excerpt or screenshot for important findings.
- Investigate contradictions in Solafide’s public material, including trial duration, pricing, payment methods, security certifications, user/customer counts, country coverage, AI capability, and offline guarantees.
- Never treat a marketing statement as proof of operational maturity, legal compliance, security certification, customer adoption, network effects, or production reliability.

Stoquify evidence discovery:

1. Check Git status and preserve all dirty-worktree changes.
2. Inspect:
   - `graphify-out/graph_components.json`
   - `graphify-out/graph_actions.json`
   - `graphify-out/graph_app.json`
   - `graphify-out/graph_hooks.json`
   - `graphify-out/graph_types.json`
   - corresponding `GRAPH_REPORT_*.md` files
3. Treat graph files as navigation aids. Current source code and fresh verification take precedence over graph age or inferred edges.
4. Inspect relevant current source in:
   - `app/`
   - `actions/`
   - `services/`
   - `components/`
   - `hooks/`
   - `lib/`
   - `config/`
   - `prisma/`
   - focused tests
5. Review relevant existing reports, especially:
   - `what-next/2026-09-06-ohada-product-competitive-audit.md`
   - `what-next/2026-09-06-stoquify-enterprise-execution-roadmap.md`
   - `what-next/2026-09-06-stoquify-enterprise-first-30-days.md`
   - `what-next/2026-09-06-stoquify-enterprise-traceability-and-blockers.md`
   - `what-next/ui-missing-capabilities-value-assessment.md`
   - relevant `innovation/` and `docs/` product, UI/UX, controls, and roadmap reports
6. Validate every inherited finding against the current working tree before using it.

Compare the platforms across these dimensions:

1. Target customer and market wedge
   - micro-SMEs;
   - trading and distribution businesses;
   - retail and multi-location operators;
   - accountants and accounting firms;
   - manufacturers and service companies;
   - employee and manager users;
   - suppliers and customers;
   - Cameroon versus wider OHADA markets.

2. First-time experience
   - signup friction;
   - onboarding time;
   - import and migration;
   - chart-of-accounts setup;
   - first invoice, purchase order, receipt, reconciliation, and report;
   - bilingual experience;
   - role-specific setup;
   - time-to-first-value;
   - ability to recover from incomplete onboarding.

3. Accounting and OHADA trust
   - SYSCOHADA chart of accounts;
   - journal ownership;
   - tax calculations;
   - statutory reports;
   - period locks;
   - corrections and reversals;
   - auditability;
   - source evidence;
   - accountant collaboration;
   - payroll-to-ledger integration;
   - distinction between operational metrics and accounting truth.

4. Sales, invoicing, receivables, and customer workflows
   - quotes and invoices;
   - credit notes;
   - payments and receipts;
   - recurring billing;
   - collections;
   - customer statements;
   - disputes;
   - reminders;
   - payment channels;
   - revenue-recognition correctness.

5. Purchasing, suppliers, AP, and procurement controls
   - purchase orders;
   - approvals;
   - receiving;
   - inspection;
   - three-way match;
   - supplier collaboration;
   - bills and payments;
   - expense capture;
   - maker-checker controls;
   - external-party permissions.

6. Inventory, POS, and offline operation
   - stock ownership and valuation;
   - multi-warehouse and multi-location operation;
   - barcode/POS workflows;
   - stock transfers and adjustments;
   - stockout prevention;
   - offline capture;
   - synchronization;
   - conflict handling;
   - duplicate prevention;
   - fiscal and receipt integrity;
   - recovery after connectivity loss.

7. Cash, banking, payments, and reconciliation
   - bank/cash management;
   - mobile-money rails;
   - payment ingestion;
   - matching;
   - suspense;
   - exception handling;
   - settlement;
   - reconciliation evidence;
   - sign-off;
   - close readiness;
   - provider failure and retry handling.

8. HR, payroll, attendance, and employee self-service
   - employee records;
   - contracts;
   - compensation;
   - attendance;
   - leave;
   - payroll;
   - payslips;
   - IRPP/CNPS or equivalent country rules;
   - declarations;
   - payment evidence;
   - privacy;
   - qualified country review;
   - employee and manager mobile workflows.

9. Multi-entity, accountant, and collaboration model
   - multiple entities;
   - branches and locations;
   - accounting-firm mode;
   - accountant-client collaboration;
   - customer participation;
   - supplier participation;
   - permission grants;
   - revocation;
   - evidence requests;
   - delivery and notification reliability;
   - repeat collaboration value.

10. Analytics, AI, reporting, and decision support
    - dashboards;
    - reports;
    - custom report builders;
    - natural-language queries;
    - bilingual AI;
    - forecasting;
    - anomaly detection;
    - metric definitions;
    - source lineage;
    - data freshness;
    - hallucination and high-impact-action controls;
    - actionable work queues versus passive overview screens.

11. API, integration, and ecosystem readiness
    - API breadth;
    - authentication;
    - scopes;
    - rate limits;
    - idempotency;
    - webhooks;
    - SDKs;
    - sandbox;
    - import/export;
    - mobile-money providers;
    - banking;
    - payroll;
    - POS hardware;
    - integrations marketplace;
    - developer and partner experience.

12. Security, privacy, controls, and enterprise readiness
    - tenant isolation;
    - RBAC;
    - module entitlement;
    - MFA;
    - fresh authorization;
    - audit trails;
    - data retention;
    - redaction;
    - backups;
    - disaster recovery;
    - data residency;
    - vulnerability disclosure;
    - certifications;
    - incident response;
    - segregation of duties;
    - safe errors;
    - financial transaction controls.

13. Product experience and operational usability
    - information architecture;
    - navigation;
    - search;
    - dense-workflow ergonomics;
    - accessibility;
    - keyboard operation;
    - mobile responsiveness;
    - French localization quality;
    - empty/loading/error/denied states;
    - technical jargon;
    - user guidance;
    - support content;
    - documentation completeness;
    - training and implementation burden.

14. Packaging, pricing, distribution, and commercial model
    - free trial and free-plan mechanics;
    - user/entity/transaction limits;
    - module packaging;
    - price transparency;
    - local currency;
    - mobile-money payment;
    - accountant/reseller/channel strategy;
    - partner incentives;
    - implementation fees;
    - support model;
    - switching costs;
    - total cost of ownership;
    - expansion revenue;
    - likely willingness to pay;
    - buyer versus user value.

Required analysis outputs:

A. Executive decision
- State whether Stoquify should compete head-on, choose a narrower wedge, partner with Solafide, or pursue a differentiated category.
- Give a confidence level and explain the three assumptions most likely to change the decision.

B. Solafide system analysis
Provide:
- architecture and product-surface observations;
- strengths;
- weaknesses;
- workflow defects or friction;
- trust and evidence gaps;
- commercial strengths;
- commercial risks;
- operational and implementation risks;
- claims requiring verification;
- likely sources of defensibility;
- likely weaknesses a focused competitor can exploit.

C. Stoquify current-state analysis
For each major domain, classify capabilities as:
- implemented and source-confirmed;
- implemented but runtime-unverified;
- partial;
- missing;
- risky or defective;
- strategically unclear;
- intentionally deferred.

Do not call a capability missing merely because it is not visible in one navigation path. Trace routes, actions, services, contracts, permissions, data models, tests, and existing reports.

D. Comparative capability matrix
Create a table with at least:

| Capability/job | Solafide evidence | Stoquify evidence | Solafide advantage | Stoquify advantage | Confidence | Strategic implication |

Use `unknown` where evidence is insufficient.

E. Solafide big wins
Identify the strongest Solafide advantages, ranked by:
- customer value;
- frequency;
- buyer impact;
- adoption leverage;
- distribution leverage;
- defensibility;
- execution difficulty for Stoquify to copy.

For each win, explain whether it is:
- a real product advantage;
- a packaging advantage;
- a distribution advantage;
- a positioning advantage;
- an evidence-backed moat;
- or only an unverified claim.

F. Stoquify big wins
Identify the strongest Stoquify advantages grounded in current source and reports. Consider, where evidence supports them:
- trustworthy financial and operational evidence;
- payment reconciliation and close assurance;
- accountant-client work;
- role-aware operating workflows;
- governed external participation;
- tenant/RBAC/module-entitlement controls;
- POS/inventory consistency;
- payroll trust spine;
- audit and evidence continuity;
- differentiated cross-party resolution workflows.

For each win, state:
- the buyer/user problem solved;
- why Solafide may find it difficult to copy;
- what proof is still missing;
- how it could become a credible market message.

G. Stoquify gaps and launch blockers
Separate:
- P0 trust blockers that could destroy credibility;
- P1 product gaps that block adoption;
- P2 differentiation opportunities;
- P3 later expansion ideas.

Explicitly verify current known concerns such as:
- sales analytics counting unfinished work;
- analytics/module-entitlement enforcement;
- country-specific payroll evidence;
- fragmented operating entry points;
- technical evidence leaking into ordinary workflows;
- incomplete external delivery and recovery;
- insufficient business-record search;
- incomplete reconciliation exception recovery;
- migration proof and onboarding friction;
- mobile and offline runtime evidence;
- lack of observed retention, willingness-to-pay, and productive network effects.

H. Strategic gaps not explicitly requested
Also assess:
- category positioning and message clarity;
- risk of becoming a broad ERP feature-parity project;
- most attractive initial customer segment;
- strongest beachhead workflow;
- accountant-led versus direct SMB distribution;
- partner and reseller economics;
- customer switching and migration strategy;
- product-led activation;
- support and implementation capacity;
- reliability and operational maturity;
- data residency and procurement readiness;
- API/ecosystem strategy;
- pricing metric and packaging;
- defensibility after competitors copy features;
- whether the proposed network-effect thesis is falsifiable;
- risks from AI overclaiming;
- opportunities for a narrow “trustworthy operating evidence” category.

I. Prioritized strategy
Recommend:
- the top five product moves;
- the top three distribution moves;
- the top three trust/release gates;
- the top three experiments;
- capabilities Stoquify should deliberately not build yet.

Provide a phased roadmap:

| Horizon | Objective | Product work | Evidence required | Owner/capability | Exit gate |
|---|---|---|---|---|---|
| 0–30 days | Trust and positioning | ... | ... | ... | ... |
| 31–90 days | First useful workflows | ... | ... | ... | ... |
| 3–6 months | Pilot and repeat use | ... | ... | ... | ... |
| 6–12 months | Scale and defensibility | ... | ... | ... | ... |

J. Metrics and validation plan
Define measurable success metrics for:
- activation;
- time-to-first-value;
- task completion;
- repeat use;
- retention;
- reconciliation accuracy;
- duplicate financial effects;
- unresolved exception age;
- stockout-days;
- payroll differences;
- support minutes;
- onboarding correction cost;
- delivery success;
- accountant/client completion;
- willingness to pay;
- referral;
- productive collaboration;
- network-effect evidence.

Do not count dashboard views, invitations, registrations, or AI queries as value unless they lead to completed authoritative work.

K. Final recommendation
Conclude with:
1. What Stoquify should become known for.
2. Which customer should be served first.
3. Which Solafide strengths must be matched.
4. Which Solafide strengths should not be copied.
5. Which Stoquify advantages should be sharpened.
6. What must be true before public launch.
7. What would cause the strategy to be reconsidered.

Expected artifacts:

- Save the full report to:
  `what-next/2026-09-10-solafide-vs-stoquify-competitive-strategy-audit.md`
- Save a machine-readable findings register to:
  `what-next/2026-09-10-solafide-vs-stoquify-competitive-strategy-audit.json`
- Include source URLs, repository file references, evidence classifications, confidence levels, unresolved questions, and date boundaries.
- Include an evidence appendix separating public Solafide claims from observed behavior and Stoquify source-confirmed behavior.
- Include a concise launch-readiness scorecard.
- Do not modify application code, database schema, production data, external accounts, or vendor systems during this analysis.

Verification:

- Confirm the working-tree baseline with:
  `git status --porcelain --ignore-submodules=all`
- Confirm relevant repository files with:
  `rg --files graphify-out what-next innovation app actions services components hooks lib config prisma`
- Use focused `rg` searches for capabilities and gaps.
- Parse and inspect the canonical Graphify JSON files.
- Recheck every inherited Stoquify claim against current source.
- Run only focused tests or scripts needed to validate a disputed claim.
- Do not run destructive migrations, database resets, external signup flows, or broad release commands for this read-only strategy audit.
- If browser evidence is unavailable, state that limitation rather than inferring runtime behavior.

Risk controls:

- Preserve the dirty worktree.
- Do not expose private data, credentials, tokens, or customer information.
- Do not create external accounts or submit forms without explicit authorization.
- Do not claim Solafide weakness solely because documentation is missing.
- Do not claim Stoquify strength solely because code exists without user-completion evidence.
- Do not conflate OHADA accounting coverage with uniform tax, payroll, labor, payment, or statutory coverage across all countries.
- Do not treat AI, offline, API, uptime, security, certification, or customer-count claims as verified without supporting evidence.
- Do not recommend broad feature expansion before fixing trust-critical workflows.
- Do not claim product-market fit, retention, network effects, regulatory approval, or enterprise readiness without direct evidence.

Success criteria:

- Every important conclusion has a source, evidence class, and confidence level.
- Solafide’s strongest real and claimed advantages are separated.
- Stoquify’s current strengths and weaknesses are grounded in current source, graph navigation, tests, and dated reports.
- The comparison is organized around business outcomes and workflows, not feature-counting.
- The report identifies a focused Stoquify market wedge and a credible path to leadership.
- The report names concrete launch blockers, priorities, experiments, metrics, and decision gates.
- Unknowns and unresolved external dependencies are explicit.
- The final recommendation is actionable without requiring the next agent to guess scope.
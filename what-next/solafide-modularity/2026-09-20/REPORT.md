# Stoquify modularity: Solafide and Odoo Enterprise comparison

**Decision audit · 20 September 2026 · Working-tree inspection, public research, and isolated tests**

## 1. Decision

**Evolve the existing modular monolith. Use improved domain contracts underneath a workflow-first configuration experience. Test simple commercial bundles separately.**

Keep Stoquify's current composition, grants, lifecycle, domain services, transactions, and retained-work controls. Make customer choices understandable through a small number of business journeys, such as selling and collecting, purchasing and replenishing, or reconciling and closing. The advanced module catalog remains available to administrators.

Use Solafide as a reference for industry presentation and local relevance. Use **Odoo Enterprise** as the additional enterprise reference for the distinction between apps, technical modules, commercial plans, and deployment options. Neither reference establishes that Stoquify should adopt the competitor's internal architecture.

The largest discovery is that this direction is already partly built. The 5 September blueprint recommended a strengthened modular monolith; current source includes retailer/service presets, dependency resolution, durable preparation, and retained records. A proposal to build all of that again would waste existing work. The useful next step is to complete and simplify it.

**Confidence:** high that an immediate architectural replacement is unjustified; medium that workflow-first presentation will improve adoption; low on optimal pricing until customer research and support-cost measurements exist.

**Verification:** 199 existing tests passed in 14 focused suites; 14 additional isolated probes passed. Persistence and sessions were mocked or injected. No production, real-database concurrency, external billing, or authenticated customer journey was certified. See [verification](VERIFICATION.md).

## 2. Evidence boundaries

- Scope is the inspected, heavily modified working tree at HEAD a05a41ef66cd5d98fd69ae3df18225795f912232, not a frozen release. The evidence folder records Git state and source hashes.
- Solafide public pages were retrieved; its feature catalog was also viewed in a browser. Its pricing link redirected to the app origin. Automatic approval review denied that browser action because it could expose private tenant/session content. No workaround, sign-in, subscription change, or private inspection followed.
- Odoo's public pricing and Odoo 19 documentation were read in the browser after several web-tool fetches timed out. Search-indexed official documentation supplemented the browser observations. No Odoo tenant was created or changed.
- Public commercial assertions are evidence of what a vendor offers or documents, not independent proof of implementation, regulatory compliance, uptime, or customer outcomes.
- The prior Solafide report is background. Its old prices and technical concerns are not automatically current findings.
- Each reviewer perspective below is an analytical lens, not a separate professional sign-off.

## 3. Six distinct layers

| Layer | Question | Stoquify treatment |
|---|---|---|
| Domain ownership | Who owns sales, stock, payroll, payables, and ledger facts? | Existing authoritative domain services; one accountable writer per business aggregate. |
| Technical module | Which contracts and dependencies deliver a capability? | Stable IDs, owned services, explicit interfaces; same deployment initially. |
| Commercial package | What does the organization purchase? | A versioned offer mapped to capabilities; independent of navigation. |
| Entitlement and permission | Is this organization eligible, and may this actor perform this operation? | Separate decisions, both enforced where applicable. |
| Workspace and recipe | Which tasks and destinations does the user see? | Role-aware presentation and suggested configuration; selection grants no authority. |
| Extension or localization | Which industry, provider, or country variation applies? | Bounded adapters and reviewed country rules; no executable marketplace required. |

A branch is not automatically another legal entity. An accountant's access to multiple clients is not permission to share records between those clients. Technical dependencies need not become separate charges.

## 4. What Solafide's public model establishes

The feature catalog presents accounting as a core module, groups other functions by business domain, and advertises industry add-ons layered over plans. It also presents security, multi-entity operation, and offline functionality as feature groups. This supports a **suite plus industry extensions** interpretation at the product level; it does not establish a plugin loader, separate databases, microservices, or independent deployments. [Feature catalog](https://solafideonline.com/features/)

The industry pages assemble capabilities into recognizable retail, manufacturing, services, and healthcare offerings. The useful lesson is to make combinations understandable to a buyer; customer outcome percentages on those pages were not independently verified. [Industry solutions](https://solafideonline.com/industries/)

The support material describes entity setup, chart-of-accounts import, opening balances, roles, and business tasks. It also identifies printed-manual gaps for POS, manufacturing, and accounting-firm mode. This is an onboarding and documentation reference, not proof of successful activation or module removal. [Support center](https://solafideonline.com/support/)

The current public API page documents plan-qualified personal access tokens and principally entity-scoped endpoints. It links an app-hosted API reference, which was not opened after the app-origin denial. This supports a commercial integration boundary, but not third-party executable modules. [API documentation](https://solafideonline.com/api-docs/)

Offline sales and automatic synchronization are advertised. Behavior when access expires during disconnection, duplicate replay, conflict resolution, and retained obligations remains unverified. [Mobile/offline offering](https://solafideonline.com/features/mobile-offline/)

The homepage now uses concrete invoice/payment/receipt and purchasing/receipt flows alongside module navigation. Workflow-oriented communication therefore is not exclusive to a proposed Stoquify design. Differentiate through measured completion and recovery, not the wording alone. [Homepage](https://solafideonline.com/)

**Adopt:** clear business categories, industry entry points, task-oriented help, bilingual setup, and a coherent expansion story.

**Do not infer or copy blindly:** unknown lifecycle mechanics, current plan-to-module mapping, pricing amounts, deactivation guarantees, or backend architecture. These require evidence unavailable in this run. Public security claims do not justify making essential controls optional in Stoquify.

## 5. Why Odoo Enterprise is the third reference

Odoo overlaps with Stoquify across accounting, sales, inventory, purchasing, POS, and people operations, and exposes unusually useful official documentation for this decision.

**Commercial model.** Its public pricing separates a free single-app entry from paid Standard and Custom plans including all apps. Required dependent apps are included with the free app; Custom covers additional customization/integration needs. Portal participants are distinguished from paid backend users. Exact amounts are omitted because browser and indexed presentations varied by currency/context, and this is not a purchase quote. [Odoo pricing](https://www.odoo.com/pricing)

**Technical model.** Odoo manifests declare dependencies and distinguish user-facing applications from supporting modules. Automatically installed link modules can integrate two apps. This is a useful precedent for explicit contracts without requiring every integration to be a product or independent service. It does not prove separately deployed microservices. [Module manifests](https://www.odoo.com/documentation/19.0/developer/reference/backend/module.html)

**Lifecycle difference.** Odoo explicitly warns that app removal can affect dependent apps and delete records, and recommends testing on a duplicate database. Installation/uninstallation is therefore a different operation from Stoquify's workspace selection or stopping new work. Borrow dependency visibility; preserve Stoquify's non-destructive business-continuity model. [Apps and modules](https://www.odoo.com/documentation/19.0/applications/general/apps_modules.html)

**Entity boundary.** Odoo documents multiple companies in one database, with some shared reference records and company-specific transactions. That can suit a corporate group, but it is not a template for sharing unrelated Stoquify client tenants. [Multi-company documentation](https://www.odoo.com/documentation/19.0/applications/general/companies/multi_company.html)

**Deployment boundary.** The Odoo Online administration guide distinguishes managed hosting from arbitrary custom module installation. The architectural lesson is to state the support boundary of each deployment clearly. This audit does not evaluate every Odoo customization mechanism. [Odoo Online](https://www.odoo.com/documentation/19.0/administration/odoo_online.html)

| Reference | Most useful lesson | Main limitation for this decision |
|---|---|---|
| Solafide | Present locally relevant industry solutions and recognizable tasks. | Public evidence does not reveal lifecycle or internal modularity. |
| Odoo Enterprise | Separate app packaging, dependencies, extension contracts, and deployment choices. | Its commercial and company-sharing models are not automatically suitable for Stoquify's market and tenancy. |
| Stoquify today | Preserve owned business truth and explicit continuation of unfinished work. | Strong code foundations still need complete enforcement, commercial integration, and measured usability. |

These are different kinds of evidence. The table is not an overall vendor-quality ranking.

## 6. Stoquify: current source findings

| ID | Current finding | Disposition and implication |
|---|---|---|
| STQ-01 | 19 canonical slugs mix domains, workspaces, and internal capabilities; dashboard/settings/administration are core. | Source-confirmed and probe-checked. Keep stable IDs; simplify labels and customer choices without a wholesale rename. |
| STQ-02 | Retailer and service presets, categories, search, dependency hints, preview, history, and EN/FR translation hooks already exist. | Source-confirmed; component tests pass. Workflow-first work is an extension of existing composition. No fresh live usability evidence. |
| STQ-03 | Configuration, grants, commands, lifecycle operations, steps, and events are distinct persisted models. | Schema/source-confirmed. Retain this separation; actual deployed constraints were not inspected. |
| STQ-04 | Preview binds actor, tenant, permissions, grants, configuration revision, setup, and stop impact. Writes use idempotency and revision checks. | Source-confirmed; mocked service tests pass. Strong foundation, not real-database race proof. |
| STQ-05 | The low-level entitlement default remains observe; action wrappers with a module gate and the API helper use enforce. An item-create action explicitly observes and continues to its service. | Mixed enforcement is current, not merely historical. Inventory item creation without initial stock has no entitlement check in the inspected service body. This is a commercial enforcement gap under denied grants, not a demonstrated cross-tenant bypass. Do not globally flip modes without impact analysis. |
| STQ-06 | Activation returns no_purchase / EXISTING_ACCESS_ONLY. The inspected grant creation preserves pre-existing legacy rights. | A workspace composer exists; an operational buy/change-plan/provider-to-grant pipeline was not demonstrated. Do not label selection as purchasing or promise automatic billing. |
| STQ-07 | Stop policies support inventory, purchasing, payroll, and new manual journals; sales, POS, and direct payment-reconciliation stop remain unsupported. | Source-confirmed; policy tests pass. This is an explicit safety boundary. Do not offer universal self-service deactivation yet. |
| STQ-08 | Presence and commercial_agents are cataloged available, but have no composition destination. Reports opens an analytics route and additionally requires analytics eligibility. | Metadata needs reconciliation. The composition layer already blocks unsupported destinations; absence here is not proof the entire business capability is absent elsewhere. |
| STQ-09 | Setup checks inspect accounting, terminals, approved provider configurations, actual payroll periods, and a narrowly supported Cameroon sandbox adapter. | Source-confirmed; readiness tests pass. Selection is not statutory approval or evidence of a live provider. |
| STQ-10 | Catalog dependencies, operational-stop dependencies, destination requirements, presets, and readiness prerequisites live in separate places. | Their meanings differ legitimately, but drift is possible. Add cross-contract validation and owner accountability, rather than flattening all edges into one dependency list. |

Important corrections to the old blueprint: explicit empty grants now deny; invalid and expired grants deny; suspended required dependencies deny; read-only distinguishes read from write/export/job; duplicate grants deny. The fresh probes confirm these pure decisions. They must not be reported as still-open defects.

Primary source anchors:

- [Catalog and dependencies](<E:/ohada saas/Focused projects/stoquify/services/modules/module-catalog.service.ts:10>)
- [Entitlement resolver](<E:/ohada saas/Focused projects/stoquify/services/modules/module-entitlement.service.ts:85>)
- [Composer and destinations](<E:/ohada saas/Focused projects/stoquify/services/modules/module-composition.service.ts:23>)
- [Existing presets](<E:/ohada saas/Focused projects/stoquify/components/modules/ModuleCompositionWorkbench.tsx:27>)
- [Stop policies](<E:/ohada saas/Focused projects/stoquify/services/modules/module-stop-policy.service.ts:28>)
- [Admission rules](<E:/ohada saas/Focused projects/stoquify/services/modules/module-admission.service.ts:34>)
- [Readiness](<E:/ohada saas/Focused projects/stoquify/services/modules/module-lifecycle-readiness.service.ts:60>)
- [Observed item-create boundary](<E:/ohada saas/Focused projects/stoquify/actions/item/items.ts:48>) and [service](<E:/ohada saas/Focused projects/stoquify/services/item/item.service.ts:1013>)
- [Action authority and refresh](<E:/ohada saas/Focused projects/stoquify/actions/modules/module-composition.actions.ts:18>)
- [Persisted authority](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:9147>)

The five graph files were parsed. Action node modules_module_control_actions_ts is in community 116; route node locale_dashboard_dashboard_settings_modules_page_tsx is in community 23. They locate control and settings surfaces, but their older line references do not describe the full new composer. Counts and extracts are saved; current source governs conclusions.

## 7. Candidate approaches and tradeoffs

| Option | Practical example | Pros | Cons / failure modes | Decision |
|---|---|---|---|---|
| A: Targeted current-model fixes | Keep module selection and correct unsupported catalog rows and enforcement. | Fastest reuse; familiar support model; low migration cost. | Customer still assembles technical choices; differentiation remains weak. | First delivery step, not the complete strategy. |
| B: Solafide-inspired suite/industry catalog | Present a retail suite with optional industry additions. | Clearer discovery and marketing; easy to map to existing modules. | Better labels alone do not improve workflow completion; competitor internals unknown. | Borrow presentation, not an assumed architecture. |
| C: Strengthened domain-module contracts | Reconciliation declares accounting/finance eligibility, setup, operations, and retention. | Fits current code; robust ownership; fewer contradictory states; reversible evolution. | Contract upkeep and boundary tests require discipline; can remain too technical for buyers. | Recommended engineering foundation. |
| D1: Workflow-first composition over existing services | An owner selects “Sell and collect”; review explains required setup and permitted work. | Reduces decisions; supports measurable outcomes; reuses composer and domain truth. | Overlapping recipes, hidden dependencies, and expectation management can confuse users; adoption benefit unproven. | Pilot as the main customer experience. |
| D2: Replacement capability kernel / executable plugin platform | Independently installed extensions or services coordinate workflows. | Potential ecosystem and isolation flexibility when justified. | Major migration, distributed transactions, extension security, compatibility, support, and recovery costs. | Defer; no measured requirement justifies replacement. |

The weighted matrix favors C (4.30/5), with D1 close (4.15/5). Those are transparent planning judgments, not measured product scores. With greater weight on adoption and differentiation, D1 leads. See [decision matrix](DECISION-MATRIX.md).

For employees, the gain should be fewer irrelevant controls. For accountants, it should be clearer evidence and client scope. For administrators, it should be an understandable impact preview. For developers and operators, it should be stable boundaries and recoverable changes. None is demonstrated merely by introducing another “module builder.”

## 8. Recommended design

### Vocabulary and ownership

Keep existing slugs as compatibility identifiers. A **capability** is an authorized operation; a **domain module** owns its rules and records; a **recipe** proposes a useful combination; a **package** is a commercial agreement; a **workspace** presents permitted tasks. Country packs attach reviewed rules to activities, not to a marketing checkbox.

The universal foundation includes identity, tenant context, authorization, configuration history, audit, evidence references, localization, and observability. Stock, ledger, provider, and payroll integrity remain in their domain owners and accompany the operations that need them. Do not create a second ledger under a new foundation name.

| Owner | Authoritative facts | Shared-contract responsibility |
|---|---|---|
| Sales/POS | Orders, accepted checkout events, sales corrections | Receipt, payment, inventory, and accounting handoffs |
| Inventory | Movements, counts, valuation, transfers | Source-linked mandatory stock effects |
| Purchasing/AP | Orders, receiving, supplier obligations | Goods/service distinction, settlement and corrections |
| Finance/reconciliation | Provider evidence, matching, suspense, settlement | Retained source identity and reviewable exceptions |
| Accounting | Journals, posting, periods, close | Mandatory posting/reversal independent of optional workspace |
| HR/payroll | Employee inputs, approved payroll, payment/declaration evidence | Privacy, country scope, corrections and retained duties |
| Platform/commercial operations | Catalog, reviewed configuration, commercial authority | No competing writer for domain business facts |

~~~mermaid
flowchart TD
  Offer["Commercial offer / reviewed provider evidence"] --> Grant["Versioned tenant grants"]
  Recipe["Business recipe + user choices"] --> Preview["Dependency and impact preview"]
  Grant --> Preview
  Setup["Domain readiness and country scope"] --> Preview
  Preview --> Prepare["Durable preparation"]
  Prepare --> Active["Verified active configuration"]
  Active --> UI["Role-specific workspace"]
  UI --> Gate["Fresh actor + tenant + operation authority"]
  Grant --> Gate
  Stop["Reviewed new-work stop policy"] --> Gate
  Gate --> Domains["Existing domain-owned services"]
  Domains --> Evidence["Ledger, stock, payment and audit evidence"]
  Retained["Scoped completion of prior obligations"] --> Gate
~~~

This is a target responsibility map. Offer/provider-to-grant automation is proposed, not verified existing functionality.

### Lifecycle and authority

Keep commercial status and configuration state separate. Existing composition states are REQUESTED, PREPARING, ACTIVE, FAILED, and RETAINED. A FAILED preparation must preserve the previous verified active workspace. RETAINED must not be described as a universal commercial cancellation state.

Customer copy should distinguish:
1. Remove a shortcut or recipe from the workspace.
2. Stop starting a supported class of new work.
3. Continue authorized settlement/correction of named prior obligations.
4. Change the commercial subscription under reviewed terms.

These are different commands. A suspended grant is not automatically a retained-work grant: the current resolver can deny even reads when a grant is suspended/expired. A future commercial downgrade must explicitly provision and enforce the intended retained scope. “History remains in the database” does not prove the customer can still reach it.

For a new operation require current actor membership, tenant/object scope, permission, applicable writable grants, operation-specific dependencies, readiness, and admission. For continuation require current actor authority and a validated prior source/obligation, plus domain-specific correction/settlement policy. Never reuse historical permission as perpetual actor access.

The RBAC implementation requests fresh session authority; grant decisions read current persisted state; composition changes revalidate EN/FR layouts. Any future cache must include organization, actor authority, configuration and grant revisions, operation, and expiry bounds. Provider delivery alone must not mutate financial truth or bypass those checks.

### Minimum contract improvement

Reconcile existing definitions before adding another registry. Each supported capability needs an owner, stable ID, permitted operations, eligibility dependencies, setup prerequisites, new-work dependencies, continuation policy, destinations, release evidence, and version. Keep these dependency types separate and validate their consistency.

Examples:
- POS depends on sales eligibility, but also needs relevant stock/accounting controls and terminal setup. Required integrity is included in the sold workflow.
- Goods purchasing may need inventory behavior; services purchasing must not require irrelevant stock setup.
- The reports recipe must explain its analytics destination requirement.
- Payroll eligibility cannot substitute for approval of a country-specific payroll scope.

### Customer experience and pricing

Start with three comprehensible entry points: **Sell and collect**, **Buy and replenish**, and **Reconcile and close**. Extend the existing presets rather than adding a parallel builder. Offer payroll only with its explicit country/readiness limitations.

A proposed review screen explains what becomes available, what setup remains, which employees may use it, the price consequence if any, and what happens to existing work. “Added to your workspace” must not mean “purchased,” “authorized,” or “production-ready.”

Test two commercial hypotheses: a small set of outcome bundles, and a broad-suite plan with limits on a clearly understood unit such as active internal users or branches. Prefer predictable terms and cheap/free external evidence participation where sustainable. Do not charge independently for every dependency, essential audit, tenant security, or required posting. Quantify support, country maintenance, storage, and provider costs before setting prices.

## 9. Scenario ledger

This is a source/test-grounded assessment plus required validation, not eight completed live journeys.

| Scenario | Current evidence | Recommended customer behavior and unresolved proof |
|---|---|---|
| Single-store retailer | Retailer preset selects inventory/sales/POS/cash drawer; POS/sales dependency, accounting and terminal preparation exist. | Explain a complete selling workflow and setup tasks. Verify first sale, stock, receipt, cash and ledger tie-out in an isolated tenant. |
| Distributor expands | Composition resolves required grants; purchasing/stock relationship is recommended, while reconciliation requires finance/accounting. | Show incremental capabilities and opening-data requirements; distinguish goods from service buying. Prove receipt, payable, settlement and close continuity. |
| Accountant serves unrelated clients | Module authority and history are organization-scoped; transport tests cover denied foreign context. | Each client grants access independently. Keep active-client identity visible; fresh client switching/revocation browser and export tests remain required. |
| Company adds payroll | Actual selected period, dates, country and permitted readiness checks exist. | Present qualified country scope and blocked prerequisites. No payroll or statutory certification is established by module activation. |
| Downgrade with open obligations | Supported stop policies preserve named completion classes, but commercial grant suspension can deny separate access. | Explain stop-new-work versus retained completion; test payment, correction and export under the final downgrade policy before offering it. |
| Offline POS reconnects after access change | Sales/POS stop is disabled pending safe continuation. | Do not expose that stop toggle yet. Classify previously accepted, queued, and newly captured events; prove exactly-once effects and exception recovery. |
| Employee/location access revoked | Fresh RBAC and organization scope are present; this run did not prove every location rule. | Remove that actor's authority immediately while another authorized actor can finish company obligations. Test in-flight writes and scope changes. |
| Failed activation, duplicate webhook, delayed provisioning, reactivation | Durable composer retries/history have mocked tests; external commercial webhook lifecycle is not demonstrated. | Preserve old active state, show an explicit pending/recovery status, and reconcile provider events before granting access. Reactivation rechecks setup and current rights. |

## 10. Risks and priorities

1. **Before monetized enforcement:** map actual entry points, classify intentional observe-mode lanes, and verify denied grants do not reach paid new-work effects. Do not turn on global enforcement without preserving legacy rights.
2. **Before promising full deactivation:** complete POS/sales offline continuation and reconciliation retained-source semantics. Keep unsupported actions unavailable until proven.
3. **Before simpler recipes:** reconcile catalog availability, destinations, and prerequisite explanations. A successful selection must lead to an accessible, supported task.
4. **Before automated purchasing:** define commercial offer versions, approved grant mutations, provider-event verification, duplicate/out-of-order handling, cancellation terms, and retained access.
5. **Before broad rollout:** prove real-database races, live role tasks, bilingual/accessibility behavior, recovery, performance, and support ownership.

The readiness read model scans accounting setup collections and provider configuration. No latency or size limits were benchmarked. Measure this path with representative tenants before adding more checks to every screen refresh.

## 11. Reviewer dispositions

| Lens | Finding |
|---|---|
| Platform/backend | Preserve current ownership and durable composition; distinguish eligibility from operational dependencies. |
| Data/migration | Retain immutable history, scoped keys and legacy grants; real migrations/restore remain unverified. |
| Security/privacy/fraud | Mixed enforcement requires explicit policy; actor revocation and retained business obligations are separate. |
| Frontend/design systems | Existing workbench is reusable; avoid duplicate configuration surfaces. |
| Workflow/accessibility/EN-FR | Task recipes are a hypothesis; 34 component tests are not user studies or screen-reader proof. |
| Product/business process | Validate completed selling/receiving/reconciliation tasks, not number of activated modules. |
| QA/release | 199 tests plus 14 probes pass within the stated mocked/pure scope; no release approval. |
| SRE/cost | Measure preparation duration, stale state, retry age, and support effort; no need shown for distributed deployment. |
| SaaS/billing/customer success | Separate offers from workspace selection; test bundle economics and retained access explicitly. |
| Finance/OHADA/internal controls | Keep required posting and corrections with their source operations; no new statutory interpretation is made. |
| Audit/records | Preserve versioned commands and evidence; hashes do not prove operational or legal approval. |
| POS/inventory/offline | Keep unsupported stop policy closed; prove admitted versus unadmitted replay behavior. |
| Purchasing/AP | Goods and services need different prerequisites; supplier settlement survives permitted stopping. |
| HR/payroll | Country and period readiness, private source data and correction rights need explicit boundaries. |
| Payments/reconciliation | Late provider evidence must retain source lineage and idempotency after subscription changes. |
| Accounting/close | Stopping new manual journals cannot stop mandatory ledger effects. |
| Analytics/data governance | Reconcile reporting destinations and inherited read scopes; a bundle must not expose extra source data. |
| AI/agents | Model evaluation is not applicable: this run adds no model. Any later recipe assistant may suggest configurations but cannot grant authority or post transactions. |
| API/events/providers | Document operation scopes and retry/duplicate behavior; public API availability is not a plugin architecture. |
| Change management/support | Explain four distinct changes: presentation, new-work stop, retained completion, and commercial change. |

## 12. What to do next

Run the small discovery/prototype experiment in [ROADMAP.md](ROADMAP.md), starting with a goods-purchasing journey because it exercises inventory, supplier obligations, accounting setup and supported stop behavior. Compare the existing builder with a recipe-led version using the same domain services.

**Keep:** modular monolith, domain services, current authority/lifecycle models, evidence history, protected continuations.

**Simplify:** customer labels, configuration choices, setup explanations, and repeated definitions that can drift.

**Adopt:** industry framing, dependency visibility, clear commercial support boundaries.

**Introduce incrementally:** versioned recipes, contract consistency checks, measured commercial provisioning and retained-access policy.

**Retire only after proof:** obsolete configuration paths and misleading catalog promises, preserving stable aliases and existing grants.

**Defer:** wholesale replacement, arbitrary plugins, microservices per module, an open marketplace, automatic AI configuration, and unvalidated industry breadth.

Reconsider the decision if usability experiments show no benefit, if commercial bundles cannot cover support cost, or if measured scale/isolation requirements make a particular workload unsuitable for the shared deployment. No evidence currently supports replacing the entire system.

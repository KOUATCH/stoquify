# Stoquify Enterprise Agent and Skill System

**Decision report | 15 July 2026**

**Scope:** Repository-grounded assessment of the agents, reusable skills, architecture, controls, metrics, and delivery sequence required to make Stoquify an indispensable daily operating system for OHADA-oriented retail and distribution businesses.

## Executive Summary

- **Build a controlled operating copilot, not a swarm of autonomous bots.** Stoquify already owns substantial operational truth across POS, inventory, purchasing, payments, reconciliation, accounting, close, compliance, HRIS, and payroll. Its fastest route to daily stickiness is a single role-aware Stoquify Command Agent that turns existing trusted snapshots and action queues into an explainable brief, then routes approved work through narrowly scoped skills.
- **The first production portfolio should contain three user-facing agents and one shared orchestration core.** Build the Stoquify Command Agent, Cash and Reconciliation Agent, and Inventory and Replenishment Agent. Build the Exception and Action Orchestrator as shared infrastructure rather than another chat persona. These use cases combine high frequency, strong existing data, measurable value, and defensible workflow depth.
- **Do not permit autonomous financial, payroll, compliance, entitlement, or destructive mutations in the first release.** Existing deterministic services must remain the source of truth. Agents may retrieve, explain, prioritize, draft, and propose. A permission check, evidence check, explicit approval, fresh authentication where required, and an idempotent service command must precede every high-impact write.
- **Close the control-plane and measurement gaps before broad rollout.** The repository has no production agent runtime or product-usage analytics layer. The module program also reports 58 active surface gaps and a no-go posture for broad enforcement. Agent execution, approval, cost, evaluation, and feedback records must be added before claiming enterprise readiness.

**Direct recommendation:** spend the first 90 days proving that a trusted command brief plus cash and inventory exception workflows increase action completion and reduce reconciliation or stock-resolution time for a small pilot cohort. Do not build a general-purpose autonomous agent platform, custom foundation model, autonomous accounting poster, automatic statutory filer, or employee-level payroll chatbot during this period.

## 1. Decision Frame and Definitions

This report supports a product and architecture decision by Stoquify leadership: which agent capabilities should be built, in what order, and under what controls so the platform becomes a daily operating habit without weakening financial or regulatory trust.

For this assessment:

- **Agent** means a bounded, stateful software actor that interprets a goal, selects approved skills, and may continue a workflow across steps. An agent is not the source of financial or operational truth.
- **Skill** means a narrow, versioned, testable capability with a defined input, output, permission boundary, evidence contract, and safe failure state.
- **Tool** means a deterministic application operation, normally an existing Stoquify service command or read model, that enforces the business rules.
- **Autonomy** means the ability to continue without a human at every step. It does not imply authority to bypass approval, RBAC, tenant scope, module entitlement, fresh authentication, or accounting controls.
- **Moat** means an advantage that compounds through proprietary workflow evidence, integrations, corrections, country expertise, and trusted operating history. The language model itself is not the moat.

## 2. Evidence Reviewed and Current-State Confidence

The assessment used current repository evidence, including:

- `docs/architecture/system/ARCHITECTURE.md`
- `config/sidebar.ts` and `config/permissions.ts`
- `prisma/schema.prisma`
- `package.json`
- `graphify-out/GRAPH_REPORT.md`
- `services/daily-habit/daily-habit-digest.service.ts`
- `services/manager-action-center/manager-action-center.service.ts`
- `services/owner-war-room/owner-war-room.service.ts`
- current readiness JSON reports for close truth, payment/cash truth, purchasing/AP, offline POS replay, statutory country packs, report trust, role cockpits, public-identity abuse, and CI
- the module control-plane status and its dated surface inventory
- the existing OHADA SMB skills audit and transaction-history agent-to-skill matrix
- official product documentation for Shopify Sidekick, Intuit Assist, Microsoft Dynamics 365 agents, Odoo AI agents/server actions, and Toast IQ.

The canonical architecture document says the platform has been live for roughly six months with about 50 paying organizations. That statement was last updated on 23 May 2026 and was not reconciled against a billing system in this assessment, so it is context rather than a current commercial metric.

### What the repository proves

Stoquify is already a broad multi-tenant operating platform:

- 137 application page/API route files were counted.
- 43 service-domain directories and 37 action-domain directories are present.
- The Prisma schema contains operational and control models spanning tenant identity, inventory, POS, offline replay, purchasing/AP, payments, reconciliation, accounting, close assurance, compliance, HRIS, payroll, workflow assurance, and audit.
- The sidebar is intentionally grouped into Command, Operations, Finance and Trust, People, and Governance.
- Existing daily-digest, manager-action-center, and owner-war-room services already combine source-owned snapshots, freshness, evidence grades, permissions, redaction, signals, and action queues.
- Current dated readiness reports show all checks passing for nine narrow control areas, including payment/cash truth, close invalidation, purchasing/AP, offline POS replay, report trust, role cockpit, and CI.

### What the repository does not yet prove

- A focused source scan found no production agent-run, tool-execution, prompt-version, model-provider, agent-memory, or agent-approval runtime in application code or the Prisma schema.
- A focused source scan found no product analytics system for activation, retention, feature usage, daily active use, weekly active use, or time to value.
- The module-control program remains no-go for broad enforcement. Its 14 July report records 323 surfaces, 58 active gaps, open P0 security prerequisites, mixed enforcement truth, and no rollout certification for any catalog module.
- Passing static readiness gates proves specific controls exist; it does not prove customer adoption, agent accuracy, workflow savings, or production economics.
- Statutory controls correctly block unsupported production claims. They do not establish that every country adapter is production-certified.

## 3. The Platform Is Agent-Ready in Data, but Not Yet in Runtime Governance

The strongest existing foundation is the flow from service-owned state to snapshots, evidence-aware signals, permission-filtered action queues, and role-specific workspaces. This is exactly the substrate a safe agent needs.

| Capability | Current assessment | Evidence and implication |
|---|---:|---|
| Service-owned domain truth | Strong | Services, source links, posting controls, and boundary gates provide safe tools. |
| Tenant/RBAC controls | Strong but incomplete | Central permissions and protected services exist; module-control P0 issues remain. |
| Evidence, freshness, and redaction | Strong | Existing BI contracts, snapshots, proof drawers, and export gates can ground answers. |
| Daily role workflows | Strong foundation | Daily Digest, Manager Action Center, and Owner War Room are natural agent entry points. |
| Cross-domain event and assurance model | Moderate to strong | Business events, outbox, assurance runs, incidents, and audit records exist. |
| Durable module entitlement truth | Incomplete | Current program explicitly blocks broad enforcement and privileged administration. |
| Product adoption telemetry | Missing | No reliable baseline exists for activation, repeat use, or value realization. |
| Agent runtime and approvals | Missing | No durable agent-run, step, tool-call, approval, feedback, or cost ledger was found. |
| Model governance and evaluations | Missing | No prompt/model registry, evaluation suite, or agent-specific incident controls were found. |
| Country-pack production coverage | Controlled but limited | The platform fails closed; production coverage must remain evidence-specific. |

**Implication:** the lowest-effort path is to wrap existing read models and service commands with a thin agent control plane. Rebuilding domain logic in prompts, creating a parallel AI database, or allowing models to write directly to Prisma would destroy the platform's strongest advantage.

## 4. Daily and Hourly User Workflow Map

| Persona | Daily/hourly job | Current Stoquify substrate | Agent opportunity | Human control required |
|---|---|---|---|---|
| Owner | Understand cash, stock exposure, supplier commitments, payroll exposure, and close risk | Owner War Room, tenant snapshots, proof subjects | Morning and exception brief with evidence-backed priorities | Approval for payments, sensitive exports, overrides, or policy changes |
| Manager | Clear overdue, critical, blocked, assigned, and routine actions | Manager Action Center and action queue | Continuous exception routing and next-best-action coaching | Approval for operational mutations outside delegated authority |
| Cashier/POS operator | Sell quickly, handle exceptions, close sessions, and preserve receipt truth | POS, cash drawer, offline queue, receipt tokens | Contextual help, discrepancy explanation, and safe recovery guidance | Manager approval for voids, refunds, or overrides |
| Stockkeeper | Prevent stockouts, resolve negative stock, count, transfer, and investigate variance | Inventory levels/events/counts/transfers and stock signals | Replenishment proposals and variance investigation | Approval for adjustments, write-offs, and destructive corrections |
| Purchasing officer | Create POs, receive goods, resolve three-way match issues, and protect supplier payments | PO, goods receipt, supplier invoice, AP controls | Supplier commitment brief and variance-resolution workflow | Maker-checker approval for bank changes and payments |
| Finance/accountant | Reconcile payment rails, clear suspense, post safely, close periods, and export proof | Reconciliation, ledger, close assurance, report certification | Matching suggestions, exception explanation, close blocker resolution | Fresh auth and approval for posting, reversal, sign-off, certification, and export |
| HR/payroll operator | Prepare employee inputs, run payroll, handle payments and declarations | HRIS/payroll control services and proof chains | Readiness and variance agent with aggregate-safe explanations | Segregated approvals for compensation, payroll, payments, and declarations |
| Employee | Access payslips and resolve personal workflow issues | Payroll self-service | Narrow self-service guide grounded only in the employee's own records | No cross-employee access; sensitive changes require HR workflow |
| Platform administrator | Manage users, roles, modules, security, and integrations | Governance surfaces and module-control workbench | Configuration diagnostics and impact previews | No autonomous role, entitlement, secret, or tenant-policy changes |

## 5. World-Class Pattern: Embedded, Contextual, Reviewable Action

Current official product documentation points toward a consistent pattern:

- Shopify Sidekick is available within the store context, can analyze and complete tasks, runs longer work in the background, remembers explicit context, supports saved skills, and presents changes for review before applying them.
- Microsoft Dynamics 365 connects finance agents to ERP context and treats agent execution as a governed, metered platform capability.
- Odoo separates AI decision-making from deterministic workers: the model selects a tool, while ordinary server logic enforces the business rules and performs the write.
- Toast IQ combines a daily briefing, proactive recommendations, plain-language analysis, and in-product action across connected operational data.
- Intuit Assist is positioned as a trusted financial assistant embedded in the small-business workflow rather than a detached chatbot.

Stoquify should adopt the pattern, not copy the products: **one embedded entry point, record/page context, proactive briefs, reusable skills, asynchronous work, review before change, and deterministic tools.** Its differentiator should be evidence-backed stock-to-cash-to-close workflows for OHADA businesses, including low-connectivity operations and controlled statutory honesty.

## 6. Recommended Agent Portfolio

### Weighted scoring model

Each candidate was scored from 1 to 5. The weighted result is also on a 5-point scale.

| Criterion | Weight | Interpretation |
|---|---:|---|
| User value | 18% | Magnitude of pain or outcome improved |
| Frequency | 14% | Hourly/daily recurrence |
| Retention potential | 12% | Ability to create a durable habit and switching cost |
| Strategic differentiation | 11% | Fit with Stoquify's evidence and OHADA operating-system thesis |
| Revenue potential | 8% | Upgrade, expansion, or pricing power |
| Data-moat potential | 8% | Ability to compound proprietary workflow evidence |
| Time to measurable value | 8% | Speed to a credible pilot result |
| Reusability | 7% | Shared value across roles and modules |
| Implementation effort, inverse | 5% | Higher score means lower relative effort |
| Dependency readiness | 4% | Existing data, services, and controls |
| Operating cost, inverse | 3% | Higher score means lower expected run cost |
| Security/compliance risk, inverse | 2% | Higher score means lower residual risk |

| Rank | Agent | Score | Decision | Primary reason |
|---:|---|---:|---|---|
| 1 | Stoquify Command Agent | 4.70 | Build now | Creates one daily entry point from existing trusted briefs and actions. |
| 2 | Exception and Action Orchestrator | 4.65 | Build now - platform core | Reusable routing, approvals, asynchronous work, and escalation for every domain. |
| 3 | Cash and Reconciliation Agent | 4.55 | Build now | Daily pain, strong evidence base, direct financial value, and a defensible moat. |
| 4 | Inventory and Replenishment Agent | 4.45 | Build now | High-frequency operational value with strong existing stock/event models. |
| 5 | Close and Compliance Agent | 4.20 | Build next | High trust and revenue value, but higher regulatory and approval burden. |
| 6 | Purchasing and AP Agent | 4.15 | Build next | Strong three-way-match and supplier-control substrate; depends on clean supplier data. |
| 7 | Platform Assurance Agent | 3.85 | Build next - internal | Essential for safe scaling but not a direct customer-facing habit. |
| 8 | Customer Success and Adoption Agent | 3.85 | Build later | Valuable after product telemetry and playbooks exist. |
| 9 | Payroll and Workforce Agent | 3.60 | Build later, narrow pilot | Valuable but sensitive, country-dependent, and expensive to validate safely. |

### 6.1 Stoquify Command Agent

**Class:** Advisory and workflow agent. **Users:** owners, managers, accountants, purchasing teams, and stockkeepers.

**Job:** answer "What needs my attention now, why, and what is the safest next action?" from any authenticated page. It should generate role-specific morning, shift, and end-of-day briefs and continue approved workflows in the background.

**Triggers:** user request; login/daily digest; critical or high business signal; scheduled morning/end-of-day brief; completion or failure of a delegated workflow.

**Inputs and tools:** tenant operating snapshot, payment-truth snapshot, inventory-cash snapshot, close-readiness snapshot, action queue, evidence/proof service, current route/record context, role and permission context, module entitlements, organization locale/currency, and approved domain skills.

**Outputs:** concise brief; ranked actions; evidence links; explanation of stale, unavailable, redacted, or permission-denied state; proposed next step; notification when a background task requires review.

**Autonomy:** read and analyze automatically. Draft low-risk changes. Never execute a high-impact write without policy evaluation and approval.

**MVP:** read-only brief, evidence-grounded Q&A, action routing, and deep links. **Mature scope:** approved low-risk actions, saved user routines, voice, multilingual assistance, and asynchronous task completion. **Exclude:** arbitrary database access, generic web answers presented as tenant truth, and autonomous financial decisions.

**Success metrics:** weekly active eligible users, brief-to-action conversion, action completion within SLA, evidence-link use, material correction rate, and cost per completed action.

### 6.2 Exception and Action Orchestrator

**Class:** Orchestration and monitoring agent. **Users:** all domain agents and internal operations.

**Job:** convert signals into deduplicated cases, assign them to a role, invoke the right skill, manage deadlines and approvals, and close the loop when evidence changes.

**Triggers:** business signal, assurance incident, scheduled rule evaluation, user delegation, tool completion, timeout, rejected approval, or changed source evidence.

**Inputs and tools:** signal rules, action queue, workflow assurance, notification service, approval service, agent-run ledger, idempotency keys, and escalation policy.

**Outputs:** case/run record, owner, due time, state, evidence fingerprint, approval request, retry/escalation event, and terminal outcome.

**Autonomy:** may prioritize, assign within policy, notify, pause, retry safe reads, and request approval. It may not override a denial, change permissions, suppress evidence, or retry non-idempotent writes automatically.

**MVP:** shared run state and routing for the first three agents. **Mature scope:** cross-domain workflow plans and service-level objectives. **Exclude:** user-facing personality and business-rule ownership.

**Success metrics:** duplicate-case rate, mean time to assignment, completion within SLA, stuck-run rate, retry recovery rate, and unauthorized-tool-call rate.

### 6.3 Cash and Reconciliation Agent

**Class:** Monitoring, advisory, assurance, and approval-gated workflow agent. **Users:** finance officers, accountants, owners, and controllers.

**Job:** explain cash position and payment-truth exceptions, propose statement matches, prioritize suspense, identify missing evidence, prepare a reconciliation pack, and guide close-safe resolution.

**Triggers:** statement import, provider-event drift, reconciliation run completion, new suspense/exception, approaching close, or user request.

**Inputs and tools:** provider accounts, statement lines, payment transactions, match records, suspense items, exceptions, source manifests, ledger source links, period state, close blockers, and reconciliation services.

**Outputs:** ranked exceptions, matching suggestions with confidence and rationale, evidence gaps, proposed resolution path, and certificate/readiness preview.

**Autonomy:** may auto-classify and suggest. Exact deterministic rules may auto-match within existing policy. Model-generated matches require review until precision is proven. Posting, suspense resolution, sign-off, and certification require the existing permission, maker-checker, and fresh-auth controls.

**MVP:** explain and prioritize unmatched/suspense items; suggest matches; prepare approval packets. **Mature scope:** configurable confidence bands and proactive cash-risk forecasting. **Exclude:** moving funds, initiating credit, creating providers, or overriding period locks.

**Success metrics:** median exception-resolution time, suggestion acceptance rate, precision of accepted suggestions, reduction in aged suspense, close-blocker reduction, and zero unauthorized postings.

### 6.4 Inventory and Replenishment Agent

**Class:** Monitoring, advisory, and workflow agent. **Users:** owners, managers, stockkeepers, and purchasing teams.

**Job:** detect stockout and overstock risk, explain negative or unusual inventory, recommend replenishment or transfer, and guide variance investigations using event history.

**Triggers:** stock threshold, sales velocity change, count variance, negative stock, delayed PO, transfer conflict, stale projection, or user request.

**Inputs and tools:** inventory levels/events, stock counts, transfers, item/supplier records, sales velocity, PO commitments, location scope, inventory valuation, and event/reconciliation services.

**Outputs:** reorder/transfer proposal, root-cause trace, affected locations/items, cash exposure, evidence links, and proposed investigation checklist.

**Autonomy:** may monitor, explain, and draft POs/transfers. Creating or approving a PO, posting an adjustment, write-off, or valuation correction remains approval-gated.

**MVP:** top stock risks, reorder suggestions, and negative-stock root-cause trace. **Mature scope:** service-level-aware demand planning and multi-location balancing. **Exclude:** black-box demand forecasts without confidence intervals and autonomous write-offs.

**Success metrics:** stockout days, emergency purchase rate, accepted recommendation rate, count-variance resolution time, inventory cash tied up, and forecast error by item class.

### 6.5 Purchasing and AP Agent

**Class:** Workflow and assurance agent. **Users:** purchasing officers, managers, AP staff, and controllers.

**Job:** summarize supplier commitments, identify PO/receipt/invoice variance, prepare three-way-match resolutions, and surface payment or bank-change risk.

**Guardrails:** never approve its own proposal; never change supplier payment destinations; never release payment. Maker-checker, evidence, and fresh-auth controls remain deterministic.

**MVP:** variance explanation and action packet. **Decision:** build after the shared orchestrator and clean supplier/invoice data are proven in the pilot.

### 6.6 Close and Compliance Agent

**Class:** Assurance and workflow agent. **Users:** accountants, controllers, compliance officers, and external reviewers with scoped access.

**Job:** explain close blockers, assemble evidence, propose remediation order, track waivers/reviews, and state the exact production support level of the relevant country pack.

**Guardrails:** no autonomous posting, reversal, period close/reopen, certification, waiver approval, or statutory submission. The agent must quote the country-pack provenance and support state in every statutory recommendation.

**MVP:** close-blocker navigator and evidence checklist. **Decision:** build next, after agent evidence and approval primitives are stable.

### 6.7 Payroll and Workforce Agent

**Class:** Advisory and approval-gated workflow agent. **Users:** payroll operators, HR managers, finance controllers, and employees through a separate self-service boundary.

**Job:** identify input-readiness gaps, explain aggregate payroll variance, prepare review steps, and answer employee-specific self-service questions without exposing another employee's data.

**Guardrails:** no person-level payroll data in owner briefs or general memory; no autonomous compensation, bank-destination, run approval, posting, payment, or declaration action.

**MVP:** read-only readiness and aggregate variance for one reviewed country pack. **Decision:** build later because privacy, country rules, and approval requirements make validation costly.

### 6.8 Customer Success and Adoption Agent

**Class:** Advisory and workflow agent. **Users:** customer administrators, champions, and Stoquify customer-success staff.

**Job:** guide onboarding, detect unused critical workflows, recommend training, and create role-specific adoption plans.

**Dependency:** product telemetry, consented usage data, playbook versioning, and customer-health definitions. **Decision:** build later; without telemetry it would guess.

### 6.9 Platform Assurance Agent

**Class:** Internal assurance agent. **Users:** engineering, security, support, and release managers.

**Job:** monitor agent evaluations, policy denials, prompt/model changes, cost, latency, incidents, and stale evidence; suspend unsafe agent versions and assemble release evidence.

**Guardrails:** may suspend or fail closed, but may not silently relax policy or self-certify. **Decision:** build with the second production wave, before broad tenant rollout.

## 7. Reusable Skill Catalogue

### Foundation and control skills

| ID | Skill | Responsibility and safe failure | Build |
|---|---|---|---|
| S01 | Trusted Context Resolver | Resolve tenant, user, role, location, route/record, locale, currency, period, and correlation context. Fail closed on ambiguity. | Now |
| S02 | Permission and Entitlement Guard | Evaluate RBAC, tenant scope, module entitlement, action risk, and fresh-auth requirement. Return denial, never a workaround. | Now |
| S03 | Evidence-Grounded Retrieval | Retrieve only approved service/read-model evidence with source identity, freshness, grade, and redaction. Return unavailable when unsupported. | Now |
| S04 | Safe Action Planner | Convert a request into bounded steps, required tools, approvals, evidence, and rollback/compensation notes. Produce a proposal only. | Now |
| S05 | Approval and Step-Up Coordinator | Create an approval request, enforce maker-checker separation, invoke verified step-up authentication, and record outcome. Pause safely. | Now |
| S06 | Idempotent Tool Executor | Invoke allowlisted service commands with schema validation, idempotency key, timeout, and deterministic error mapping. Never call Prisma directly. | Now |
| S07 | Agent Evidence Recorder | Persist prompt/model/skill/tool versions, inputs by reference, evidence fingerprints, decisions, approvals, outputs, and terminal status. | Now |
| S08 | Redaction and Disclosure Policy | Apply field- and role-level disclosure rules before model input and user output. Fail closed on unknown sensitive fields. | Now |
| S09 | Freshness and Trust Evaluator | Interpret snapshot age, evidence grade, blockers, redactions, certification state, and unsupported claims. | Now |
| S10 | Exception Prioritizer | Deduplicate and rank cases by severity, value, deadline, evidence quality, and role. Avoid inventing urgency. | Now |
| S11 | Notification and Escalation Router | Route approval, deadline, failure, and completion notices through user preferences and role policy. | Now |
| S12 | Agent Run State Machine | Manage queued, running, waiting-for-approval, blocked, retryable, failed, cancelled, and completed states with resumability. | Now |
| S13 | Model and Cost Router | Select an approved model by task sensitivity and complexity, enforce token/cost budgets, and fall back safely. | Next |
| S14 | Explicit Preference Memory | Store user-approved preferences and saved routines with expiry and deletion. Never store raw payroll or secret material. | Next |
| S15 | Offline and Replay Awareness | Detect provisional/offline state, avoid finality claims, and wait for server replay/certification before consequential action. | Next |
| S16 | Country-Pack Provenance Resolver | Resolve country, effective date, version, review evidence, environment, and production-support state. Block unsupported automation. | Next |

### Domain skills

| ID | Skill | Responsibility and safe failure | Build |
|---|---|---|---|
| S17 | Daily Operating Brief | Compose role-specific, evidence-backed morning/shift/end-of-day briefs from existing snapshots and actions. | Now |
| S18 | Cross-Domain Root-Cause Trace | Trace a signal through event, source record, ledger link, evidence, and related workflow without inferring missing links. | Now |
| S19 | Cash Exception Triage | Classify and rank payment exceptions and suspense, showing evidence gaps and close impact. | Now |
| S20 | Reconciliation Match Suggestion | Suggest statement/payment matches with confidence, features, rationale, and review requirement. | Now |
| S21 | Inventory Risk and Replenishment | Estimate stockout/overstock risk and propose reorder or transfer using location and supplier evidence. | Now |
| S22 | Inventory Variance Investigation | Explain negative stock, count variance, replay conflicts, and projection drift from the event trail. | Now |
| S23 | PO/Receipt/Invoice Variance | Explain three-way-match differences and prepare a controlled resolution packet. | Next |
| S24 | Supplier Commitment and Payment Risk | Summarize expected cash commitments and supplier-control exceptions without releasing funds. | Next |
| S25 | Close Blocker Navigator | Rank close findings and missing evidence; propose remediation sequence and show certification consequences. | Next |
| S26 | Compliance Readiness Explanation | Explain document/submission state and country-pack support without making legal or production claims beyond evidence. | Next |
| S27 | Payroll Readiness and Variance | Check input readiness and explain aggregate variance within a reviewed country pack and privacy boundary. | Later |
| S28 | Adoption and Onboarding Coach | Convert product telemetry into role-specific setup, training, and adoption actions. Return unknown until telemetry is reliable. | Later |

Every skill must have a versioned JSON input/output schema, permission and data classification, deterministic preconditions, maximum runtime/cost, retry class, evidence contract, audit record, evaluation cases, and explicit list of prohibited actions.

## 8. Agent-to-Skill Responsibility Matrix

| Agent | Primary skills | Shared/secondary skills |
|---|---|---|
| Stoquify Command | S17 Daily Brief, S03 Retrieval, S04 Planner, S18 Root-Cause | S01-S02, S07-S11, S13-S16 |
| Exception and Action Orchestrator | S10 Prioritizer, S11 Notifications, S12 Run State | S01-S09, S13, S15-S16 |
| Cash and Reconciliation | S19 Cash Triage, S20 Match Suggestion, S18 Root-Cause | S01-S12, S13, S16, S25 |
| Inventory and Replenishment | S21 Replenishment, S22 Variance, S18 Root-Cause | S01-S12, S13, S15, S23-S24 |
| Purchasing and AP | S23 Three-Way Variance, S24 Commitment Risk | S01-S12, S13, S16, S18-S20 |
| Close and Compliance | S25 Close Navigator, S26 Compliance Readiness, S16 Country Pack | S01-S13, S18-S20, S23-S24 |
| Payroll and Workforce | S27 Payroll Readiness, S16 Country Pack | S01-S14, S18, S25-S26 |
| Customer Success and Adoption | S28 Adoption Coach, S17 Daily Brief | S01-S04, S07-S14 |
| Platform Assurance | S07 Evidence, S09 Trust, S10 Prioritizer, S12 Run State, S13 Model Router | All skill evaluation and policy metadata; no domain writes |

## 9. Target Architecture and Dependency Map

```text
Authenticated user / scheduled trigger / business event
                         |
                  Agent experience
         (Command, Cash, Inventory, later domains)
                         |
             Exception & Action Orchestrator
       run state | budget | routing | approvals | retry
                         |
                 Versioned skill registry
     context | evidence | planning | domain reasoning | output
                         |
              Policy and deterministic tool gateway
 tenant + RBAC + entitlement + fresh auth + schema + idempotency
                         |
 Existing Stoquify services and read models - source of truth
 snapshots | signals | POS | inventory | purchasing | payments
 accounting | close | compliance | HRIS/payroll | notifications
                         |
 Postgres + business events/outbox + audit/evidence + observability
```

### New control-plane records

Add a small, service-owned agent schema rather than a separate application:

- `AgentDefinition`: stable agent ID, purpose, owner, risk class, allowed skills, status, and default budget.
- `AgentVersion`: prompt, model policy, release state, evaluation result, effective period, and rollback target.
- `SkillDefinition` and `SkillVersion`: schemas, allowed tools, data classification, timeout, retry policy, and tests.
- `AgentRun`: tenant, actor, trigger, context references, status, budget, correlation ID, and terminal outcome.
- `AgentStep`: selected skill, evidence references, model/tool decision, structured output, and timing.
- `AgentToolCall`: allowlisted tool, validated arguments, idempotency key, result reference, and error class.
- `AgentApproval`: proposed action, approver policy, maker-checker evidence, fresh-auth result, decision, and expiry.
- `AgentEvidenceLink`: source type/ID, snapshot fingerprint, freshness, grade, redaction, and claim association.
- `AgentFeedback`: accepted, corrected, rejected, reason, and resulting workflow outcome.
- `AgentCostRecord`: model, tokens, latency, provider cost, retries, and cost allocation.
- `AgentIncident`: policy breach, unsafe output, evidence failure, prompt injection, excessive cost, or tool failure.

Raw sensitive records should not be copied into agent tables. Store references, hashes, classifications, and the minimum reviewable output.

### Execution contract

1. Resolve tenant, actor, role, location, module, period, and route context on the server.
2. Retrieve only permission-filtered, redacted, evidence-graded service outputs.
3. Ask the model for a strict structured decision or plan, never a direct database mutation.
4. Validate the output against a versioned schema and policy.
5. For a read, return the answer with evidence and uncertainty.
6. For a write, create a proposed action and approval request.
7. After authorization and fresh auth, invoke an allowlisted service command with an idempotency key.
8. Persist the evidence, policy decision, approval, tool result, cost, and outcome.
9. Re-evaluate if evidence changed before execution; cancel stale proposals.

### Model strategy

- Use a provider-neutral gateway and start with one primary and one fallback model.
- Use smaller models or deterministic logic for classification, summarization, and routing; use a stronger model only for complex cross-domain explanation.
- Keep prompts, model choice, temperature, output schema, and tool allowlist versioned.
- Do not fine-tune initially. First collect consented corrections and verified outcomes.
- Never send secrets, raw tokens, unrestricted payroll records, or other tenants' information to a model.

## 10. Autonomy and Human-Approval Policy

| Risk tier | Examples | Agent authority |
|---|---|---|
| Tier 0 - read only | Explain a metric, summarize a case, show evidence | Automatic after permission and disclosure checks |
| Tier 1 - reversible draft | Draft PO, prepare reconciliation proposal, compose reminder | Agent may draft; user reviews before persistence or sending |
| Tier 2 - controlled operational write | Assign case, update non-financial status, create approved task | Explicit confirmation; deterministic service validation; full audit |
| Tier 3 - financial/sensitive write | Post/reverse journal, approve PO, stock adjustment, payroll run, payment action | Permission + maker-checker where applicable + fresh auth + explicit approval |
| Tier 4 - regulated/irreversible/admin | Period close/reopen, statutory submission, entitlement/RBAC change, secrets, destructive action | Agent may only explain and prepare evidence; authorized human executes controlled workflow |

No agent may grant itself access, choose a less restrictive tool after denial, hide a blocker, mark unsupported country logic as production-ready, or treat conversation memory as authorization.

## 11. First Three Production Specifications

### Specification A: Stoquify Command Agent MVP

**Entry point:** persistent copilot panel available from Daily Digest, Manager Action Center, Owner War Room, and evidence-aware domain pages.

**Initial intents:** `brief_me`, `explain_metric`, `why_blocked`, `show_evidence`, `prioritize_actions`, `route_to_workflow`, and `save_read_only_routine`.

**Required skills:** S01-S04, S07-S12, S17-S18. **Allowed tools:** read-only snapshot, action-queue, evidence, route-link, and notification-preference tools.

**Acceptance criteria:**

1. Every numeric or status claim links to an authorized evidence source and freshness state.
2. Permission-denied, redacted, stale, partial, empty, and unavailable states remain visible.
3. A user cannot retrieve another tenant, role, location, or employee's restricted information through conversation.
4. Unsupported requests produce a bounded refusal and route to the appropriate existing workflow.
5. Evaluation passes include English and French prompts, ambiguous requests, prompt injection, stale evidence, and denied tools.

### Specification B: Cash and Reconciliation Agent MVP

**Entry point:** reconciliation workbench and Cash Command.

**Initial intents:** `summarize_cash_risk`, `explain_exception`, `suggest_match`, `show_missing_evidence`, `prepare_resolution`, and `prepare_close_review`.

**Required skills:** S01-S12, S18-S20, and S25. **Allowed tools:** reconciliation read models, statement/match evidence, suspense workflow proposal, period-state read, and approval creation. Posting tools are disabled in the MVP.

**Acceptance criteria:**

1. Match suggestions expose confidence, rationale, compared fields, and contradictory evidence.
2. Low-confidence or conflicting candidates are never presented as a resolved match.
3. Suggestions are tested against labeled historical cases and an untouched evaluation set.
4. The agent cannot sign, certify, post suspense, reverse, or bypass a closed period.
5. Accepted and rejected suggestions create feedback linked to the eventual outcome.

### Specification C: Inventory and Replenishment Agent MVP

**Entry point:** inventory overview, movements, item detail, and manager action center.

**Initial intents:** `show_stock_risk`, `explain_negative_stock`, `recommend_reorder`, `recommend_transfer`, `investigate_variance`, and `draft_purchase_order`.

**Required skills:** S01-S12, S15, S18, S21-S24. **Allowed tools:** location-scoped inventory reads, sales velocity, supplier/PO commitments, event history, count/transfer state, and draft proposal creation.

**Acceptance criteria:**

1. Recommendations are location-specific and distinguish on-hand, available, committed, in-transit, and provisional/offline state.
2. Every recommendation includes demand window, confidence, supplier/lead-time assumption, and cash impact.
3. The agent never posts an adjustment, accepts a count, approves a PO, or writes off stock autonomously.
4. Forecast error and recommendation outcome are measured by item class and location.
5. Offline events remain provisional until replay/certification is complete.

## 12. Build Versus Buy

| Capability | Recommendation | Reason |
|---|---|---|
| Foundation models | Buy through a provider-neutral gateway | Base-model training is not a Stoquify moat and would consume disproportionate capital. |
| Agent control plane | Build thinly inside Stoquify | Tenant, RBAC, evidence, approval, and domain integration are product-specific. |
| Domain skills and tool wrappers | Build | They encode Stoquify workflows, controls, OHADA context, and differentiated evidence. |
| Vector retrieval | Start with Postgres/approved managed retrieval | Avoid a separate data platform until document volume or latency proves the need. |
| Tracing and model observability | Buy or extend OpenTelemetry/Sentry-compatible tooling | Faster time to production; preserve canonical run/evidence records in Stoquify. |
| Product analytics | Buy a mature privacy-conscious event platform or build a minimal event layer first | The immediate need is reliable adoption and workflow telemetry, not custom analytics infrastructure. |
| Evaluation harness | Build domain datasets and assertions; use commodity runners | Proprietary cases and outcome labels are the moat; runner infrastructure is not. |
| Country-pack legal/accounting review | Partner with qualified experts | The platform can encode provenance and controls but must not self-certify law. |
| Voice and translation | Buy initially | Useful experience layer, but not a core differentiator. |

## 13. Moat Strategy

### 13.1 Proof graph

Every recommendation should connect business signal -> source record -> workflow event -> ledger/evidence link -> approval -> final outcome. Competitors can imitate a chat UI; reproducing years of trustworthy, queryable operating proof is harder.

### 13.2 Outcome-labelled workflow graph

Capture which exception occurred, which recommendation was shown, which evidence changed the decision, who approved it, what tool executed, and whether the business outcome improved. This creates proprietary training and evaluation material without making the model the source of truth.

### 13.3 OHADA and country-pack provenance

Build versioned, effective-dated, expert-reviewed country packs linked to actual workflows. The moat is not a generic "Africa compliance" claim; it is controlled coverage with explicit supported, sandbox, blocked, and superseded states.

### 13.4 Stock-to-cash-to-close continuity

Stoquify can connect a sale, payment, inventory movement, supplier commitment, payroll exposure, reconciliation exception, ledger posting, and close blocker in one tenant-safe platform. Cross-domain resolution is more defensible than isolated AI features.

### 13.5 Low-connectivity operating knowledge

Offline devices, provisional receipts, replay evidence, conflict resolution, and server certification can become a differentiated operating dataset. Agents must understand provisional state rather than pretending offline data is final.

### 13.6 Embedded habits and switching cost

Daily briefs, saved routines, approval history, exception ownership, evidence packs, and accountant/customer collaboration create legitimate switching cost because the system becomes the business's operating memory.

### What is not a moat

- A generic chatbot.
- A prompt library without workflow integration.
- A branded wrapper around a public model.
- Autonomous actions without evidence or governance.
- Static dashboards competitors can reproduce.
- Unsupported claims of legal, tax, or payroll automation.

## 14. Measurement Framework

No current product-usage baseline was found, so the following are **pilot exit thresholds**, not forecasts.

### Primary outcome KPIs

1. **Agent-assisted action completion:** eligible high-priority actions completed within their SLA after an agent brief, divided by eligible surfaced actions. Pilot exit threshold: at least 40% with no degradation in control quality.
2. **Weekly value-active users:** eligible users who complete at least one evidence view, accepted recommendation, or approved agent-assisted workflow in a week, divided by eligible pilot users. Pilot exit threshold: at least 50% by week eight.
3. **Verified time saved:** median measured or sampled time saved per completed target workflow relative to the pre-pilot baseline. Pilot exit threshold: at least 20% for the selected cash or inventory workflow.

### Drivers

- Seven-day agent activation.
- Brief opened -> evidence viewed -> action started -> action completed funnel.
- Recommendation acceptance and rejection reason.
- Mean time to assignment and resolution.
- Saved-routine repeat use.
- Evidence freshness and unavailable-answer rate.

### Quality and trust guardrails

- Material correction rate below 10% for advisory outputs during pilot.
- Accepted match-suggestion precision at or above 95% before any confidence-based automation is considered.
- Zero cross-tenant, permission, entitlement, payroll-disclosure, or unauthorized-write incidents.
- 100% of consequential claims linked to authorized evidence with freshness and version metadata.
- 100% of Tier 3/4 attempts denied or routed to the required human-controlled workflow.
- Tool execution success at or above 99% for enabled idempotent actions, excluding valid business denials.
- Median interactive response latency below five seconds for briefs already backed by existing snapshots; asynchronous handling for longer work.
- Cost per successful outcome measured and capped by tenant/package. Do not optimize token cost at the expense of control quality.

## 15. Delivery Roadmap

### Days 0-30: Foundation and measurement

- Freeze the agent/skill vocabulary, risk tiers, tool contract, and prohibited-action list.
- Add product telemetry for the current Daily Digest, action queue, reconciliation, and inventory workflows to establish baselines.
- Implement `AgentDefinition`, version, run, step, evidence, approval, feedback, cost, and incident records.
- Build S01-S12 and read-only tool wrappers around existing services.
- Create an evaluation corpus from synthetic cases plus reviewed, de-identified historical patterns.
- Resolve or explicitly isolate module-control P0 gaps for the pilot routes; do not enable broad enforcement.
- Deliver the read-only Stoquify Command Agent behind tenant and user feature flags.

**30-day gate:** no write tools; all answers evidence-linked; denial and redaction tests pass; pilot telemetry is collecting; agent version can be suspended instantly.

### Days 31-60: First controlled pilot

- Pilot the Command Agent and Exception/Action Orchestrator with 5-10 consenting organizations or a similarly bounded cohort.
- Add S17-S22 for daily briefs, cash triage/match suggestion, and inventory risk/variance.
- Enable background read tasks and review notifications.
- Establish weekly accuracy, adoption, latency, cost, and incident review.
- Label historical reconciliation outcomes and inventory exception outcomes for evaluation.

**60-day gate:** weekly value-active use and time-to-resolution show directional improvement; no material policy breach; correction and evidence-unavailable rates are understood.

### Days 61-90: Approval-enabled low-risk workflows

- Add Tier 1 drafting: reconciliation resolution packet, draft reorder/transfer, and draft PO.
- Introduce explicit approval and stale-evidence revalidation.
- Add outcome feedback and saved read-only routines.
- Decide whether cash or inventory merits wider rollout based on measured value, not enthusiasm.
- Produce a production-readiness report with cost, security, accuracy, and rollback evidence.

**90-day gate:** expand only an agent whose primary KPI, trust guardrails, cost envelope, and support runbook pass. Keep other agents in pilot or stop them.

### Months 4-6: Workflow expansion

- Add Purchasing/AP and Close Blocker skills.
- Introduce low-risk Tier 2 operational writes only after independent security and control review.
- Add English/French evaluation parity and country-pack provenance in responses.
- Build the Platform Assurance Agent and formal agent incident drills.

### Months 7-9: Finance and compliance depth

- Expand cash/reconciliation to more providers and statement formats.
- Pilot Close and Compliance Agent in read-only/evidence-preparation mode.
- Introduce accountant collaboration and certified agent evidence packs.
- Add package-based usage limits and cost controls.

### Months 10-12: Carefully earned autonomy and ecosystem

- Consider confidence-banded automation only for deterministic, reversible, low-risk cases with measured precision.
- Add Customer Success/Adoption Agent after telemetry definitions are stable.
- Pilot Payroll Readiness only in a reviewed country scope and aggregate-safe mode.
- Open a versioned integration/tool SDK only after tenant, approval, and audit boundaries are independently validated.

## 16. 30/60/90 Ownership and Acceptance Plan

| Period | Accountable owner | Main deliverables | Acceptance evidence |
|---|---|---|---|
| 0-30 | Platform architect + security lead + product analytics owner | Control-plane schema, policy gateway, telemetry, S01-S12, read-only Command MVP | Threat model, schema/contract tests, cross-tenant negative tests, evaluation baseline, feature-flag rollback |
| 31-60 | Product lead + finance/inventory domain owners | Bounded pilot, S17-S22, background reads, reviewed datasets | Adoption funnel, accuracy report, latency/cost report, incident review, user interviews |
| 61-90 | Product lead + controller + operations lead | Tier 1 drafts, approvals, feedback loop, rollout decision | Primary KPI movement, precision/correction results, approval audit, support runbook, go/no-go decision |

## 17. Risk Register and Release Gates

| Risk | Impact | Mitigation | Release gate |
|---|---|---|---|
| Cross-tenant or over-privileged retrieval | Critical | Server-derived context, S02 guard, redaction before model input, adversarial tests | Zero leakage in negative and prompt-injection tests |
| Hallucinated financial or statutory claim | Critical | Evidence-only claims, source/freshness metadata, unsupported-state refusal | 100% consequential claims traceable to evidence |
| Unauthorized or duplicate write | Critical | Approval policy, fresh auth, idempotency, deterministic service tool, stale-plan cancellation | Zero bypass; duplicate/replay tests pass |
| Prompt injection through records/documents | High | Treat retrieved content as data, tool allowlist, instruction isolation, output schema | Injection corpus produces no policy/tool escape |
| Sensitive payroll/privacy leakage | Critical | Data classification, aggregate-safe views, role-specific agents, memory exclusion | Disclosure tests and redaction audit pass |
| Country-rule drift | High | Effective-dated country packs, expert review, provenance resolver | Unsupported or stale pack blocks automation |
| Weak suggestions create operational noise | High | Confidence, outcome labels, quiet thresholds, user feedback | False critical alert rate and rejection reasons within limits |
| Model/provider outage | Medium | Fallback model, cached deterministic briefs, asynchronous retry, graceful unavailable state | Failure drill and no corrupted workflow state |
| Excessive cost/latency | Medium | Model routing, budgets, snapshot-first reads, asynchronous long tasks | Package cost cap and latency SLO met |
| Automation bias | High | Rationale, contradictory evidence, review, no false certainty | User testing shows comprehension; material correction tracked |
| Dirty or stale source data | High | Freshness evaluator, blocker visibility, no action on stale evidence | Stale-source simulations block or downgrade actions |
| Uncontrolled prompt/model change | High | Version registry, evaluations, canary, rollback, assurance agent | Candidate version passes evaluation and rollback drill |
| Module-control inconsistency | High | Pilot allowlist, resolve P0 prerequisites, no broad enforcement claim | Pilot surfaces have reconciled entitlement and permission truth |

## 18. Recommendations by Decision Class

### Build now

- Thin agent control plane and product telemetry.
- Foundation skills S01-S12.
- Stoquify Command Agent in read-only mode.
- Exception and Action Orchestrator.
- Cash/Reconciliation and Inventory/Replenishment MVP skills.
- Evaluation, policy, redaction, approval, audit, cost, and incident controls.

### Build next

- Model/cost routing, explicit preference memory, offline awareness, and country-pack provenance.
- Purchasing/AP and Close/Compliance agents.
- Platform Assurance Agent.
- Carefully selected Tier 1 and Tier 2 actions.

### Build later

- Payroll/Workforce Agent beyond read-only readiness.
- Customer Success/Adoption Agent after telemetry maturity.
- Voice, broader integration SDK, predictive forecasting, and multi-country expansion.

### Do not build

- A custom foundation model.
- A separate AI data warehouse before a demonstrated need.
- An agent that writes directly to Prisma or bypasses services.
- Autonomous posting, payment release, stock write-off, payroll approval, statutory filing, role/entitlement change, or period close.
- One agent per page or one agent per module.
- A chatbot whose answers are not tied to tenant evidence.
- An agent marketplace before tool, security, and commercial boundaries are stable.

## 19. Further Questions That Would Change the Plan

1. Which five to ten paying organizations are willing to join a measured pilot, and which roles use the current Daily Digest, reconciliation, and inventory workflows most often?
2. What are the current baselines for reconciliation exception time, stockout days, emergency purchases, and manager action completion?
3. Which model providers and data-processing regions are acceptable for customer, accounting, and payroll data?
4. Which first country pack has qualified legal/accounting ownership and a production support commitment?
5. Which existing service commands are safe enough for Tier 1 drafting and Tier 2 controlled writes?
6. What package and usage model will fund inference, review, and support costs without harming SMB affordability?

## 20. Caveats and Assumptions

- This is a static repository and documentation assessment dated 15 July 2026. It did not query production databases, billing, customer usage, support tickets, or model-provider contracts.
- Current readiness JSON files establish that specific code and policy checks passed when generated. They are not production customer outcome data.
- The 50-paying-organization statement comes from the architecture document last updated on 23 May 2026 and may be stale.
- Weighted scores are decision aids based on repository evidence and stated strategy. They are not measured ROI forecasts.
- KPI thresholds are proposed pilot gates and should be revised after baseline telemetry and customer discovery.
- Legal, payroll, tax, and country-pack production support require qualified human review and explicit ownership.

## 21. Source References

### Internal evidence

- `docs/architecture/system/ARCHITECTURE.md`
- `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_FULL_ARCHITECTURE_AUDIT_AND_REMEDIATION_REPORT_2026-07-12.md`
- `docs/skills-life-cycle/STOQUIFY_OHADA_SMB_SKILLS_AUDIT_REPORT_2026-07-11.md`
- `docs/skills-life-cycle/STOQUIFY_TRANSACTION_HISTORY_AGENT_SKILL_MATRIX_2026-07-14.md`
- `docs/prompts/stoquify-agent-orchestrator-enterprise-modernization-prompt-2026-07-01.md`
- `what-next/module-system/00-program-status-and-evidence-report.md`
- `what-next/module-system/execution-status.md`
- `what-next/*-readiness.json` files cited in Section 2
- `graphify-out/GRAPH_REPORT.md`
- `config/sidebar.ts`, `config/permissions.ts`, `package.json`, and `prisma/schema.prisma`
- `services/daily-habit`, `services/manager-action-center`, `services/owner-war-room`, `services/signals`, and `services/snapshots`

### External official references

- Shopify Help Center, Sidekick: https://help.shopify.com/en/manual/shopify-admin/productivity-tools/sidekick
- Intuit, Intuit Assist: https://www.intuit.com/intuitassist/
- Microsoft, Dynamics 365 Finance: https://www.microsoft.com/en-us/dynamics-365/products/finance
- Microsoft Learn, Dynamics 365 agents and Copilot: https://learn.microsoft.com/en-us/dynamics365/copilot/ai-get-started
- Odoo 19 documentation, AI agents: https://www.odoo.com/documentation/19.0/applications/productivity/ai/agents.html
- Odoo 19 documentation, AI server actions: https://www.odoo.com/documentation/19.0/applications/productivity/ai/server-actions.html
- Toast, Toast IQ overview: https://support.toasttab.com/en/article/Toast-IQ-Overview

## Final Decision

Stoquify should become an **evidence-backed operating copilot for stock, cash, controls, and close**, not a generic AI platform. Build one trusted Command Agent, one shared Exception and Action Orchestrator, and the cash and inventory domain agents first. Reuse the platform's existing snapshots, action queues, proof trails, and service-owned controls. Earn broader autonomy only after telemetry demonstrates repeat use, measurable workflow improvement, high precision, controlled cost, and zero boundary violations.

That sequence provides the most functionality with the least architectural waste while building the moats that matter: trusted operating history, outcome-labelled workflows, OHADA country-pack provenance, low-connectivity expertise, and deep stock-to-cash-to-close continuity.

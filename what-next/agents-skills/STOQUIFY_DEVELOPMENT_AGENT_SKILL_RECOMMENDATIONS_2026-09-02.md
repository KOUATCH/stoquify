# Stoquify Development Agent and Skill Recommendations

Date: **2026-09-02**  
Decision: **Adopt a nine-capability development portfolio by composing and extending existing assets.**  
Scope: proposal and evidence review; no agent installation, product implementation or activation.  
Companions: [machine-readable registry](<E:/ohada saas/Focused projects/stoquify/what-next/agents-skills/STOQUIFY_DEVELOPMENT_AGENT_SKILL_REGISTRY_2026-09-02.json>) · [operating playbook and three executable prompts](<E:/ohada saas/Focused projects/stoquify/what-next/agents-skills/STOQUIFY_DEVELOPMENT_AGENT_SKILL_PLAYBOOK_2026-09-02.md>)

## 1. Recommendation

Start with **D01 Delivery Coordinator and Current Evidence**, using the installed `001-aqstoqflow-program-orchestrator`. Have it prepare a precise acceptance handoff for the current P0-02/P0-03 work. Use **D02 Independent Workflow Verification** to make completion claims dependable, and **D03 Trusted Analytics** to turn the accepted foundation into valuable cash, reconciliation and accountant workflows.

Treat the nine entries as reusable responsibilities. They are not nine simultaneously active workstreams and do not require nine new installed agents. Three recommendations extend a skill/procedure; six compose existing roles and skills. No new product agent is proposed for immediate activation.

**Next program milestone:** accept P0-02/P0-03 with a current typecheck disposition and accountable sign-offs, then open P0-04/P0-06 within the existing two-package work-in-progress limit. The current register still has P0-02/P0-03 active. This recommendation does not clear those gates. [E03](<E:/ohada saas/Focused projects/stoquify/what-next/analytics-network-program/PROGRAM_STATUS_REGISTER.json>), [E04](<E:/ohada saas/Focused projects/stoquify/what-next/analytics-network-program/P0_01_TO_P0_03_EXECUTION_REPORT.md>)

**First concrete verification improvement:** a local AR-history capture must wait for a truthful data-ready or expected-empty state. The inspected screenshot still displays “Loading AR history” despite the local manifest's loaded-state claim. Correct that acceptance gap when its work is assigned within available or explicitly reprioritized WIP. [E05](<E:/ohada saas/Focused projects/stoquify/what-next/evidence/finance-x1/local-simulation/LOCAL-X1-20260901144339/manifest.local-simulation.json>), [E06](<E:/ohada saas/Focused projects/stoquify/what-next/evidence/finance-x1/local-simulation/LOCAL-X1-20260901144339/screenshots/desktop/en/receivables-history.png>), [E07](<E:/ohada saas/Focused projects/stoquify/tests/e2e/finance-x1-local-authenticated-evidence.spec.ts>)

## 2. Product objective and evidence scope

The working mission is supported by the module catalog, financial/event services and the latest analytics strategy: a trusted operating and financial-control platform for OHADA-region businesses, with traceable daily work, exception resolution and permissioned collaboration. This is a synthesis of repository evidence, not a newly approved product charter. [E10](<E:/ohada saas/Focused projects/stoquify/services/modules/module-catalog.service.ts>), [E19](<E:/ohada saas/Focused projects/stoquify/services/accounting/posting.service.ts>), [E20](<E:/ohada saas/Focused projects/stoquify/services/events/business-event.service.ts>), [E35](<E:/ohada saas/Focused projects/stoquify/what-next/STOQUIFY_ANALYTICS_NETWORK_PHASES_0_TO_3_EXECUTION_ROADMAP_2026-08-30.md>)

Keep three milestones distinct:

| Horizon | Outcome |
|---|---|
| Current development | Close and accept the existing analytical ownership/context slices; prove actual task completion in finance workflows. |
| Controlled product validation | Source-linked cash/reconciliation/advisory read models, bounded onboarding, verified access and measured user outcomes. |
| Longer term | Reliable multi-domain operations and controlled external participation, qualified separately for each deployment, country and integration scope. |

The August 2 copilot program measures monthly organizations completing at least three evidence-backed outcomes across two workflows. The August 30 network program measures at least one evidence-backed operating decision plus one trusted external-participation outcome. They govern different programs; do not silently replace one denominator with the other or require external participation for an internal-only slice. Use task completion and evidence correctness as the present slice measures. [E48](<E:/ohada saas/Focused projects/stoquify/docs/stoquify-skills-agents/STOQUIFY_TOP_12_AGENTS_SKILLS_COMPLETE_EXECUTION_ROADMAP_2026-08-02.md>), [E35](<E:/ohada saas/Focused projects/stoquify/what-next/STOQUIFY_ANALYTICS_NETWORK_PHASES_0_TO_3_EXECUTION_ROADMAP_2026-08-30.md>)

### What this run established

- Branch: `codex/migration-control-plane-release-2026-08-29`.
- HEAD: `a05a41ef66cd5d98fd69ae3df18225795f912232`.
- The working tree was already dirty: 172 Git status entries at the start. HEAD alone does not identify the reviewed state.
- Inventory found 441 immediate Codex skill directories containing 446 SKILL.md files, including nested/system files; 43 SKILL.md files under the other global skills root; three workspace `.agents` skills and two workspace `.codex` skills.
- The Codex agent directory contains 242 TOML definitions, including nine Stoquify-specific definitions.
- Purpose, workflow or responsibility excerpts were inspected for 25 relevant skill/agent assets. Filesystem availability is not proof of session tool availability, execution quality or product activation.
- Fifty-four evidence anchors are recorded in the registry with working-tree hashes after collection. Some are navigation/import anchors; the registry labels them accordingly.
- Three focused suites passed: **19/19 tests**. The evaluation catalog still has **999 NOT_TESTED entries**.
- The 42 artifacts in the September 1 local X1 manifest exist and match their recorded SHA-256 values. One screenshot was visually inspected.

The study covers representative route/action/service/data flows and shared domain boundaries. It is not an exhaustive audit of every route or an independent professional certification. No production telemetry, customer interviews, vendor evaluation or live database query was performed.

## 3. Current architecture and useful reuse points

| Workflow or boundary | Inspected trace | Development implication |
|---|---|---|
| Cash decisions | Cash Command route → finance access wrapper → `getCashCommandData` → permission-aware payment, close, inventory and drawer snapshots → existing dashboard | Extend this source-owned route for cash decisions. A target 13-week job in the ownership map does not establish that a complete forecast already exists. [E46](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx>), [E15](<E:/ohada saas/Focused projects/stoquify/services/cash-command/cash-command.service.ts>), [E39](<E:/ohada saas/Focused projects/stoquify/what-next/analytics-network-program/SURFACE_OWNERSHIP_AND_DUPLICATION_MAP.md>) |
| Reconciliation | Workbench → TanStack query hook → protected action → reconciliation read-model service contract | Add explanation/aging/coverage to the existing workflow. The action derives organization server-side. [E45](<E:/ohada saas/Focused projects/stoquify/hooks/payments/usePaymentReconciliationWorkbench.ts>), [E18](<E:/ohada saas/Focused projects/stoquify/actions/payments/reconciliation-workbench.actions.ts>) |
| Master-data onboarding | Settings route → allowed target/read/write scope → workbench/actions → staged/approved import → canonical customer/supplier/item writers | Reuse the working bounded import; do not claim it imports balances or opening stock. [E47](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/data-onboarding/page.tsx>), [E14](<E:/ohada saas/Focused projects/stoquify/actions/onboarding/master-data-onboarding.actions.ts>), [E13](<E:/ohada saas/Focused projects/stoquify/services/onboarding/master-data-import.service.ts>) |
| Financial export | Action schema → permission, fresh auth and module checks → server-derived organization/actor → export service | Keep exports server-finalized and verify the actual file/job outcome. [E43](<E:/ohada saas/Focused projects/stoquify/actions/accounting/finance-statement-export.actions.ts>), [E40](<E:/ohada saas/Focused projects/stoquify/components/DataTableComponents/finance-x1-evidence-binding.ts>) |
| Accounting/event truth | Posting transaction → open-period/balance/account checks → sensitive-action control → source link and close invalidation; event gateway → audit/outbox | New economic workflows require cross-domain invariants, not isolated table changes. [E19](<E:/ohada saas/Focused projects/stoquify/services/accounting/posting.service.ts>), [E20](<E:/ohada saas/Focused projects/stoquify/services/events/business-event.service.ts>), [E21](<E:/ohada saas/Focused projects/stoquify/services/events/business-event-outbox.service.ts>) |
| Accountant collaboration | Client grant → effective/expiry/state and requested capability checks → authorized organization; revocation emits evidence | A deterministic advisory portfolio can precede a new advisor agent. [E22](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-access.service.ts>) |
| POS/offline | Signed/sequence-aware offline input → canonical `commitPOSSale` → business-event evidence and existing source owners | Reuse replay/conflict handling; devices do not become financial authority. [E24](<E:/ohada saas/Focused projects/stoquify/services/pos/offline-sync.service.ts>) |
| Purchasing/AP and payroll | Supplier invite/proposal events retain buyer ownership; payroll payment evidence separates request/approve/apply and uses attendance/redaction contracts | Keep domain-specific approvals and source evidence. Supplier invite delivery is still an explicit gap. [E23](<E:/ohada saas/Focused projects/stoquify/services/purchase-order/supplier-po-acknowledgement.service.ts>), [E25](<E:/ohada saas/Focused projects/stoquify/services/payroll/payment-evidence.service.ts>) |
| Agent assistance | Command service → context/rollout/release checks → tool registry → deterministic runner → evidence/governance; evaluation harness → case prioritization only | Qualify the existing runtime rather than building another framework. [E26](<E:/ohada saas/Focused projects/stoquify/services/agents/command-agent.service.ts>), [E27](<E:/ohada saas/Focused projects/stoquify/services/agents/agent-runner.service.ts>), [E28](<E:/ohada saas/Focused projects/stoquify/scripts/top12-evaluation-harness.js>), [E29](<E:/ohada saas/Focused projects/stoquify/docs/copilot/stoquify-agent-skill-definition-suite/evaluations/evaluation-catalog.json>) |
| SaaS/module boundary | Catalog/dependency contract → legacy/requested-module derivation → observe/enforce decisions at callers | Trace actual guard behavior. Durable commercial subscription truth needs its own later implementation. [E10](<E:/ohada saas/Focused projects/stoquify/services/modules/module-catalog.service.ts>), [E11](<E:/ohada saas/Focused projects/stoquify/services/modules/module-entitlement.service.ts>) |

Graph navigation supports these seams: app graph `cash_command_page_cashcommandpage` is community 38 and `finance_financerouteaccess_financerouteaccess` is community 1; component `finance_paymentreconciliationworkbench_tsx` is community 13 and `agents_agentcommandpanel_tsx` is community 72. Service nodes place Cash Command in community 2, posting in 3, Command Agent in 30, and the business-event writer in 1. These are grouping aids. For example, the graph puts `recordBusinessEventInTx` at line 97 while current source starts it at line 164, demonstrating why live source takes precedence. [E36](<E:/ohada saas/Focused projects/stoquify/graphify-out/graph_components.json>), [E37](<E:/ohada saas/Focused projects/stoquify/graphify-out/graph_app.json>), [E38](<E:/ohada saas/Focused projects/stoquify/services/graphify-out/graph.json>), [E20](<E:/ohada saas/Focused projects/stoquify/services/events/business-event.service.ts>)

## 4. Findings that determine the portfolio

### F01 — Delivery evidence needs scope-aware reconciliation

The August 28 system assessment predates the August 30 isolated replay and September 1 local X1 evidence. Repeating its broad migration/UI statements unchanged would send development back through completed work. Conversely, local replay/capture does not close production approval or runtime gates. D01 maintains that distinction. [E02](<E:/ohada saas/Focused projects/stoquify/what-next/system-evaluation-2026-08-28-comprehensive-report.md>), [E32](<E:/ohada saas/Focused projects/stoquify/what-next/migrations/isolated-next-level-fresh-replay-20260830.md>), [E05](<E:/ohada saas/Focused projects/stoquify/what-next/evidence/finance-x1/local-simulation/LOCAL-X1-20260901144339/manifest.local-simulation.json>), [E33](<E:/ohada saas/Focused projects/stoquify/what-next/enterprise-release-blocker-status.md>)

### F02 — Local capture does not yet prove the AR task is ready

All 42 local X1 artifact files pass hash checks. However, the sampled desktop/English AR-history capture shows loading and zero AR items. The local harness waits for DOMContentLoaded, checks authentication/accessibility/overflow, takes a screenshot, then records `routeLoaded: true`. It does not wait for business data to reach an accepted terminal state.

Twenty-one captures record zero `tbody tr` rows. This alone is not proof that all 21 are defective: some routes or legitimate empty states can have no HTML table rows. It is a reason to require route-specific fixture expectations. The local `usefulResultMs` values span 7,800–63,200 ms and include accessibility and capture work; they are not a reliable time-to-data-ready metric or an SLA measurement. D02 owns acceptance quality; D05 owns any reproduced UI behavior defect. [E05](<E:/ohada saas/Focused projects/stoquify/what-next/evidence/finance-x1/local-simulation/LOCAL-X1-20260901144339/manifest.local-simulation.json>), [E06](<E:/ohada saas/Focused projects/stoquify/what-next/evidence/finance-x1/local-simulation/LOCAL-X1-20260901144339/screenshots/desktop/en/receivables-history.png>), [E07](<E:/ohada saas/Focused projects/stoquify/tests/e2e/finance-x1-local-authenticated-evidence.spec.ts>)

The separate authoritative harness waits for a visible table and requires approved evidence. Reuse its applicable checks, while avoiding a universal table assertion for routes whose accepted state is deliberately empty or not tabular. No authoritative browser run was performed here. [E08](<E:/ohada saas/Focused projects/stoquify/tests/e2e/finance-x1-authenticated-evidence.spec.ts>)

### F03 — Analytics semantics are a concrete unfinished dependency

The organization context contract requires currency, IANA timezone and explicit half-open period instants. Its focused unit tests pass. Business Pulse still contains an XAF default and server-local day helpers, and does not import that new contract. P0-03's report explicitly excludes that integration. Treat the contract as a completed development slice, not a completed production analytical workflow. [E16](<E:/ohada saas/Focused projects/stoquify/services/analytics/sales-analytics.service.ts>), [E17](<E:/ohada saas/Focused projects/stoquify/services/analytics/analytical-context-contracts.ts>), [E04](<E:/ohada saas/Focused projects/stoquify/what-next/analytics-network-program/P0_01_TO_P0_03_EXECUTION_REPORT.md>), [E49](<E:/ohada saas/Focused projects/stoquify/services/analytics/__tests__/analytical-context-contracts.test.ts>)

### F04 — Guard truth is more precise than scanner counts or UI visibility

Selected actions enforce module and permission checks, while entitlement derivation still supports requested modules and legacy defaults. A large missing-permission count cannot by itself prove an exploit; a protected sidebar or action name cannot prove safety either. D04 traces the selected route/action/export boundary and its denial cases. [E11](<E:/ohada saas/Focused projects/stoquify/services/modules/module-entitlement.service.ts>), [E14](<E:/ohada saas/Focused projects/stoquify/actions/onboarding/master-data-onboarding.actions.ts>), [E18](<E:/ohada saas/Focused projects/stoquify/actions/payments/reconciliation-workbench.actions.ts>), [E43](<E:/ohada saas/Focused projects/stoquify/actions/accounting/finance-statement-export.actions.ts>)

### F05 — Strong import and replay foundations should be reused narrowly

The isolated replay report records 80/80 migrations and zero unexpected structural drift, with 226 intentionally classified residual drift statements. The bounded onboarding report records staged approval/commit and a historical browser matrix. Neither proves broad financial-history migration, fresh production readiness or all-tenant usability. D06 protects these separate meanings. [E32](<E:/ohada saas/Focused projects/stoquify/what-next/migrations/isolated-next-level-fresh-replay-20260830.md>), [E54](<E:/ohada saas/Focused projects/stoquify/what-next/migrations/isolated-next-level-blocker-register-20260830.md>), [E34](<E:/ohada saas/Focused projects/stoquify/what-next/master-data-onboarding-release-readiness.md>), [E13](<E:/ohada saas/Focused projects/stoquify/services/onboarding/master-data-import.service.ts>)

### F06 — Agent qualification is still an observed-behavior gap

The catalog has 999 unexecuted entries and the harness explicitly emits NOT_TESTED records. Its passing tests verify honest prioritization, not agent behavior. D08 should add a runnable adapter for one existing capability before expanding coverage. Qualifying this runtime is mandatory for product agents; it is not a prerequisite for every deterministic UI or analytics improvement. [E28](<E:/ohada saas/Focused projects/stoquify/scripts/top12-evaluation-harness.js>), [E29](<E:/ohada saas/Focused projects/stoquify/docs/copilot/stoquify-agent-skill-definition-suite/evaluations/evaluation-catalog.json>), [E51](<E:/ohada saas/Focused projects/stoquify/scripts/__tests__/top12-evaluation-harness.test.js>)

### F07 — External delivery and accountable approval cannot be supplied by more prompts

Supplier invitation events retain empty outbox messages. Production/provider, credential, scheduler and ownership evidence remains blocked in the inspected release records. The newer X1 intake has a traceable-approvals prerequisite, while the approval-automation report also has configuration/signature prerequisites. Those are different scopes, not contradictory counts to add together. D09 can build/test internal boundary behavior; named operators and approvers must supply external authority. [E23](<E:/ohada saas/Focused projects/stoquify/services/purchase-order/supplier-po-acknowledgement.service.ts>), [E33](<E:/ohada saas/Focused projects/stoquify/what-next/enterprise-release-blocker-status.md>), [E41](<E:/ohada saas/Focused projects/stoquify/what-next/evidence/finance-x1/X1_APPROVAL_INTAKE_PREFILLED_2026-09-01.md>), [E42](<E:/ohada saas/Focused projects/stoquify/what-next/evidence/finance-x1/X1_APPROVAL_AUTOMATION_READINESS_2026-08-31.md>)

### F08 — Existing asset instructions require deliberate adaptation

The generic Data Engineer definition emphasizes lakehouse tooling and Frontend Developer includes editor-integration duties. Those duties are not requirements for Stoquify's selected slice. The `enterprise-db-seed` skill includes a broad population target and plaintext demo-credential output; this task explicitly excludes secret disclosure and seeding. Reuse schema knowledge and existing verification tools, not those broad defaults.

`kontava-business-pulse-analytics` prohibits predictive/AI additions. D03 therefore uses it for pulse work and extends the BI trust procedure with an explicit later deterministic forecast contract under the newer roadmap. It does not silently reinterpret the old skill. The release-foundation skill's broad commands also require scope review: `npm run build` currently chains migration deployment. [data-engineer](<C:/Users/J COMPUTER/.codex/agents/data-engineer.toml>), [frontend-developer](<C:/Users/J COMPUTER/.codex/agents/frontend-developer.toml>), [enterprise-db-seed](<C:/Users/J COMPUTER/.codex/skills/enterprise-db-seed/SKILL.md>), [kontava-business-pulse-analytics](<C:/Users/J COMPUTER/.codex/skills/kontava-business-pulse-analytics/SKILL.md>), [E31](<E:/ohada saas/Focused projects/stoquify/package.json>)

## 5. Ranked portfolio

Scores use 1–5 judgments across user value (20%), dependency unlock (20%), delivery improvement (15%), reuse (10%), feasibility (10%), risk reduction (15%), recurring usefulness (5%) and differentiation (5%). Score = sum of rating × weight / 5. Ratings and arithmetic are retained in the registry.

**Rank is dependency-adjusted.** D02 scores highest, but D01 must establish its scope and ownership first. Ties are ordered by current program fit and prerequisites. Scores are comparative judgments, not measured ROI or staffing estimates. Effort is relative scope: S a narrow procedure/contract; M a bounded cross-file slice; L a multi-domain or external integration.

| Rank | Capability | Form | Reuse decision | Value score |
|---:|---|---|---|---:|
| 1 | D01 — Delivery Coordinator and Current Evidence | Skill | EXTEND | 94/100 |
| 2 | D02 — Independent Workflow Verification Engineer | Development agent | COMPOSE | 96/100 |
| 3 | D03 — Trusted Analytics and Decision Engineering | Development agent | EXTEND | 94/100 |
| 4 | D04 — Tenant Access and Module Contract Engineering | Development agent | COMPOSE | 90/100 |
| 5 | D05 — Workflow UX and Accessibility Engineering | Development agent | COMPOSE | 89/100 |
| 6 | D06 — Migration and First-Value Onboarding Engineering | Development agent | COMPOSE | 89/100 |
| 7 | D07 — Financial Event Integrity Engineering | Development agent | COMPOSE | 88/100 |
| 8 | D08 — Agent Behavioral Evaluation and Runtime Qualification | Skill | EXTEND | 83/100 |
| 9 | D09 — Connector and Offline Reliability Engineering | Development agent | COMPOSE | 81/100 |

### D01 — Delivery Coordinator and Current Evidence

**Why and for whom.** Several programs and reports describe different candidates and environments; two analytics packages remain active while newer migration and local UI evidence changes what is actually missing. Developer/operator coordinating delivery; product owner deciding the next accepted milestone. Evidence: [E01](<E:/ohada saas/Focused projects/stoquify/what-next/agents-skills/STOQUIFY_HIGH_LEVERAGE_AGENT_SKILL_GAP_AND_PRIORITY_ROADMAP_2026-08-20.md>), [E03](<E:/ohada saas/Focused projects/stoquify/what-next/analytics-network-program/PROGRAM_STATUS_REGISTER.json>), [E04](<E:/ohada saas/Focused projects/stoquify/what-next/analytics-network-program/P0_01_TO_P0_03_EXECUTION_REPORT.md>), [E05](<E:/ohada saas/Focused projects/stoquify/what-next/evidence/finance-x1/local-simulation/LOCAL-X1-20260901144339/manifest.local-simulation.json>), [E32](<E:/ohada saas/Focused projects/stoquify/what-next/migrations/isolated-next-level-fresh-replay-20260830.md>), [E33](<E:/ohada saas/Focused projects/stoquify/what-next/enterprise-release-blocker-status.md>), [E41](<E:/ohada saas/Focused projects/stoquify/what-next/evidence/finance-x1/X1_APPROVAL_INTAKE_PREFILLED_2026-09-01.md>), [E42](<E:/ohada saas/Focused projects/stoquify/what-next/evidence/finance-x1/X1_APPROVAL_AUTOMATION_READINESS_2026-08-31.md>).

**Value.** A repeatable route from an approved work package to a verified user outcome, with fewer stale blockers and reopened decisions. **Why this place:** It is the dependency needed to assign the other capabilities safely and prevent a tenth competing roadmap.

**Reuse and ownership.** EXTEND: [001-aqstoqflow-program-orchestrator](<C:/Users/J COMPUTER/.codex/skills/001-aqstoqflow-program-orchestrator/SKILL.md>); [stoquify-release-evidence-ratchet](<C:/Users/J COMPUTER/.codex/skills/stoquify-release-evidence-ratchet/SKILL.md>); [workflow-architect](<C:/Users/J COMPUTER/.codex/agents/workflow-architect.toml>). Maintain a source-referenced handoff for the active package, distinguish implementation/review/approval, reconcile evidence scope, assign file ownership and sequence dependencies. Coordinate existing domain owners; do not create another live program register or act as independent reviewer, signer or release authority.

**Trigger and handoff.** Start/resume a package, receive new evidence, encounter conflicting status, or prepare a handoff. Inputs: Existing program/status and decision registers; Current candidate and relevant source hashes; Accepted objective and file ownership; Command results and scoped approval references. Outputs: One active-package handoff and evidence-disposition delta; Explicit next action with receiving owner; Source links to existing canonical registers. Receives: The selected implementation owner, with Product retaining prioritization authority.

**Prerequisites and first slice.** Identify the existing authoritative program register and its scope. Separate technical readiness from human sign-off; do not infer approvals from seeded personas. Reconcile P0-02/P0-03 holds against the Aug 30 migration replay and Sept 1 local X1 captures; classify the four recorded typecheck errors as historical until rerun; prepare one closure handoff without activating P0-04/P0-06.

**Verification.** Every active item has one owner, input source/date/environment, acceptance criterion and next action. No local simulation is promoted to release evidence. No duplicate status register; reported WIP remains two until closure or explicit reprioritization. Completion: An implementer can resume the current P0 closure work using the handoff without repeating platform-wide discovery.

**Measures.** Development: Accepted handoff latency — Elapsed time from complete handoff receipt to the first scoped implementation action; source: Existing package/decision timestamps plus proposed handoff timestamps. User/business: Verified workflow delivery rate — Accepted end-to-end user workflows / started workflow slices, using a fixed reporting window; source: Existing workflow acceptance records; instrumentation completeness must be checked. Both baselines and numerical targets are unestablished. Metric owners and review windows are in the registry.

**Effort, confidence and tradeoff.** S for the first handoff; M for a reusable scoped procedure. High for reuse and coordination need; medium for measured delivery impact. Adds a small evidence-maintenance step; keep it to one handoff per package and avoid document-only workstreams.

### D02 — Independent Workflow Verification Engineer

**Why and for whom.** Local X1 capture can finish while AR history is still loading. Green contract tests and file hashes do not establish completion of the user's task. Implementers and independent QA; accountants and operators relying on complete screens and exports. Evidence: [E05](<E:/ohada saas/Focused projects/stoquify/what-next/evidence/finance-x1/local-simulation/LOCAL-X1-20260901144339/manifest.local-simulation.json>), [E06](<E:/ohada saas/Focused projects/stoquify/what-next/evidence/finance-x1/local-simulation/LOCAL-X1-20260901144339/screenshots/desktop/en/receivables-history.png>), [E07](<E:/ohada saas/Focused projects/stoquify/tests/e2e/finance-x1-local-authenticated-evidence.spec.ts>), [E08](<E:/ohada saas/Focused projects/stoquify/tests/e2e/finance-x1-authenticated-evidence.spec.ts>), [E40](<E:/ohada saas/Focused projects/stoquify/components/DataTableComponents/finance-x1-evidence-binding.ts>), [E50](<E:/ohada saas/Focused projects/stoquify/components/DataTableComponents/__tests__/FinanceX1EvidenceBinding.test.ts>), [E52](<E:/ohada saas/Focused projects/stoquify/jest.config.ts>), [E53](<E:/ohada saas/Focused projects/stoquify/jest.setup.ts>).

**Value.** A user can load the expected authorized records, inspect evidence and complete a scoped action or truthful empty-state flow. **Why this place:** It makes completion claims reliable across every later feature and addresses a directly observed issue.

**Reuse and ownership.** COMPOSE: [code-reviewer](<C:/Users/J COMPUTER/.codex/agents/code-reviewer.toml>); [aqstoqflow-entity-workflow-verifier](<C:/Users/J COMPUTER/.codex/skills/aqstoqflow-entity-workflow-verifier/SKILL.md>); [aqstoqflow-release-verification-foundation](<C:/Users/J COMPUTER/.codex/skills/aqstoqflow-release-verification-foundation/SKILL.md>). Translate each workflow's acceptance into observable behavior, adversarial/failure cases, evidence classification and a reproducible independent review. Own test validity and findings; implementation owners fix domain code. Do not approve your own changes or issue product/statutory/production certification.

**Trigger and handoff.** A slice claims completion, a defect is fixed, or evidence must be rebound to a candidate. Inputs: Expected route/persona/data states; Frozen or hash-identified source scope; Known fixture and allowed environment; Existing test harnesses and evidence manifest. Outputs: Passed/failed/blocked acceptance matrix; Minimal reproducible findings; Candidate-bound evidence classified as unit, browser, local simulation or approved release evidence. Receives: Responsible implementation owner for failures; human release reviewer for a complete evidence packet.

**Prerequisites and first slice.** D01 package boundary and owner. Authenticated testing requires an authorized environment and data scope; fixture presence does not substitute for that authority. For X1 receivables history, make capture wait for an explicit terminal data state and verify known fixture expectations; separate data-ready timing from axe/screenshot elapsed time. Inspect the stronger authoritative harness before sharing helpers.

**Verification.** A delayed-loading fixture cannot pass as a completed-data capture. A legitimate authorized empty state is distinguishable from loading, denial and failed data fetch. Local and authoritative evidence classifications remain separate. Known records, drill-through and export results are checked where promised by this slice. Completion: The selected AR workflow has a truthful reproducible acceptance result; awaiting external approval is recorded separately.

**Measures.** Development: False completion rate — Previously accepted slices reopened for unmet original acceptance / accepted slices; source: Acceptance matrix and linked defect records. User/business: Verified task completion — Successful authorized task completions / eligible attempts, segmented by persona and locale; source: Proposed task-based usability runs, not page-load counts. Both baselines and numerical targets are unestablished. Metric owners and review windows are in the registry.

**Effort, confidence and tradeoff.** M. High: source and a captured loading state directly support the gap. Behavioral verification takes longer than checking route presence; use one representative workflow before expanding.

### D03 — Trusted Analytics and Decision Engineering

**Why and for whom.** The new organization analytical context exists but Business Pulse still uses XAF and server-local day boundaries. Surface ownership describes target jobs that are not all implemented. Finance/data engineering; owners, finance teams and accountants making operating decisions. Evidence: [E03](<E:/ohada saas/Focused projects/stoquify/what-next/analytics-network-program/PROGRAM_STATUS_REGISTER.json>), [E04](<E:/ohada saas/Focused projects/stoquify/what-next/analytics-network-program/P0_01_TO_P0_03_EXECUTION_REPORT.md>), [E15](<E:/ohada saas/Focused projects/stoquify/services/cash-command/cash-command.service.ts>), [E16](<E:/ohada saas/Focused projects/stoquify/services/analytics/sales-analytics.service.ts>), [E17](<E:/ohada saas/Focused projects/stoquify/services/analytics/analytical-context-contracts.ts>), [E18](<E:/ohada saas/Focused projects/stoquify/actions/payments/reconciliation-workbench.actions.ts>), [E22](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-access.service.ts>), [E35](<E:/ohada saas/Focused projects/stoquify/what-next/STOQUIFY_ANALYTICS_NETWORK_PHASES_0_TO_3_EXECUTION_ROADMAP_2026-08-30.md>), [E39](<E:/ohada saas/Focused projects/stoquify/what-next/analytics-network-program/SURFACE_OWNERSHIP_AND_DUPLICATION_MAP.md>), [E49](<E:/ohada saas/Focused projects/stoquify/services/analytics/__tests__/analytical-context-contracts.test.ts>).

**Value.** Organization-correct Business Pulse, source-linked cash outlook, reconciliation exposure explanations and consent-bound accountant triage on existing routes. **Why this place:** It unlocks the currently planned P0/P1 product value and creates reusable foundations for several innovations.

**Reuse and ownership.** EXTEND: [data-engineer](<C:/Users/J COMPUTER/.codex/agents/data-engineer.toml>); [kontava-workflow-bi-trust-gates](<C:/Users/J COMPUTER/.codex/skills/kontava-workflow-bi-trust-gates/SKILL.md>); [kontava-business-pulse-analytics](<C:/Users/J COMPUTER/.codex/skills/kontava-business-pulse-analytics/SKILL.md>); [kontava-workflow-efficiency-telemetry](<C:/Users/J COMPUTER/.codex/skills/kontava-workflow-efficiency-telemetry/SKILL.md>). Define metric ownership, currency/time/period/grain, coverage/freshness, formulas, drill-through and deterministic read models before UI integration. Source services retain writes and balances. Business Pulse skill covers current pulse only; a later forecast is a separately scoped deterministic contract under the analytics roadmap, not an implicit expansion of that skill.

**Trigger and handoff.** A metric, analytical read model, forecast, cohort or cross-domain decision view is proposed or changed. Inputs: P0 surface ownership and organization-context contracts; Source model definitions and permission boundaries; Metric definition and denominator; Accepted phase/work-package scope. Outputs: Versioned metric contract or read model; Missing-data and authorization behavior; Source-to-display validation and outcome measurement plan. Receives: Frontend owner for display; Finance/Data owners for semantics; independent QA for acceptance.

**Prerequisites and first slice.** P0-02/P0-03 acceptance and current typecheck disposition before P0-04. P0-06 access evidence before cross-client or sensitive analytical delivery. No new forecast UI before the applicable Phase 1 gates. After the active P0 closure, define P0-04's proposed_closing_cash metric and a bounded reconciliation exposure metric with explicit currency, organization timezone, period, source coverage and unknown states; identify the authorized Business Pulse integration change separately.

**Verification.** No implicit currency/timezone fallback and no mixed-currency sum. Same inputs yield identical results; boundaries and missing coverage have explicit behavior. Forecast, actual cash, unresolved exposure and proven loss cannot be conflated. Metric keys have one canonical owner and authorized source drill-through. Completion: The selected metric contract is reviewable and testable, tied to the existing route and source owners; future forecast activation is not implied.

**Measures.** Development: Metric contract reuse — Consumers using the canonical tested metric contract / consumers of that metric; source: Surface ownership registry and import/reference audit. User/business: Evidence-backed decision completion — Eligible users completing a source-linked cash/reconciliation review / eligible review attempts; source: Proposed workflow outcomes linked to source evidence; baseline absent. Both baselines and numerical targets are unestablished. Metric owners and review windows are in the registry.

**Effort, confidence and tradeoff.** M for metric contract; L for later cross-domain forecast workflow. High for semantic gap and reuse; medium for forecast/advisory demand until user validation. Defining periods, coverage and ownership delays attractive dashboards but avoids misleading amounts.

### D04 — Tenant Access and Module Contract Engineering

**Why and for whom.** Explicit enforcement at selected wrappers coexists with legacy/default requestedModules-derived entitlements; broad scanner totals cannot establish actual route/action safety. Security/platform developers; tenant administrators and external accountants. Evidence: [E09](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma>), [E10](<E:/ohada saas/Focused projects/stoquify/services/modules/module-catalog.service.ts>), [E11](<E:/ohada saas/Focused projects/stoquify/services/modules/module-entitlement.service.ts>), [E12](<E:/ohada saas/Focused projects/stoquify/services/_shared/protect.ts>), [E14](<E:/ohada saas/Focused projects/stoquify/actions/onboarding/master-data-onboarding.actions.ts>), [E18](<E:/ohada saas/Focused projects/stoquify/actions/payments/reconciliation-workbench.actions.ts>), [E22](<E:/ohada saas/Focused projects/stoquify/services/accounting/accountant-access.service.ts>), [E35](<E:/ohada saas/Focused projects/stoquify/what-next/STOQUIFY_ANALYTICS_NETWORK_PHASES_0_TO_3_EXECUTION_ROADMAP_2026-08-30.md>), [E43](<E:/ohada saas/Focused projects/stoquify/actions/accounting/finance-statement-export.actions.ts>), [E46](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx>).

**Value.** Each permitted user reaches the appropriate workflow while unauthorized reads, exports and module access are blocked before data exposure. **Why this place:** Sensitive analytics, advisor access, exports and eventual packaging depend on a known authorization contract.

**Reuse and ownership.** COMPOSE: [backend-architect](<C:/Users/J COMPUTER/.codex/agents/backend-architect.toml>); [aqstoqflow-module-access-guard-contract](<C:/Users/J COMPUTER/.codex/skills/aqstoqflow-module-access-guard-contract/SKILL.md>); [aqstoqflow-entity-workflow-verifier](<C:/Users/J COMPUTER/.codex/skills/aqstoqflow-entity-workflow-verifier/SKILL.md>). Trace route/action/API/export guard order, tenant derivation, module intent, consent grants and denied states for one selected surface family. Do not turn observed requestedModules into a durable paid-subscription claim or broadly enable enforcement. Preserve current scope and independently reviewed activation decisions.

**Trigger and handoff.** A new surface, export, shared service, client grant or package entitlement is introduced. Inputs: Route catalog and actual wrappers; Permission vocabulary and module catalog; Source service calls; Tenant/persona/grant test matrix. Outputs: Source-backed access matrix; Focused negative tests and smallest fixes; Scanner false-positive/negative disposition. Receives: Module/platform owner and independent security reviewer.

**Prerequisites and first slice.** D01 current scope. P0-02 accepted for the P0-06 lane; explicit authorization for any new enforcement scope. Reconcile P0-06 for the Cash Command, Reconciliation and Accountant Portfolio route/action/export seams, including expired/revoked grants.

**Verification.** Foreign-tenant and expired-grant access fail before source reads. Denied exports do not create or expose jobs. Sidebar state and role-name matches are never treated as sufficient authorization. Current observe/enforce semantics are documented per surface. Completion: No unexplained access finding remains in the selected pilot surface family.

**Measures.** Development: Access classification coverage — Selected surfaces with traced guards and negative tests / selected surfaces; source: Route catalog, source matrix and focused tests. User/business: Correct access outcomes — Authorized successes plus correctly denied unauthorized attempts / all controlled scenario attempts; source: Synthetic persona/grant acceptance matrix; later consented support outcomes. Both baselines and numerical targets are unestablished. Metric owners and review windows are in the registry.

**Effort, confidence and tradeoff.** M for the pilot family; durable subscription provisioning is separate L work. High for mixed implementation; no new exploitable vulnerability is certified by this audit. Precise per-surface work is slower than enabling a global switch and avoids breaking legitimate legacy tenants.

### D05 — Workflow UX and Accessibility Engineering

**Why and for whom.** Canonical finance table contracts now exist, but completed-data behavior, loading/empty/denied states and bilingual task usability still need end-to-end proof. Frontend developers; accountants, cashiers and managers across desktop/tablet/mobile. Evidence: [E05](<E:/ohada saas/Focused projects/stoquify/what-next/evidence/finance-x1/local-simulation/LOCAL-X1-20260901144339/manifest.local-simulation.json>), [E06](<E:/ohada saas/Focused projects/stoquify/what-next/evidence/finance-x1/local-simulation/LOCAL-X1-20260901144339/screenshots/desktop/en/receivables-history.png>), [E07](<E:/ohada saas/Focused projects/stoquify/tests/e2e/finance-x1-local-authenticated-evidence.spec.ts>), [E08](<E:/ohada saas/Focused projects/stoquify/tests/e2e/finance-x1-authenticated-evidence.spec.ts>), [E39](<E:/ohada saas/Focused projects/stoquify/what-next/analytics-network-program/SURFACE_OWNERSHIP_AND_DUPLICATION_MAP.md>), [E40](<E:/ohada saas/Focused projects/stoquify/components/DataTableComponents/finance-x1-evidence-binding.ts>), [E43](<E:/ohada saas/Focused projects/stoquify/actions/accounting/finance-statement-export.actions.ts>), [E45](<E:/ohada saas/Focused projects/stoquify/hooks/payments/usePaymentReconciliationWorkbench.ts>).

**Value.** Consistent finance tables with usable filters, evidence drill-through, safe exports and clear recovery in English and French. **Why this place:** It converts existing financial functionality into a usable daily product without adding backend feature count.

**Reuse and ownership.** COMPOSE: [frontend-developer](<C:/Users/J COMPUTER/.codex/agents/frontend-developer.toml>); [aqstoqflow-uiux-06-module-normalization](<C:/Users/J COMPUTER/.codex/skills/aqstoqflow-uiux-06-module-normalization/SKILL.md>); [aqstoqflow-uiux-09-accessibility-visual-regression-governance](<C:/Users/J COMPUTER/.codex/skills/aqstoqflow-uiux-09-accessibility-visual-regression-governance/SKILL.md>); [nextjs-service-layer-workflow](<C:/Users/J COMPUTER/.codex/skills/nextjs-service-layer-workflow/SKILL.md>). Implement one user workflow using existing shared components and server contracts; provide keyboard, focus, responsive, localization and complete state behavior. Do not rewrite domain services to fit a table, duplicate source metrics, or equate an axe pass with complete accessibility.

**Trigger and handoff.** A surface is normalized, a workflow-state defect is reported, or a canonical component contract changes. Inputs: D02 acceptance scenarios; Existing canonical table/state contracts; Server-owned read model and permissions; Approved wording and task expectations. Outputs: Scoped UI change; State/interaction matrix and browser evidence; EN/FR keyboard and responsive findings. Receives: D02 independent verifier and Product/UX owner.

**Prerequisites and first slice.** D01 WIP assignment. D02 establishes what successful data loading and task completion mean. Use the existing fixture/evidence boundary; do not reseed by default. Resolve the selected receivables-history loading/data-ready journey once reproduced, then prove filter, evidence-link and export states; reuse the X1 family rather than expanding to X2-X4.

**Verification.** Loading, valid empty, denied, error and populated states are distinct. Keyboard/focus/zoom and EN/FR task flows are inspected. Known data and permissions agree with service outputs. Timing claims use data-ready measurements and approved test conditions. Completion: The selected finance user task is independently accepted in its bounded persona/locale/device matrix.

**Measures.** Development: Shared interaction reuse — In-scope surfaces using the canonical state/filter/export contracts / in-scope surfaces; source: Component registry and scoped source audit. User/business: Time to complete finance task — Median elapsed time from authorized task start to correct evidence/export outcome, separated by locale/device; source: Task-based browser/user sessions; baseline to collect. Both baselines and numerical targets are unestablished. Metric owners and review windows are in the registry.

**Effort, confidence and tradeoff.** M. High for current UI/evidence need; user productivity gain is unmeasured. One complete workflow yields less apparent surface coverage than a mass visual rewrite.

### D06 — Migration and First-Value Onboarding Engineering

**Why and for whom.** Local replay and bounded customer/supplier/item import exist. Generic migration/onboarding claims can blur database schema replay, demo fixtures and customer financial-history migration. Database/onboarding engineers and implementation staff; new tenant administrators. Evidence: [E09](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma>), [E13](<E:/ohada saas/Focused projects/stoquify/services/onboarding/master-data-import.service.ts>), [E14](<E:/ohada saas/Focused projects/stoquify/actions/onboarding/master-data-onboarding.actions.ts>), [E31](<E:/ohada saas/Focused projects/stoquify/package.json>), [E32](<E:/ohada saas/Focused projects/stoquify/what-next/migrations/isolated-next-level-fresh-replay-20260830.md>), [E34](<E:/ohada saas/Focused projects/stoquify/what-next/master-data-onboarding-release-readiness.md>), [E47](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/data-onboarding/page.tsx>), [E54](<E:/ohada saas/Focused projects/stoquify/what-next/migrations/isolated-next-level-blocker-register-20260830.md>).

**Value.** A new organization can import validated master data and reach a first trusted operating workflow with a reproducible environment. **Why this place:** It turns the substantial local fixture/import investment into repeatable customer activation.

**Reuse and ownership.** COMPOSE: [database-optimizer](<C:/Users/J COMPUTER/.codex/agents/database-optimizer.toml>); [aqstoqflow-uiux-08-onboarding-demo-workspace](<C:/Users/J COMPUTER/.codex/skills/aqstoqflow-uiux-08-onboarding-demo-workspace/SKILL.md>); [stoquify-customer-success-adoption-agent](<C:/Users/J COMPUTER/.codex/agents/stoquify-customer-success-adoption-agent.toml>). Keep schema history, fixtures and customer imports as separate contracts; verify target identity, staged import, approval digest, idempotent commit and truthful progress. The Customer Success definition contributes outcome vocabulary, not active authority. Exclude historical balances/stock/ledger migration from the existing master-data workflow. Do not run the broad enterprise-db-seed instructions wholesale.

**Trigger and handoff.** Environment preparation, onboarding failure, new supported import type or migration-history discrepancy. Inputs: Exact approved environment/target identity; Migration history and drift classification; Existing master-data import contract; Fixture/import source and persona scope. Outputs: Reproducible target/fixture evidence; One-source import acceptance and first-value journey; Explicit unsupported-data list and retry/compensation instructions. Receives: Onboarding/domain owner; DB/operator for authorized execution; D02 for workflow acceptance.

**Prerequisites and first slice.** D01 scope and current target evidence. D04 target read/write permissions. Explicit database/import authority before any write; analysis and dry-run remain available. Reuse the existing isolated baseline and master-data pipeline to specify one customer CSV import through review/approval/commit to one read-only verified record and adoption event; rerun only stale relevant checks.

**Verification.** Import totals/duplicates/errors reconcile to source rows. High-risk uploader cannot self-approve and commit rechecks the digest. Retry creates no duplicate authoritative records. No financial balances or opening stock sneak into master-data import. Completion: One bounded first-value journey is repeatable with source-to-record evidence and clearly stated data exclusions.

**Measures.** Development: Environment reproduction success — Successful authorized reproductions / attempts for the same declared target recipe; source: Existing replay/fixture reports and command receipts. User/business: Time to first trusted value — Elapsed time from onboarding start to first independently evidenced permitted workflow outcome; source: Import batch timestamps plus proposed first-value outcome event. Both baselines and numerical targets are unestablished. Metric owners and review windows are in the registry.

**Effort, confidence and tradeoff.** M for one source/outcome; financial-history migration remains separate L work. High for existing substrate and separation need; medium for commercial impact. Master-data onboarding delivers narrower value than a universal migration promise, with much stronger traceability.

### D07 — Financial Event Integrity Engineering

**Why and for whom.** POS, purchasing/AP, payroll, inventory and close share money/event invariants. New features can be locally correct while breaking source links, reversal, replay or close invalidation across domains. Backend/domain developers; finance controllers and operators relying on consistent records. Evidence: [E09](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma>), [E19](<E:/ohada saas/Focused projects/stoquify/services/accounting/posting.service.ts>), [E20](<E:/ohada saas/Focused projects/stoquify/services/events/business-event.service.ts>), [E21](<E:/ohada saas/Focused projects/stoquify/services/events/business-event-outbox.service.ts>), [E23](<E:/ohada saas/Focused projects/stoquify/services/purchase-order/supplier-po-acknowledgement.service.ts>), [E24](<E:/ohada saas/Focused projects/stoquify/services/pos/offline-sync.service.ts>), [E25](<E:/ohada saas/Focused projects/stoquify/services/payroll/payment-evidence.service.ts>).

**Value.** A sale, refund, receipt or payroll event has consistent source, stock/cash, journal, audit and close effects. **Why this place:** Protects the financial trust that differentiates every planned product feature.

**Reuse and ownership.** COMPOSE: [backend-architect](<C:/Users/J COMPUTER/.codex/agents/backend-architect.toml>); [ledger-first-business-events](<C:/Users/J COMPUTER/.codex/skills/ledger-first-business-events/SKILL.md>); [nextjs-service-layer-workflow](<C:/Users/J COMPUTER/.codex/skills/nextjs-service-layer-workflow/SKILL.md>); [aqstoqflow-entity-workflow-verifier](<C:/Users/J COMPUTER/.codex/skills/aqstoqflow-entity-workflow-verifier/SKILL.md>). Supply and implement a bounded event/transaction contract across existing source owners, including idempotency, money precision, reversal and post-commit delivery. Preserve domain services. Do not invent one universal posting recipe, change country rules or let an LLM perform financial approvals.

**Trigger and handoff.** A change affects money, stock, payments, payroll, posting, reversal or close evidence. Inputs: One event/workflow boundary; Canonical domain writers and transaction seams; Country configuration provenance where relevant; Known failure/replay cases. Outputs: Cross-domain invariant contract; Scoped implementation and failure-path tests; Source-to-ledger/close evidence handoff. Receives: Domain engineer for implementation; independent finance/QA reviewer for evidence.

**Prerequisites and first slice.** D01 ownership; D02 acceptance method. Use existing qualified domain rules; expert review for changed statutory behavior. Trace one existing POS refund or AP correction through source/event/journal/close invalidation and add only the missing cross-boundary replay/failure assertions found by that trace.

**Verification.** Same-key replay has one economic effect; conflicting payload fails with evidence. Rollback preserves transactional consistency. Reversal adds traceable correction rather than rewriting finalized truth. Post-commit delivery failure does not silently change the accepted financial outcome. Completion: The selected event's invariants are demonstrated across its actual service boundaries, with any external evidence requirement explicitly separate.

**Measures.** Development: Cross-domain regression escape — Accepted financial slices later reopened for invariant failure / accepted financial slices; source: Linked event acceptance and defect records. User/business: Unexplained control variance — Unexplained source-to-ledger or stock/cash variances per selected reconciliation period; source: Authoritative reconciliation and close findings; no arbitrary aggregation. Both baselines and numerical targets are unestablished. Metric owners and review windows are in the registry.

**Effort, confidence and tradeoff.** M per event family. High for architectural need; current completeness varies by event. Requires domain-specific reviews; avoids a broad event-platform rewrite.

### D08 — Agent Behavioral Evaluation and Runtime Qualification

**Why and for whom.** The 999-case catalog is entirely NOT_TESTED and the existing harness intentionally prioritizes without executing behavior. Agent definitions and runtime records do not establish production qualification. AI/runtime engineers and independent platform assurance; future copilot users. Evidence: [E26](<E:/ohada saas/Focused projects/stoquify/services/agents/command-agent.service.ts>), [E27](<E:/ohada saas/Focused projects/stoquify/services/agents/agent-runner.service.ts>), [E28](<E:/ohada saas/Focused projects/stoquify/scripts/top12-evaluation-harness.js>), [E29](<E:/ohada saas/Focused projects/stoquify/docs/copilot/stoquify-agent-skill-definition-suite/evaluations/evaluation-catalog.json>), [E33](<E:/ohada saas/Focused projects/stoquify/what-next/enterprise-release-blocker-status.md>), [E44](<E:/ohada saas/Focused projects/stoquify/services/agents/agent-metrics.service.ts>), [E51](<E:/ohada saas/Focused projects/stoquify/scripts/__tests__/top12-evaluation-harness.test.js>).

**Value.** A role-specific daily brief can make supported statements, refuse unsupported requests and expose current evidence without unauthorized effects. **Why this place:** It is the right investment before introducing collections or advisor agents and reuses the existing catalog.

**Reuse and ownership.** EXTEND: [016-aqstoqflow-ai-copilot-guardrails](<C:/Users/J COMPUTER/.codex/skills/016-aqstoqflow-ai-copilot-guardrails/SKILL.md>); [stoquify-platform-assurance-agent](<C:/Users/J COMPUTER/.codex/agents/stoquify-platform-assurance-agent.toml>); [stoquify-release-evidence-ratchet](<C:/Users/J COMPUTER/.codex/skills/stoquify-release-evidence-ratchet/SKILL.md>). Extend the current evaluator with scoped adapters, expected/observed records, policy/abstention checks and evidence/cost/latency accounting. Keep development evaluation distinct from the product Platform Assurance runtime. Evaluation cannot self-approve activation or treat absent model/provider use as measured zero production cost.

**Trigger and handoff.** Change to prompt, model, tool, policy, registry, evidence contract or candidate runtime. Inputs: Current catalog and risk selection; One callable capability contract; Synthetic authorized fixtures and prohibited-action list; Version/hash identities and scoped cost policy if a model is used. Outputs: Observed case results with evidence; Explicit unsupported/unmapped/blocked cases; Independent qualification handoff. Receives: Runtime implementation owner for failures; independent assurance and human release authority for activation decisions.

**Prerequisites and first slice.** D01 scope; D02 evidence method; D04 access contract. Provider-free deterministic adapter first; separate environment/model permissions when later needed. Map the existing role-daily-brief capability's applicable cases to the deterministic Command Agent seam. Execute a small representative set, including stale evidence and denial, before expanding to the risk-ranked 150. Leave unmapped cases NOT_TESTED/BLOCKED.

**Verification.** PASS requires an observed result and evidence, not catalog validation. Prohibited tool calls and unauthorized disclosures fail the run. Failure, stale input and abstention behavior are exercised. Run records bind versions and test scope; no Phase 2B/3 promotion is inferred. Completion: One capability has reproducible observed behavioral evidence and an honest coverage denominator.

**Measures.** Development: Behavioral coverage — Catalog cases with valid observed results / applicable cases, with unmapped count reported separately; source: Extended existing evaluation output. User/business: Supported brief acceptance — Reviewed briefs whose material claims are evidence-supported and useful / reviewed eligible briefs; source: Proposed reviewer rubric plus AgentFeedback and evidence links. Both baselines and numerical targets are unestablished. Metric owners and review windows are in the registry.

**Effort, confidence and tradeoff.** M for one deterministic adapter; L for portfolio expansion. High for the evaluation gap; model-based user value remains unvalidated. This remains mandatory before product-agent expansion but does not need to block unrelated deterministic engineering.

### D09 — Connector and Offline Reliability Engineering

**Why and for whom.** Connector health and offline replay primitives exist, while supplier invitations still lack delivery outbox messages and production provider/operations evidence remains external. Integration/backend/SRE developers; cashiers, finance teams and invited counterparties. Evidence: [E20](<E:/ohada saas/Focused projects/stoquify/services/events/business-event.service.ts>), [E21](<E:/ohada saas/Focused projects/stoquify/services/events/business-event-outbox.service.ts>), [E23](<E:/ohada saas/Focused projects/stoquify/services/purchase-order/supplier-po-acknowledgement.service.ts>), [E24](<E:/ohada saas/Focused projects/stoquify/services/pos/offline-sync.service.ts>), [E30](<E:/ohada saas/Focused projects/stoquify/services/agents/portfolio/connector-health.service.ts>), [E33](<E:/ohada saas/Focused projects/stoquify/what-next/enterprise-release-blocker-status.md>), [E35](<E:/ohada saas/Focused projects/stoquify/what-next/STOQUIFY_ANALYTICS_NETWORK_PHASES_0_TO_3_EXECUTION_ROADMAP_2026-08-30.md>), [E42](<E:/ohada saas/Focused projects/stoquify/what-next/evidence/finance-x1/X1_APPROVAL_AUTOMATION_READINESS_2026-08-31.md>).

**Value.** Late, duplicated or unavailable provider/device inputs become visible, recoverable states; later supplier participation avoids re-keying without mutating buyer truth. **Why this place:** It supports real operating conditions and controlled-network participation once internal foundations are ready.

**Reuse and ownership.** COMPOSE: [backend-architect](<C:/Users/J COMPUTER/.codex/agents/backend-architect.toml>); [aqstoqflow-provider-health-recon-ops](<C:/Users/J COMPUTER/.codex/skills/aqstoqflow-provider-health-recon-ops/SKILL.md>); [014-aqstoqflow-offline-pos-sync-architect-builder](<C:/Users/J COMPUTER/.codex/skills/014-aqstoqflow-offline-pos-sync-architect-builder/SKILL.md>). Test one boundary at a time for freshness, signature, tenant scope, duplicate/reorder, retry budgets, dead-letter, reconciliation and recovery evidence. Provider integrations and device replay share failure techniques, not one domain writer. Do not activate callbacks, send invitations or assign final fiscal numbers without the applicable separate authority.

**Trigger and handoff.** A connector/device/provider path is introduced or reports stale, missing, duplicate or failed events. Inputs: One provider/file/device contract; Health/readiness model; Outbox/inbox and domain ownership; Synthetic failure scenarios and operator escalation contract. Outputs: Boundary contract and replay/failure fixtures; Truthful health/readiness behavior; Recovery runbook with owner and last accepted evidence. Receives: Integration/SRE owner; domain owner for authoritative correction; D02 for evidence review.

**Prerequisites and first slice.** D01 scope, D04 access and D07 relevant event invariant. Live provider, scheduler, alert, consent and support owners before external activation. Choose one existing payment-file or offline replay path and prove duplicate, stale and retry/dead-letter behavior with fixtures. Treat supplier invitation delivery as a later explicitly assigned P0/P2 dependency.

**Verification.** Duplicate/reordered input does not duplicate economic effects. Stale or unverifiable evidence changes reliance state. Retry and dead-letter transitions are observable and bounded. Operator recovery preserves evidence and source authority. Completion: One selected integration boundary has demonstrated failure/recovery behavior and a clear activation prerequisite list.

**Measures.** Development: Integration failure reproducibility — Reported boundary failures reproducible from retained redacted fixtures / reported boundary failures; source: Existing run IDs, safe fixtures and incident records. User/business: Exception resolution time — Median time from a source-backed stale/failed input incident to verified resolution; source: Connector/outbox/assurance timestamps, where complete. Both baselines and numerical targets are unestablished. Metric owners and review windows are in the registry.

**Effort, confidence and tradeoff.** M for one fixture-backed boundary; L with an external provider. High for existing foundations and gaps; external delivery timing/cost unknown. External dependencies make calendar estimates unreliable; keep local contract work separate from activation.


## 6. Disposition of the August 20 shortlist

The older roadmap remains a useful product-agent strategy reference. This report updates the development-tooling emphasis and evidence, without overriding any release authority. [E01](<E:/ohada saas/Focused projects/stoquify/what-next/agents-skills/STOQUIFY_HIGH_LEVERAGE_AGENT_SKILL_GAP_AND_PRIORITY_ROADMAP_2026-08-20.md>)

| Prior item | Decision | Development owners | Reason |
|---|---|---|---|
| HC-01 | REVISE | D02, D08 | Separate ordinary development acceptance from product-agent behavioral qualification; retain runtime qualification before product-agent activation without making it a prerequisite for unrelated deterministic work. |
| HC-02 | RETAIN AND NARROW | D06, D05 | Reuse working bounded master-data import and isolated replay. Do not treat these as general financial-history migration. |
| HC-03 | RETAIN | D09 | Reuse connector health and provider/offline primitives; keep external activation separate. |
| HC-04 | RETAIN AND PRIORITIZE | D01 | Existing coordinator plus evidence discipline addresses stale scope/status; no new orchestrator or competing register. |
| HC-05 | DEFER | D06 | Document extraction is a later input adapter after one structured-source import proves value; no new OCR/product agent now. |
| HC-06 | DEFER | D03, D08, D09 | Collections is a future product outcome requiring qualified runtime, AR source truth, consent, delivery and human control. |
| HC-07 | REVISE | D03, D04, D05 | Prioritize the existing consent-bound Accountant Portfolio workflow. A specialist advisor agent is not required for the first deterministic advisory read model. |

Do not add a generic orchestrator, second evaluation catalog, general agent framework or open marketplace. A billing-specialist lane is deferred behind known entitlement truth; document intake behind a proven structured-source import; collections/advisor agents behind behavioral qualification and their data/consent/delivery dependencies.

## 7. Product innovations and validation

These are product hypotheses, not promised returns. No current user-interview or outcome baseline was available.

| Opportunity | Smallest useful product outcome | Existing foundation | Validate before expansion |
|---|---|---|---|
| Organization-correct operating pulse | An owner sees the right day's facts in the organization's currency and timezone | Analytical context + Business Pulse; D03/D04/D05 | Boundary fixtures and source-to-display comparison, then observed owner review |
| Source-linked cash outlook | A finance user can explain an upcoming deficit and open its source obligations | Cash Command snapshots + P0 metric ownership; D03/D07 | Coverage/unknown-state tests, deterministic baseline, actual-versus-projected reconciliation |
| Reconciliation exception explanation | An accountant sees exposure age/root cause and reaches the existing resolution workflow | Reconciliation workbench, evidence and health; D03/D09 | Compare classification to known cases; measure resolution time without calling exposure loss |
| Accountant triage | An advisor sees only active-consent clients and their permitted next action | Existing grants/portfolio; D03/D04/D05 | Expired/revoked grant denial and observed review tasks; no mixed-currency firm total |
| First trusted value | An admin imports one clean customer/supplier/item file and verifies the resulting records | Master-data import + isolated fixture; D06/D05 | Exact source-to-row accounting, safe retries and time to a verified first workflow |
| Recoverable unreliable connectivity | A cashier or finance operator can identify a quarantined/stale input and follow a safe recovery path | Offline replay, outbox and connector health; D07/D09 | Duplicate/reorder/outage scenarios and measured incident resolution |
| Document-assisted onboarding, later | A user reviews extracted fields against the original document before a supported import | Existing staged import/evidence; D06 then D08 if model-based | Extraction correction rate, malicious-document cases and bounded cost before new agent design |

## 8. Review perspectives and tradeoffs

All perspectives below were applied as review lenses by this audit. They are not independent reviewer sign-offs.

| Perspective | Finding / portfolio consequence |
|---|---|
| Platform architecture | Reuse canonical routes and domain owners; D01 prevents parallel ownership registers. |
| Backend/integration | Shared event and transaction seams need cross-boundary acceptance; D07/D09. |
| Database/migrations | Local replay is ahead of the August 28 report; D06 preserves target/drift scope. |
| App security/IAM/privacy/abuse | Trace guards and purpose/grant state, not scanner totals; D04. |
| Frontend/design system | Canonical contracts exist; validate populated and recovery states before more surface work; D05. |
| Workflow UX/accessibility/localization | A loading screenshot is not completed task evidence; EN/FR and assistive interactions remain scoped verification; D02/D05. |
| Product/business process | Daily task completion and first value outweigh another agent catalog; D03/D06. |
| Quality/release | Separate contract, local capture and approved evidence; D02. |
| SRE/DevSecOps/performance/cost | Current timing includes capture overhead; operational authorities/providers remain external; D02/D09. |
| SaaS packaging/adoption | Durable commercial entitlements are not inferred from requested modules; measure actual first value; D04/D06. |
| Finance/treasury/fraud/internal controls | Exposure, loss, expected cash and settled cash need distinct semantics; D03/D07. |
| OHADA/statutory/country packs | Provenance and source hashes do not establish legal approval; no new statutory rule was proposed. |
| Audit/evidence/records | Hash identity and human authority are separate; D01/D02. |
| POS/inventory/offline | Preserve server authority and replay/quarantine invariants; D07/D09. |
| Purchasing/AP | Supplier replies remain proposals; missing invitation delivery is owned separately; D07/D09. |
| HR/payroll/privacy | Preserve request/approve/apply separation and reviewed rules; D07. |
| Payments/provider settlement | Connector health and suspense remain evidence-driven; D03/D09. |
| Accounting/close/advisor | Keep source links, correction history, close invalidation and client grants; D04/D07. |
| Analytics/BI/experimentation | Baseline metrics before committing targets; D03. |
| AI/model risk/human approval | Execute observed cases before product-agent expansion; D08. |
| API/webhook/outbox/import/export | Deterministic validation/execution and separate external delivery; D06/D09. |
| Training/support/operational readiness | Explain recoverable next actions and assign support owners; D01/D05/D09. |

A product lens could put onboarding first; the development lens puts reliable coordination/acceptance first because the current active work is already partly implemented. AI specialists could put runtime qualification first; it remains first for agent activation, but the existing deterministic product work can proceed independently. A UX lens could expand all tables immediately; one verifiable task is a better next slice than another broad normalization pass.

## 9. Operating model and next actions

Use the existing program orchestrator and register. Keep at most two major work packages active; contributors to one accepted package do not automatically become new packages. D01 records ownership; D02 reviews independently of its implementation author; D03–D09 contribute only when their boundaries are touched. A human remains the release/regulated decision owner.

1. Reconcile the existing P0 closure packet, including exact scope of newer local evidence and historical typecheck results.
2. Assign the AR-history readiness-capture fix when capacity is available or explicitly reprioritized, keeping source UI work with D05 if reproduction finds a UI defect.
3. After P0-02/P0-03 acceptance, prepare P0-04 metric contracts with D03 and P0-06 access closure with D04 as the permitted two lanes.

The playbook supplies the complete state flow, ownership rules, top-three briefs and executable prompts. This report's registry is a recommendation catalog; it is not a new live project-status authority.

### Human and engineering dependencies

| Dependency | Owner | Useful engineering work before external input |
|---|---|---|
| P0 semantic/surface acceptance | Product/UX/Finance/Payments/Accounting/Purchasing/Data owners | Prepare exact decisions, source evidence and unresolved differences |
| Current typecheck disposition | Current file owners + coordinator | Rerun once for the accepted candidate; scope any actual remaining fixes |
| X1 traceable decisions and approved capture scope | Product and security/control approvers | Fix readiness assertions and prepare the evidence packet; keep local classification |
| Provider, scheduler, alert, secret references and support | Named integration/SRE/operations owners | Implement bounded fixture/recovery contracts and document required non-secret inputs |
| Statutory/country behavior | Qualified reviewer and accountable checker | Bind current source/configuration versions and isolate unsupported behavior |

## 10. Verification and limits

| Check | Result | What it establishes |
|---|---|---|
| Repository, source, graph and asset inspection | Complete for stated sample | Current ownership/seams and evidence gaps; not all-system correctness |
| Selected Jest suites | PASS — 3 suites, 19 tests | Analytical-context/evidence-binding contracts and prioritization-helper behavior |
| Local X1 artifact files | PASS — 42 present, 42 SHA-256 matches | File integrity for the existing manifest |
| Local X1 visual sample | Finding recorded | AR history is visibly still loading in the inspected capture |
| Evaluation catalog | 999 NOT_TESTED | Catalog state only; no claim that all other runtime tests are absent |
| Whole-repository typecheck/build/release gates | Not run | Historical errors and gates remain historical/unknown for the current tree |
| Live browser/accessibility/database/provider/model work | Not run | No new runtime, production, statutory or accessibility claim |
| Recommendation/JSON/links/DAG/source hashes | Validated with the companion artifacts | Package consistency and provenance, not implementation completion |

The command log records failed/no-match discovery probes as well as successful checks. Two guessed filenames were corrected by file discovery. Git status succeeded with warnings about a global ignore file. All existing application changes were preserved.

The relevant sources, inspected skill/agent paths, hashes, score arithmetic, dependencies, metrics and command results are in the [registry](<E:/ohada saas/Focused projects/stoquify/what-next/agents-skills/STOQUIFY_DEVELOPMENT_AGENT_SKILL_REGISTRY_2026-09-02.json>). No ROI, delivery calendar, staff allocation or performance SLA is asserted.

**Recommended starting capability: D01. Next milestone: accepted P0-02/P0-03 with truthful evidence and a current verification disposition, followed by the authorized P0-04/P0-06 lanes.**


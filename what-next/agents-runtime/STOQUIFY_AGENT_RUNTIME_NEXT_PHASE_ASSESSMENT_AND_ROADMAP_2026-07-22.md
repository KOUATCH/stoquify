# Stoquify Agent Runtime Next-Phase Assessment And Execution Roadmap

**Assessment date:** 2026-07-22  
**Selected review skill:** `017-aqstoqflow-enterprise-release-gate`  
**Scope:** Determine the next logical phases after the completed Phase 0 and Phase 1 foundation  
**Overall decision:** `APPROVED WITH REQUIRED FIXES` for Phase 2 engineering; user-facing model promotion remains blocked

## 1. Executive Decision

Stoquify should proceed to **Phase 2: Read-Only Command Agent**, with Daily Digest as the first integration surface. The immediate increment should not begin with a conversational chatbot or an autonomous model tool loop. It should begin with a deterministic, role-aware daily brief that exercises the complete runtime path through trusted context, entitlement-filtered tools, evidence binding, redaction, persistence, feedback, and the embedded UI.

The Phase 2 sequence should be:

1. **Phase 2A: Command Agent entry hardening and deterministic Daily Brief.**
2. **Phase 2B: Optional constrained model summarization**, enabled only after Phase 2A evaluation gates pass.
3. **Phase 3: Cash/Reconciliation Agent in read-and-draft mode.**
4. **Phase 4: Inventory/Replenishment Agent in read-and-draft mode.**
5. **Phase 5: Approval and explicitly classified low-risk actions.**
6. **Phase 6: Scaled observability, evaluation, administration, and cost control.**
7. **Phase 7: Controlled domain expansion.**

This keeps the original roadmap intact while correcting one sequencing weakness: basic evaluation, cost capture, redaction-safe operational metrics, and rollout controls are release requirements for Phase 2. They cannot all wait until Phase 6. Phase 6 should add vendor-grade tracing and fleet administration, not introduce the first visibility into model behavior.

## 2. Evidence Basis

### Verified Repository Facts

The assessment inspected:

- `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASED_EXECUTION_REFINED_PROMPT_2026-07-22.md`
- `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PRACTICAL_EXECUTION_PLAN_2026-07-22.md`
- `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_DESIGN_FREEZE_2026-07-22.md`
- `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_STRATEGIC_ROADMAP_REPORT_2026-07-21.md`
- `what-next/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_1_EXECUTION_REPORT_2026-07-22.md`
- `what-next/agents-runtime/STOQUIFY_AGENT_RUNTIME_POSTGRES_DEPLOYMENT_SMOKE_REPORT_2026-07-22.md`
- the runtime implementation under `services/agents`
- the agent governance models in `prisma/schema.prisma`
- current RBAC and module-entitlement services
- snapshot, signal, evidence, Daily Digest, payment, inventory, and stock-to-cash services
- the Daily Digest route and UI
- current package dependencies, release scripts, static gates, and focused tests
- `graphify-out/GRAPH_REPORT.md`

The graph is useful for its tenant-defence, RBAC, service-boundary, ledger-first, and error-handling clusters, but it predates the current agent runtime and newer command surfaces. Current source files are authoritative where the graph is stale. The specialized component, action, route, hook, and type graphs referenced in repository instructions are not currently present.

### Current External Technology Facts

- The Vercel AI SDK supports Zod or JSON-schema tool inputs, strict tool calling where providers support it, active-tool restriction, bounded multi-step execution, and token-usage reporting. Its telemetry can record prompts, outputs, tool arguments, and results, so input and output recording must remain disabled until Stoquify proves export-safe redaction. See [AI SDK tool calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling), [generateText](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text), and [telemetry](https://ai-sdk.dev/docs/ai-sdk-core/telemetry).
- MCP has an official TypeScript SDK for tools, resources, prompts, and server transports. Stoquify can keep internal contracts MCP-compatible without exposing a server in Phase 2. See the [MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/).
- Inngest provides durable TypeScript functions with persisted steps, retries, schedules, and idempotency controls. Trigger.dev provides durable tasks, retries, queues, and task-scoped idempotency. Neither is required for the synchronous Phase 2 Daily Brief. See [Inngest durable functions](https://www.inngest.com/docs/learn/inngest-functions), [Inngest retries](https://www.inngest.com/docs/guides/error-handling), and [Trigger.dev idempotency](https://trigger.dev/docs/idempotency).
- Langfuse supports LLM tracing, cost tracking, evaluations, and masking. Its normal trace model is intentionally rich in prompts and outputs, so Stoquify should not export traces until its masking policy and tests are release-ready. See [Langfuse observability](https://langfuse.com/docs/observability/overview) and [masking](https://langfuse.com/docs/observability/features/masking).

## 3. Current-State Assessment

| Dimension | Current state | Maturity | Consequence |
| --- | --- | --- | --- |
| Shared architecture | One TypeScript runtime under `services/agents`; domain services remain source of truth | Strong foundation | No additional agent framework is needed |
| Tenant and RBAC context | Trusted server context, known permissions, enforce-mode module decisions, wildcard cannot bypass entitlement | Strong foundation | Suitable for read-only adapter work |
| Tool governance | Eight static read-only definitions; prohibited patterns and business-write scans | Strong metadata, no real adapters | Phase 2 must implement executable adapters without widening authority |
| Evidence and freshness | Snapshot/proof binders preserve grade, hash, freshness, blockers, redactions, and availability | Strong foundation | A Daily Digest evidence adapter is still required |
| Redaction | Prompt and output helpers reuse Stoquify policy | Partial integration | The runner currently trusts adapters to invoke them correctly |
| Persistence | Nine governance models, 27 applied migrations, compound tenant/run constraints, PostgreSQL smoke test | Ready in controlled local PostgreSQL | Preview and production deployment are not yet approved |
| Runtime execution | Deterministic run, step, evidence, denial, and incident recording | Functional foundation | No real domain adapter, definition resolver, timeout recovery, or model gateway exists |
| Product UI | Daily Digest already exists with role workspaces, loading/error states, evidence-aware BI components | Excellent entry surface | No Agent Command Panel, feedback control, or run state is visible |
| Feedback and cost | Tables exist | Not wired | Phase 2 cannot measure usefulness or model cost yet |
| Observability | Governance rows exist; the generic logger has no configured production sink | Limited | Minimal local metrics and incident visibility must be added before pilot |
| Model runtime | No AI SDK, provider, secret, model policy, routing, or evaluation harness | Intentionally absent | Add only after deterministic vertical-slice proof |
| Durable execution | Existing domain workers exist, but no agent durable layer | Not needed for Phase 2A | Defer until scheduled/waiting workflows justify it |
| MCP | No MCP server or dependency | Correctly absent | Keep contracts compatible; do not expose a broad server |
| Operational rollout | Agent rollout enums exist, but no tenant pilot assignment or kill switch is wired | Missing | Internal pilot promotion is blocked until rollout control exists |

### Where This Places Stoquify

Stoquify is no longer at the idea or schema stage. It has a credible agent control plane, but not yet a user-facing agent product. The next milestone is not autonomy. It is proving that Stoquify can turn its connected operational evidence into a daily, role-specific, explainable brief without weakening its existing accounting, inventory, payment, payroll, and tenant controls.

If Phase 2 succeeds, Stoquify moves from dashboards that users must interpret independently to a trusted operating companion that identifies what matters, explains why, shows its evidence, and routes the user to the protected source workflow. That is the first product-level proof of the broader agent-runtime strategy.

## 4. Enterprise Release-Gate Decision

### Phase 0 And Phase 1 Foundation

**Decision: `APPROVED` for the controlled local foundation.**

- Architecture, tenant, RBAC, entitlement, evidence, redaction, and no-direct-write foundations are present.
- PostgreSQL persistence, cross-tenant rejection, correlation uniqueness, and cascade cleanup are proven.
- Agent gates, Prisma validation, type checking, and focused tests passed in the execution evidence.

This is not approval for production database promotion or model traffic.

### Phase 2 Engineering Start

**Decision: `APPROVED WITH REQUIRED FIXES`.**

Engineering may begin because no unresolved issue requires weakening an existing control. The required fixes below must be part of the Phase 2 slice rather than deferred.

### Phase 2 User-Facing Model Pilot

**Decision: `BLOCKED` until all Phase 2 pilot gates pass.**

The blockers are permission-aware field projection, enforced output redaction, rollout controls, model evaluation, budget/cost capture, feedback persistence, safe failure behavior, and browser-level UX verification.

### Gate Review

| Gate | Decision | Evidence or required fix |
| --- | --- | --- |
| Architecture and context | Pass | Canonical service and UI paths exist; no alternate business layer is needed |
| Tenant, RBAC, module control | Conditional | Tool visibility is sound, but field-level projection for broad snapshots is unresolved |
| Event and ledger integrity | Pass / not applicable | Phase 2 remains read-only and cannot post ledger or business events |
| Error and notification contract | Partial | `protect` provides typed safe errors; agent-specific timeout, budget, and duplicate-run behavior is not implemented |
| UX completeness | Blocked for pilot | Agent panel, trust notice, feedback, degraded state, and accessibility tests do not exist |
| Evidence and observability | Partial | Evidence is strong; feedback, cost, latency, unsafe-attempt, and stale-answer metrics are not wired |
| Verification | Partial | Phase 1 tests pass; Phase 2 adapters, output claims, browser flows, and evaluation corpus are absent |

## 5. Required Fixes Before A Model Sees Data

### High: Broad Snapshot Exposure

`TenantOperatingMetrics` includes sales revenue, cash collection, purchasing, payment reconciliation, inventory, close, payroll forecast, employee-balance exposure, and ledger/source-link information. The registry currently classifies `readTenantOperatingSnapshot` under `dashboard.read`.

The existing Daily Digest does not send that entire object to the browser. It builds small, permission-filtered role projections. A Phase 2 model must receive only an equivalent allowlisted projection. Passing the full tenant operating snapshot to a model with only `dashboard.read` would violate least privilege even if the final prose hid unauthorized fields.

**Required control:** introduce atomic permission-aware tools or one role-digest adapter that returns a fixed allowlisted schema assembled only from authorized source projections. Keep `readTenantOperatingSnapshot` unavailable to the model until this is proven.

### High: Redaction Is Available But Not Structurally Mandatory

`redactBeforeAgentPrompt` and `redactBeforeAgentOutput` exist, but `runDeterministicAgent` accepts an adapter-provided `safeSummary` and output without calling the redaction boundary itself. This was acceptable for a deterministic foundation, but a user-facing/model path cannot rely on developer discipline alone.

**Required control:** the executable adapter contract must return a validated safe DTO; the model gateway must accept only that DTO; the output validator must apply the output redaction boundary before persistence and rendering. Add canary secret, provider reference, bank detail, payroll, PII, and prompt-injection fixtures.

### High: No Pilot Control Plane

`AgentDefinition.rolloutMode` exists, but the runtime does not resolve an active definition or enforce per-tenant rollout. There is no kill switch, pilot tenant allowlist, or shadow/internal/general transition service.

**Required control:** add a fail-closed `agent-rollout.service.ts`. For the smallest internal increment, a typed server-only environment switch and pilot-organization allowlist are acceptable. Before a multi-tenant pilot, persist tenant rollout assignments with activation windows and an audit trail.

### Medium: Runtime Definitions Are Not Runtime Authority

Agent, skill, and tool definition rows exist, but normal execution neither loads them nor records a skill definition/version on a run. Static code is currently the real tool authority.

**Required control:** keep code as the security authority, use database definitions as governed rollout/version records, fail if an active definition does not match the expected code manifest, and persist the exact agent/skill version and prompt hash used by each run.

### Medium: Persistence Lifecycle Needs Phase 2 Hardening

The runner updates run and step records by generated identifiers and writes the lifecycle in several independent transactions. A process interruption can leave a run in `RUNNING`, and a duplicate correlation ID currently surfaces as a creation conflict rather than an idempotent receipt.

**Required control:** carry organization identity through run-store mutations where the schema permits, return an existing tenant/actor-scoped receipt for a repeated request key, define timeouts, and add an abandoned-run reconciler. Do not add a durable workflow dependency for this synchronous read-only path.

### Medium: Phase 1 Dependency Gate Must Evolve Deliberately

`agent-tool-registry-gate.js` rejects AI SDK, durable execution, MCP, and observability dependencies. This correctly protects Phase 1, but it will reject a legitimate Phase 2 AI dependency.

**Required control:** keep the current Phase 1 gate and add a Phase 2 dependency allowlist that permits only the selected SDK/provider packages. Continue rejecting LangChain, multiple orchestration frameworks, durable engines, broad MCP servers, and trace exporters in the Phase 2 slice.

### Medium: Feedback, Cost, Logging, And Evaluation Are Not Wired

`AgentFeedback` and `AgentCostLedger` are used only by the PostgreSQL smoke test. The logger defaults to a no-op sink. No golden evaluation corpus exists.

**Required control:** implement feedback persistence in Phase 2A; add latency, outcome, stale, denial, and redaction counters locally; add token and estimated-cost persistence in Phase 2B; create a deterministic evaluation corpus before enabling the model.

### Naming Boundary

The existing commercial module slug `commercial_agents` means sales-channel agents, not AI agents. The new runtime must not reuse that slug. The Command Agent should be governed by the source modules it reads and by its own agent definition/rollout policy.

## 6. Recommended Phase Sequence

### Phase 2A: Command Agent Entry Hardening And Deterministic Daily Brief

**Purpose and value:** deliver the first daily-use agent surface while proving the runtime end to end without model nondeterminism or external data transfer.

**Prerequisites:**

- recorded product and security approval of the Phase 0 design freeze;
- an approved role/permission/field/redaction matrix;
- a pilot organization and pilot roles;
- a kill switch and rollback owner.

**In scope:**

- active definition and rollout resolution;
- role-aware Daily Brief skill version 1;
- real read-only adapters with Zod input/output schemas;
- safe role projection instead of full-snapshot exposure;
- deterministic prioritization and explanation templates;
- run, step, evidence, feedback, and incident persistence;
- embedded Daily Digest command panel;
- trust notice, limitations, evidence drill-through, and feedback;
- local metrics and abandoned-run reconciliation;
- evaluation corpus and browser tests.

**Out of scope:**

- model provider;
- free-form chat;
- scheduled or background generation;
- action drafts;
- assignment, resolution, approval, mutation, posting, filing, or certification;
- MCP server;
- durable execution vendor;
- external trace export.

**Recommended tools:**

- `readRoleDailyDigest` as a new narrow adapter over permission-filtered digest projections;
- `readBusinessSignals` with per-signal permission filtering;
- `readActionQueue` with links only and no workflow mutation;
- `readProofTrail` only after subject-specific permission validation.

Keep the broad tenant, payment, inventory, and close snapshot definitions in the registry for later atomic use, but do not make unauthorized fields model-visible.

**RBAC and entitlement:** each adapter must declare its required permission and module. Subject drill-through must re-check the proof subject's permission. The panel route and server action must enforce module access rather than relying only on navigation visibility.

**Evidence and redaction:** every priority item must contain evidence IDs, source modules, source hash where available, evidence grade, generation time, freshness, blockers, redaction notices, limitations, and run ID. Unsupported or unavailable evidence yields an explicit limitation, never a confident claim.

**Observability:** store status, latency, tool keys, evidence count, redaction count, denial code, stale state, and feedback. Do not store raw tool payloads or full user input.

**Rollout:** `off -> shadow -> internal`. In shadow mode, generate and evaluate without showing the panel. Internal mode is limited to the pilot organization and named pilot roles.

**Acceptance criteria:**

- zero unauthorized tools or fields across the role/permission/entitlement matrix;
- every material output claim resolves to available evidence or an explicit no-evidence state;
- zero sensitive canary values in persisted summaries, logs, UI, and exported test artifacts;
- repeated request IDs return the same scoped run receipt;
- stale, partial, empty, blocked, and failed states render distinctly;
- direct-action requests are refused and create no business mutation;
- feedback persists under the same tenant and run;
- focused service, action, UI, tenant-rejection, RBAC-rejection, redaction, and browser tests pass;
- the panel can be disabled without database rollback.

**Complexity:** medium. **Risk:** medium until projection tests pass, then low for an internal read-only pilot.

### Phase 2B: Constrained Model Summarization Pilot

**Purpose and value:** improve explanation quality and permit narrow follow-up questions after deterministic retrieval and trust controls are proven.

**Prerequisites:** Phase 2A complete; approved provider/data-processing decision; model secret handling; evaluation corpus; tenant budget; latency and fallback policy.

**Architecture:** add one `AgentModelGateway` interface and one approved provider implementation. Use the Vercel AI SDK or equivalent TypeScript-native SDK. Use one provider and one approved model initially, with no model-to-model fallback. The fallback is the deterministic Phase 2A brief.

**Model boundaries:**

- receive only validated, redacted, authorized DTOs;
- structured response schema, not unconstrained prose;
- no web search, file access, code execution, or provider-defined tools;
- maximum three reasoning/tool steps if tool calling is later enabled;
- strict schema validation where supported;
- low-temperature, bounded output, short timeout, and at most one provider retry;
- evidence-reference validator rejects uncited claims;
- invalid, timed-out, over-budget, or unsafe output falls back to the deterministic brief.

The first model increment should summarize a fixed authorized evidence bundle. Letting the model select tools is a later Phase 2B increment after the same active-tool set is proven by tests.

**Cost and telemetry:** persist provider, model, input tokens, output tokens, estimated cost, latency, and budget bucket. Keep AI SDK telemetry disabled, or set `recordInputs: false` and `recordOutputs: false`. Do not export prompts, tool arguments, results, or responses.

**Evaluation:** use role, locale, entitlement, stale, missing, redacted, prompt-injection, and prohibited-action scenarios. Evaluate authorization, evidence citation, factual consistency, redaction, refusal, language quality, latency, and cost. Model-judge scores may supplement but never replace deterministic checks.

**Rollout:** `shadow -> internal -> pilot`. Promotion to pilot requires zero authorization/redaction/unsafe-action failures, product-approved French and English quality, and an agreed helpfulness/wrong-answer threshold over a meaningful internal sample.

**Complexity:** medium. **Risk:** medium because behavior becomes nondeterministic and data leaves the process boundary.

### Phase 3: Cash/Reconciliation Agent In Read-And-Draft Mode

**Purpose and value:** reduce time spent understanding duplicates, suspense, pending payments, reconciliation failures, and cash variance.

**Prerequisites:** Phase 2 pilot trust gates pass; payment owner approves provider-reference and suspense projection policy; `AgentActionDraft` contract is approved.

**Repository fit:** payment truth, reconciliation workbench, reconciliation services, evidence services, and focused tests already exist. This makes Phase 3 the most mature financial follow-on.

**Key complication:** the payment workbench exposes provider references and suspense details. The agent adapter must not pass the existing workbench DTO directly to the model. It needs a purpose-built redacted DTO and stricter permissions for drill-down.

**Changes:** payment read adapters, reconciliation explanation skill, draft suggestion schema/service, evidence-bound draft card, finance reconciliation integration, draft acceptance/rejection feedback, and duplicate/suspense evaluation corpus.

**Permanent limits:** no provider mutation, cash adjustment, suspense posting, manual match approval, ledger posting, sign-off, or reconciliation certification.

**Acceptance:** drafts carry source evidence, permission, risk, payload hash, expiry, and non-executing status; direct execution remains structurally impossible; payment cash-truth and ledger gates pass.

**Complexity:** high. **Risk:** high due to financial data and user expectation of execution.

### Phase 4: Inventory/Replenishment Agent In Read-And-Draft Mode

**Purpose and value:** explain negative stock, zero stock, stockout exposure, dead stock, movement anomalies, and replenishment options.

**Prerequisites:** Phase 2 trust gates pass; inventory and purchasing owners approve movement and supplier projections; Phase 3 draft contract is reusable or extracted as platform infrastructure.

**Repository fit:** inventory snapshots, stock-to-cash, movement history, reconciliation, valuation, transfer, count, adjustment, and purchasing services exist. Read adapters must stay physically separated from the many write-capable inventory services.

**Changes:** inventory risk adapters, supplier-context projection, replenishment skill, transfer/count-review draft types, inventory assistant panel, and inventory-specific evidence/evaluation tests.

**Permanent limits:** no adjustment, write-off, count approval, transfer execution, goods receipt, reservation mutation, purchase-order approval, or posting.

**Acceptance:** source movements and hashes support every recommendation; negative stock is never normalized away; supplier/payment-sensitive fields are redacted; inventory boundary and ledger gates pass.

**Complexity:** high. **Risk:** high because unsafe recommendations can disrupt replenishment and stock truth even without direct execution.

### Phase 5: Approval And Explicit Low-Risk Actions

**Purpose and value:** convert a small subset of proven drafts into controlled workflow execution.

**Prerequisites:** stable Phase 3/4 draft quality, explicit action classification, separation-of-duties design, fresh-auth policy, idempotency and replay-validation design, immutable audit evidence, and domain-owner approval.

**Changes:** `AgentActionDraft`, `AgentApproval`, payload and evidence hashes, expiry, approval timeline, execution receipts, protected domain-service gateway, idempotency conflict handling, and compensation/rollback tests.

**Durable execution choice:** provisionally select **Inngest**, not both Inngest and Trigger.dev, when approvals, waits, retries, or scheduled digests prove the need. Its event-driven durable steps align with Stoquify's business-event/outbox architecture. Record the final choice in an ADR after deployment, residency, pricing, and operational ownership review.

**Permanent limits:** direct Prisma business writes, ledger posting, statutory filing, payroll release, close certification, cash adjustment, stock write-off, and permission changes remain prohibited. If a future low-risk action has accounting, stock, payroll, or statutory impact, it must execute through the existing protected domain service and its own controls, never through a generic agent action executor.

**Complexity:** very high. **Risk:** critical. **Decision now:** defer.

### Phase 6: Scaled Observability, Evaluation, Cost, And Administration

**Purpose and value:** operate the agent fleet safely across tenants and providers.

**Pulled forward to Phase 2:** local run metrics, feedback, token/cost records, redaction counts, latency, incidents, and evaluation gates.

**Remaining Phase 6 scope:** admin run inspection, trust dashboards, prompt/skill comparison, tenant budgets, anomaly alerts, evaluator jobs, trace retention, incident workflows, and one external observability provider.

**Provider recommendation:** evaluate Langfuse first because it supports TypeScript/OpenTelemetry, costs, evaluations, environments, and masking. Start with no prompt/output export. Export only redacted identifiers and metrics until adversarial masking tests pass. Do not add Helicone simultaneously. Do not add LiteLLM until a real multi-provider routing, fallback, or budget requirement exists.

**Complexity:** high. **Risk:** high because traces can become a secondary sensitive-data store.

### Phase 7: Controlled Expansion

Recommended order:

1. Purchasing/AP read-and-draft assistance after inventory supplier context is proven.
2. Customer-success/adoption guidance using product telemetry only, isolated from financial authority.
3. Close and compliance explanation after accountant validation and Phase 6 trust monitoring.
4. Payroll readiness last, with person-level data excluded unless a separately approved purpose and permission exist.
5. POS cashier assistance limited to shift guidance, exception explanation, and source navigation; never sale, refund, void, till, or cash mutation.

Every expansion reuses the same runtime, rollout, definition, evidence, redaction, evaluation, cost, and incident services. No module receives its own agent framework.

## 7. Immediate Phase 2A Execution Plan

### Step 1: Freeze The Phase 2 Authorization Contract

Create a Phase 2 addendum that maps each role and tool to permissions, module entitlements, allowed fields, redaction categories, evidence source, and prohibited outputs.

Likely artifacts:

- `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2_COMMAND_AGENT_DESIGN_FREEZE_2026-07-22.md`
- `services/agents/command-agent-contracts.ts`
- focused manifest/gate tests

Do not code adapters until product and security approve the matrix.

### Step 2: Add Real Schemas And Safe Projections

Create Zod schemas for every executable adapter. Add a role-digest projection that returns only fields authorized for the resolved context. Do not expose the full `TenantOperatingMetrics` object.

Likely files:

- `services/agents/tools/command-tool-schemas.ts`
- `services/agents/tools/command-tool-adapters.ts`
- a narrow projection in `services/daily-habit/`
- adapter tests beside `services/agents/__tests__`

### Step 3: Harden Runtime Definition And Persistence

Resolve the active code-backed agent and skill manifest, enforce rollout mode, persist exact definition/skill version, make duplicate requests idempotent, and define timeout/abandoned-run handling.

Likely files:

- `services/agents/agent-definition.service.ts`
- `services/agents/agent-rollout.service.ts`
- `services/agents/agent-runner.service.ts`
- `prisma/schema.prisma` and an additive migration only if skill/run provenance or tenant rollout cannot be represented safely

### Step 4: Implement The Versioned Daily-Brief Skill

Build deterministic role-based ranking over authorized signals and action links. Return a structured trust envelope, not a prose-only string.

Likely files:

- `services/agents/skills/role-daily-brief.skill.ts`
- `services/agents/command-agent.service.ts`
- evaluation fixtures under `services/agents/__tests__/fixtures`

### Step 5: Enforce Redaction And Claim Validation

Apply redaction at adapter output, prompt boundary, persisted summary, and UI response. Validate every output item against evidence IDs and authorized fields.

Likely files:

- `services/agents/agent-redaction.service.ts`
- `services/agents/agent-output-validator.service.ts`
- redaction and evidence tests

### Step 6: Add The Protected Server Action

Use the existing `protect` contract, a server-generated trusted tenant, enforce-mode module gates, Zod input, safe correlation IDs, and stable typed failures.

Likely file:

- `actions/agents/command-agent.actions.ts`

The action accepts period and request ID, not organization ID from the browser. It exposes no generic tool name or arbitrary tool arguments.

### Step 7: Add Feedback And Minimum Trust Metrics

Persist helpful, wrong, stale, unsafe, accepted, and rejected feedback under the active tenant/run. Record duration, result, tool count, evidence count, redaction count, and denial code without raw content.

Likely files:

- `services/agents/agent-feedback.service.ts`
- `services/agents/agent-metrics.service.ts`
- `actions/agents/agent-feedback.actions.ts`

### Step 8: Embed The Command Panel In Daily Digest

Reuse `BIEvidenceBadgeRow`, `EvidenceGradeBadge`, and `ProofTrailDrawer`. Add a compact embedded panel, not a separate chatbot landing page.

Likely files:

- `components/agents/AgentCommandPanel.tsx`
- `components/agents/AgentTrustNotice.tsx`
- `components/agents/AgentFeedbackControls.tsx`
- `components/agents/AgentEvidenceDrawer.tsx`
- `components/daily-habit/DailyHabitDigestDashboard.tsx`

Required UI states: loading, empty, permission denied, entitlement denied, stale, partial, blocked, failed, retryable, redacted, and feature disabled. French and English copy, keyboard access, focus states, and responsive layout are release requirements.

### Step 9: Add Static, Service, Integration, And Browser Gates

Required coverage:

- role/permission/module tool visibility matrix;
- field-level projection and sensitive-canary rejection;
- same request ID idempotency;
- cross-tenant run/feedback rejection;
- stale/missing/blocked evidence behavior;
- direct action request refusal;
- output claim-to-evidence validation;
- safe typed errors and no raw exception text;
- panel state and accessibility tests;
- Playwright desktop/mobile Daily Digest flows;
- PostgreSQL runner integration with cleanup.

Required commands include:

```bash
npm run prisma:validate
npm run typecheck
npm run lint
npm run service:boundary:fail
npm run agent:runtime:gates
npm run workflow:assurance:runtime-check
npm run report:trust:export:gate
npm test -- --runInBand services/agents services/daily-habit
```

Run `npm run verify:repo` before promotion beyond internal pilot.

### Step 10: Shadow And Internal Rollout

Start disabled. Run shadow evaluations against test/pilot tenants without rendering output. Review incidents and evaluation results. Enable the panel only for the approved pilot organization and roles. Roll back by disabling the feature, not by deleting runtime records or applied migrations.

## 8. Agent And Skill Sequence

| Capability | Mode | Timing | Reason |
| --- | --- | --- | --- |
| Trusted Context Resolver | Deterministic | Existing, harden in 2A | Security fact, never model-owned |
| Permission and Entitlement Guard | Deterministic | Existing | Tool visibility must be pre-model |
| Safe Role Projection | Deterministic | First in 2A | Prevent broad snapshot exposure |
| Evidence Grounding | Deterministic | Existing, extend in 2A | Claims require source proof |
| Freshness Evaluation | Deterministic | Existing | Staleness is a rule, not an opinion |
| Redaction and Output Validation | Deterministic | Harden in 2A | Sensitive data cannot depend on model compliance |
| Role Daily Brief | Deterministic first, model-enhanced later | 2A then 2B | Establish a safe fallback and evaluation baseline |
| Command Agent | Read-only | Phase 2 | Highest cross-role daily value with low action risk |
| Exception Orchestration | Deterministic platform infrastructure | Expand during 2A/3 | Existing signals and incidents should feed one queue |
| Cash/Reconciliation Agent | Read-and-draft | Phase 3 | Mature evidence/read models, high finance value |
| Inventory/Replenishment Agent | Read-and-draft | Phase 4 | Strong services, but broader operational impact |
| Action Draft Builder | Deterministic validation plus model rationale | Phase 3/4 | Payload and evidence rules must be code-owned |
| Approval Router | Deterministic and human-controlled | Phase 5 | Authority cannot be delegated to the model |
| Action Orchestrator | Deterministic durable infrastructure | Phase 5 | Execute only protected approved domain commands |
| Trust Monitor | Deterministic metrics plus optional model evaluators | Baseline in 2, scale in 6 | Safety needs metrics from the first pilot |

Model reasoning is appropriate for explanation, concise summarization, question interpretation, and draft rationale. Deterministic code must own permissions, entitlement, retrieval, calculations, ranking thresholds, evidence, freshness, redaction, schema validation, budgets, idempotency, approval, and execution. Humans retain approval and all consequential financial, stock, payroll, compliance, close, and access-control authority.

## 9. Technology Decisions

| Concern | Decision | Timing |
| --- | --- | --- |
| Agent framework | Keep Stoquify runtime; do not add another framework | Permanent |
| Model SDK | Vercel AI SDK or equivalent behind `AgentModelGateway`; one provider package | Phase 2B only |
| Tool schemas | Zod schemas with fixed safe DTOs and active-tool filtering | Phase 2A |
| Model routing | One provider, one approved model, deterministic fallback; no cross-provider fallback | Phase 2B |
| Durable execution | No dependency for synchronous brief; provisional Inngest ADR for Phase 5 | Deferred |
| MCP | Compatible contracts only; no server or external tool exposure | Deferred |
| Observability | Stoquify DB metrics first; evaluate one Langfuse deployment later | Baseline Phase 2, vendor Phase 6 |
| Trace content | No raw prompts, outputs, tool arguments, provider values, or evidence export | Permanent default |
| LiteLLM | Do not adopt until multiple providers/budgets are operational requirements | Deferred |
| Helicone | Do not combine with Langfuse; proxy review needed before any adoption | Deferred |
| Idempotency | Tenant/actor/agent/request-scoped request ID plus existing correlation uniqueness | Phase 2A |
| Retries | Bounded reads and one model retry; deterministic fallback; no replayed business actions | Phase 2 |
| Rate/budget | Per-user and per-tenant run limits; model token and cost ceilings | 2A/2B |

## 10. Prioritized Decision Matrix

| Phase | User value | Leverage | Main prerequisite | Effort | Risk | Timing | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2A deterministic Command Agent | Very high | Very high | Projection and rollout contract | Medium | Medium | Now | `GO WITH REQUIRED FIXES` |
| 2B constrained model layer | High | High | 2A evaluation, provider and budget approval | Medium | Medium | After 2A | `CONDITIONAL GO` |
| 3 Cash/Reconciliation draft | Very high | High | Phase 2 trust plus payment redaction map | High | High | Next | `CONDITIONAL GO` |
| 4 Inventory/Replenishment draft | High | High | Draft platform plus movement/supplier map | High | High | After Phase 3 platform contract | `CONDITIONAL GO` |
| 5 low-risk actions | High | Very high | Proven drafts, approval, idempotency, fresh auth | Very high | Critical | Later | `DEFER` |
| 6 scaled observability/admin | High operational value | High | Redaction-safe export ADR | High | High | Baseline now, full later | `SPLIT` |
| 7 regulated expansion | Variable | High | Domain expert validation and prior trust evidence | Very high | Critical | Last | `DEFER` |

## 11. Decisions Requiring Confirmation

These are not discoverable from the repository and must be resolved before Phase 2B or broader pilot promotion:

1. Which organization is the internal pilot tenant?
2. Which named roles participate first: owner/manager only, or all five pilot roles?
3. Which model provider, region, retention policy, and data-processing terms are approved?
4. What per-tenant and per-run budget is acceptable?
5. What retention period applies to runs, evidence links, feedback, costs, and policy incidents?
6. Who owns product-quality review in French and English?
7. What internal sample size and helpful/wrong-answer thresholds authorize pilot expansion?
8. Is local controlled PostgreSQL sufficient for Phase 2 engineering, or is a dedicated preview environment required before UI integration?

Recommended default: begin Phase 2A for one pilot organization and owner/manager roles, with no model and the panel disabled by default.

## 12. Final Recommendation

The next logical phase is **Phase 2A: Read-Only Command Agent with a deterministic Daily Digest brief**.

It has the best value-to-risk ratio because Stoquify already has the Daily Digest, trusted snapshots, permission-filtered signals, evidence UI, runtime policy, and PostgreSQL governance needed for a complete vertical slice. It can demonstrate daily usefulness without external model traffic or business mutation.

The first execution increment should implement:

1. the Phase 2 authorization and projection matrix;
2. the fail-closed rollout service;
3. one narrow `readRoleDailyDigest` adapter;
4. the versioned deterministic daily-brief skill;
5. run/evidence/feedback persistence;
6. the embedded trust-aware command panel;
7. the complete role, redaction, evidence, and browser test gate.

Do not implement yet:

- free-form chat;
- model-selected broad tools;
- durable scheduling;
- MCP server exposure;
- external prompt/output tracing;
- action drafts outside the Phase 3 contract;
- approval or execution;
- direct database, ledger, statutory, payroll, stock, cash, close, or permission mutations.

**Entry gate:** product/security approval, role-field matrix, pilot tenant, kill switch, adapter schemas, and named tests.  
**Completion gate:** deterministic end-to-end brief, no unauthorized field exposure, evidence on every claim, redaction canaries clean, feedback persisted, all Phase 2A gates green, and internal rollout reversible.  
**Follow-on:** Phase 2B constrained model summarization, then Phase 3 Cash/Reconciliation Agent.

## 13. Next Recommended Numbered Skill

After this assessment, use `016-aqstoqflow-ai-copilot-guardrails` for the Phase 2A implementation slice, then apply `017-aqstoqflow-enterprise-release-gate` again before internal promotion.

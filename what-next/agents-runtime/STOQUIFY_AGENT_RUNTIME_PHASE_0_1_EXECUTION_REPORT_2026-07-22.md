# Stoquify Agent Runtime Phase 0 And Phase 1 Execution Report

Date: 2026-07-22  
Status: Phase 0 `complete`; Phase 1 implementation `complete`  
Next gate: controlled migration deployment and Phase 2 Command Agent authorization

## Executive Result

Stoquify now has an additive, deterministic agent-runtime foundation without a model provider, visible agent UI, durable-execution dependency, observability vendor, MCP server, or business action tool.

The runtime resolves trusted tenant and actor context, evaluates module entitlement in enforce mode, exposes only permission-authorized read tools, preserves evidence and freshness states, applies the existing redaction policy before prompt and output boundaries, records run and step governance, and blocks unsafe tool attempts with policy incidents.

No existing domain service or operational business table was replaced. No migration was deployed to a database during this run.

## Phase Status

| Phase | Status | Evidence |
| --- | --- | --- |
| Phase 0: Readiness and design freeze | complete | Design freeze records architecture boundary, risk taxonomy, pilot agents and roles, tool catalog, prohibited actions, dependency order, and stop conditions. |
| Phase 1: Shared runtime foundation | complete | Schema validates, TypeScript passes, lint has zero errors, service boundary passes, agent gates pass, and 16 focused tests pass. |

## Tickets Executed

| Ticket | Status | Result |
| --- | --- | --- |
| 0.1 Runtime boundary ADR | complete | One shared runtime under `services/agents`; no parallel module frameworks. |
| 0.2 Agent risk taxonomy | complete | Read-only, draft, low-risk, sensitive, and prohibited levels frozen. |
| 0.3 MVP tool list | complete | Eight static read-only tool definitions with owner, module, permission, evidence behavior, and risk. |
| 1.1 Runtime Prisma models | complete | Nine governance models, supporting enums, organization relations, and an isolated migration. |
| 1.2 Shared contracts | complete | Runtime, context, tool, evidence, freshness, invocation, and receipt contracts compile. |
| 1.3 Trusted context resolver | complete | Uses server-side RBAC, active organization settings, normalized period, and enforce-mode entitlement evaluation. |
| 1.4 Tool registry | complete | Unknown, prohibited, write-capable, unauthorized, and module-blocked tools fail closed. |
| 1.5 Evidence binder | complete | Snapshot and proof-trail evidence preserve grade, source hash, freshness, blockers, redactions, source module, and availability. |
| 1.6 Redaction wrapper | complete | Existing redaction policies are applied before prompt construction and again before output. |
| 1.7 Deterministic runner | complete | Context, tool, evidence, completion, failure, and policy-denial records work without model calls. |
| 1.8 Safety tests and gates | complete | Two static gates and six focused suites enforce the Phase 1 boundary. |

## Architecture Evidence Inspected

- `graphify-out/GRAPH_REPORT.md`
- `lib/security/rbac.ts`
- `lib/security/rbac-permissions.ts`
- `services/_shared/protect.ts`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-entitlement.service.ts`
- `services/security/redaction-policy.service.ts`
- `services/evidence/evidence-contracts.ts`
- `services/evidence/proof-trail.service.ts`
- `services/snapshots/snapshot-contracts.ts`
- tenant, payment, inventory, and close snapshot services
- `services/signals/action-queue.service.ts`
- `services/signals/business-signal.service.ts`
- `services/payments/payment-reconciliation-workbench.service.ts`
- workflow-assurance persistence service, tests, schema, and migration conventions
- current Prisma schema, package scripts, Jest configuration, and dirty-worktree state

The graph report's tenant-defence, server-action security, RBAC, service-boundary, and ledger-first clusters support the chosen composition model. The graph is older than the newest services, so current source files remained authoritative.

## Artifacts Created Or Modified

### Prompt and Phase 0

- `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASED_EXECUTION_REFINED_PROMPT_2026-07-22.md`
- `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASED_EXECUTION_REFINED_PROMPT_2026-07-22.pdf`
- `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_DESIGN_FREEZE_2026-07-22.md`

### Schema and migration

- `prisma/schema.prisma`
- `prisma/migrations/20260722143000_agent_runtime_phase_1_foundation/migration.sql`

Added models:

- `AgentDefinition`
- `AgentSkillDefinition`
- `AgentToolDefinition`
- `AgentRun`
- `AgentStep`
- `AgentEvidenceLink`
- `AgentFeedback`
- `AgentCostLedger`
- `AgentPolicyIncident`

The models use unique definition/tool keys, unique skill key and version, unique run correlation IDs, ordered run steps, tenant-first indexes, evidence subject indexes, and organization foreign keys where tenant-owned records are persisted.

### Runtime services and skills

- `services/agents/agent-contracts.ts`
- `services/agents/agent-context.service.ts`
- `services/agents/agent-policy.service.ts`
- `services/agents/agent-tool-registry.service.ts`
- `services/agents/agent-evidence.service.ts`
- `services/agents/agent-redaction.service.ts`
- `services/agents/agent-runner.service.ts`
- `services/agents/tools/command-tools.ts`
- `services/agents/skills/freshness-evaluator.skill.ts`

### Tests and gates

- six test files under `services/agents/__tests__/`
- `scripts/agent-tool-registry-gate.js`
- `scripts/agent-prohibited-action-gate.js`
- three focused commands added to `package.json`

## How The Runtime Works

1. `resolveAgentExecutionContext` obtains the authenticated RBAC context and active organization settings from trusted server services.
2. It evaluates every requested module using entitlement mode `enforce`; wildcard RBAC remains unable to bypass a blocked entitlement.
3. `AgentToolRegistry` validates static definitions at construction and exposes only read-only tools allowed by permission and entitlement.
4. Tool input is persisted only as a deterministic SHA-256 hash.
5. A domain adapter, introduced with its consuming agent, returns an already-redacted safe summary and evidence records.
6. Evidence records preserve source identity, hash, grade, freshness, availability, blockers, and redactions.
7. Tool output is persisted only as a deterministic SHA-256 hash plus a bounded safe summary.
8. Policy violations create a blocked policy step and an `AgentPolicyIncident`; the tool executor is never called.
9. Tool execution failures persist a generic safe failure code without raw exception text.
10. The run completes, fails, or blocks deterministically without an LLM.

## MVP Tool Registry

The registry contains only:

- `readTenantOperatingSnapshot`
- `readBusinessSignals`
- `readActionQueue`
- `readProofTrail`
- `readPaymentTruthSnapshot`
- `readPaymentReconciliationWorkbench`
- `readInventoryCashSnapshot`
- `readCloseReadinessSnapshot`

No mutation, draft, approval, posting, filing, certification, permission, or provider action is registered.

## Security And Trust Controls

- Tenant and actor must come from trusted RBAC context.
- Active organization settings must exist.
- Reporting periods are validated.
- Unknown permissions fail registry construction.
- Unknown tools fail authorization.
- Module entitlement is checked before tool exposure.
- RBAC wildcard cannot override entitlement.
- Tool type and risk must both be `read_only` in Phase 1.
- Prohibited action-name patterns fail closed.
- Redaction reuses Stoquify's existing field-category policies.
- Evidence unavailable, stale, partial, blocked, failed, and empty states remain explicit.
- Runtime persistence is limited to agent governance tables.
- Raw inputs and outputs are hashed, not persisted.
- Raw tool exceptions are not written into summaries.

## Verification Results

### Passed

`npm run prisma:validate`

- Passed.
- Prisma schema is valid.

`npm run prisma:generate`

- Passed.
- Prisma Client 6.19.3 generated with the new delegates.

`npm run typecheck`

- Passed across the repository.
- Exit code 0.

`npm run lint`

- Passed with zero errors.
- Four pre-existing warnings remain outside `services/agents`.

`npm run service:boundary:fail`

- Passed.
- Zero active service-boundary violations.

`npm run agent:runtime:gates`

- Passed.
- Static registry is read-only and dependency-neutral.
- No business-write path exists under `services/agents`.

`npm test -- --runInBand services/agents`

- Passed: 6 suites, 16 tests.
- Covered tenant fail-closed behavior, enforce-mode entitlement, permission filtering, wildcard denial, prohibited tools, evidence preservation, unavailable evidence, prompt/output redaction, stale evidence, deterministic hashing, run logging, and policy incidents.

`git diff --check -- package.json prisma/schema.prisma`

- No whitespace errors.
- Git reported only existing CRLF-to-LF normalization warnings for the two tracked files.

### Unrelated Existing Warnings

Lint warnings were not changed:

- three existing `@next/next/no-img-element` warnings
- one existing `import/no-anonymous-default-export` warning in `config/permissions.ts`

## Deliberate Deviations And Boundaries

The Phase 1 registry contains governed tool metadata, not direct domain adapters. This keeps Phase 1 deterministic and prevents unused service wrappers from becoming an accidental execution surface. Each adapter will be introduced with its consuming agent beginning with the Phase 2 Command Agent and must return redacted, evidence-bound output through this registry.

The migration file was created but not deployed. Running `prisma migrate deploy` in the current workspace could apply other pending user-owned migrations and mutate the configured database. Deployment must occur through the repository's normal reviewed migration flow.

No `AgentActionDraft` or `AgentApproval` model was added because the roadmap assigns them to Phases 3 and 5.

## Remaining Risks

- The new migration still needs deployment verification against a controlled PostgreSQL environment.
- The deterministic runner persistence path is covered with a mocked store, not a PostgreSQL integration test.
- Domain tool adapters must enforce subject-specific permissions in addition to registry-level permission checks.
- Safe summary producers must pass through the output redaction boundary before persistence.
- The current architecture graph predates this runtime and should be refreshed after Phase 2.

## Rollback

Phase 1 is additive. Before database deployment, rollback consists of removing the isolated migration, agent schema additions, `services/agents`, and the two agent gate scripts. After deployment, rollback must use a reviewed database migration because run and evidence records may exist.

## Phase 2 Readiness Decision

Phase 0 and Phase 1 implementation gates are green. Phase 2 should begin only after:

1. The migration is applied and smoke-tested in a controlled environment.
2. A PostgreSQL persistence test confirms tenant-scoped run, step, evidence, and policy-incident writes.
3. Product and security approve the Phase 0 design freeze.
4. The Command Agent domain adapters are defined with subject-specific permissions and redaction maps.

Recommended next execution: implement the read-only Command Agent only, using Daily Digest as the first entry point and retaining direct execution as structurally disabled.

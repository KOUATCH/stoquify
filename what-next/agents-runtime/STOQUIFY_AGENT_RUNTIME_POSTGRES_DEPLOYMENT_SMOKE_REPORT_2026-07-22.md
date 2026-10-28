# Stoquify Agent Runtime PostgreSQL Deployment And Smoke Report

**Execution date:** 2026-07-22  
**Selected execution skill:** `016-aqstoqflow-ai-copilot-guardrails`  
**Decision:** Passed for the controlled local PostgreSQL environment

## Scope

Deploy the Phase 1 agent-runtime persistence foundation through the existing Prisma migration ledger, verify tenant and evidence consistency at the database boundary, exercise a real PostgreSQL round trip, and leave no smoke-test data behind.

## Controlled Target

- Engine: PostgreSQL
- Host: `localhost`
- Port: `5432`
- Database: `dbakesman`
- Schema: `public`
- Credentials printed or persisted in evidence: no
- Preview or production database mutated: no

## Migration Control Results

1. The pre-deployment ledger check found only the reviewed agent-runtime migration pending.
2. `npm run prisma:migration:safety:gate` passed 8/8 checks across 27 migrations with 0 risk findings and 0 blockers.
3. `20260722143000_agent_runtime_phase_1_foundation` was deployed successfully.
4. A follow-up review found that separate run and organization foreign keys could admit mismatched tenant references, and that evidence could reference a step from another run.
5. `20260722150000_agent_runtime_tenant_consistency` was added and deployed to enforce those compound relationships in PostgreSQL.
6. `20260722153000_agent_runtime_incident_cascade_consistency` was deployed so tenant-consistent incidents cascade during physical tenant cleanup instead of blocking it.
7. The final `npm run prisma:migrate:status` returned `Database schema is up to date!`

Applied consistency constraints:

- feedback `(runId, organizationId)` must match one agent run;
- cost ledger `(runId, organizationId)` must match one agent run;
- policy incident `(runId, organizationId)` must match one agent run when a run is supplied; and
- evidence `(stepId, runId)` must match one agent step in that run.

## Persistence Smoke Test

Command: `npm run agent:runtime:postgres-smoke`

The isolated fixture persisted two organizations plus a governed agent definition, skill, tool, two runs, two steps, and valid evidence, feedback, cost, and policy-incident records. A tenant-scoped query recovered exactly one tenant's complete runtime graph.

Database rejection checks passed:

- cross-tenant feedback: Prisma/PostgreSQL `P2003`;
- cross-tenant cost: `P2003`;
- cross-tenant policy incident: `P2003`;
- cross-run evidence: `P2003`; and
- duplicate run correlation ID: `P2002`.

Cleanup ran in `finally`, deleted the temporary organizations, relied on database cascades for their complete runtime graphs, removed the global definitions, and verified `residualRows: 0`, including policy incidents.

## Regression Gates

- `npm run prisma:validate`: passed
- `npm run prisma:generate`: passed with Prisma Client 6.19.3
- `npm run agent:runtime:gates`: passed
- `npm test -- --runInBand services/agents`: 6 suites and 16 tests passed
- `npm run typecheck`: passed

## Outcome

The Phase 1 database deployment and PostgreSQL persistence entry gate are complete for the controlled local environment. Agent runtime records now have database-enforced tenant and evidence lineage, deterministic correlation uniqueness, a repeatable smoke command, and verified fixture cleanup.

Production deployment is not implied by this result. It remains governed by Stoquify's production migration, secret, backup, observability, and release procedures.

## Next Recommended Skill

`017-aqstoqflow-enterprise-release-gate`

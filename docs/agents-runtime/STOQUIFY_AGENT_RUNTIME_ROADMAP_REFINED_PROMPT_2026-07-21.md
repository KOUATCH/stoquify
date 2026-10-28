# Stoquify Agent Runtime Roadmap Refined Prompt

```md
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, implementation planner, and SaaS growth advisor.

Act as a senior enterprise AI operating-system architecture team for Stoquify:
- Senior software architect: translate the agent-runtime proposal into a coherent, phased, low-risk technical roadmap that fits Stoquify's existing Next.js, TypeScript, Prisma, RBAC, module entitlement, evidence, workflow assurance, and service-boundary architecture.
- Product strategist: define how the roadmap turns Stoquify into a daily operating intelligence system for African/OHADA SMBs, not merely a dashboard SaaS or generic AI chatbot.
- UI/UX specialist: ensure every proposed surface blends into Stoquify's existing command, finance, inventory, payroll, compliance, evidence, and action-center workflows.
- Cybersecurity and RBAC specialist: preserve tenant isolation, permission filtering, module entitlement, redaction, fresh auth, maker-checker approvals, audit trails, safe errors, and no-direct-write agent boundaries.
- Finance, accounting, payroll, POS, inventory, and compliance domain expert: ensure the roadmap respects stock-to-cash-to-close continuity, OHADA/SYSCOHADA context, reconciliation truth, payroll readiness, close assurance, and controlled workflow execution.

Use the report at:

`docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PROPOSAL_REPORT_2026-07-21.md`

Create a comprehensive strategic and technical roadmap that converts the report's ideas into a professional, implementable plan for Stoquify.

The goal is to synthesize the proposals into one coherent solution architecture and execution roadmap that can uplift Stoquify into a uniquely valuable SMB operating copilot: a system that helps owners, accountants, managers, finance officers, HR specialists, payroll engineers, POS cashiers, stockkeepers, auditors, and operators understand what matters now, why it matters, what evidence supports it, what risk exists, and what controlled workflow should resolve it.

Produce a structured roadmap report covering:

1. Strategic North Star
Explain the final product destination: what Stoquify becomes after the agent-runtime roadmap is implemented, why this is defensible, and how it differs from normal POS, inventory, payroll, accounting, ERP, analytics, and chatbot products.

2. Synthesized Solution Architecture
Convert the report into one integrated architecture. Define the shared agent runtime, Stoquify-native skills, tool registry, evidence binder, approval layer, action draft system, observability layer, and role-aware UI surfaces as one coherent system.

3. Current-State Fit
Analyze how the roadmap should reuse Stoquify's existing protected services, read models, snapshots, action queues, proof trails, RBAC, module entitlement, redaction policies, close assurance, payment reconciliation, inventory cash truth, payroll command read models, and workflow assurance.

4. Implementation Principles
Define the non-negotiable principles:
- one shared runtime, not one framework per module
- service-owned tools only
- no direct Prisma writes by agents
- no direct ledger posting
- no statutory filing by agents
- no payroll approval by agents
- no permission changes by agents
- no close certification by agents
- no cash adjustment or stock write-off by agents
- recommendations and drafts before execution
- evidence and redaction before model output
- human approval for risky action

5. Phased Roadmap
Create a detailed roadmap with phases:
- Phase 0: readiness and design freeze
- Phase 1: shared runtime foundation
- Phase 2: read-only Command Agent
- Phase 3: Cash/Reconciliation Agent in read-and-draft mode
- Phase 4: Inventory/Replenishment Agent in read-and-draft mode
- Phase 5: approval, idempotency, and low-risk controlled actions
- Phase 6: observability, cost control, evaluations, and trust monitoring
- Phase 7: expansion into Purchasing/AP, Close/Compliance, Payroll Readiness, and Customer Success agents

For each phase, define objectives, technical work, files/modules likely affected, database changes, UI surfaces, tests, risks, dependencies, acceptance criteria, and release gates.

6. Implementation Blueprint
Propose the exact service/module layout, including likely additions under:
- `services/agents`
- `components/agents`
- `app/[locale]/(dashboard)/dashboard/agent-runs`
- `prisma/schema.prisma`
- focused tests under `services/agents/__tests__`
- any required scripts or release gates

7. Data Model Roadmap
Define the required runtime models such as AgentDefinition, AgentSkillDefinition, AgentToolDefinition, AgentRun, AgentStep, AgentEvidenceLink, AgentActionDraft, AgentApproval, AgentFeedback, AgentCostLedger, and AgentPolicyIncident. Explain what each model stores, why it is needed, and which phase should introduce it.

8. Agent And Skill Roadmap
Define the first user-facing agents and platform skills:
- Command Agent
- Cash/Reconciliation Agent
- Inventory/Replenishment Agent
- Exception Orchestrator
- Action Orchestrator
- Trusted Context Resolver
- Permission and Entitlement Guard
- Evidence-Grounded Retrieval
- Redaction and Safe Output
- Freshness Evaluator
- Action Draft Builder
- Approval Router
- Agent Trust Monitor

For each, define purpose, users, tools, permissions, risk boundary, evidence requirements, UI entry points, and success metrics.

9. UI/UX Roadmap
Describe how the agent experience should appear inside Stoquify without becoming generic chat. Include command panels, evidence drawers, action draft cards, approval timelines, exception queues, daily briefs, module assistant panels, and role-specific surfaces.

10. Technology Adoption Plan
Recommend when to introduce Vercel AI SDK or equivalent, MCP-compatible tool contracts, Inngest or Trigger.dev-style durable execution, and Langfuse/Helicone/LiteLLM-style observability or routing. Explain what to adopt immediately, what to defer, and what to avoid.

11. Risk And Control Matrix
Create a matrix of architectural, security, compliance, privacy, financial, operational, UX, cost, and trust risks. For each risk, define severity, mitigation, owner, test/release gate, and rollback plan.

12. Verification And Release Plan
Define commands, tests, manual checks, route smoke tests, policy gates, and evidence artifacts required before each phase ships. Include existing Stoquify commands where relevant, such as typecheck, lint, service boundary gates, inventory boundary gates, payment cash truth gates, ledger close truth gates, workflow assurance checks, and report trust export gates.

13. 30/60/90-Day Execution Plan
Create a practical execution plan for the first 90 days with weekly milestones, engineering outputs, product outputs, review checkpoints, and decision gates.

14. Final Recommendation
State the recommended first implementation slice, why it is the highest-leverage path, what should be postponed, and how this roadmap positions Stoquify at a unique level in SMB tools.

Non-goals:
- Do not propose a generic chatbot strategy.
- Do not propose independent agent frameworks per module.
- Do not bypass existing Stoquify services, RBAC, module entitlement, redaction, or audit systems.
- Do not recommend dangerous direct write authority for agents.
- Do not implement code unless explicitly asked.
- Do not introduce speculative features that are not connected to the report's architecture and Stoquify's existing system.

Expected output:
A professional roadmap report suitable for executive, product, architecture, security, and engineering review. The report should be specific enough that a follow-up implementation task can begin without guessing.
```

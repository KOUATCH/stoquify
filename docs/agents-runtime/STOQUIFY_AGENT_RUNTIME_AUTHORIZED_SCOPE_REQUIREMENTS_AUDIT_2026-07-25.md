# Stoquify Agent Runtime Authorized-Scope Requirements Audit

**Evaluated:** 2026-07-27T16:19:14.118Z<br>
**Status:** `BLOCKED_REPOSITORY_REQUIREMENTS`<br>
**Authorized scope complete:** No<br>
**Full phased program complete:** No<br>
**Activation authorized:** No<br>
**Phase 3 authorized:** No

## Scope

This gate proves repository-owned requirements for Phase 0, Phase 1, and the inactive read-only Phase 2A Command Agent. It does not convert missing approval, deployment, credential, pilot, or release evidence into completion.

## Summary

| Measure | Result |
|---|---:|
| Requirements | 37 |
| Satisfied | 36 |
| Repository blockers | 4 |
| External blockers | 6 |

## Phase Counts

| Phase | Satisfied | Total | Blocked |
|---|---:|---:|---:|
| PHASE_0 | 8 | 8 | 0 |
| PHASE_1 | 13 | 13 | 0 |
| PHASE_2A | 12 | 13 | 1 |
| PERMANENT | 3 | 3 | 0 |

## Requirement Matrix

| ID | Phase | Requirement | Result | Evidence |
|---|---|---|---|---|
| P0-01 | PHASE_0 | One shared runtime and domain ownership | Passed | docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_DESIGN_FREEZE_2026-07-22.md |
| P0-02 | PHASE_0 | MVP agents and pilot roles | Passed | docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_DESIGN_FREEZE_2026-07-22.md |
| P0-03 | PHASE_0 | Risk taxonomy | Passed | docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_DESIGN_FREEZE_2026-07-22.md |
| P0-04 | PHASE_0 | Permanent prohibited-action policy | Passed | docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_DESIGN_FREEZE_2026-07-22.md |
| P0-05 | PHASE_0 | Read-only tool catalog with governance metadata | Passed | docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_DESIGN_FREEZE_2026-07-22.md |
| P0-06 | PHASE_0 | Dependency order, rollout, rollback, and stop conditions | Passed | docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_DESIGN_FREEZE_2026-07-22.md |
| P0-07 | PHASE_0 | Measurable Phase 1 acceptance criteria | Passed | docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_DESIGN_FREEZE_2026-07-22.md |
| P0-08 | PHASE_0 | Phase 0/1 execution report | Passed | what-next/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_0_1_EXECUTION_REPORT_2026-07-22.md |
| P1-01 | PHASE_1 | Agent governance persistence models | Passed | prisma/schema.prisma |
| P1-02 | PHASE_1 | Additive runtime migrations and tenant consistency | Passed | prisma/migrations/20260722143000_agent_runtime_phase_1_foundation/migration.sql, prisma/migrations/20260722150000_agent_runtime_tenant_consistency/migration.sql, prisma/migrations/20260722153000_agent_runtime_incident_cascade_consistency/migration.sql |
| P1-03 | PHASE_1 | Shared runtime contracts | Passed | services/agents/agent-contracts.ts |
| P1-04 | PHASE_1 | Trusted tenant, actor, and entitlement context | Passed | services/agents/agent-context.service.ts |
| P1-05 | PHASE_1 | Permission and entitlement guard before tool exposure | Passed | services/agents/agent-policy.service.ts, services/agents/agent-tool-registry.service.ts |
| P1-06 | PHASE_1 | Static read-only registry and prohibited-tool policy | Passed | services/agents/tools/command-tools.ts, scripts/agent-tool-registry-gate.js, scripts/agent-prohibited-action-gate.js |
| P1-07 | PHASE_1 | Evidence binder and explicit no-evidence state | Passed | services/agents/agent-evidence.service.ts |
| P1-08 | PHASE_1 | Redaction before prompt and output | Passed | services/agents/agent-redaction.service.ts |
| P1-09 | PHASE_1 | Freshness evaluator | Passed | services/agents/skills/freshness-evaluator.skill.ts |
| P1-10 | PHASE_1 | Deterministic run and step logger without raw payload persistence | Passed | services/agents/agent-runner.service.ts |
| P1-11 | PHASE_1 | Feedback, cost, and policy-incident foundations | Passed | prisma/schema.prisma, services/agents/agent-feedback.service.ts, services/agents/agent-metrics.service.ts |
| P1-12 | PHASE_1 | Focused safety tests and runtime commands | Passed | services/agents/__tests__/agent-context.service.test.ts, services/agents/__tests__/agent-tool-registry.service.test.ts, services/agents/__tests__/agent-evidence.service.test.ts, services/agents/__tests__/agent-redaction.service.test.ts, services/agents/__tests__/agent-runner.service.test.ts, package.json |
| P1-13 | PHASE_1 | Provider-free deterministic foundation | Passed | package.json |
| P2A-01 | PHASE_2A | Command Agent design freeze and disabled rollout | Passed | docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2A_COMMAND_AGENT_DESIGN_FREEZE_2026-07-22.md |
| P2A-02 | PHASE_2A | Role-aware Command Agent with one narrow read tool | Passed | services/agents/command-agent.service.ts, services/agents/tools/command-tool-adapters.ts |
| P2A-03 | PHASE_2A | Versioned evidence-constrained Daily Brief skill | Passed | services/agents/command-agent-contracts.ts, services/agents/skills/role-daily-brief.skill.ts |
| P2A-04 | PHASE_2A | Protected server action with handler-derived tenant scope | Passed | actions/agents/command-agent.actions.ts |
| P2A-05 | PHASE_2A | Evidence and trust fields on material output | Passed | services/agents/command-agent-contracts.ts, services/agents/agent-contracts.ts |
| P2A-06 | PHASE_2A | Embedded Daily Digest UI with safe states | Passed | components/agents/AgentCommandPanel.tsx, components/daily-habit/DailyHabitDigestDashboard.tsx, app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx |
| P2A-07 | PHASE_2A | Bounded user feedback persistence | Passed | services/agents/agent-feedback.service.ts, actions/agents/command-agent.actions.ts |
| P2A-08 | PHASE_2A | Fail-closed rollout and kill switch | Passed | services/agents/agent-rollout.service.ts |
| P2A-09 | PHASE_2A | Release, reconciliation, and rollback controls | Passed | services/agents/agent-release-control.service.ts, services/agents/agent-execution-control.service.ts, services/agents/agent-reconciler-invocation.service.ts, app/api/internal/agents/reconcile-abandoned/route.ts, package.json |
| P2A-10 | PHASE_2A | Focused, browser, and static verification surfaces | Passed | services/agents/__tests__/command-agent.service.test.ts, actions/agents/__tests__/command-agent.actions.test.ts, components/agents/__tests__/AgentCommandPanel.test.tsx, tests/e2e/command-agent-enabled-pilot.spec.ts, tests/e2e/command-agent-kill-switch.spec.ts, package.json |
| P2A-11 | PHASE_2A | Frozen commit attestation | Blocked | docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2A_FREEZE_COMMIT_ATTESTATION_2026-07-25.json |
| P2A-12 | PHASE_2A | Phase 2A execution report | Passed | what-next/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2A_COMMAND_AGENT_EXECUTION_REPORT_2026-07-22.md |
| P2A-13 | PHASE_2A | Executable Phase 2B and Phase 3 entry gates | Passed | scripts/agent-phase-promotion-gate.js, scripts/__tests__/agent-phase-promotion-gate.test.js, docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2B_PILOT_EXIT_REGISTER_2026-07-25.json, docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_PROMOTION_GATE_CONTRACT_2026-07-25.md, package.json |
| BOUNDARY-01 | PERMANENT | No agent business-write authority | Passed | package.json, scripts/agent-prohibited-action-gate.js |
| BOUNDARY-02 | PERMANENT | Activation remains unauthorized | Passed | docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json, docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2A_FREEZE_COMMIT_ATTESTATION_2026-07-25.json |
| BOUNDARY-03 | PERMANENT | Phase 3 remains unauthorized and unstarted | Passed | docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_3_PROMOTION_LEDGER_2026-07-25.json, docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2A_FREEZE_COMMIT_ATTESTATION_2026-07-25.json, prisma/schema.prisma |

## Repository Blockers

- `P2A-11:JSON_FIELD_MISMATCH:freezeAttestation:status`
- `P2A-11:JSON_FIELD_MISMATCH:freezeAttestation:freezeVerified`
- `P2A-11:JSON_FIELD_MISMATCH:freezeAttestation:summary.contentMismatches`
- `P2A-11:JSON_FIELD_MISMATCH:freezeAttestation:summary.phase2aRuntimeDrift`

## External Authority Blockers

- `EXTERNAL_PRODUCT_APPROVAL_NOT_RECORDED`
- `EXTERNAL_SECURITY_APPROVAL_NOT_RECORDED`
- `EXTERNAL_CLEAN_RELEASE_NOT_READY`
- `EXTERNAL_CREDENTIAL_ROTATION_BLOCKED`
- `EXTERNAL_OPERATIONAL_RELEASE_BLOCKED`
- `EXTERNAL_PHASE3_GO_NOT_RECORDED`

## Authority State

- Operational register: `BLOCKED`.
- Credential register: `BLOCKED`.
- Promotion ledger: `BLOCKED`.
- Activation requested / authorized / timestamp: `false` / `false` / `null`.
- Phase 3 authorized: `false`.

## Decision

The authorized repository scope has unresolved implementation requirements. Correct them before requesting external approval or advancing.

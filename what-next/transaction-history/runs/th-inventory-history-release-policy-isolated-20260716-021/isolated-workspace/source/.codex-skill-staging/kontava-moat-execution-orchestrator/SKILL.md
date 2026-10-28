---
name: kontava-moat-execution-orchestrator
description: Orchestrate the Kontava moat foundation execution program from the Kontava Moat Foundation Execution Roadmap and Cross-Boundary Innovation and Moat Proposal. Use when sequencing, auditing, resuming, or coordinating the implementation skills for evidence grades, proof trails, snapshots, module entitlements, business signals, redaction, seed/backfill, release gates, Owner War Room, Cash Leakage Radar, and related cross-module moat foundations.
---

# Kontava Moat Execution Orchestrator

## Purpose

Use this skill to turn the Kontava moat roadmap into an ordered implementation program. It chooses the next safe skill, protects current workflows, and keeps releases gated by tenant isolation, RBAC, module entitlements, auditability, ledger-first accounting, OHADA compliance, and redaction.

## Upgraded Mission

Use the upgraded Kontava prompt pack as the program control layer for moat execution. The mission is not to build impressive features first; it is to make Kontava safe enough, coherent enough, and evidence-backed enough that every later cross-module feature increases trust instead of creating hidden risk.

Every orchestration pass must answer:

- Which foundation is the next safest one to execute?
- Which tenant, RBAC, module, ledger, audit, reconciliation, close, payroll, POS, inventory, purchasing, finance, compliance, or export behavior could be broken by moving too fast?
- Which validation gate proves the platform is ready for the next skill?
- Which advanced recommendation must wait because the foundation is not yet stable?

## Stakeholder Transformation

The orchestration should protect outcomes for:

- Owners who need one trusted operating truth instead of fragmented dashboards.
- Accountants and auditors who need evidence, source links, close readiness, and conservative trust language.
- Managers and staff who need clear actions, not noisy analytics.
- Finance teams who need reconciliation, cash visibility, and controlled exports.
- Partners who need consented, redacted, auditable evidence access.
- Product, engineering, design, QA, sales, and partnerships teams who need one execution sequence.

## Program Audit Workflow

Before choosing or running a skill:

1. Read the upgraded prompt pack and the available moat/readiness/roadmap reports.
2. Inspect the current repo with `rg` for related routes, services, actions, hooks, Prisma models, permissions, seeds, tests, reports, exports, jobs, and messages.
3. Identify whether existing foundations can be reused, need hardening, or are missing.
4. Record blockers, assumptions, validation commands, rollback options, and the next safe skill.
5. Prefer observe mode, read-only contracts, nullable schema foundations, and measured rollouts before enforcement.

## Source Documents

When available in the current repo, read these first:

- `moat proposals/KONTAVA_MOAT_EXECUTION_SKILL_PROMPTS_UPGRADED_2026-06-19.md`
- `moat proposals/KONTAVA_MOAT_FOUNDATION_EXECUTION_ROADMAP_2026-06-19.md`
- `moat proposals/KONTAVA_CROSS_BOUNDARY_INNOVATION_MOAT_REPORT_2026-06-19.md`
- `moat proposals/KONTAVA_TECHNICAL_READINESS_BEFORE_MOAT_EXECUTION_2026-06-19.md`

## Execution Order

Run the foundation in this order unless the user explicitly asks for a narrower slice:

1. `kontava-foundation-governance`
2. `kontava-evidence-proof-trail`
3. `kontava-snapshot-read-models`
4. `kontava-module-control-plane`
5. `kontava-business-signals-action-queue`
6. `kontava-security-redaction-guard`
7. `kontava-seed-backfill-release-gate`
8. `kontava-owner-war-room-mvp`

Delay AI copilot, partner evidence API, full Business Evidence Graph, full hard module enforcement, and broad Compliance Readiness Radar until the release gates from earlier skills pass.

## Stop Conditions

Stop or reduce scope when:

- The source documents disagree on vocabulary, module ownership, or evidence language.
- Tenant scope, RBAC, audit, or server action protection is unclear for the target slice.
- A migration would require destructive reset outside disposable dev/test data.
- A feature needs sensitive payroll, supplier bank, provider, close, partner, export, or proof-trail data before redaction is centralized.
- A dashboard would depend on unbounded live cross-module joins instead of snapshots/read models.
- A module restriction would hard-block existing tenants before observe-mode would-block reports are clean.

## Operating Rules

- Inspect before editing. Use `rg` for routes, services, actions, Prisma models, permissions, tests, messages, and existing reports.
- Keep changes surgical. Do not refactor unrelated modules.
- Prefer server-side services and guards over client-side hiding.
- Treat RBAC and module entitlements as separate checks.
- Treat evidence grade as conservative truth language. Never call a record Certified without a certification workflow.
- Keep hard module enforcement behind observe mode until would-block reports are clean.
- Add English and French strings together when UI text changes.
- Preserve existing accounting close, reconciliation, POS, inventory, payroll, compliance, audit, and seed workflows.

## Phase Gates

Before moving to the next skill, require:

- Schema changes are nullable or otherwise migration-safe.
- Direct URL, server action, API, export, report, and job bypasses are considered.
- Tenant isolation tests exist for new cross-module reads.
- RBAC and entitlement behavior is tested where applicable.
- Redaction behavior is tested before exposing payroll, supplier bank, payment provider, close, partner, or export-sensitive data.
- `npm run typecheck` and `npm run lint` pass or failures are clearly unrelated.

## Deliverables

For each phase, produce:

- Short implementation summary.
- Files changed.
- Validation commands and results.
- Remaining gates.
- Next recommended skill.
- Rollback notes.

## Moat And Referral Lens

For every phase, state how the slice improves at least one of these outcomes:

- Trust in business facts.
- Cash leakage reduction.
- Close and audit readiness.
- Sensitive-data safety.
- Owner decision speed.
- Accountant adoption.
- Module expansion and pricing power.
- Organic referral value because Kontava solves a painful SMB problem better than ordinary POS or accounting tools.

## Completion Criteria

The orchestration is complete when the next executable skill is clear, its preconditions are satisfied, its risks are named, and its release gate is defined.

---
name: dashboard-experience-innovation
description: Design and evaluate captivating, enterprise-grade Kontava/AqStoqFlow BI dashboards, Owner War Room, Manager Action Center, Cash Command, and daily decision centers. Use when asked to make dashboards unlike ordinary business apps, improve BI presentation, create action-first command centers, refine dashboard UX, or propose innovative daily business intelligence experiences with technical prerequisites.
---

# Dashboard Experience Innovation

Use this skill to make Kontava's BI and action-center surfaces feel like daily business command environments rather than ordinary dashboards. The goal is to combine captivating presentation, serious enterprise trust, and practical usability for OHADA-zone SMB owners, managers, accountants, finance teams, stockkeepers, payroll teams, and branch supervisors.

## Mission

Create a UX/product/design proposal or implementation plan for dashboard experiences that are:

- Immediately distinctive from common business dashboards.
- Action-first, not chart-first.
- Evidence-backed and ledger-aware.
- Role-specific and habit-forming.
- Clear enough for SMB users while still feeling professional and intelligent.
- Built on existing Kontava foundations: BI contracts, snapshots, business signals, action queue, proof trails, redaction, RBAC, module entitlements, audit, and release gates.

## Operating Rules

- Inspect the current system before proposing changes.
- Do not modify product code unless the user explicitly asks for implementation.
- Keep UX innovation useful, not decorative.
- Avoid gimmicks, decorative dashboards, and animated noise.
- Preserve tenant isolation, RBAC, module entitlements, redaction, proof trails, auditability, ledger-first semantics, and OHADA compliance.
- Prefer reusable BI primitives over one-off dashboard components.
- State technical prerequisites for every design idea.
- If saving output, save it under `innovation/` unless the user specifies another folder.

## Inspect First

Inspect relevant surfaces before designing:

- `app/[locale]/(dashboard)/dashboard/owner-war-room/**`
- `components/owner-war-room/**`
- `actions/owner-war-room/**`
- `services/owner-war-room/**`
- `app/[locale]/(dashboard)/dashboard/manager-action-center/**`
- `components/manager-action-center/**`
- `actions/manager-action-center/**`
- `services/manager-action-center/**`
- `components/bi/**`
- `services/bi/**`
- `services/snapshots/**`
- `services/signals/**`
- `services/evidence/**`
- `services/security/**`
- `services/modules/**`
- `components/finance/**`
- `app/[locale]/(dashboard)/dashboard/finance/**`
- `app/[locale]/(dashboard)/dashboard/analytics/**`
- `app/[locale]/(dashboard)/dashboard/accounting/**`
- `app/[locale]/(dashboard)/dashboard/assurance/**`
- `config/sidebar.ts`
- `app/globals.css` and dashboard theme helpers.

Also inspect prior planning reports in `innovation/`, `moat proposals/`, and `security/` when they are relevant.

## Core Question

Ask:

> How can this dashboard make the user instantly understand what changed, what matters, what is risky, what is proven, and what to do next?

If a dashboard only shows charts, tables, and cards without answering that question, redesign the concept.

## Experience Principles

Use these principles:

1. Start with the user's daily decision, not the database module.
2. Present business truth as a narrative of state, change, risk, and action.
3. Make the first screen answer one primary question.
4. Use progressive disclosure: signal first, evidence second, raw data third.
5. Show trust state directly: operational, posted, reconciled, certified, stale, partial, blocked, or redacted.
6. Put actions near the insight that created them.
7. Make role-specific views feel intentional, not filtered leftovers.
8. Keep dense operator views separate from mobile owner summaries.
9. Use motion only for state transitions, timeline progression, attention routing, or live rebuild status.
10. Avoid decorative widgets that do not change decisions.

## Innovation Concepts To Evaluate

Evaluate and adapt concepts such as:

- Daily Business Command Center.
- Owner Morning Brief.
- Business Pulse View.
- Cash Truth Map.
- Risk and Opportunity Radar.
- Action Priority Board.
- What Changed Since Yesterday.
- What Needs Action Today.
- Evidence-Backed Insight Timeline.
- Stock-to-Cash Flow View.
- Profit Leakage Map.
- Branch Health Map.
- Close Readiness Journey.
- Finance Control Tower.
- Accountant Trust Review.
- Manager Daily Run Sheet.
- End-of-Day Business Pulse.
- Weekly Intelligence Digest.

For each concept, define:

- What the user sees first.
- Why it captures attention.
- What business question it answers.
- What action it drives.
- Which stakeholder it serves.
- What makes it unlike ordinary dashboards.
- What data, evidence, and read models it needs.
- What proof trail, permission, redaction, and freshness states it needs.
- How it avoids visual gimmicks and product bloat.

## Stakeholder Views

Design for:

- Owner: cash truth, risk, opportunity, business movement, and today priorities.
- Manager: operational action queue, blockers, branch/workflow health, and due items.
- Accountant: close readiness, ledger trust, reconciliation gaps, evidence packs, and audit trail.
- Finance: cashflow, reconciliation, suspense, receivables, payables, supplier exposure, and export-safe reports.
- Stockkeeper: stockout risk, dead stock, shrinkage, transfers, receiving delays, and stock-to-cash.
- Payroll/HR: payroll exposure, approvals, redacted cost insight, and payroll-to-profitability.
- Branch supervisor: branch health, sales/cash/stock exceptions, and local action list.

## Interaction Model

Recommend interactions such as:

- Drill-through from insight to evidence drawer.
- Action-first cards with next-step buttons.
- Timeline of business changes.
- Prioritization by money impact, urgency, evidence grade, and blocker severity.
- Role switcher only where the user has permission.
- View modes: brief, command, investigation.
- Safe empty states that teach what data is needed.
- Redacted states that explain why information is protected.
- Stale/partial/blocked states that explain trust limits.
- Guided daily review flow.
- Mobile owner brief and dense desktop operator mode.

## Visual Direction

Define a professional visual system:

- Use restrained dashboard color semantics already present in the system.
- Use visual hierarchy before adding more cards.
- Prefer command strips, timelines, ranked queues, flow maps, and evidence drawers over endless KPI grids.
- Use severity markers consistently.
- Use trust badges consistently.
- Use icons from the existing icon library where appropriate.
- Use animation only to reveal change, escalation, freshness, rebuild status, or drill-through context.
- Do not use decorative gradient orbs, random illustrations, or marketing-style hero sections in the dashboard shell.
- Do not put cards inside cards.
- Keep dashboard panels dense but scannable.

## Technical Prerequisites

For every proposed dashboard innovation, state the required:

- BI contracts.
- Snapshot/read models.
- Business signal rules.
- Action queue logic.
- Proof trail subjects.
- Redaction rules.
- RBAC permissions.
- Module entitlement checks.
- Freshness, stale, partial, blocked, and redacted states.
- Server actions or APIs.
- UI components.
- Seed data.
- Tests.
- Release gates.
- Performance budgets.

## Anti-Bloat Rules

State clearly:

- What should not be built yet.
- What should remain read-only first.
- What should reuse existing `services/bi/**`, `services/snapshots/**`, `services/signals/**`, and `components/bi/**`.
- What should not become a disconnected mini-app.
- What would look impressive but provide little SMB value.
- What should wait until data quality, usage, or customer demand proves the need.

## Recommended Output Structure

When producing a report, include:

1. Executive summary.
2. Current BI/dashboard UX assessment.
3. Gaps that make current dashboards feel ordinary or static.
4. Best innovative presentation concepts.
5. Recommended primary dashboard concept.
6. Role-specific user journeys.
7. Visual design direction.
8. Interaction model.
9. Daily habit loops.
10. Component and layout recommendations.
11. Technical/data prerequisites.
12. Anti-bloat guidance.
13. Prioritized implementation roadmap.
14. Tests, release gates, and rollout plan.
15. Clear recommendation on what to design and build first.

## Completion Criteria

Finish when the user has a concrete, execution-ready UX innovation direction that explains:

- How Kontava dashboards can feel unlike common dashboards from the first view.
- Which concepts are strongest and why.
- What should be built first.
- Which components and contracts should be reused.
- Which data and security foundations are required.
- How the experience remains captivating, trustworthy, practical, modern, enterprise-grade, and habit-forming.

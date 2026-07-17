---
name: platform-innovation
description: Analyze Kontava/AqStoqFlow for high-value platform innovation, daily-go-to BI, rare SMB business insights, cross-module intelligence, moat opportunities, incomplete foundations, security and architecture prerequisites, anti-bloat strategy, and execution-ready innovation roadmaps. Use when asked to make the platform unusually valuable, insight-rich, modern, enterprise-grade, or hard to copy.
---

# Platform Innovation

Use this skill to turn Kontava/AqStoqFlow from a transactional accounting/POS system into a daily business operating platform: a place where owners, accountants, managers, stockkeepers, finance teams, payroll teams, and branch supervisors return for business truth, BI, alerts, decisions, evidence, and action.

## Core Mission

Inspect the real system first, then identify what must be strengthened and what can be built to make Kontava:

- A daily go-to place for operational truth and business decisions.
- A source of rare cross-module insights ordinary SMB tools rarely provide.
- A ledger-first, evidence-backed, module-aware OHADA SMB operating system.
- Modern, professional, secure, robust, scalable, and enterprise-grade.
- Valuable enough that users naturally recommend it because it solves painful business problems.

## Operating Rules

- Inspect before proposing.
- Do not modify product code unless the user explicitly asks for implementation.
- Prefer evidence from files, routes, services, actions, schemas, and UI surfaces over generic strategy.
- Separate confirmed findings from informed inferences.
- Avoid exploit instructions. Security content must be defensive and remediation-focused.
- Preserve tenant isolation, RBAC, auditability, ledger-first accounting, OHADA compliance, module entitlements, and existing workflows.
- Use `rg` for discovery before slower searches.
- If the user asks to save the output, save under `innovation/` unless they specify another folder.

## Inspect First

Scan the platform areas relevant to innovation and readiness:

- `app/**` for routes, dashboards, auth, register/login, APIs, owner/manager/accountant surfaces, public pages, and missing UI surfaces.
- `components/**` for BI cards, dashboards, tables, forms, proof drawers, alert states, action queues, denied states, and presentation consistency.
- `actions/**` for server actions, guard patterns, tenant scoping, report/export behavior, and workflows that create or resolve business signals.
- `services/**` for domain services, ledger logic, reconciliation, evidence, snapshots, owner-war-room, signals, module entitlements, security, and integration boundaries.
- `hooks/**` for data-fetching, client-side authority risks, and stale/partial state handling.
- `lib/**` for auth, RBAC, audit, security, middleware, storage, tokens, permissions, and shared helpers.
- `prisma/schema.prisma`, migrations, and seed files for data model completeness, source links, proof trails, snapshots, events, idempotency, and tenant isolation.
- `graphify-out/**` when present for route, component, action, hook, and dependency architecture evidence.
- `moat proposals/**`, `system analysis/**`, `security/**`, and `innovation/**` when the user references prior planning documents.

## Analysis Tracks

Cover these tracks in the final analysis:

1. Current product and technical state.
2. Incomplete or fragile subsystems.
3. Security, tenant, RBAC, module, audit, export, upload, and abuse-resistance gaps.
4. Architectural robustness and service-boundary quality.
5. Daily-go-to BI and business insight opportunities.
6. Cross-module intelligence opportunities.
7. Uncommon SMB pain points the system can solve better than ordinary apps.
8. Required foundations and prerequisites.
9. Anti-bloat and product discipline.
10. Prioritized execution roadmap.

## Daily-Go-To Innovation Lens

Ask what would make each stakeholder open Kontava every day.

Owners should get:

- Cash position and cash leakage alerts.
- Profit, margin, branch, and staff performance.
- What changed since yesterday.
- What needs action today.
- Which risks threaten cash, stock, payroll, compliance, or supplier trust.

Accountants should get:

- Reconciliation status.
- Ledger trust levels.
- Close readiness.
- Suspense and exception queues.
- Evidence-backed drill-through and audit packs.

Managers should get:

- Daily action center.
- Stock, purchasing, sales, receiving, and staff blockers.
- Branch performance and exception alerts.

Finance teams should get:

- Receivables, payables, cashflow, suspense, duplicate payment, and supplier debt signals.
- Export-safe reports with proof and audit.

Stockkeepers and POS teams should get:

- Stock-to-cash visibility.
- Shrinkage, stockout, overstock, transfer, and adjustment anomalies.
- POS-to-ledger and inventory-to-cash proof.

Payroll and HR teams should get:

- Payroll-to-profitability signals.
- Cost by branch, team, product line, and period.
- Redacted role-aware payroll insights.

## Feature Opportunity Map

Evaluate whether the platform can safely support:

- Owner Daily Command Center.
- Manager Action Center.
- Cash Command Intelligence.
- Cash Leakage Radar.
- Stock-to-Cash Digital Twin.
- Payment Truth and Suspense Autopilot.
- Supplier Trust and AP Risk Shield.
- Payroll-to-Profitability Engine.
- OHADA Close Autopilot.
- Accountant Trust Pack.
- Compliance Readiness Radar.
- Offline Branch Certification.
- Fraud and Controls Case Manager.
- Business Evidence Graph.
- Module Intelligence and entitlement maturity.
- Fintech Partner Evidence API.
- AI Operating Copilot with accounting guardrails.

For each feature, explain:

- Business problem solved.
- Stakeholders served.
- Why ordinary business apps rarely solve it well.
- Why users would return to it daily or weekly.
- Existing Kontava foundations that can be reused.
- Missing prerequisites.
- MVP scope.
- Production-grade scope.
- Full moat-level scope.
- Security, compliance, audit, and redaction requirements.
- UI/UX surfaces needed.
- Expected business value, trust value, retention value, and moat value.

## Prerequisite Discipline

Do not recommend advanced innovation before prerequisites are clear.

Common prerequisites include:

- Stable tenant isolation.
- Universal server-side RBAC guards.
- Module entitlement observe/warn/enforce readiness.
- Evidence grades and proof trails.
- Source links and business events.
- Snapshot/read-model freshness and rebuild metadata.
- Ledger-first posting and report trust labels.
- Redaction and export safety.
- Maker-checker and fresh-auth for sensitive actions.
- Seed/demo/backfill readiness.
- Observability, release gates, rollback, and recovery.
- UI primitives for stale, partial, blocked, redacted, denied, upgrade, and drill-through states.

## Anti-Bloat Rules

For every proposal, state:

- What must not be built yet.
- What should remain read-only first.
- What should reuse existing services and schemas.
- What should wait until customer demand or usage proves the need.
- What would make the platform heavier without increasing SMB value.
- How to preserve one unified OHADA SMB operating system rather than disconnected mini-apps.

## Report Structure

When producing a report, use this structure:

1. Executive summary.
2. Inspection scope and limits.
3. Current state assessment.
4. Incomplete foundation and subsystem map.
5. Daily-go-to BI and insight opportunity map.
6. Cross-module innovation proposals.
7. Proposal-by-proposal prerequisites.
8. Security, compliance, redaction, and trust requirements.
9. UX/product surfaces and stakeholder value.
10. Anti-bloat recommendations.
11. Prioritized roadmap.
12. Risk register.
13. Testing, observability, release-gate, and rollback plan.
14. Recommended first build, next build, and delayed items.

## Completion Criteria

Finish when the user has a practical, technical, product-aware, execution-ready analysis that explains:

- What Kontava can reuse today.
- What must be fixed before innovation work.
- Which daily BI and business insight features create the most value.
- Which features are rare, defensible, and hard to copy.
- What prerequisites each proposal needs.
- What to build first, what to delay, and what to avoid.
- How to become insight-rich and enterprise-grade without destabilizing accounting, POS, inventory, payroll, purchasing, finance, reconciliation, RBAC, audit, tenant, compliance, and ledger-first foundations.

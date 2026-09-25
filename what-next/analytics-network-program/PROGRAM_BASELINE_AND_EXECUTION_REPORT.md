# Stoquify Analytics and Controlled-Network Program Baseline

Date: 2026-08-30  
Program ID: `STOQUIFY-ANALYTICS-CONTROLLED-NETWORK`  
Selected skill: `001-aqstoqflow-program-orchestrator`  
Active phase: P0 — Foundation and control closure  
Release posture: development execution active; production and external pilot blocked

## Outcome

P0-01 is complete as a development execution baseline. The direct instruction to execute the approved roadmap authorizes the roadmap sequence, role-based ownership, base capacity model, WIP limit, and additive application development inside the active package boundary. It does not authorize production deployment, database migration, provider activation, external outreach, legal/accounting/privacy/security certification, or a marketplace launch.

The only active major packages are:

1. P0-02 — canonical surface ownership and duplication map.
2. P0-03 — organization money, timezone, and period contract.

This satisfies the maximum-two-package WIP decision. P0-04 and P0-06 are next, but cannot activate until the two current packages provide their evidence.

## Governing authority

- Roadmap: `what-next/STOQUIFY_ANALYTICS_NETWORK_PHASES_0_TO_3_EXECUTION_ROADMAP_2026-08-30.md`.
- Work-package registry: `what-next/STOQUIFY_ANALYTICS_NETWORK_PHASES_0_TO_3_WORK_PACKAGE_REGISTRY_2026-08-30.json`.
- Live status: `what-next/analytics-network-program/PROGRAM_STATUS_REGISTER.json`.
- Decisions and holds: `what-next/analytics-network-program/DECISION_REGISTER.json`.
- Architecture context: live route/service/schema sources and `graphify-out/GRAPH_REPORT.md`; live source wins over the dated graph.

## Scope and non-goals

### Authorized development scope

- P0 governance and verification artifacts.
- Canonical route/job/KPI ownership.
- Organization analytical context contracts and focused tests.
- Later source-owned, read-only analytical composition only after each dependency gate passes.
- Independent feature flags and fail-closed robust states in later slices.

### Explicitly unauthorized at this boundary

- production deployment or production-readiness claim;
- database schema change, migration creation, or migration execution;
- live provider credential use, callback activation, or outbound campaign;
- real accountant, supplier, customer, partner, or recipient outreach;
- public marketplace, discovery, rating, ranking, lending, escrow, credit scoring, payment routing, payout, or commission flow;
- external writes into authoritative payment, purchasing, inventory, payroll, accounting, ledger, or bank truth;
- statutory, legal, accounting, privacy, security, or accessibility certification.

## Role ownership and base capacity

| Role | Base allocation | Accountable boundary |
|---|---:|---|
| Product Program Lead | 1.0 FTE | roadmap scope, WIP, decisions, gates |
| Engineering/BI Lead | 1.0 FTE | contracts, architecture, BI evidence |
| Backend/domain engineering | 2.0 FTE | source-owned read models and controls |
| Frontend engineering | 2.0 FTE | canonical command surfaces and robust states |
| Data/BI engineering | 1.0 FTE | metric registry, cohorts, data quality |
| Product design/accessibility | 0.75 FTE | job ownership, task UX, accessibility |
| QA/release | 1.0 FTE | tenant/RBAC/contract/browser/release evidence |
| Security/privacy/SRE | 1.25 FTE combined | access, external delivery, privacy, operations |
| Support/partner operations | 0.5 FTE in P2; 1.5 FTE in P3 | rehearsal and closed-cohort operations |

Named people, provider operators, qualified country/legal reviewers, and production approvers remain required before their corresponding gates can pass.

## Repository baseline

Candidate at program activation:

- branch: `codex/migration-control-plane-release-2026-08-29`;
- commit: `a05a41ef66cd5d98fd69ae3df18225795f912232`;
- dirty worktree: yes;
- changed paths: 123;
- modified paths: 61;
- untracked paths: 62.

All pre-existing changes are user-owned. This program is path-scoped and will not revert, reformat, or absorb unrelated work.

The refreshed module-surface inventory reports 414 surfaces: 371 mapped, 5 unmapped, 79 missing-permission findings, 77 dashboard-only risks, 293 enforcement candidates, and 6 review-required findings. This is a discovery baseline, not evidence that every live wrapper/action/API decision is correct.

## Baseline product and semantic findings

| Finding | State | Program consequence |
|---|---|---|
| Business Pulse hard-codes XAF and uses server-local day helpers | BLOCKED for multi-country analytical trust | P0-03 defines an organization currency/timezone/period contract before remediation. |
| Cash Command already composes evidence, payment, close, drawer, and payroll signals | READY foundation | Extend the existing route; do not create another finance overview. |
| Payment Reconciliation already exposes runs, suspense, failures, workflow, and proof | READY foundation | Compose an executive exposure/root-cause mode over the authoritative workbench. |
| Accountant portfolio enforces active, effective, expiring, revocable grants | READY foundation | Add bands and next actions only after per-row re-authorization. |
| Referral funnel is tenant-scoped and aggregate-only but ALL_TIME | PARTIAL | Cohort and trusted-activation work remains in P2. |
| Customer-statement delivery has consent and outbox evidence | PARTIAL | Live provider, wrong-recipient, support, and privacy evidence remain blocked. |
| Supplier acknowledgement is invite-only and proposal-only; invite outbox is absent | PARTIAL | Preserve the boundary; delivery activation waits for P2 controls. |

## Decisions activated

- controlled, accountant-led, invite-only network; no open marketplace;
- maximum two major active packages;
- extend Cash Command, Reconciliation, and Accountant Portfolio routes;
- analytical screens remain read-only and drill into source workflows;
- organization currency and IANA timezone are mandatory analytical context;
- canonical periods use inclusive start and exclusive end;
- no cross-tenant identity merge;
- Phase 1 forecast is a deterministic read-only baseline; governed scenarios are deferred.

Provider/channel, privacy/retention/wrong-recipient, named pilot cohort, and production decisions remain `REQUIRES_EXPERT_REVIEW`.

## Gate status

| Gate | Status | Evidence needed to advance |
|---|---|---|
| G0 Foundation | IN PROGRESS | P0-02 through P0-08 complete, no unresolved critical control decision |
| G1 Product value | BLOCKED_DEPENDENCY | G0 plus Phase 1 correctness/access/evidence/UX/performance |
| G2 Pilot readiness | BLOCKED_DEPENDENCY | G1 plus fresh provider/privacy/support/real-cohort/kill-switch evidence |
| G3 Continue pilot | BLOCKED_DEPENDENCY | G2 and weekly operating thresholds |
| G4 Expand network | BLOCKED_DEPENDENCY | retained trusted value, safety, support economics, two-sided demand |

## Universal execution gates

Every implementation slice must cover architecture/context, tenant/RBAC/module control, source/event integrity where applicable, typed errors and notifications, robust bilingual accessible UX, evidence/observability, and focused verification. Any HIGH or CRITICAL failure stops downstream advancement.

## Verification baseline

- `npm run prisma:validate` passed before execution activation.
- The current graph report was reviewed in full; it shows established tenant defense, BI, error, financial, reconciliation, and notification foundations that must be reused.
- The status and decision registers must parse as JSON.
- P0-02 route ownership and P0-03 contract tests are the next active evidence.

## Next permitted transition

Close P0-02 and P0-03 with verification. Then activate P0-04 Metric Registry and P0-06 Pilot Access/Entitlement Closure as the next two packages. Do not activate P1 or any external lane.

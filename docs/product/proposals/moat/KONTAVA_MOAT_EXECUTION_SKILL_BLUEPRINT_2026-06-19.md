# Kontava Moat Execution Skill Blueprint

Date: 2026-06-19

Source documents:

1. `moat proposals/KONTAVA_MOAT_FOUNDATION_EXECUTION_ROADMAP_2026-06-19.md`
2. `moat proposals/KONTAVA_CROSS_BOUNDARY_INNOVATION_MOAT_REPORT_2026-06-19.md`

Purpose: convert the Kontava moat roadmap into an executable Codex skill suite that can start implementation without destabilizing tenant isolation, RBAC, module entitlements, ledger-first accounting, auditability, reconciliation, payroll, inventory, POS, compliance, or existing workflows.

## Executive Summary

Kontava should begin execution with a foundation skill suite, not with isolated feature work. The first implementation wave must establish shared vocabulary, evidence grades, proof trails, snapshots, module observe mode, business signals, redaction, seed/backfill validation, and release gates. Only after those foundations pass should the team build broad Owner War Room, Cash Leakage Radar, partner APIs, AI copilot, or hard module enforcement.

The first skill to run is:

```text
kontava-moat-execution-orchestrator
```

The first implementation skill after orchestration is:

```text
kontava-foundation-governance
```

## Foundation Dependency Map

```text
Foundation governance
  -> evidence-grade service
  -> proof-trail service
  -> proof-trail UI and trust language

Evidence and proof trails
  -> snapshots and read models
  -> business signals
  -> Owner War Room evidence labels
  -> future Business Evidence Graph
  -> future AI guardrails

Snapshot read models
  -> Owner War Room MVP
  -> Cash Leakage Radar MVP
  -> Stock-to-Cash Twin
  -> Close Autopilot

Module control plane observe mode
  -> module-aware navigation
  -> page/action/API/report/job guards
  -> safe upgrade prompts
  -> later staged hard enforcement

Business signals
  -> owner action queue
  -> cash leakage workflow
  -> risk cases
  -> notification/digest layer

Security redaction guard
  -> safe proof trails
  -> safe dashboards
  -> safe exports
  -> partner evidence API
  -> AI-readable evidence

Seed, backfill, and release gates
  -> QA confidence
  -> demo confidence
  -> migration confidence
  -> production rollout confidence
```

## Prioritized Skill List

| Order | Skill | Folder | Main Outcome |
|---:|---|---|---|
| 1 | Moat Execution Orchestrator | `kontava-moat-execution-orchestrator` | Chooses next safe skill and enforces release sequencing. |
| 2 | Foundation Governance | `kontava-foundation-governance` | Locks module vocabulary, ownership maps, evidence language, ADRs, and gates. |
| 3 | Evidence Proof Trail | `kontava-evidence-proof-trail` | Builds conservative evidence grades, proof trails, blockers, badges, and guarded proof access. |
| 4 | Snapshot Read Models | `kontava-snapshot-read-models` | Creates stable evidence-graded snapshot contracts for cross-module dashboards. |
| 5 | Module Control Plane | `kontava-module-control-plane` | Adds module catalog, entitlements, observe mode, server guards, and admin/upgrade surfaces. |
| 6 | Business Signals Action Queue | `kontava-business-signals-action-queue` | Turns cross-module facts into deduped, evidence-linked owner/accountant actions. |
| 7 | Security Redaction Guard | `kontava-security-redaction-guard` | Centralizes redaction, export safety, fresh-auth, consent, and composite guards. |
| 8 | Seed Backfill Release Gate | `kontava-seed-backfill-release-gate` | Proves scenarios, backfills, migration safety, rollback, and release gates. |
| 9 | Owner War Room MVP | `kontava-owner-war-room-mvp` | Builds the first safe read-only product surface after foundations exist. |

## Skill Specifications

### 1. `kontava-moat-execution-orchestrator`

Use when sequencing, resuming, auditing, or coordinating the whole moat execution program.

It must:

- Read the source roadmap documents.
- Pick the next safest execution skill.
- Confirm prerequisites and release gates.
- Stop advanced features when foundations are missing.
- Report validation, risks, rollback notes, and next skill.

### 2. `kontava-foundation-governance`

Use for Phase 0 work.

It must produce:

- Module vocabulary ADR.
- Evidence-grade ADR.
- Proof-trail contract ADR.
- Module entitlement observe-mode ADR.
- Snapshot strategy ADR.
- Redaction and sensitive-data ADR.
- Release gate checklist.
- Module ownership map for routes, actions, services, reports, exports, jobs, seeds, and tests.

It must not add hard entitlement enforcement.

### 3. `kontava-evidence-proof-trail`

Use for the first technical trust layer.

It must build or audit:

- `services/evidence/evidence-contracts.ts`
- `services/evidence/evidence-grade.service.ts`
- `services/evidence/proof-trail.service.ts`
- Evidence blockers and redaction hooks.
- Guarded proof-trail server actions or API.
- `EvidenceGradeBadge`.
- `ProofTrailDrawer`.

It must prove tenant isolation, RBAC, redaction, and conservative grade transitions.

### 4. `kontava-snapshot-read-models`

Use before broad command-center dashboards.

It must define stable contracts for:

- Tenant daily operating snapshot.
- Branch daily operating snapshot.
- Payment truth snapshot.
- Inventory cash snapshot.
- Close readiness snapshot.
- Snapshot build run.

It must label stale, partial, blocked, and redacted facts instead of hiding uncertainty.

### 5. `kontava-module-control-plane`

Use for module-oriented SaaS foundations.

It must build:

- Canonical module catalog.
- Module dependency map.
- Tenant entitlements.
- Observe-mode decision service.
- Would-block logs.
- Server-side guards.
- Module Control Center.
- Owner/admin upgrade surfaces.

It must not enable global hard enforcement on the first pass.

### 6. `kontava-business-signals-action-queue`

Use when turning evidence-backed facts into action.

It must build:

- BusinessSignal contracts.
- Dedupe keys.
- Severity mapping.
- Expiry/freshness.
- Assignment and resolution audit.
- Permission-filtered action paths.
- Owner/accountant action queue UI.

It must avoid noisy, unredacted, or non-actionable alerts.

### 7. `kontava-security-redaction-guard`

Use before exposing sensitive cross-module intelligence.

It must build:

- Central redaction policy.
- Export safety policy.
- Composite moat guard.
- Sensitive action extensions.
- Consent boundaries.
- Tests proving wildcard permissions cannot bypass entitlement, consent, fresh auth, maker-checker, or certification rules.

### 8. `kontava-seed-backfill-release-gate`

Use to prove the foundation.

It must create or extend:

- Full evidence-chain seed.
- Cash leakage seed.
- Inventory cash risk seed.
- Payroll exposure seed.
- Accountant multi-client seed.
- Limited-module seed.
- Suspended/read-only seed.
- Partner consent seed.
- Idempotent backfills.
- Tenant-level data quality reports.
- Release gate scripts or checklists.

It must never reset or reseed production.

### 9. `kontava-owner-war-room-mvp`

Use only after enough foundations exist.

It must build a read-only owner/admin command center with:

- Cash at risk.
- Reconciliation exceptions.
- Stock cash exposure.
- Supplier commitments.
- Payroll exposure.
- Close readiness.
- Action queue.
- Evidence-grade badges.
- Proof Trail drawer integration.
- Cash Leakage Radar MVP.
- Module observe/upgrade UI.

It must support loading, empty, partial, stale, blocked, redacted, permission-denied, module-unavailable, upgrade/request, and safe-error states.

## Execution Sequence

### Must Build First

1. Foundation governance.
2. Evidence grade and proof-trail service.
3. Snapshot contracts.
4. Module observe mode.
5. Redaction policy.

### First Safe Implementation Slice

```text
Evidence-grade service + proof-trail service + read-only snapshot contract.
```

### Medium-Risk Consolidation

1. BusinessSignal and ActionItem.
2. Module Control Center observe UI.
3. Snapshot rebuild jobs.
4. Seed and backfill validation.

### Advanced Work To Delay

1. AI Operating Copilot.
2. Fintech Partner Evidence API.
3. Full Business Evidence Graph.
4. Hard module enforcement.
5. Broad Compliance Readiness Radar.

## Validation And Release Gates

Each skill should run the smallest useful validation set, normally:

```text
npm run typecheck
npm run lint
```

When relevant:

```text
npx prisma validate
npm test -- --runInBand
```

Required gate categories:

- Tenant isolation.
- RBAC.
- Module entitlement.
- Evidence-grade transition.
- Proof-trail redaction.
- Snapshot freshness.
- Business signal dedupe.
- Export/fresh-auth.
- Seed/backfill idempotency.
- Existing accounting close, reconciliation, POS, inventory, payroll, and compliance regressions.

## Risk Register

| Risk | Severity | Mitigation |
|---|---:|---|
| Starting with Owner War Room before evidence | High | Build evidence grades and snapshots first. |
| Hard module enforcement breaks tenants | Critical | Use observe mode and would-block reports first. |
| Wildcard bypasses subscription | Critical | Test entitlement separately from RBAC. |
| Sensitive data leaks in cross-module dashboards | Critical | Central redaction and JSON leakage tests. |
| Proof trails overclaim trust | High | Use conservative evidence-grade language. |
| Snapshots become stale or misleading | Medium | Show freshness, partial, stale, and blocked states. |
| Signals become noisy | Medium | Require dedupe, expiry, severity, and action path. |
| Legacy data marked Certified | High | Default old unsupported records to Operational or Blocked, never Certified. |
| Partner/API/AI work starts early | Critical | Gate behind proof, redaction, consent, and export safety. |

## Rollback Strategy

- Keep early schemas nullable and non-blocking.
- Put proof-trail drawers, Owner War Room, module enforcement, business signals, and radar surfaces behind flags.
- Disable snapshot rebuild jobs without breaking existing dashboards.
- Fall back to existing dashboard read models when snapshots fail.
- Keep observe-mode logs non-blocking.
- Keep seed and destructive database operations limited to development unless explicitly approved.

## Team Responsibilities

| Team | Responsibility |
|---|---|
| Product | Module language, evidence terms, phased scope, acceptance criteria. |
| Design | Evidence badges, proof drawer, command center states, accessibility. |
| Backend | Schemas, services, guards, snapshots, signals, migrations, backfills. |
| Frontend | Dashboards, hooks, localization, role/module states. |
| Security | Tenant isolation, RBAC, entitlements, redaction, fresh auth, consent, export safety. |
| QA | Tests, seed scenarios, E2E, release gates. |
| DevOps | Feature flags, jobs, observability, rollback. |
| Sales/Partnerships | Demo narrative after proof and redaction foundations are safe. |

## Final Recommendation

Install and run the skill suite in this order:

```text
kontava-moat-execution-orchestrator
kontava-foundation-governance
kontava-evidence-proof-trail
kontava-snapshot-read-models
kontava-module-control-plane
kontava-business-signals-action-queue
kontava-security-redaction-guard
kontava-seed-backfill-release-gate
kontava-owner-war-room-mvp
```

The strongest first implementation request is:

```text
Use kontava-moat-execution-orchestrator, then start kontava-foundation-governance for Phase 0. Produce the module vocabulary ADR, evidence-grade ADR, module ownership map, and release-gate checklist without adding hard enforcement.
```

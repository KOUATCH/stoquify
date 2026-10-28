Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

# Phase 06: Controlled Rollout And Rollback

## Objective

Expand only the validated authenticated placement through bounded cohorts while preserving immediate fallback to existing Stoquify command surfaces.

## Prerequisites

- Phase 05 records an evidence-backed expand decision.
- Security thresholds remain perfect.
- Feature flag, kill switch, support owner, and rollback plan exist.

## Required Skills

- `aqstoqflow-prompt-architect`
- `aqstoqflow-module-rollout-certification`
- `aqstoqflow-module-release-gates-and-rollback`
- `aqstoqflow-release-verification-foundation`
- `017-aqstoqflow-enterprise-release-gate`

## Work

1. Define named tenant/role/module cohorts and explicit exclusions.
2. Record policy version, destination set, source-service owners, and start/end time.
3. Define latency, error, freshness, denial, dead-end, and support budgets.
4. Run canary, hold, review, and expand steps.
5. Test rollout-on/off behavior and fallback to Dashboard, Daily Digest, Manager Action Center, Owner War Room, and workbenches.
6. Exercise rollback without disabling underlying RBAC, tenant, module, page, or action guards.
7. Add each new role family or module only after its own deny, leakage, support, and rollback evidence passes.

## Verification

- Policy and module release gates.
- Authenticated allow/deny browser matrix.
- Stale/revoked session and cross-tenant negative smoke.
- Telemetry quality and source-freshness checks.
- Support runbook exercise.
- Timed kill-switch and recovery drill.

## Exit Gate

- Security defects remain zero.
- Authorized-destination success remains at least 98%.
- Rollback restores existing surfaces within the approved recovery objective.
- Support can explain each state using policy and evidence IDs.

## Evidence

Save cohort manifests, canary reports, SLOs, support runbook, rollback trace, command output, and decision logs under:

`what-next/workflow-atlas-transformation-roadmap/phase-06-rollout/`

## Stop Conditions

Any critical disclosure, guard mismatch, error-budget breach, support overload, freshness failure, or loss of measured task value stops expansion and triggers rollback.

## Non-Goals

No broad default enablement, no automatic module-enforcement promotion, and no dedicated route unless separately approved from Phase 05 evidence.


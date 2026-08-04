Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

# Phase 07: Final Release And Risk Decision

## Objective

Issue a truthful release, reduction, or retirement decision for the public Workflow Guide and authenticated contextual guidance.

## Prerequisites

- All preceding phase reports are readable.
- Evidence is fresh enough for the release window.
- Rollback has been rehearsed.
- Critical and high risks have passing controls or explicit rejection.

## Required Skills

- `aqstoqflow-prompt-architect`
- `017-aqstoqflow-enterprise-release-gate`
- `aqstoqflow-module-release-gates-and-rollback`

## Review Gates

1. Product comprehension and task-value evidence.
2. Tenant, RBAC, scope, entitlement, redaction, fresh-auth, and maker-checker evidence.
3. Destination-policy, page, and action/API parity.
4. Accessibility, localization, browser, performance, and robust states.
5. Telemetry privacy, quality, retention, and deletion.
6. Support readiness, observability, SLOs, incident ownership, and rollback.
7. Residual legal, payroll, compliance, and country-pack claim boundaries.

## Required Decisions

- Public guide: GO, CONDITIONAL GO, or NO-GO.
- Authenticated guidance: GO, LIMITED GO, REDUCE, RETIRE, or NO-GO.
- Dedicated `/dashboard/workflows` route: default NO unless a distinct repeat-use job is proven.
- Residual risks: accept with owner/date, remediate, or block.

## Verification

Run the smallest complete release set from the current repository and attach exact command output. Do not claim authenticated smoke from redirects, route presence from authorization, or functional evidence from telemetry value.

## Artifacts

- `what-next/workflow-atlas-transformation-roadmap/phase-07-final-release-decision.md`
- Final gate matrix and evidence index
- Residual risk acceptance register
- Rollback status and next review date

## Exit Gate

- No critical or high invariant is open.
- Evidence is fresh, reproducible, and linked.
- The decision states exactly what is approved, limited, rejected, and not claimed.

## Stop Conditions

Reject promotion when one critical/high invariant fails, evidence is stale, rollback is unproven, or product value does not exceed the existing command surfaces.

## Non-Goals

No release by deadline pressure, no hidden exceptions, no broad enforcement, no commit, push, or deployment unless separately authorized.


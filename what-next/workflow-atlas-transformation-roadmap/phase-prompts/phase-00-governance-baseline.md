Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

# Phase 00: Workflow Atlas Governance And Baseline

## Objective

Freeze the product, security, ownership, evidence, and launch contracts for the Workflow Atlas transformation. This is a governance and evidence run. Do not implement product code.

## Governing Inputs

- `docs/workflow-atlas/STOQUIFY_WORKFLOW_ATLAS_VALUE_EVALUATION_2026-07-30.md`
- `docs/workflow-atlas/STOQUIFY_WORKFLOW_ATLAS_TRANSFORMATION_ROADMAP_2026-07-30.md`
- `what-next/workflow-atlas-transformation-roadmap/roadmap.json`
- `what-next/workflow-atlas-transformation-roadmap/evidence-register.md`
- `what-next/workflow-atlas-transformation-roadmap/risk-register.md`
- Current Atlas code, EN/FR messages, focused tests, browser evidence, module status, and graphs

## Required Skills

- `aqstoqflow-prompt-architect`
- `aqstoqflow-uiux-00-orchestrator`
- `aqstoqflow-module-control-plane-orchestrator`
- `aqstoqflow-release-verification-foundation`

## Work

1. Reconfirm the retain/reshape/split decision against current code.
2. Capture scoped dirty-worktree status without changing unrelated files.
3. Refresh the 8-role, 12-outcome, 12-workflow, 41-destination baseline.
4. Name accountable owners for public content, destination policy, session/RBAC, tenant/location/self scope, module entitlement, telemetry, QA, and each domain read model.
5. Record the invariant that public role/outcome state is never authorization input.
6. Separate public and authenticated launch decisions.
7. Refresh evidence and risk registers only where current facts changed.

## Artifacts

- `what-next/workflow-atlas-transformation-roadmap/phase-00-governance-baseline-report.md`
- Updated evidence/risk registers when required
- A decision log with owner, date, and unresolved questions

## Verification

- Every P0 risk has one owner and treatment.
- Every source claim points to current code or a dated report.
- The public lane is not blocked by authenticated module-control work.
- The authenticated lane is explicitly NO-GO while prerequisites remain open.

## Stop Conditions

- Current code contradicts the governing report.
- Ownership cannot be assigned for a critical contract.
- Evidence is missing for the 41-destination baseline.

## Non-Goals

No code changes, copy changes, schema work, entitlement promotion, telemetry integration, commit, push, or deployment.


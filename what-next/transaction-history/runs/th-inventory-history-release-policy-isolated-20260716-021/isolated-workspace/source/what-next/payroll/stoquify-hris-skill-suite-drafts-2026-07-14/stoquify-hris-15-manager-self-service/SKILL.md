---
name: stoquify-hris-15-manager-self-service
description: "Open Stoquify manager self-service for team roster, approvals, readiness, onboarding/offboarding tasks, documents, leave, and attendance without broad sensitive data. Use after manager scope is proven."
---

# Stoquify HRIS 15 Manager Self Service

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Give managers operational team workflows while keeping salary, identifiers, and out-of-scope employees protected.

## Trigger/use cases

Use after manager scope, approvals, and employee self-service controls exist.

## Prerequisites

- Manager scope tests.
- Approval inbox.
- Redaction policy.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- services/payroll/org-manager-scope.service.ts
- services/payroll/__tests__/org-manager-scope.service.test.ts
- config/sidebar.ts

## Files/surfaces likely touched

- app/[locale]/(dashboard)/dashboard/people/team/
- services/hris/manager-self-service.service.ts
- components/hris/
- tests
- report

## What the skill may change

- Add team roster/readiness views.
- Add scoped approval queues.
- Add safe task status panels.

## What the skill must not change

- Expose salary, identifiers, bank data, or documents by default.
- Show employees outside manager scope.

## Required tests or gates

- Scoped manager tests.
- Out-of-scope denial tests.
- No salary/identifier leakage tests.
- Browser route smoke where feasible.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_MANAGER_SELF_SERVICE_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-16-accounting-finance-assurance-bridge`.

## Stop/blocker conditions

Stop if current scope is location-only and the requested workflow requires reporting-line authority.

## Success criteria

Manager workflows are useful and honest about scope boundaries.

## Execution Workflow

1. Read the governing HRIS analysis, skill-system blueprint, current status register, and the latest report for the active slice.
2. Confirm the prerequisites before making code or report changes.
3. Inspect only the surfaces needed for this skill.
4. Preserve tenant isolation, RBAC, redaction, audit, evidence hashes, and payroll/accounting ownership boundaries.
5. Stop and save a blocker report when a prerequisite or risk control fails.
6. Change only the active slice when implementation is explicitly requested.
7. Run the smallest honest verification gate set.
8. Save the required report and name the next handoff skill.

## Shared Risk Controls

- Do not duplicate employee master truth.
- Do not let payroll invent mutable HRIS facts.
- Do not run payroll from uncertified, stale, or UI-derived HRIS inputs.
- Do not leak salary, identifiers, payment destination data, raw documents, provider payloads, or authority payloads.
- Do not broaden work outside the active slice.
- Do not claim unrestricted production readiness from controlled-pilot evidence.

## Report Contract

Every run must report scope, files inspected, files changed, current blockers, data ownership, tenant/RBAC decision, audit/redaction decision, gates run, skipped checks, residual risk, and next handoff skill.

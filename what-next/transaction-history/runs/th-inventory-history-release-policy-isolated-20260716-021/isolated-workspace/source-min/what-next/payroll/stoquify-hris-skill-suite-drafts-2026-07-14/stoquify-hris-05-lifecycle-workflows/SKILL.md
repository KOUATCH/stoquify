---
name: stoquify-hris-05-lifecycle-workflows
description: "Model Stoquify HRIS onboarding, transfer, promotion, suspension, termination, offboarding, and rehire workflows. Use when lifecycle changes must be request-reviewed-applied with audit and payroll readiness impact."
---

# Stoquify HRIS 05 Lifecycle Workflows

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Replace ad hoc employee status edits with traceable lifecycle workflows.

## Trigger/use cases

Use after employee identity/profile read models are safe.

## Prerequisites

- Employee identity profile.
- Audit event sources.
- Maker-checker decision for high-risk HR changes.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- services/payroll/employee.service.ts
- services/payroll/contract.service.ts
- services/payroll/payroll-control.service.ts
- prisma/schema.prisma
- services/security/redaction-policy.service.ts

## Files/surfaces likely touched

- services/hris/lifecycle.service.ts
- actions/hris/
- tests
- report

## What the skill may change

- Add lifecycle request/read models.
- Block payroll readiness on incomplete starter/leaver facts.
- Emit audit and business events.

## What the skill must not change

- Silently mutate employee status after payroll snapshot.
- Bypass contract, document, or payroll readiness effects.

## Required tests or gates

- Maker-checker tests.
- Starter/leaver payroll readiness tests.
- Audit timeline tests.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_LIFECYCLE_WORKFLOWS_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-06-org-position-manager-scope`.

## Stop/blocker conditions

Stop if lifecycle changes need new schema and no expand/contract plan exists.

## Success criteria

Lifecycle changes are traceable, approved, and reflected in payroll readiness.

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

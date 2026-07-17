---
name: stoquify-hris-06-org-position-manager-scope
description: "Build Stoquify HRIS organization units, positions, reporting lines, manager scope, delegation, and effective-dated assignment rules. Use when moving beyond location-based manager scope."
---

# Stoquify HRIS 06 Org Position Manager Scope

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Create honest manager authority and org structure without overstating current location-scope behavior.

## Trigger/use cases

Use before manager self-service, approvals, org reporting, or delegated authority workflows.

## Prerequisites

- Employee identity profile.
- Current manager/location scope evidence.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- services/payroll/org-manager-scope.service.ts
- services/payroll/__tests__/org-manager-scope.service.test.ts
- prisma/schema.prisma
- config/sidebar.ts

## Files/surfaces likely touched

- services/hris/org.service.ts
- manager-scope tests
- People route/read models
- report

## What the skill may change

- Add compatibility wrapper over current location scope.
- Design effective-dated org/position assignment models.
- Add manager negative tests.

## What the skill must not change

- Call location-managed employees direct reports unless reporting lines exist.
- Expose salary or identifiers to managers by default.

## Required tests or gates

- Manager sees only assigned scope.
- Cross-tenant and out-of-scope denial tests.
- Assignment overlap checks when schema is introduced.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_ORG_POSITION_MANAGER_SCOPE_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-07-contract-document-evidence`.

## Stop/blocker conditions

Stop if manager scope cannot be proven without leaking broader employee data.

## Success criteria

The system distinguishes location scope from reporting-line authority and tests the boundary.

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

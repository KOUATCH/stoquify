---
name: stoquify-hris-02-people-boundary-facade
description: "Create or design the first-class Stoquify HRIS People boundary over existing payroll source storage. Use when adding `services/hris`, `actions/hris`, People Core read models, or facade-first HRIS ownership without duplicating employee truth."
---

# Stoquify HRIS 02 People Boundary Facade

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Introduce the HRIS facade so new people-source reads and mutations have one upstream owner before payroll consumes snapshots.

## Trigger/use cases

Use for the first People Core code slice or a detailed facade design pass.

## Prerequisites

- Current-state register.
- Source-truth map.
- Decision to keep facade-first storage.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- prisma/schema.prisma
- services/payroll/employee.service.ts
- services/payroll/contract.service.ts
- services/payroll/compensation.service.ts
- services/payroll/payment-evidence.service.ts
- services/payroll/payroll-control.service.ts
- actions/payroll/

## Files/surfaces likely touched

- services/hris/
- actions/hris/
- service tests
- what-next/payroll report

## What the skill may change

- Add HRIS facade services.
- Add read-model contracts.
- Add narrow tests proving payroll storage is wrapped, not duplicated.

## What the skill must not change

- Rename payroll tables.
- Create a second employee master.
- Break existing payroll routes.

## Required tests or gates

- No duplicate employee truth.
- Payroll focused tests still pass.
- Tenant and redaction tests cover HRIS facade reads.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_PEOPLE_BOUNDARY_FACADE_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-03-permissions-and-route-shell`.

## Stop/blocker conditions

Stop if the facade would require schema migration before ownership is agreed.

## Success criteria

`services/hris` owns new People Core access while payroll compatibility remains intact.

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

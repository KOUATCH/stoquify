---
name: stoquify-hris-03-permissions-and-route-shell
description: "Add Stoquify HRIS permissions, risk classifications, and the `/dashboard/people` route shell. Use when separating HRIS access from payroll access and creating the People workspace entry point."
---

# Stoquify HRIS 03 Permissions And Route Shell

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Create the access and route shell that lets HRIS become visible without widening payroll permissions.

## Trigger/use cases

Use after the HRIS facade exists or when defining People workspace access contracts.

## Prerequisites

- People boundary facade or approved facade design.
- Current RBAC map.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- config/permissions.ts
- config/sidebar.ts
- lib/security/rbac-permissions.ts
- app/[locale]/(dashboard)/dashboard/payroll/
- config/__tests__/permissions.test.ts
- config/__tests__/sidebar.test.ts

## Files/surfaces likely touched

- config/permissions.ts
- config/sidebar.ts
- lib/security/rbac-permissions.ts
- app/[locale]/(dashboard)/dashboard/people/
- route/access tests
- report

## What the skill may change

- Add `hris.*` permissions.
- Add People sidebar entries.
- Add route shell and denied/empty states.

## What the skill must not change

- Reuse payroll manage permissions for broad HRIS actions.
- Expose People routes without route-level access checks.

## Required tests or gates

- HRIS/payroll permissions are separate.
- Sidebar and route-access tests pass.
- Denied state is safe and redacted.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_PERMISSIONS_ROUTE_SHELL_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-04-employee-identity-profile`.

## Stop/blocker conditions

Stop if permission taxonomy conflicts with module entitlement strategy.

## Success criteria

People route shell is present, permission-gated, and not payroll-permission dependent.

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

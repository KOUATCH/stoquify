---
name: stoquify-hris-04-employee-identity-profile
description: "Build Stoquify HRIS employee identity, directory, profile, duplicate detection, user mapping, and redacted profile read models. Use when implementing People Core employee master behavior over existing payroll employee storage."
---

# Stoquify HRIS 04 Employee Identity Profile

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Make the employee profile the HRIS-owned source for identity, status, user mapping, readiness, and profile history.

## Trigger/use cases

Use after People route shell and permissions exist.

## Prerequisites

- HRIS facade.
- HRIS permissions and route shell.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- prisma/schema.prisma
- services/payroll/employee.service.ts
- actions/payroll/payroll-employee.actions.ts
- services/payroll/__tests__/payroll-employee.service.test.ts

## Files/surfaces likely touched

- services/hris/employee.service.ts
- actions/hris/
- components/hris or People route components
- tests
- report

## What the skill may change

- Add redacted employee directory/profile read models.
- Add duplicate and stale user mapping checks.
- Add lifecycle timeline read hooks from audit/business events.

## What the skill must not change

- Expose raw identifiers, salary, or payment destination in list payloads.
- Trust client-provided employee ids for own-record access.

## Required tests or gates

- Tenant isolation tests.
- Duplicate prevention tests.
- User-to-employee denial tests.
- Redacted payload tests.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_EMPLOYEE_IDENTITY_PROFILE_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-05-lifecycle-workflows`.

## Stop/blocker conditions

Stop if user-to-employee mapping cannot be resolved tenant-safely.

## Success criteria

HRIS can explain one tenant-scoped employee profile without leaking sensitive fields.

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

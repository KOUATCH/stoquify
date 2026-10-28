---
name: stoquify-hris-08-compensation-benefits-control
description: "Move Stoquify employee-level compensation, benefits, allowances, deductions, and payroll-affecting assignments behind HRIS approval and evidence controls. Use when compensation truth must be separated from payroll calculation formulas."
---

# Stoquify HRIS 08 Compensation Benefits Control

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Make employee compensation inputs HRIS-owned while country packs own statutory meaning and accounting owns posting maps.

## Trigger/use cases

Use after contract and document evidence boundaries are safe.

## Prerequisites

- Contract/document evidence workflow.
- Payroll component/country-pack ownership map.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- services/payroll/compensation.service.ts
- actions/payroll/payroll-compensation.actions.ts
- services/payroll/payroll-control.service.ts
- lib/security/rbac-permissions.ts

## Files/surfaces likely touched

- services/hris/compensation.service.ts
- actions/hris/
- tests
- report

## What the skill may change

- Add HRIS compensation assignments/read models.
- Require maker-checker for salary changes.
- Attach evidence and effective dates.

## What the skill must not change

- Invent statutory formula meaning.
- Expose compensation in manager or employee lists without explicit permission.

## Required tests or gates

- Salary request/approve/apply separation tests.
- Stale compensation readiness blocker tests.
- Country-pack separation tests.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_COMPENSATION_BENEFITS_CONTROL_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-09-payment-destination-privacy`.

## Stop/blocker conditions

Stop if employee compensation truth cannot be separated from payroll component definitions.

## Success criteria

Approved compensation source data can be certified for payroll without broad leakage.

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

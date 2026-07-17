---
name: stoquify-hris-14-employee-self-service
description: "Open Stoquify HRIS employee self-service for own profile, documents, leave/time, payment requests, correction requests, and payslips. Use only after identity, redaction, own-record resolution, and readiness contracts are safe."
---

# Stoquify HRIS 14 Employee Self Service

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Give employees safe own-record workflows without cross-employee leakage.

## Trigger/use cases

Use after readiness contract and movement history are safe.

## Prerequisites

- Own employee resolver.
- Redacted employee profile.
- Document/payment/time workflow controls.
- Payslip self-service compatibility.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- services/payroll/payslip-self-service.service.ts
- actions/payroll/payroll-payslip-self-service.actions.ts
- components/payroll/PayrollPayslipSelfService.tsx
- tests/e2e/payroll-authenticated-smoke.spec.ts

## Files/surfaces likely touched

- app/[locale]/(dashboard)/dashboard/people/me/
- services/hris/self-service.service.ts
- actions/hris/
- components/hris/
- tests
- report

## What the skill may change

- Add own profile and request views.
- Reuse payslip self-service.
- Add fresh-auth export/reveal gates.

## What the skill must not change

- Trust client-provided employee id.
- Preload hidden sensitive fields into the DOM.

## Required tests or gates

- Employee sees only own data.
- DOM redaction tests.
- Fresh-auth export tests.
- Route smoke where feasible.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_EMPLOYEE_SELF_SERVICE_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-15-manager-self-service`.

## Stop/blocker conditions

Stop if own-record resolver cannot be proven tenant-safe.

## Success criteria

Employee self-service is useful, scoped, audited, and redacted.

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

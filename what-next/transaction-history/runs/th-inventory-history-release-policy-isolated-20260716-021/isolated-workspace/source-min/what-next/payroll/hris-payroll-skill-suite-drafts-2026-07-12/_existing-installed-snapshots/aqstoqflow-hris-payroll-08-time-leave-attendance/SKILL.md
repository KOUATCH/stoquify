---
name: aqstoqflow-hris-payroll-08-time-leave-attendance
description: "Build schedules, leave, absences, overtime, corrections, approvals, and freeze contracts. Use when attendance affects payroll or leave/overtime corrections are requested. Preserve HRIS-first payroll truth, tenant isolation, RBAC, redaction, audit, evidence, and saved-report handoffs."
---

# AqStoqFlow HRIS Payroll 08 Time Leave Attendance

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

## Purpose

Build schedules, leave, absences, overtime, corrections, approvals, and freeze contracts.

## Trigger/use cases

Use this skill when attendance affects payroll or leave/overtime corrections are requested.

## Prerequisites

- Employee identity.
- Org scope.
- Contract lifecycle.

## Evidence to inspect

- time/attendance models
- leave services
- schedule services
- approval flows
- payroll attendance adapters
- attendance readiness reports
- docs/HR-Payroll/README.md
- docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md
- docs/HR-Payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md
- docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md
- docs/HR-Payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_BLUEPRINT_2026-07-12.md
- what-next/payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_NEXT_STEPS_2026-07-12.md
- what-next/payroll/
- docs/prompts/skills/
- prisma/
- services/payroll/
- actions/payroll/
- components/payroll/
- app/[locale]/(dashboard)/dashboard/payroll/
- config/permissions.ts
- lib/security/rbac-permissions.ts

## Files/surfaces likely touched

- attendance services
- leave approval actions
- payroll input adapters
- tests

## What the skill may change

- attendance approval/freeze logic
- correction evidence
- payroll readiness blockers

## What the skill must not change

- payroll run finalization without snapshot correction rules

## Required tests or gates

- unapproved attendance readiness denial
- approved freeze evidence
- correction diff evidence

## Required saved report path

`what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_TIME_LEAVE_ATTENDANCE_<date>.md`

## Handoff conditions

Hand off to 09-input-readiness-gate.

## Stop/blocker conditions

Stop if payroll can consume unapproved attendance or mutable leave state.

## Success criteria

Payroll consumes approved, frozen, traceable time/leave/attendance inputs only.

## Execution Workflow

1. Read the governing HRIS/payroll blueprint and the latest status/report evidence.
2. Confirm prerequisites before editing or recommending downstream work.
3. Inspect only the surfaces needed for this skill.
4. Stop and save a blocker report when a prerequisite or risk control fails.
5. Change only the active slice when implementation is explicitly requested.
6. Run the smallest honest verification gate set.
7. Save the required report and name the next handoff skill.

## Shared Risk Controls

- Do not allow UI-derived payroll truth.
- Do not let payroll invent HRIS truth.
- Do not create duplicate employee truth.
- Do not run payroll without certified HRIS readiness.
- Do not accept unreviewed statutory formulas.
- Do not release payments without approved destination evidence.
- Do not submit declarations without authority proof.
- Do not mutate backfilled data without dry-run and signoff.
- Do not leak cross-tenant or cross-employee data.
- Do not broaden refactors outside the active slice.
- Do not treat stale reports as current truth.

## Report Contract

Every run must report scope, files inspected, current blockers, data ownership, tenant/RBAC decision, audit/redaction decision, gates run, skipped checks, residual risk, and the next handoff skill.

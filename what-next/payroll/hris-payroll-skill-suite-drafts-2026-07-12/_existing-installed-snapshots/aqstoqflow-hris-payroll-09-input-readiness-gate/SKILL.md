---
name: aqstoqflow-hris-payroll-09-input-readiness-gate
description: "Make payroll fail closed when HRIS inputs are missing, stale, unapproved, unsupported, or untraceable. Use when payroll run creation, recalculation, release, or migration pilot is in scope. Preserve HRIS-first payroll truth, tenant isolation, RBAC, redaction, audit, evidence, and saved-report handoffs."
---

# AqStoqFlow HRIS Payroll 09 Input Readiness

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

## Purpose

Make payroll fail closed when HRIS inputs are missing, stale, unapproved, unsupported, or untraceable.

## Trigger/use cases

Use this skill when payroll run creation, recalculation, release, or migration pilot is in scope.

## Prerequisites

- Identity readiness.
- Contract readiness.
- Compensation readiness.
- Document readiness.
- Attendance readiness.

## Evidence to inspect

- payroll run services
- input validation services
- readiness reports
- Prisma models
- action routes
- UI run request flows
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

- payroll readiness services
- run creation actions
- tests
- reports

## What the skill may change

- readiness evaluator
- fail-closed run gates
- error codes
- focused tests

## What the skill must not change

- payroll formulas
- downstream payment/declaration release

## Required tests or gates

- missing contract denial
- stale compensation denial
- unapproved attendance denial
- missing destination denial
- unsupported country denial

## Required saved report path

`what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_INPUT_READINESS_GATE_<date>.md`

## Handoff conditions

Hand off to 10-snapshot-correction.

## Stop/blocker conditions

Stop if readiness is only checked in UI or can be bypassed by API/action calls.

## Success criteria

Every payroll run starts from a service-owned, tenant-scoped, auditable readiness verdict.

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

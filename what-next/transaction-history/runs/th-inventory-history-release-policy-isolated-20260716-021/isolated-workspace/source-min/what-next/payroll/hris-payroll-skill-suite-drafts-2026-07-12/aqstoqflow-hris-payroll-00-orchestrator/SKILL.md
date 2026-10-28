---
name: aqstoqflow-hris-payroll-00-orchestrator
description: "Select the next safe HRIS/payroll slice and keep execution in dependency order. Use when the user asks what to do next, asks to execute the roadmap, or asks to continue HRIS/payroll work after a report. Preserve HRIS-first payroll truth, tenant isolation, RBAC, redaction, audit, evidence, and saved-report handoffs."
---

# AqStoqFlow HRIS Payroll 00 Orchestrator

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

## Purpose

Select the next safe HRIS/payroll slice and keep execution in dependency order.

## Trigger/use cases

Use this skill when the user asks what to do next, asks to execute the roadmap, or asks to continue HRIS/payroll work after a report.

## Prerequisites

- Current roadmap and status evidence must be readable, or hand off to 01-status-register.

## Evidence to inspect

- docs/HR-Payroll/
- what-next/payroll/
- existing skill installers
- recent git status
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

- planning reports only unless a downstream skill is selected

## What the skill may change

- saved orchestration report
- updated next-step report

## What the skill must not change

- production code
- database schema
- installed skills
- payroll business logic

## Required tests or gates

- report consistency grep
- no-production-code-change check

## Required saved report path

`what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ORCHESTRATOR_REPORT_<date>.md`

## Handoff conditions

Hand off to the earliest incomplete prerequisite skill.

## Stop/blocker conditions

Stop if required roadmap/status documents conflict, are missing, or are too stale to trust.

## Success criteria

One next skill is selected with clear prerequisites, verification, and stop conditions.

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

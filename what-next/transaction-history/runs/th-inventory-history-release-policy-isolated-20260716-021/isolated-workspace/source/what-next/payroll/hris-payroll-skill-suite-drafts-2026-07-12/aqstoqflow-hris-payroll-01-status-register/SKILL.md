---
name: aqstoqflow-hris-payroll-01-status-register
description: "Create the canonical HRIS/payroll status register. Use when work begins after long gaps, many reports exist, or readiness is disputed. Preserve HRIS-first payroll truth, tenant isolation, RBAC, redaction, audit, evidence, and saved-report handoffs."
---

# AqStoqFlow HRIS Payroll 01 Status Register

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

## Purpose

Create the canonical HRIS/payroll status register.

## Trigger/use cases

Use this skill when work begins after long gaps, many reports exist, or readiness is disputed.

## Prerequisites

- Access to docs/HR-Payroll and what-next/payroll.

## Evidence to inspect

- all HRIS/payroll blueprint, roadmap, phase, wave, final-readiness, browser-smoke, country-pack, payment, declaration, and backfill reports
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

- docs/HR-Payroll reports
- what-next/payroll reports

## What the skill may change

- canonical status register
- supersession map

## What the skill must not change

- service code
- Prisma schema
- routes
- installed skills
- test fixtures

## Required tests or gates

- rg evidence checks proving every major blocker class is represented

## Required saved report path

`what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_STATUS_REGISTER_<date>.md`

## Handoff conditions

Hand off to 02-source-truth-map.

## Stop/blocker conditions

Stop if reports contradict each other and cannot be reconciled without user decision.

## Success criteria

Blockers are classified as open, closed, superseded, pilot-only, or ready for implementation.

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

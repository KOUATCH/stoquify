---
name: aqstoqflow-hris-payroll-02-source-truth-map
description: "Map ownership across HRIS, payroll, accounting, assurance, compliance, and country packs. Use when schema, service, API, or report work involves employee, payroll, accounting, or statutory data. Preserve HRIS-first payroll truth, tenant isolation, RBAC, redaction, audit, evidence, and saved-report handoffs."
---

# AqStoqFlow HRIS Payroll 02 Source Truth Map

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

## Purpose

Map ownership across HRIS, payroll, accounting, assurance, compliance, and country packs.

## Trigger/use cases

Use this skill when schema, service, API, or report work involves employee, payroll, accounting, or statutory data.

## Prerequisites

- Current status register.

## Evidence to inspect

- Prisma schema
- HR/payroll services
- setup/config services
- accounting posting services
- assurance/proof-pack services
- permissions
- existing reports
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

- source-truth map report
- service boundary docs

## What the skill may change

- documentation
- narrow service-boundary TODO reports

## What the skill must not change

- payroll calculations
- HRIS schema in the mapping pass

## Required tests or gates

- ownership matrix grep for HRIS, payroll, accounting, assurance, compliance, and country pack

## Required saved report path

`what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SOURCE_TRUTH_MAP_<date>.md`

## Handoff conditions

Hand off to 03-employee-identity.

## Stop/blocker conditions

Stop if a data field has multiple write owners and no safe owner can be inferred.

## Success criteria

Every critical field has one owner, consumers, audit rules, redaction rules, and mutation rules.

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

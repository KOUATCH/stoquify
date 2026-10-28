---
name: aqstoqflow-hris-payroll-18-final-readiness
description: "Produce the final go/no-go decision for unrestricted HRIS/payroll production readiness. Use when the team believes the HRIS/payroll chain is ready for production expansion. Preserve HRIS-first payroll truth, tenant isolation, RBAC, redaction, audit, evidence, and saved-report handoffs."
---

# AqStoqFlow HRIS Payroll 18 Final Readiness

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

## Purpose

Produce the final go/no-go decision for unrestricted HRIS/payroll production readiness.

## Trigger/use cases

Use this skill when the team believes the HRIS/payroll chain is ready for production expansion.

## Prerequisites

- All prior gates complete or explicitly waived with owner, date, and risk acceptance.

## Evidence to inspect

- status register
- source-truth map
- identity/org/contract/compensation/document/attendance reports
- readiness/snapshot reports
- payroll proof reports
- browser reports
- migration pilot reports
- CI gate results
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

- final readiness report only

## What the skill may change

- final go/no-go report
- launch checklist

## What the skill must not change

- production code
- schema
- tenant data

## Required tests or gates

- evidence completeness checklist
- focused suite replay where feasible
- route smoke proof
- release blocker review

## Required saved report path

`what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_FINAL_READINESS_<date>.md`

## Handoff conditions

If go, hand off to controlled rollout; if no-go, hand off to the earliest failing prerequisite skill.

## Stop/blocker conditions

Stop on unresolved tenant isolation, RBAC, redaction, readiness, statutory, payment, declaration, accounting, migration, or browser release blockers.

## Success criteria

A defensible go/no-go decision exists with evidence, owners, residual risk, and release boundaries.

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

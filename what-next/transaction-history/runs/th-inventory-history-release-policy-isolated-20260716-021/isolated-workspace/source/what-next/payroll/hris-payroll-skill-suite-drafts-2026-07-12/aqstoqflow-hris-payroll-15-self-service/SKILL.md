---
name: aqstoqflow-hris-payroll-15-self-service
description: "Build employee and manager self-service only after identity, scope, redaction, and readiness gates are safe. Use when profile updates, document requests, leave requests, manager approvals, payslip access, or employee payroll views are in scope. Preserve HRIS-first payroll truth, tenant isolation, RBAC, redaction, audit, evidence, and saved-report handoffs."
---

# AqStoqFlow HRIS Payroll 15 Self Service

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

## Purpose

Build employee and manager self-service only after identity, scope, redaction, and readiness gates are safe.

## Trigger/use cases

Use this skill when profile updates, document requests, leave requests, manager approvals, payslip access, or employee payroll views are in scope.

## Prerequisites

- Employee identity.
- Org scope.
- Document redaction.
- Input readiness.
- Proof access model.

## Evidence to inspect

- self-service routes
- employee profile APIs
- manager approval components
- payslip routes
- navigation
- permission config
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

- self-service components
- route handlers
- actions
- permission tests
- browser smoke tests

## What the skill may change

- self-service access guards
- scoped read models
- redacted payloads
- UI route smoke coverage

## What the skill must not change

- payroll source truth
- approvals from client state

## Required tests or gates

- own-data employee access
- manager scoped access
- sensitive field redaction
- route smoke

## Required saved report path

`what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SELF_SERVICE_<date>.md`

## Handoff conditions

Hand off to 16-browser-accessibility-release.

## Stop/blocker conditions

Stop if self-service can bypass HRIS approvals or cross employee/tenant boundaries.

## Success criteria

Self-service is useful, scoped, redacted, auditable, and not a source of payroll truth.

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

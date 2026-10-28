---
name: aqstoqflow-hris-payroll-03-employee-identity
description: "Build employee identity, tenant scope, duplicate-risk, and user-to-employee mapping boundaries. Use when employee master data, employee self-service, manager access, payslip access, or payroll run eligibility is in scope. Preserve HRIS-first payroll truth, tenant isolation, RBAC, redaction, audit, evidence, and saved-report handoffs."
---

# AqStoqFlow HRIS Payroll 03 Employee Identity

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

## Purpose

Build employee identity, tenant scope, duplicate-risk, and user-to-employee mapping boundaries.

## Trigger/use cases

Use this skill when employee master data, employee self-service, manager access, payslip access, or payroll run eligibility is in scope.

## Prerequisites

- Source-truth map.
- Permission model review.

## Evidence to inspect

- employee models
- user models
- tenant/org relations
- RBAC permissions
- payroll employee services
- self-service routes
- duplicate detection reports
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

- employee services
- identity mapping services
- tests
- reports

## What the skill may change

- identity service contracts
- duplicate checks
- user-to-employee mapping checks
- focused tests

## What the skill must not change

- payroll calculation logic
- country-pack formulas
- unrelated auth flows

## Required tests or gates

- tenant isolation
- duplicate prevention
- user-to-employee access denial
- redacted employee payload tests

## Required saved report path

`what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_EMPLOYEE_IDENTITY_<date>.md`

## Handoff conditions

Hand off to 04-org-structure-manager-scope.

## Stop/blocker conditions

Stop if employee identity can be created or read outside tenant scope.

## Success criteria

Employee identity is service-owned, tenant-scoped, deduplicated, auditable, and payroll-snapshot safe.

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

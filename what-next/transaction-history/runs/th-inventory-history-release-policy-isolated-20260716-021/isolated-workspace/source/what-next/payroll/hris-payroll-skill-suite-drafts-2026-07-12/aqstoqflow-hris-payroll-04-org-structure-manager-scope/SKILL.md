---
name: aqstoqflow-hris-payroll-04-org-structure-manager-scope
description: "Build org unit, branch, position, manager, and scoped access rules. Use when manager self-service, approvals, branch-level payroll, or department reporting work is in scope. Preserve HRIS-first payroll truth, tenant isolation, RBAC, redaction, audit, evidence, and saved-report handoffs."
---

# AqStoqFlow HRIS Payroll 04 Org Manager Scope

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

## Purpose

Build org unit, branch, position, manager, and scoped access rules.

## Trigger/use cases

Use this skill when manager self-service, approvals, branch-level payroll, or department reporting work is in scope.

## Prerequisites

- Employee identity boundary.

## Evidence to inspect

- org/location/branch models
- manager relationships
- permissions
- navigation
- HR/payroll dashboards
- approval services
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

- org-scope services
- permission checks
- approval queries
- tests

## What the skill may change

- scoped query helpers
- manager access checks
- approval scope tests

## What the skill must not change

- global admin permissions unless the active slice requires it

## Required tests or gates

- manager sees assigned scope only
- cross-branch denial
- cross-tenant denial

## Required saved report path

`what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ORG_MANAGER_SCOPE_<date>.md`

## Handoff conditions

Hand off to 05-contract-lifecycle.

## Stop/blocker conditions

Stop if manager scope cannot be proven from durable relationships.

## Success criteria

Org and manager scope is explicit, testable, and not inferred from UI navigation.

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

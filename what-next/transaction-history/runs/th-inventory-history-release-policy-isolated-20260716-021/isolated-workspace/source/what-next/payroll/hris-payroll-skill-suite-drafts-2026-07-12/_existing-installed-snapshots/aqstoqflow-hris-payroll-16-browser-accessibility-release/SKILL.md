---
name: aqstoqflow-hris-payroll-16-browser-accessibility-release
description: "Run route smoke, accessibility, visual validation, RBAC negative checks, and release gates. Use when dashboard, route, workflow, navigation, sidebar, responsive, or release-candidate changes are in scope. Preserve HRIS-first payroll truth, tenant isolation, RBAC, redaction, audit, evidence, and saved-report handoffs."
---

# AqStoqFlow HRIS Payroll 16 Browser Accessibility

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

## Purpose

Run route smoke, accessibility, visual validation, RBAC negative checks, and release gates.

## Trigger/use cases

Use this skill when dashboard, route, workflow, navigation, sidebar, responsive, or release-candidate changes are in scope.

## Prerequisites

- Implemented slice with focused tests passing.

## Evidence to inspect

- Playwright/browser scripts
- route smoke reports
- screenshots
- accessibility reports
- RBAC configs
- package scripts
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

- smoke scripts
- browser evidence reports
- screenshots
- accessibility reports

## What the skill may change

- focused browser smoke scripts
- saved validation evidence

## What the skill must not change

- production code unless fixing a verified browser/accessibility defect in the active slice

## Required tests or gates

- desktop/tablet/mobile smoke when relevant
- RBAC negative route checks
- accessibility
- visual no-overlap checks

## Required saved report path

`what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_BROWSER_ACCESSIBILITY_RELEASE_<date>.md`

## Handoff conditions

Hand off to 17-migration-backfill-pilot or 18-final-readiness.

## Stop/blocker conditions

Stop if authenticated route evidence cannot be produced or if RBAC negative checks fail.

## Success criteria

Browser evidence proves the route/workflow is usable, scoped, accessible, and release-ready for the active slice.

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

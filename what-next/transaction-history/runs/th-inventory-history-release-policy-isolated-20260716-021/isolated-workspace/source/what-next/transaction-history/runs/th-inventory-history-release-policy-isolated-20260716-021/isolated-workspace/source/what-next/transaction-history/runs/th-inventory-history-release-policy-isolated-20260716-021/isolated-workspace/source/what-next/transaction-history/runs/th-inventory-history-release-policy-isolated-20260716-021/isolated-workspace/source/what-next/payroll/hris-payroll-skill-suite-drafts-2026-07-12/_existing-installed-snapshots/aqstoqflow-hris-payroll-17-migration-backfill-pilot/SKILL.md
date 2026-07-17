---
name: aqstoqflow-hris-payroll-17-migration-backfill-pilot
description: "Handle tenant migration, dry-run diffs, idempotency, rollback/correction, pilot cycle, and signoff. Use when existing tenants move into the new HRIS/payroll spine or unrestricted rollout is considered. Preserve HRIS-first payroll truth, tenant isolation, RBAC, redaction, audit, evidence, and saved-report handoffs."
---

# AqStoqFlow HRIS Payroll 17 Migration Backfill

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

## Purpose

Handle tenant migration, dry-run diffs, idempotency, rollback/correction, pilot cycle, and signoff.

## Trigger/use cases

Use this skill when existing tenants move into the new HRIS/payroll spine or unrestricted rollout is considered.

## Prerequisites

- Input readiness.
- Snapshot correction.
- Country-pack provenance.
- Payments/declarations proof.
- Close assurance.

## Evidence to inspect

- migration scripts
- seed/backfill plans
- pilot certification reports
- dry-run reports
- proof-backfill reports
- rollback procedures
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

- migration/backfill scripts
- fixtures
- pilot reports
- idempotency tests

## What the skill may change

- dry-run scripts
- backfill guards
- idempotency checks
- pilot signoff reports

## What the skill must not change

- production tenant data without explicit dry-run, signoff, and rollback plan

## Required tests or gates

- dry-run diff
- idempotency rerun
- rollback/correction simulation
- pilot close-pack signoff

## Required saved report path

`what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_MIGRATION_BACKFILL_PILOT_<date>.md`

## Handoff conditions

Hand off to 18-final-readiness.

## Stop/blocker conditions

Stop if migration changes are not reversible, not idempotent, or not signed off.

## Success criteria

Pilot tenant migration is proven before unrestricted rollout.

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

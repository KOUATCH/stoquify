---
name: aqstoqflow-hris-payroll-10-snapshot-correction
description: "Build payroll input snapshots, diffing, correction planning, and post-finalization safety. Use when payroll inputs can change after calculation or corrections/backfills are needed. Preserve HRIS-first payroll truth, tenant isolation, RBAC, redaction, audit, evidence, and saved-report handoffs."
---

# AqStoqFlow HRIS Payroll 10 Snapshot Correction

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

## Purpose

Build payroll input snapshots, diffing, correction planning, and post-finalization safety.

## Trigger/use cases

Use this skill when payroll inputs can change after calculation or corrections/backfills are needed.

## Prerequisites

- Input readiness gate.

## Evidence to inspect

- payroll run snapshot models
- correction services
- finalization services
- audit logs
- proof reports
- migration/backfill reports
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

- snapshot services
- correction planners
- audit/proof services
- tests

## What the skill may change

- snapshot persistence
- diff generation
- correction blockers
- post-finalization guards

## What the skill must not change

- finalized ledger/payment records without approved correction flow

## Required tests or gates

- snapshot immutability
- correction diff
- post-finalization block
- approved correction path

## Required saved report path

`what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SNAPSHOT_CORRECTION_<date>.md`

## Handoff conditions

Hand off to 11-payroll-engine-integration.

## Stop/blocker conditions

Stop if payroll can recalculate from live mutable HRIS data after snapshot creation.

## Success criteria

Payroll inputs are immutable snapshots with controlled correction evidence.

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

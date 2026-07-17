---
name: aqstoqflow-hris-payroll-11-payroll-engine-integration
description: "Reconnect payroll calculation to certified HRIS snapshots without weakening the existing payroll kernel. Use when readiness/snapshot layers are complete and payroll calculation needs to consume them. Preserve HRIS-first payroll truth, tenant isolation, RBAC, redaction, audit, evidence, and saved-report handoffs."
---

# AqStoqFlow HRIS Payroll 11 Engine Integration

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

## Purpose

Reconnect payroll calculation to certified HRIS snapshots without weakening the existing payroll kernel.

## Trigger/use cases

Use this skill when readiness/snapshot layers are complete and payroll calculation needs to consume them.

## Prerequisites

- Input readiness.
- Snapshot correction.

## Evidence to inspect

- payroll calculation services
- country-pack adapters
- run services
- payroll kernel tests
- statutory fixture reports
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

- payroll run orchestration
- snapshot input adapters
- focused tests

## What the skill may change

- adapter between certified snapshots and existing payroll engine

## What the skill must not change

- core calculation formulas except through country-pack provenance work

## Required tests or gates

- existing payroll kernel tests
- snapshot-adapter tests
- negative readiness tests

## Required saved report path

`what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ENGINE_INTEGRATION_<date>.md`

## Handoff conditions

Hand off to 12-country-pack-provenance.

## Stop/blocker conditions

Stop if calculation reads directly from mutable HRIS tables instead of certified snapshots.

## Success criteria

Payroll calculation input is deterministic, certified, traceable, and compatible with existing kernel proof.

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

---
name: aqstoqflow-hris-payroll-12-country-pack-provenance
description: "Enforce expert-reviewed statutory country-pack formulas, golden fixtures, source hashes, and legal provenance. Use when OHADA, SYSCOHADA, Cameroon, tax, social security, employer charge, declaration, or statutory formula work is in scope. Preserve HRIS-first payroll truth, tenant isolation, RBAC, redaction, audit, evidence, and saved-report handoffs."
---

# AqStoqFlow HRIS Payroll 12 Country Pack Provenance

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

## Purpose

Enforce expert-reviewed statutory country-pack formulas, golden fixtures, source hashes, and legal provenance.

## Trigger/use cases

Use this skill when OHADA, SYSCOHADA, Cameroon, tax, social security, employer charge, declaration, or statutory formula work is in scope.

## Prerequisites

- Payroll engine integration.
- Current country-pack status.

## Evidence to inspect

- country-pack services
- statutory fixture reports
- authority proof reports
- regulatory hardcode gates
- formula source documents
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

- country-pack registry
- fixtures
- provenance metadata
- tests

## What the skill may change

- provenance metadata
- fixture coverage
- fail-closed formula gates
- reports

## What the skill must not change

- formulas without expert-reviewed source evidence

## Required tests or gates

- regulatory hardcode gate
- golden fixture tieout
- unsupported country fail-closed
- source hash verification

## Required saved report path

`what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_COUNTRY_PACK_PROVENANCE_<date>.md`

## Handoff conditions

Hand off to 13-payments-declarations-proof.

## Stop/blocker conditions

Stop if statutory formulas lack source, review, fixture, or provenance.

## Success criteria

Country-pack calculations are evidence-backed, fixture-proven, and safe to expose to payroll runs.

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

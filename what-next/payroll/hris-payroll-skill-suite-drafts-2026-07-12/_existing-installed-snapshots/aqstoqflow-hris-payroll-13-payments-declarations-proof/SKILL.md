---
name: aqstoqflow-hris-payroll-13-payments-declarations-proof
description: "Certify payment provider proof, authority declaration proof, settlement receipts, callbacks, and reconciliation. Use when payment release, declaration submission, provider callback handling, or authority proof lifecycle work is in scope. Preserve HRIS-first payroll truth, tenant isolation, RBAC, redaction, audit, evidence, and saved-report handoffs."
---

# AqStoqFlow HRIS Payroll 13 Payments Declarations

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

## Purpose

Certify payment provider proof, authority declaration proof, settlement receipts, callbacks, and reconciliation.

## Trigger/use cases

Use this skill when payment release, declaration submission, provider callback handling, or authority proof lifecycle work is in scope.

## Prerequisites

- Payroll run outputs.
- Country-pack provenance.
- Approved payment destination evidence.

## Evidence to inspect

- payment provider services
- declaration services
- authority adapter reports
- reconciliation reports
- callback handlers
- proof drawers
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

- payment/declaration proof services
- reconciliation workers
- tests

## What the skill may change

- proof envelope validation
- callback idempotency
- settlement/declaration tieout checks

## What the skill must not change

- employee bank/mobile-money data without HRIS document/evidence approval

## Required tests or gates

- approved destination required
- provider callback dedupe
- declaration authority proof
- settlement tieout

## Required saved report path

`what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_PAYMENTS_DECLARATIONS_PROOF_<date>.md`

## Handoff conditions

Hand off to 14-accounting-close-assurance.

## Stop/blocker conditions

Stop if payments or declarations can be released without proof evidence and maker-checker approval.

## Success criteria

Every payment and declaration is traceable from certified payroll run to external proof and reconciliation.

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

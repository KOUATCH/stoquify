---
name: stoquify-hris-18-migration-backfill-pilot
description: "Plan and execute Stoquify HRIS migration, backfill, dry-run, idempotency, reconciliation, rollback, and pilot close signoff. Use before moving real tenants to People Core ownership."
---

# Stoquify HRIS 18 Migration Backfill Pilot

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Move tenant data safely without corrupting HRIS, payroll, accounting, or audit history.

## Trigger/use cases

Use after implementation and browser/RBAC gates are ready for pilot data.

## Prerequisites

- Implemented People Core slices.
- Schema/backfill plan.
- Pilot tenant scope.
- Rollback/correction plan.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- prisma/migrations/
- scripts/
- what-next/prisma-migration-deployment-readiness.md
- what-next/payroll/*BACKFILL*
- what-next/payroll/*PILOT*

## Files/surfaces likely touched

- migration/backfill scripts
- dry-run reports
- pilot reports
- tests

## What the skill may change

- Add dry-run scripts.
- Add idempotency checks.
- Add reconciliation hashes.
- Add pilot close signoff report.

## What the skill must not change

- Mutate production tenant data without dry-run and owner signoff.
- Delete historical evidence records.

## Required tests or gates

- Dry-run diff.
- Idempotency rerun.
- Rollback/correction simulation.
- Pilot close-pack signoff.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-19-final-readiness`.

## Stop/blocker conditions

Stop if migration history, tenant data quality, or rollback proof is incomplete.

## Success criteria

Pilot migration is reconciled, repeatable, reversible by correction, and signed off.

## Execution Workflow

1. Read the governing HRIS analysis, skill-system blueprint, current status register, and the latest report for the active slice.
2. Confirm the prerequisites before making code or report changes.
3. Inspect only the surfaces needed for this skill.
4. Preserve tenant isolation, RBAC, redaction, audit, evidence hashes, and payroll/accounting ownership boundaries.
5. Stop and save a blocker report when a prerequisite or risk control fails.
6. Change only the active slice when implementation is explicitly requested.
7. Run the smallest honest verification gate set.
8. Save the required report and name the next handoff skill.

## Shared Risk Controls

- Do not duplicate employee master truth.
- Do not let payroll invent mutable HRIS facts.
- Do not run payroll from uncertified, stale, or UI-derived HRIS inputs.
- Do not leak salary, identifiers, payment destination data, raw documents, provider payloads, or authority payloads.
- Do not broaden work outside the active slice.
- Do not claim unrestricted production readiness from controlled-pilot evidence.

## Report Contract

Every run must report scope, files inspected, files changed, current blockers, data ownership, tenant/RBAC decision, audit/redaction decision, gates run, skipped checks, residual risk, and next handoff skill.

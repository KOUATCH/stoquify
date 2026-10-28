---
name: stoquify-hris-01-current-state-register
description: "Reconcile the Stoquify HRIS proposal, repo state, and payroll evidence into one current truth register. Use before People Core implementation, after long gaps, or when HRIS/payroll readiness is disputed."
---

# Stoquify HRIS 01 Current State Register

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Create the canonical current-state register for HRIS, payroll, accounting, RBAC, UI, migration, and release evidence.

## Trigger/use cases

Use before implementing People Core or when old reports may conflict with newer payroll proof.

## Prerequisites

- Orchestrator report or explicit user request.
- Readable HRIS proposal and prior payroll reports.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- prisma/schema.prisma
- services/payroll/
- actions/payroll/
- components/payroll/
- app/[locale]/(dashboard)/dashboard/payroll/
- config/permissions.ts
- config/sidebar.ts
- lib/security/rbac-permissions.ts
- services/security/redaction-policy.service.ts
- services/accounting/
- services/finance/

## Files/surfaces likely touched

- Status register report.
- Optional supersession map report.

## What the skill may change

- Save current-state and blocker tables.
- Mark closed, open, superseded, and pilot-only evidence.

## What the skill must not change

- Edit production code.
- Treat stale reports as current truth without evidence.

## Required tests or gates

- Every major blocker class appears in the register.
- Current next handoff is named.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_CURRENT_STATE_REGISTER_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-02-people-boundary-facade` when the register is current.

## Stop/blocker conditions

Stop if evidence conflicts require owner decision.

## Success criteria

The register identifies current posture, open blockers, closed evidence, and next safe implementation skill.

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

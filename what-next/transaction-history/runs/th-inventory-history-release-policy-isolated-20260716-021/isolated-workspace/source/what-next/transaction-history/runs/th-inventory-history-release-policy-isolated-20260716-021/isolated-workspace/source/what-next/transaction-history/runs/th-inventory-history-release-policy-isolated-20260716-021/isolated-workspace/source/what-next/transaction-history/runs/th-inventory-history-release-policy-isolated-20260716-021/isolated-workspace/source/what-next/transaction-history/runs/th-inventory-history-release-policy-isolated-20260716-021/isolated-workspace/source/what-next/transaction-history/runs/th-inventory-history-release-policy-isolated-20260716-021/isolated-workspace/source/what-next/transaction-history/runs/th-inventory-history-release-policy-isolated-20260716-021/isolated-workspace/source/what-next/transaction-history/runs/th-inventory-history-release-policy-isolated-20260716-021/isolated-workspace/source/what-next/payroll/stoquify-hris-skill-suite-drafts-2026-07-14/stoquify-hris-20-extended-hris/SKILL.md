---
name: stoquify-hris-20-extended-hris
description: "Govern deferred Stoquify HRIS modules such as recruitment, performance, training, disciplinary workflows, surveys, workforce planning, analytics, and advanced benefits after People Core is stable. Use to prevent broad HRIS overbuild before the core is ready."
---

# Stoquify HRIS 20 Extended HRIS

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Add broader HRIS capabilities only after People Core and payroll assurance are stable.

## Trigger/use cases

Use after final readiness for People Core or when evaluating deferred HRIS modules.

## Prerequisites

- People Core is production-ready or controlled-pilot limitations are explicit.
- Module entitlement and product packaging decisions.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- docs/modules/
- what-next/module-surface-inventory.md
- config/sidebar.ts
- config/permissions.ts

## Files/surfaces likely touched

- Extended HRIS module plans
- module entitlement docs
- reports
- optional future code only when approved

## What the skill may change

- Prioritize deferred HRIS modules.
- Define module contracts.
- Add skill prompts for specific future modules.

## What the skill must not change

- Start recruitment/performance/training before People Core evidence is stable.
- Bypass HRIS boundary, RBAC, redaction, audit, or release governance.

## Required tests or gates

- Each extension has owner, boundary, data model, RBAC, redaction, tests, and release gates.
- Module entitlement is defined before UI exposure.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_EXTENDED_HRIS_<date>.md`

## Handoff conditions

Hand off to a module-specific skill only after approval.

## Stop/blocker conditions

Stop if the module would dilute payroll-ready People Core before it is stable.

## Success criteria

Deferred HRIS growth is governed rather than bolted on.

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

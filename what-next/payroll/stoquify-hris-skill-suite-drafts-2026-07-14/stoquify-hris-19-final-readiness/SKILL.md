---
name: stoquify-hris-19-final-readiness
description: "Produce the final Stoquify HRIS/payroll go/no-go decision with evidence completeness, release gates, owner signoff, environment, tenant/country scope, and commit SHA. Use before unrestricted production claims."
---

# Stoquify HRIS 19 Final Readiness

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Make the launch decision explicit, evidence-backed, and honest about scope.

## Trigger/use cases

Use after all required People Core, payroll, accounting, browser, migration, and release gates are complete.

## Prerequisites

- All prior skills complete or explicitly waived with owner/date/risk.
- Current CI and gate evidence.
- Pilot signoff.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- all `STOQUIFY_HRIS_*` reports
- what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_FINAL_READINESS_*
- package.json
- CI evidence
- git status

## Files/surfaces likely touched

- Final readiness report only unless missing evidence requires a blocker report.

## What the skill may change

- Save go/no-go report.
- Name launch scope.
- List waivers and owners.
- Name residual risks.

## What the skill must not change

- Mark unrestricted production ready when required proof is missing.
- Hide skipped checks.

## Required tests or gates

- Evidence completeness checklist.
- Focused suite replay where feasible.
- Route smoke proof.
- Release blocker review.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_FINAL_READINESS_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-20-extended-hris` only after controlled People Core release is real.

## Stop/blocker conditions

Stop as NO-GO if any critical HRIS/payroll/accounting/security release gate lacks proof.

## Success criteria

A scoped, signed, evidence-backed go/no-go decision is saved.

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

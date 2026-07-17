---
name: stoquify-hris-00-orchestrator
description: "Select the next safe Stoquify HRIS People Core slice and keep the HRIS/payroll roadmap in dependency order. Use when asked to run, continue, pilot, or coordinate the HRIS skill suite without breaking payroll, accounting, RBAC, redaction, audit, evidence, or saved-report handoffs."
---

# Stoquify HRIS 00 Orchestrator

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Select the next safe People Core skill, prevent payroll-first drift, and save the ordered handoff report.

## Trigger/use cases

Use when the user asks to run the Stoquify HRIS skill suite, continue HRIS work, choose the next step, or pilot the installed skills.

## Prerequisites

- Readable HRIS implementation analysis and targeted skill-system blueprint.
- Readable `docs/HR-Payroll/` and `what-next/payroll/` evidence.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- git status
- installed `stoquify-hris-*` skills
- installed `aqstoqflow-hris-payroll-*` skills

## Files/surfaces likely touched

- Planning reports only unless a downstream skill is explicitly selected.

## What the skill may change

- Save an orchestration report.
- Name the next handoff skill and stop conditions.

## What the skill must not change

- Change production code.
- Change database schema.
- Overwrite installed payroll skills.

## Required tests or gates

- Report consistency grep.
- No-production-code-change check for the orchestrator run.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_ORCHESTRATOR_REPORT_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-01-current-state-register` unless a current register already exists and points to a later safe skill.

## Stop/blocker conditions

Stop if required roadmap or status documents conflict and cannot be reconciled from repo evidence.

## Success criteria

One next skill is selected with prerequisites, verification, blockers, and next report path.

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

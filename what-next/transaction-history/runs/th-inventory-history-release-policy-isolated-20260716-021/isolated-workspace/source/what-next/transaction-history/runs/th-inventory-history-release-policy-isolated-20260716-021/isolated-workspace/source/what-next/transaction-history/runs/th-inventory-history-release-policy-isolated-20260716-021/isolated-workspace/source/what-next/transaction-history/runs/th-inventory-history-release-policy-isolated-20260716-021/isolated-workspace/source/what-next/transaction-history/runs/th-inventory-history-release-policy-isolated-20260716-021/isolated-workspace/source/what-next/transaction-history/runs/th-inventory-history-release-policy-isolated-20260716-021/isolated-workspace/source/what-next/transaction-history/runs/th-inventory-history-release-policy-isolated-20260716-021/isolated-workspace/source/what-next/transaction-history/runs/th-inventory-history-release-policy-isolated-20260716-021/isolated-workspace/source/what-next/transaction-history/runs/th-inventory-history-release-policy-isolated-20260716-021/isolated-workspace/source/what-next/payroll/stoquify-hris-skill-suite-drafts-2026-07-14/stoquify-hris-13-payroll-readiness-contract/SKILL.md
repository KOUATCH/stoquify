---
name: stoquify-hris-13-payroll-readiness-contract
description: "Connect Stoquify People Core facts to payroll input readiness, certified snapshots, correction diffing, and payroll engine consumption. Use when proving payroll consumes HRIS proof only."
---

# Stoquify HRIS 13 Payroll Readiness Contract

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Bind HRIS People Core outputs to the existing payroll readiness and snapshot chain.

## Trigger/use cases

Use after People Core source domains produce enough approved facts for payroll readiness.

## Prerequisites

- Employee, contract, compensation, payment destination, and time/leave readiness sources.
- Existing payroll readiness and snapshot reports.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- services/payroll/payroll-control.service.ts
- what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_INPUT_READINESS_GATE_2026-07-12.md
- what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SNAPSHOT_CORRECTION_2026-07-12.md
- what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ENGINE_INTEGRATION_2026-07-12.md

## Files/surfaces likely touched

- services/hris/readiness.service.ts
- services/payroll/payroll-control.service.ts
- tests
- report

## What the skill may change

- Add HRIS readiness export contract.
- Add source hash propagation.
- Add fail-closed stale proof handling.

## What the skill must not change

- Let payroll read live mutable HRIS tables when certified snapshot proof is required.

## Required tests or gates

- Payroll consumes certified HRIS proof only.
- Stale or missing proof fails closed.
- Existing payroll-control tests remain green.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_PAYROLL_READINESS_CONTRACT_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-14-employee-self-service`.

## Stop/blocker conditions

Stop if HRIS source proof cannot be reconciled with existing payroll run metadata.

## Success criteria

Payroll readiness and snapshots can cite HRIS People Core proof end to end.

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

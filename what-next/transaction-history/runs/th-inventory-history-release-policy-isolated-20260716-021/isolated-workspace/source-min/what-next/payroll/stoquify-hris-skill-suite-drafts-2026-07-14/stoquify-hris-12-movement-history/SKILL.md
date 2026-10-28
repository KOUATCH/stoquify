---
name: stoquify-hris-12-movement-history
description: "Build Stoquify HRIS movement history from audit logs, business events, lifecycle events, contracts, compensation, documents, payment destination, attendance freezes, and payroll snapshots. Use when HR changes must be explainable and redacted."
---

# Stoquify HRIS 12 Movement History

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Create the evidence timeline that explains employee and payroll source changes without leaking sensitive details.

## Trigger/use cases

Use after approval workflows or when HR history/reporting is requested.

## Prerequisites

- Employee profile.
- Audit/business event sources.
- Redaction policy.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- prisma/schema.prisma
- services/security/redaction-policy.service.ts
- services/payroll/
- services/accounting/close-assurance-pack.service.ts

## Files/surfaces likely touched

- services/hris/movement-history.service.ts
- components/hris/
- tests
- report

## What the skill may change

- Add movement read model.
- Normalize event types.
- Add proof badges and redaction reasons.

## What the skill must not change

- Expose raw before/after sensitive values.
- Treat missing audit events as proof.

## Required tests or gates

- Redacted event payload tests.
- Tenant-scoped filters.
- Proof badge consistency checks.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_MOVEMENT_HISTORY_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-13-payroll-readiness-contract`.

## Stop/blocker conditions

Stop if source events are too sparse to support an honest history claim.

## Success criteria

HRIS can explain person and payroll-input movement with safe, scoped evidence.

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

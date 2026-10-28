---
name: stoquify-hris-10-time-leave-attendance-engine
description: "Build Stoquify HRIS schedules, calendars, holidays, leave policies, balances, requests, approvals, overtime, attendance imports, corrections, and payroll freeze contracts. Use before payroll relies on full time/leave truth."
---

# Stoquify HRIS 10 Time Leave Attendance Engine

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Move from aggregate payroll attendance snapshots to operational time, leave, attendance, and overtime source truth.

## Trigger/use cases

Use after core employee, org, contract, compensation, and destination controls are safe.

## Prerequisites

- Employee identity.
- Manager scope.
- Contract and compensation controls.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- services/payroll/payroll-control.service.ts
- components/payroll/PayrollPaymentAttendanceReadinessWorkbench.tsx
- services/payroll/__tests__/payroll-control.service.test.ts

## Files/surfaces likely touched

- services/hris/time-leave.service.ts
- actions/hris/
- People route components
- tests
- report

## What the skill may change

- Add time/leave contracts.
- Add approval and correction chains.
- Produce certified period freeze proof for payroll.

## What the skill must not change

- Let payroll calculate from mutable time data.
- Build leave UI before policy/balance/readiness contracts exist.

## Required tests or gates

- Unapproved time/leave blocks payroll.
- Approved freeze creates immutable input proof.
- Corrections create diff evidence.
- Manager approval tests.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_TIME_LEAVE_ATTENDANCE_ENGINE_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-11-approval-inbox`.

## Stop/blocker conditions

Stop if country/company leave policy rules are not modeled enough to avoid incorrect payroll impact.

## Success criteria

Payroll can consume certified time/leave/attendance proof instead of raw mutable inputs.

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

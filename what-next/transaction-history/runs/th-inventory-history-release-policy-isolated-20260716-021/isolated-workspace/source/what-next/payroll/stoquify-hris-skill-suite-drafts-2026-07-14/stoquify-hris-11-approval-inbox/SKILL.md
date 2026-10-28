---
name: stoquify-hris-11-approval-inbox
description: "Create Stoquify HRIS approval inbox and maker-checker flows for lifecycle, contract, document, compensation, payment destination, leave, attendance, and corrections. Use when pending approvals must block readiness safely."
---

# Stoquify HRIS 11 Approval Inbox

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Centralize HR and manager approvals with safe states, SoD, audit, and readiness blockers.

## Trigger/use cases

Use after the first workflow domains exist and before self-service is opened.

## Prerequisites

- At least one HRIS workflow domain with request/review/apply states.
- RBAC/fresh-auth policy.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- actions/payroll/
- services/payroll/compensation.service.ts
- services/payroll/payment-evidence.service.ts
- services/payroll/contract.service.ts

## Files/surfaces likely touched

- services/hris/approval-inbox.service.ts
- actions/hris/
- components/hris/
- tests
- report

## What the skill may change

- Add approval read models.
- Add deny/approve/apply state transitions.
- Add readiness blockers for pending approval.

## What the skill must not change

- Use client state as approval truth.
- Allow high-risk self-approval.

## Required tests or gates

- SoD matrix tests.
- Pending approval blocker tests.
- Denied/error-state safety tests.
- Audit event tests.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_APPROVAL_INBOX_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-12-movement-history`.

## Stop/blocker conditions

Stop if workflow states are not explicit enough to audit.

## Success criteria

Approvals are visible, scoped, auditable, and tied to readiness.

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

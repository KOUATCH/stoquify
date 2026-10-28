---
name: stoquify-hris-09-payment-destination-privacy
description: "Own Stoquify employee payment-destination request, approval, privacy, masking, hashing, fresh-auth, and payroll-release readiness. Use when moving destination evidence from payroll-only screens into HRIS People Core."
---

# Stoquify HRIS 09 Payment Destination Privacy

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Make approved payment destination an HRIS-owned sensitive workflow consumed by payroll release.

## Trigger/use cases

Use after compensation controls or when payment-destination privacy is changed.

## Prerequisites

- Employee identity profile.
- RBAC/fresh-auth policy for sensitive HRIS actions.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- services/payroll/payment-evidence.service.ts
- actions/payroll/payroll-payment-evidence.actions.ts
- services/payroll/payroll-control.service.ts
- services/security/redaction-policy.service.ts

## Files/surfaces likely touched

- services/hris/payment-destination.service.ts
- actions/hris/
- tests
- report

## What the skill may change

- Wrap existing payment-destination change requests.
- Add HRIS self-service request flow.
- Propagate approved hashes to payroll proof.

## What the skill must not change

- Persist or expose raw bank/mobile-money values in reports.
- Allow requester and approver to be the same actor for high-risk changes.

## Required tests or gates

- Fresh-auth tests.
- Masked/hash-only payload tests.
- Payment release readiness tests.
- Maker-checker tests.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_PAYMENT_DESTINATION_PRIVACY_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-10-time-leave-attendance-engine`.

## Stop/blocker conditions

Stop if encryption/HMAC and reveal/export policy are undefined for recoverable sensitive data.

## Success criteria

Payment destinations are approved, masked/hash-backed, fresh-auth protected, and payroll-consumable.

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

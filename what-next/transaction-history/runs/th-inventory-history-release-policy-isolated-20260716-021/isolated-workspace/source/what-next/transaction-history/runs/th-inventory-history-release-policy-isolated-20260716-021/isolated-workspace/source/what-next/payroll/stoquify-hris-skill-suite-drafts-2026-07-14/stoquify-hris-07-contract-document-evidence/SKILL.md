---
name: stoquify-hris-07-contract-document-evidence
description: "Wrap Stoquify contracts and HR document evidence behind HRIS approval, retention, legal-hold, redaction, and secure-access controls. Use before exposing contract or document workflows in People Core."
---

# Stoquify HRIS 07 Contract Document Evidence

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Move contracts and HR documents into HRIS-owned evidence workflows with safe access boundaries.

## Trigger/use cases

Use after employee identity and org scope are understood.

## Prerequisites

- Employee identity profile.
- Document redaction and retention decisions.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- services/payroll/contract.service.ts
- actions/payroll/payroll-contract.actions.ts
- services/security/redaction-policy.service.ts
- prisma/schema.prisma

## Files/surfaces likely touched

- services/hris/contract.service.ts
- services/hris/document-evidence.service.ts
- tests
- report

## What the skill may change

- Wrap current contract model.
- Add document metadata/access decisions.
- Add contract approval and expiry risk views.

## What the skill must not change

- Expose raw documents without short-lived authorized access.
- Delete legal/audit evidence needed for disputes.

## Required tests or gates

- Contract overlap tests.
- Signed evidence tests.
- Document access denial tests.
- Export redaction tests.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_CONTRACT_DOCUMENT_EVIDENCE_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-08-compensation-benefits-control`.

## Stop/blocker conditions

Stop if raw storage, malware scanning, or retention requirements are not decided before download exposure.

## Success criteria

Contracts and documents are approval-backed, redacted, and payroll-readiness aware.

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

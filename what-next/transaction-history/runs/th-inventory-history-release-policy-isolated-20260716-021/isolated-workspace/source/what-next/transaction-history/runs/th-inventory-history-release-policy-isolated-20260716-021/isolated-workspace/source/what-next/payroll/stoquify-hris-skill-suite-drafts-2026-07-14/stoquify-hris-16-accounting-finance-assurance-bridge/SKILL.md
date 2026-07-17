---
name: stoquify-hris-16-accounting-finance-assurance-bridge
description: "Prove Stoquify HRIS changes flow safely through payroll, finance, accounting, data trust, and close assurance. Use when People Core proof must support registers, ledger posting, forecasts, auditor packs, and close blockers."
---

# Stoquify HRIS 16 Accounting Finance Assurance Bridge

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Purpose

Keep people truth, payroll proof, money truth, and close assurance aligned.

## Trigger/use cases

Use after People Core and payroll readiness proof are connected.

## Prerequisites

- Payroll readiness contract.
- Recent payment/declaration proof.
- Recent accounting close assurance proof.

## Evidence to inspect

- docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md
- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md
- docs/HR-Payroll/
- what-next/payroll/
- services/accounting/data-trust.service.ts
- services/accounting/close-assurance-pack.service.ts
- services/finance/finance-dashboard.service.ts
- what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_PAYMENTS_DECLARATIONS_PROOF_2026-07-14.md
- what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ACCOUNTING_CLOSE_ASSURANCE_2026-07-14.md

## Files/surfaces likely touched

- services/accounting/
- services/finance/
- services/hris/
- tests
- report

## What the skill may change

- Add HRIS proof references to finance/accounting read models.
- Add close blockers for missing HRIS/payroll proof.
- Add redacted auditor exports.

## What the skill must not change

- Expose person-level payroll detail in accounting broad reports.
- Let accounting mutate HR profile truth.

## Required tests or gates

- Register-to-ledger tieout.
- Close fails on missing HRIS/payroll proof.
- Redacted auditor export tests.

## Required saved report path

`what-next/payroll/STOQUIFY_HRIS_ACCOUNTING_FINANCE_ASSURANCE_BRIDGE_<date>.md`

## Handoff conditions

Hand off to `stoquify-hris-17-browser-accessibility-rbac-release`.

## Stop/blocker conditions

Stop if finance/accounting proof would require raw employee-level data outside authorized contexts.

## Success criteria

Finance and close assurance can rely on aggregate/hash-backed HRIS/payroll proof.

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

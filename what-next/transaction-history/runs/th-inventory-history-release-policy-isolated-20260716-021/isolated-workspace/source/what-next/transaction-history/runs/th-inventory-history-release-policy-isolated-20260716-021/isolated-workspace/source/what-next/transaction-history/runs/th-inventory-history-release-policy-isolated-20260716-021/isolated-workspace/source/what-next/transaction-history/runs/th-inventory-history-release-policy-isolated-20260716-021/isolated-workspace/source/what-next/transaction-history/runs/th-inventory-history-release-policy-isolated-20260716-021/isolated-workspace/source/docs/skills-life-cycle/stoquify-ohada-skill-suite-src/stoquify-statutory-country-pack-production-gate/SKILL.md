---
name: stoquify-statutory-country-pack-production-gate
description: Audit, implement, and verify Stoquify OHADA/SYSCOHADA statutory country-pack production readiness. Use for tax, payroll, declarations, fiscal adapters, country configuration, expert-review blockers, sandbox versus production claims, and compliance evidence.
---

# Stoquify Statutory Country Pack Production Gate

## Purpose

Prevent false production-readiness claims for OHADA/SYSCOHADA, tax, payroll, declarations, fiscal adapters, and country packs.

## Required First Reads

1. `services/compliance/adapters/registry.ts`
2. `services/compliance/adapters/`
3. `services/compliance/adapter-contract.ts`
4. `services/payroll/payroll-tax-rule-evaluator.ts`
5. `services/payroll/`

Read `references/evidence-map.md` for statutory surfaces. Read `references/verification.md` before checks.

## Workflow

1. Identify jurisdiction, obligation, adapter, payroll rule, tax rule, or declaration lifecycle in scope.
2. Classify support status: unsupported, sandbox, blocked pending expert review, pilot, or production-supported.
3. Verify production paths require official specs, sandbox proof, expert review, and release evidence.
4. Keep statutory and country-pack configuration data-driven rather than hardcoded into workflows.
5. Add blockers or tests where unsupported flows can be misrepresented as production-ready.
6. Save statutory readiness evidence for any material change.

## Guardrails

- Do not claim legal, fiscal, payroll, tax, or OHADA production support without reviewed evidence.
- Do not convert sandbox adapters into production adapters by renaming.
- Do not bury expert-review blockers in UI text only.
- Do not hardcode mutable statutory rates or compliance rules in generic services.

## Output Contract

Report country/obligation, support status, evidence inspected, blockers, changed files, verification results, and residual statutory risk.

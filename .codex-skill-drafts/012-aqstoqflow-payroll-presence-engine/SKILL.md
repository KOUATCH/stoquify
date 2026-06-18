---
name: 012-aqstoqflow-payroll-presence-engine
description: Build HR, employee contracts, presence, attendance, leave, payroll runs, payslips, deductions, and payroll payment controls. Use when HR, employees, contracts, attendance, presence, leave, payroll, payslips, deductions, CNPS, social security, or payroll payments in the AqStoqFlow/OHADA SMB platform, especially when implementing the numbered skill suite with gates, errors, notifications, evidence, and enterprise release discipline.
---

# Payroll Presence Engine

This skill implements one boundary of the AqStoqFlow numbered OHADA SMB platform suite.

## Required Context

Read these files when present:

- `references/chunk-blueprint.md`
- `what-next/AQSTOQFLOW_ORDERED_IMPLEMENTATION_CHUNKS_AND_SKILL_SUITE_2026-06-14.md`
- `what-next/OHADA_SMB_PLATFORM_TECHNICAL_SPEC_2026-06-14.md`
- `docs/OHADA_SMB_PLATFORM_TECHNICAL_SPEC_2026-06-14.md`
- `graphify-out/GRAPH_REPORT.md`

Previous required skill: `011-aqstoqflow-purchasing-ap-controls`.
Next recommended skill: `013-aqstoqflow-data-trust-accountant-portal`.

## Focus

Auditable workforce and payroll controls.

## Operating Rules

1. Start by identifying the current repo state and the active chunk boundary.
2. Reuse graph-visible foundations before introducing new primitives.
3. Keep edits limited to the active chunk and its direct dependencies.
4. Treat legal, tax, payroll, social-security, fiscal-device, and authority-submission behavior as requiring expert validation before production claims.
5. Add gates, typed errors, notifications, audit evidence, and verification in the same slice as the feature.
6. Stop instead of advancing when a CRITICAL or HIGH invariant fails.

## Companion Skills

Load companion skills when their trigger applies:

- `stockflow-ohada-saas-backbone`
- `ohada-compliance-oracle`
- `ledger-first-business-events`
- `enterprise-error-handling`
- `enterprise-fraud-and-controls`
- `review`

## Required Gates

Apply tenant, RBAC, ledger, error, notification, idempotency, evidence, UX, observability, and verification gates. The detailed gate language lives in the suite blueprint.

## Output Contract

End with:

- selected skill: `012-aqstoqflow-payroll-presence-engine`
- files changed
- gates passed
- gates blocked
- verification result
- next recommended numbered skill

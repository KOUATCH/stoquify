---
name: 011-aqstoqflow-purchasing-ap-controls
description: Implement requisitions, purchase orders, receiving, supplier invoices, AP approvals, payments, and supplier risk controls. Use when purchasing, requisitions, purchase orders, goods receipt, supplier invoices, AP, supplier payments, or supplier bank controls in the AqStoqFlow/OHADA SMB platform, especially when implementing the numbered skill suite with gates, errors, notifications, evidence, and enterprise release discipline.
---

# Purchasing AP Controls

This skill implements one boundary of the AqStoqFlow numbered OHADA SMB platform suite.

## Required Context

Read these files when present:

- `references/chunk-blueprint.md`
- `what-next/AQSTOQFLOW_ORDERED_IMPLEMENTATION_CHUNKS_AND_SKILL_SUITE_2026-06-14.md`
- `what-next/OHADA_SMB_PLATFORM_TECHNICAL_SPEC_2026-06-14.md`
- `docs/OHADA_SMB_PLATFORM_TECHNICAL_SPEC_2026-06-14.md`
- `graphify-out/GRAPH_REPORT.md`

Previous required skill: `010-aqstoqflow-inventory-valuation-kernel`.
Next recommended skill: `012-aqstoqflow-payroll-presence-engine`.

## Focus

Procure-to-pay controls with ledger and fraud safeguards.

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

- selected skill: `011-aqstoqflow-purchasing-ap-controls`
- files changed
- gates passed
- gates blocked
- verification result
- next recommended numbered skill

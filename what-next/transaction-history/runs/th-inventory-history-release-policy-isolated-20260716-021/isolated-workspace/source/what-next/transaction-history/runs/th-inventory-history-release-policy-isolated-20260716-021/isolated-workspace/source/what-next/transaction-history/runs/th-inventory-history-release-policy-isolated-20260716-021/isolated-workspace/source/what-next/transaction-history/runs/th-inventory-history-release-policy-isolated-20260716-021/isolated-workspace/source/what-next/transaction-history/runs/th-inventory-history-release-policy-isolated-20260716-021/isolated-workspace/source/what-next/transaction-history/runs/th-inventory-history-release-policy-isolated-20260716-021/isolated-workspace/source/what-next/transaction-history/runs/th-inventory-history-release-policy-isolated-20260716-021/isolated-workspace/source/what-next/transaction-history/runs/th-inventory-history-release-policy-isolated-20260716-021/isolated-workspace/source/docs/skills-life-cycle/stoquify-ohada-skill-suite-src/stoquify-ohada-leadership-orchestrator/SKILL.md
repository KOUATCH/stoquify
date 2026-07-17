---
name: stoquify-ohada-leadership-orchestrator
description: Coordinate the Stoquify OHADA SMB skill suite. Use when asked to improve Stoquify toward operating-system leadership, choose the next skill, execute a multi-skill audit or implementation sequence, turn a report into implementation chunks, or produce evidence-backed run reports.
---

# Stoquify OHADA Leadership Orchestrator

## Purpose

Route Stoquify/OHADA platform requests to the right reusable skill, keep the scope narrow, preserve service-owned truth, select verification commands, and save evidence when work is material.

## Required First Reads

1. `docs/skills-life-cycle/stoquify-ohada-skill-suite-src/manifest.md`
2. `docs/skills-life-cycle/STOQUIFY_OHADA_SMB_SKILL_SUITE_EXECUTION_BLUEPRINT_2026-07-11.md`
3. `docs/skills-life-cycle/STOQUIFY_OHADA_SMB_SKILLS_AUDIT_REPORT_2026-07-11.md`
4. `package.json`

Read `references/evidence-routing.md` before selecting a skill for a broad or ambiguous request.

## Workflow

1. Classify the request as audit, implementation, verification, skill creation/update, release synthesis, UI/UX review, or product strategy.
2. Identify the domain: service boundary, RBAC, public/API security, accounting/ledger, purchasing/AP, payment reconciliation, offline POS, statutory country pack, reporting/export trust, UI/UX, or release evidence.
3. Select exactly one primary skill. Select at most two supporting skills when the request crosses boundaries.
4. State scope and non-goals before editing files.
5. Inspect only the evidence needed for the selected domain.
6. Execute the smallest useful slice.
7. Run focused verification. Avoid broad repo checks unless release readiness is the explicit goal.
8. Save a run report under `what-next/skills-life-cycle/` for any material audit, implementation, or release synthesis.
9. Recommend the next skill only after reporting evidence and residual risk.

## Routing Defaults

- Service ownership, direct DB access, action/API boundaries: use `stoquify-service-boundary-ratchet`.
- Permissions, tenant isolation, module entitlement, fresh auth: use `stoquify-rbac-tenant-freshauth-enforcer`.
- Public receipts, external APIs, raw-ID access, redaction, abuse resistance: use `stoquify-public-api-abuse-boundary`.
- Ledger posting, source links, close invalidation, journals: use `stoquify-ledger-close-truth-guardian`.
- Bank, mobile money, cash, suspense, provider evidence: use `stoquify-payment-recon-cash-truth-moat`.
- Purchase orders, goods receipt, supplier invoices, AP controls: use `stoquify-purchasing-ap-consolidator`.
- Offline POS replay, fiscal numbering, device sequence, provisional receipts: use `stoquify-offline-pos-fiscal-replay-finalizer`.
- OHADA/SYSCOHADA, country packs, tax, payroll statutory adapters: use `stoquify-statutory-country-pack-production-gate`.
- BI, reports, exports, provenance, currency, redaction: use `stoquify-report-trust-export-certifier`.
- Role dashboards, command-center UI, robust states, accessibility: use `stoquify-role-based-operating-cockpit-uiux`.
- Run reports, verification summaries, release evidence: use `stoquify-release-evidence-ratchet`.

## Guardrails

- Do not run all skills by default.
- Do not broaden scope because adjacent issues are visible.
- Do not make production statutory claims without expert-reviewed evidence.
- Do not create dashboard-only truth; require service-owned read models before UI.
- Do not revert unrelated user changes.
- Do not install skills outside the workspace without explicit approval when required by the sandbox.

## Output Contract

Return the selected skill, mode, scope, files inspected, actions taken, verification results, saved report path, unresolved blockers, and next recommended skill.

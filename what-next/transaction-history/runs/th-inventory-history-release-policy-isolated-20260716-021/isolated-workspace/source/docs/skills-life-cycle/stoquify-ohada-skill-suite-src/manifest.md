# Stoquify OHADA Skill Suite Manifest

Source date: 2026-07-11

Source blueprint: `docs/skills-life-cycle/STOQUIFY_OHADA_SMB_SKILL_SUITE_EXECUTION_BLUEPRINT_2026-07-11.md`

Install target after approval: `C:\Users\J COMPUTER\.codex\skills`

## Purpose

This manifest defines the reusable Codex skill suite for advancing Stoquify toward OHADA SMB operating-system leadership. The suite is organized around service-owned truth, tenant-safe access, finance-grade evidence, statutory honesty, report trust, role-based usability, and release evidence.

## Execution Rule

Use `stoquify-ohada-leadership-orchestrator` first for multi-skill or ambiguous requests. It selects the primary skill, limits scope, identifies evidence, chooses verification commands, and decides whether a run report is required.

## Skill Bundles

| Order | Skill | Bundle | Type | Primary Mission |
| --- | --- | --- | --- | --- |
| 0 | `stoquify-ohada-leadership-orchestrator` | Control | Orchestrator | Route requests to the right Stoquify skill and verification path. |
| 1 | `stoquify-service-boundary-ratchet` | Control | Audit, implementation, verification | Keep business truth service-owned. |
| 2 | `stoquify-rbac-tenant-freshauth-enforcer` | Control | Security, RBAC, tenant safety | Enforce RBAC, tenant isolation, module entitlement, and fresh auth. |
| 3 | `stoquify-public-api-abuse-boundary` | Control | Public/API security | Harden public/customer/API surfaces against abuse and leakage. |
| 4 | `stoquify-ledger-close-truth-guardian` | Finance | Accounting correctness | Ensure material events reach ledger, source links, audit, and close invalidation. |
| 5 | `stoquify-payment-recon-cash-truth-moat` | Finance | Reconciliation | Defend cash truth across providers, POS, suspense, and ledger. |
| 6 | `stoquify-purchasing-ap-consolidator` | Finance | Purchasing/AP controls | Align PO, receipt, supplier invoice, stock, AP, and payment readiness. |
| 7 | `stoquify-offline-pos-fiscal-replay-finalizer` | Finance | Offline POS hardening | Make offline POS replay-safe and fiscal-safe. |
| 8 | `stoquify-statutory-country-pack-production-gate` | Statutory | Compliance truth | Prevent false production claims for statutory country packs. |
| 9 | `stoquify-report-trust-export-certifier` | Reporting | Report/export trust | Add provenance, currency, period status, row counts, redaction, and certification state. |
| 10 | `stoquify-role-based-operating-cockpit-uiux` | UX | Role workflow UX | Turn trusted operating truth into daily role workspaces. |
| 11 | `stoquify-release-evidence-ratchet` | Governance | Release evidence | Save command results, blockers, evidence, and next-skill recommendations. |

## Dependency Order

1. Author and validate the orchestrator.
2. Author and validate Bundle A: service boundary, RBAC/tenant/fresh-auth, public/API abuse boundary.
3. Author and validate Bundle B: ledger/close truth, payment reconciliation, purchasing/AP, offline POS replay.
4. Author and validate Bundle C: statutory country-pack gate, report trust, role cockpit UX.
5. Author and validate Bundle D: release evidence ratchet.
6. Install into the local Codex skills folder after approval.
7. Execute the first real run: `stoquify-service-boundary-ratchet` in audit-only mode.

## Standard Output Contract

Every material skill run should return:

- mode: audit, implementation, verification, release synthesis, or skill update
- primary skill and supporting skills
- evidence inspected
- findings or changes
- verification commands and results
- saved report path when non-trivial
- blockers and residual risk
- next recommended skill

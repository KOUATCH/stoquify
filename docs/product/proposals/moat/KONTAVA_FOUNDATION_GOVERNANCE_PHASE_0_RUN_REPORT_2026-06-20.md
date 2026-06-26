# Kontava Foundation Governance Phase 0 Run Report

Date: 2026-06-20

Skill executed:

```text
kontava-foundation-governance
```

## Executive Summary

The `kontava-foundation-governance` skill has been run as a Phase 0 governance pass. This run created the shared vocabulary, ownership, evidence, proof-trail, entitlement, snapshot, redaction, and release-gate artifacts required before deeper moat execution begins.

No product behavior was changed. No Prisma schema was changed. No hard module enforcement was introduced. No RBAC, route, server action, dashboard, POS, inventory, purchasing, payroll, accounting, finance, reconciliation, compliance, close, audit, seed, or tenant workflow behavior was changed.

This was intentionally document-first foundation work so later skills can build from one agreed vocabulary.

## Source Inputs Read

Primary skill:

```text
C:\Users\J COMPUTER\.codex\skills\kontava-foundation-governance\SKILL.md
```

Source reports:

```text
moat proposals/KONTAVA_MOAT_EXECUTION_SKILL_PROMPTS_UPGRADED_2026-06-19.md
moat proposals/KONTAVA_MOAT_FOUNDATION_EXECUTION_ROADMAP_2026-06-19.md
moat proposals/KONTAVA_CROSS_BOUNDARY_INNOVATION_MOAT_REPORT_2026-06-19.md
```

Architecture context:

```text
graphify-out/GRAPH_REPORT.md
```

Code surfaces inspected:

```text
config/sidebar.ts
services/_shared/protect.ts
lib/security/rbac.ts
lib/security/rbac-permissions.ts
prisma/schema.prisma
services
actions
app/[locale]/(dashboard)/dashboard
components/reports
services/analytics
services/dashboard
scripts
prisma/seed.ts
prisma/comprehensive-seed.ts
```

## Artifacts Created

| Artifact | Purpose |
|---|---|
| `docs/adr/0004-kontava-module-vocabulary-and-ownership.md` | Canonical module slugs, platform domains, ownership rules, and module language. |
| `docs/adr/0005-kontava-evidence-grade-language.md` | Official evidence grades, allowed meanings, forbidden misuse, UI/API language. |
| `docs/adr/0006-kontava-proof-trail-contract.md` | Proof-trail subject types, response contract, node/edge contract, guard rules, UX rules. |
| `docs/adr/0007-kontava-module-entitlement-observe-mode.md` | Entitlement vocabulary, observe-mode rollout, guard order, RBAC separation, non-bypass rules. |
| `docs/adr/0008-kontava-snapshot-read-model-strategy.md` | Snapshot/read-model contract, stale/partial/blocked states, rebuild rules, dashboard states. |
| `docs/adr/0009-kontava-redaction-sensitive-data-policy.md` | Sensitive data classes, redaction defaults, composite guard outcomes, UI states. |
| `docs/adr/0010-kontava-moat-release-gates.md` | Global and phase-specific release gates for every moat execution skill. |
| `docs/adr/0011-kontava-module-ownership-inventory.md` | First ownership map for sidebar, routes, services, actions, reports, exports, scripts, seeds, and Prisma anchors. |

## Current System Findings

Kontava already has reusable foundations that can support the moat roadmap:

- Permission-driven dashboard navigation in `config/sidebar.ts`.
- Service/action domains aligned with major business areas.
- Central protected action wrapper in `services/_shared/protect.ts`.
- RBAC context, permission checks, audit decisions, and wildcard awareness in `lib/security/rbac.ts` and `lib/security/rbac-permissions.ts`.
- Existing high/critical permission risk classification for accounting close, payment reconciliation, purchasing/AP, supplier bank, payroll, exports, POS refunds/voids, and controls.
- `Organization.requestedModules` as registration intent for future entitlement migration.
- `AccountingSourceLink`, `BusinessEvent`, `BusinessEventOutbox`, `PaymentReconciliationInboxItem`, close assurance models, payroll models, purchase order models, stock models, and `AuditLog` as proof/evidence anchors.
- Existing release-gate scripts under `scripts`.
- Existing report surfaces under `components/reports`, `services/analytics`, `services/accounting`, and related actions.

Main gap:

```text
The platform had strong primitives but lacked a single governance contract tying modules, ownership, evidence language, sensitive data classes, proof trail contracts, entitlement observe mode, snapshot states, and release gates together.
```

## Phase 0 Decisions

Canonical commercial module slugs:

```text
pos
inventory
purchasing
accounting
finance
payments
reconciliation
payroll
compliance
close
analytics
controls
partners
```

Supporting platform or adjacent domains:

```text
settings
users
locations
sales
customers
suppliers
presence
production
content
administration
```

Evidence grades:

```text
raw
operational
posted
reconciled
certified
blocked
```

Non-bypass rule:

```text
RBAC wildcard may satisfy RBAC checks only. It must not bypass module entitlement, consent, fresh auth, maker-checker, redaction, certification, or evidence rules.
```

Rollout rule:

```text
Module entitlements must start in observe mode. Hard enforcement must wait for clean would-block reports and explicit release approval.
```

## Validation

Commands run:

```powershell
git diff --check -- docs/adr
```

Result:

```text
Passed. No whitespace or patch hygiene errors.
```

Placeholder scan:

```powershell
Select-String -Path docs\adr\0004-*.md,docs\adr\0005-*.md,docs\adr\0006-*.md,docs\adr\0007-*.md,docs\adr\0008-*.md,docs\adr\0009-*.md,docs\adr\0010-*.md,docs\adr\0011-*.md -Pattern '<placeholder-marker-pattern>' -CaseSensitive
```

Result:

```text
Passed. No placeholders found.
```

Full typecheck, lint, Prisma validation, and Jest were not run because this pass created governance documentation only and did not touch product code, schema, tests, or generated client code.

## Phase 0 Gate Status

| Gate | Status |
|---|---|
| Canonical module slug list exists. | Passed |
| Supporting platform/adjacent domains identified. | Passed |
| Evidence grade taxonomy documented. | Passed |
| Proof-trail contract documented. | Passed |
| Entitlement observe-mode vocabulary documented. | Passed |
| Snapshot/read-model state contract documented. | Passed |
| Sensitive data and redaction defaults documented. | Passed |
| Release gates documented. | Passed |
| Route/service/action/report/export/job ownership inventory started. | Passed |
| No schema migration introduced. | Passed |
| No hard module enforcement introduced. | Passed |
| Documentation validation passed. | Passed |

Phase 0 governance is complete enough to begin the next foundation skill.

## Remaining Governance Follow-Ups

These are not blockers for the next skill but should be tracked:

- Reconcile legacy/duplicate route groups such as `/dashboard/items`, `/dashboard/suppliersSystem`, and `/dashboard/cashDrawer` in a later cleanup phase.
- Decide whether production and presence become commercial modules or remain adjacent/support domains.
- Expand report/export/job ownership as new export and background job surfaces are added.
- Convert governance docs into typed constants only after the team approves the vocabulary.
- Add a future doc/test that checks route/action/service ownership coverage when module control plane work begins.

## Next Recommended Skill

Run:

```text
kontava-evidence-proof-trail
```

Why:

The next moat foundation should make the evidence-grade language executable. It should build conservative evidence-grade contracts, proof-trail services, blockers, redactions, and guarded read-only proof access for the first safe subjects:

```text
journal.entry
reconciliation.run
close.run
```

Release gate before moving beyond proof trails:

- Proof-trail MVP subjects return deterministic grade, reason, freshness, nodes, edges, blockers, redactions, and next actions.
- Access is tenant-scoped and RBAC-guarded.
- Sensitive proof fields are redacted.
- Direct action/API access is denied when permissions fail.
- Existing accounting, reconciliation, close, audit, and source-link behavior is preserved.

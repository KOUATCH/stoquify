# Kontava Moat Skill Suite Install, Validation, And First Execution Report

Date: 2026-06-19

Primary source:

```text
moat proposals/KONTAVA_MOAT_EXECUTION_SKILL_PROMPTS_UPGRADED_2026-06-19.md
```

Supporting sources:

```text
moat proposals/KONTAVA_MOAT_EXECUTION_SKILL_BLUEPRINT_2026-06-19.md
moat proposals/KONTAVA_MOAT_FOUNDATION_EXECUTION_ROADMAP_2026-06-19.md
moat proposals/KONTAVA_CROSS_BOUNDARY_INNOVATION_MOAT_REPORT_2026-06-19.md
moat proposals/KONTAVA_TECHNICAL_READINESS_BEFORE_MOAT_EXECUTION_2026-06-19.md
```

## Executive Summary

The Kontava moat execution skill suite was audited, upgraded from the upgraded prompt pack, staged, installed into the local Codex skills directory, and validated.

All nine skills now exist as real reusable Codex skills under:

```text
C:\Users\J COMPUTER\.codex\skills
```

Each skill also has a workspace staging copy under:

```text
.codex-skill-staging
```

The first execution path was started. The orchestrator selected `kontava-foundation-governance` as the correct first skill. No stronger blocker was found. The Phase 0 governance output is a non-enforcing plan: lock vocabulary, module ownership, evidence language, redaction classes, and release gates before any schema-heavy or advanced cross-module feature work.

Do not start Owner War Room, AI Copilot, Partner Evidence API, full Business Evidence Graph, broad Compliance Readiness Radar, or hard module enforcement until Phase 0 and the early foundation gates pass.

## Suite Audit Result

Existing Kontava skill folders were already present in both staging and installed locations. Before this pass, the staged `SKILL.md` files and installed `SKILL.md` files matched by SHA-256. The suite was therefore updated in place rather than recreated under new names.

Current upgraded skill bodies are larger and more execution-ready:

| Skill | Updated SKILL.md lines | Agent metadata |
|---|---:|---|
| `kontava-business-signals-action-queue` | 177 | present |
| `kontava-evidence-proof-trail` | 154 | present |
| `kontava-foundation-governance` | 148 | present |
| `kontava-moat-execution-orchestrator` | 127 | present |
| `kontava-module-control-plane` | 147 | present |
| `kontava-owner-war-room-mvp` | 157 | present |
| `kontava-security-redaction-guard` | 149 | present |
| `kontava-seed-backfill-release-gate` | 146 | present |
| `kontava-snapshot-read-models` | 148 | present |

## Installed Skills

| Skill | Installed path | Responsibility | Must never break |
|---|---|---|---|
| `kontava-moat-execution-orchestrator` | `C:\Users\J COMPUTER\.codex\skills\kontava-moat-execution-orchestrator` | Sequence skills, enforce phase gates, choose next safe work, delay advanced features until foundations pass. | Tenant isolation, RBAC, ledger-first accounting, auditability, OHADA compliance, reconciliation, POS, inventory, purchasing, payroll, finance, close assurance, existing workflows. |
| `kontava-foundation-governance` | `C:\Users\J COMPUTER\.codex\skills\kontava-foundation-governance` | Create Phase 0 vocabulary, ownership maps, ADRs, evidence language, sensitive-data classes, route/action/service/report/job inventory, release gates. | Existing routes, module names, permissions, tenant semantics, accounting and compliance semantics. |
| `kontava-evidence-proof-trail` | `C:\Users\J COMPUTER\.codex\skills\kontava-evidence-proof-trail` | Build conservative evidence grades, proof trails, blockers, guarded proof reads, proof UI contracts, and redaction. | Source links, ledger postings, reconciliation truth, close evidence, audit logs, sensitive proof data. |
| `kontava-snapshot-read-models` | `C:\Users\J COMPUTER\.codex\skills\kontava-snapshot-read-models` | Build evidence-graded, freshness-aware, tenant-safe read models for fast cross-module dashboards. | Transactional modules, existing dashboards, tenant aggregation boundaries, stale/partial data truth. |
| `kontava-module-control-plane` | `C:\Users\J COMPUTER\.codex\skills\kontava-module-control-plane` | Build module catalog, tenant entitlements, observe-mode would-block logs, server-side guards, owner/admin upgrade surfaces. | Existing tenant access, RBAC rules, requested module data, direct URL/API/action/export/job protections. |
| `kontava-business-signals-action-queue` | `C:\Users\J COMPUTER\.codex\skills\kontava-business-signals-action-queue` | Convert evidence and snapshots into deduped, assignable, auditable action signals. | Signal quality, tenant isolation, redaction, action assignment permissions, existing analytics. |
| `kontava-security-redaction-guard` | `C:\Users\J COMPUTER\.codex\skills\kontava-security-redaction-guard` | Centralize redaction, export safety, fresh auth, maker-checker, consent, composite guards, and leakage tests. | Payroll, supplier bank, payment provider, close, partner, export, proof-trail, and audit confidentiality. |
| `kontava-seed-backfill-release-gate` | `C:\Users\J COMPUTER\.codex\skills\kontava-seed-backfill-release-gate` | Build realistic seeds, idempotent backfills, migration safety, validation reports, rollback plans, and release gates. | Production data, tenant ownership, ledger-first posting, close/reconciliation rules, non-dev destructive reset boundaries. |
| `kontava-owner-war-room-mvp` | `C:\Users\J COMPUTER\.codex\skills\kontava-owner-war-room-mvp` | Build the first safe, read-only, evidence-backed owner/admin command center after foundations exist. | Sensitive data, live-join performance, existing dashboards, module gates, proof accuracy, color semantics. |

## Validation Results

Staged validation command:

```powershell
$validator = 'C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py'
Get-ChildItem -LiteralPath '.codex-skill-staging' -Directory |
  Where-Object { $_.Name -like 'kontava-*' } |
  Sort-Object Name |
  ForEach-Object { python $validator $_.FullName }
```

Result: all nine staged skills returned `Skill is valid!`.

Installed validation command:

```powershell
$validator = 'C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py'
Get-ChildItem -LiteralPath 'C:\Users\J COMPUTER\.codex\skills' -Directory |
  Where-Object { $_.Name -like 'kontava-*' } |
  Sort-Object Name |
  ForEach-Object { python $validator $_.FullName }
```

Result: all nine installed skills returned `Skill is valid!`.

Install integrity check: each installed `SKILL.md` and `agents/openai.yaml` matched its validated staged copy by SHA-256.

## Execution Order

The installed orchestrator keeps this order:

1. `kontava-foundation-governance`
2. `kontava-evidence-proof-trail`
3. `kontava-snapshot-read-models`
4. `kontava-module-control-plane`
5. `kontava-business-signals-action-queue`
6. `kontava-security-redaction-guard`
7. `kontava-seed-backfill-release-gate`
8. `kontava-owner-war-room-mvp`

Advanced features that must wait:

- Owner War Room beyond a narrow read-only readiness slice.
- AI Copilot.
- Partner Evidence API.
- Full Business Evidence Graph.
- Broad Compliance Readiness Radar.
- Hard module enforcement.
- Predictive fraud or staff risk scoring.

## Orchestrator First Execution Result

The orchestrator was run as an inspection and sequencing pass.

Inputs inspected:

- Upgraded prompt pack section map.
- Moat foundation roadmap section map.
- Cross-boundary innovation report section map.
- `config/sidebar.ts`.
- `services` domain folders.
- `actions` domain folders.
- Dashboard route inventory sample under `app/[locale]/(dashboard)/dashboard`.
- Key Prisma anchors in `prisma/schema.prisma`.
- Shared protected action wrapper in `services/_shared/protect.ts`.
- RBAC permission/risk mappings in `lib/security/rbac-permissions.ts`.
- Existing documentation locations under `docs` and `what-next`.

Findings:

- The system already has module-like domains across services, actions, dashboard routes, and permissions.
- The sidebar is permission-driven and already grouped by business capabilities such as Inventory, Sales/POS, Accounting, Compliance, Purchases, Presence, Payroll, Finance, Analytics, Settings, and Administration.
- `Organization.requestedModules` exists and can inform future module entitlement migration.
- Durable trust foundations already exist or are in progress: `AccountingSourceLink`, `BusinessEvent`, `BusinessEventOutbox`, `PaymentReconciliationInboxItem`, close assurance models, payroll models, purchase order models, stock models, and `AuditLog`.
- `services/_shared/protect.ts` already centralizes session, permission, fresh-auth, tenant-input guard, safe action error, and correlation handling for protected actions.
- RBAC risk mappings already classify high/critical permissions for accounting, compliance, payment reconciliation, purchasing/AP, payroll, controls, POS refunds/voids, and exports.
- The main blocker is not absence of platform primitives. The blocker is absence of a single governance contract tying modules, route ownership, evidence language, redaction classes, and release gates together.

Orchestrator decision:

```text
Run kontava-foundation-governance first.
```

Reason:

Phase 0 is low-risk, non-enforcing, and needed before any durable schemas, hard guards, snapshots, signal queues, or owner-facing cross-module intelligence. It will prevent later skills from using conflicting module slugs, evidence grades, sensitive-data rules, or ownership boundaries.

## Phase 0 Foundation Governance Output

The first governance run should produce non-enforcing artifacts, not production behavior changes.

Recommended Phase 0 artifacts:

1. `docs/adr/kontava-module-vocabulary-and-ownership.md`
   - Canonical module slugs.
   - User-facing module names.
   - Route/sidebar/service/action/report/export/job ownership.
   - Dependency map.

2. `docs/adr/kontava-evidence-grade-language.md`
   - `raw`, `operational`, `posted`, `reconciled`, `certified`, `blocked`.
   - Required proof for each grade.
   - Banned marketing shortcuts.
   - English/French product language rules.

3. `docs/adr/kontava-proof-trail-contract.md`
   - Subject types.
   - Proof nodes and edges.
   - Blockers, redactions, freshness, source modules, next actions.
   - Guard and audit requirements.

4. `docs/adr/kontava-module-entitlement-observe-mode.md`
   - Catalog.
   - Entitlement decision terms.
   - Observe-mode would-block logging.
   - Explicit rule that RBAC wildcard does not bypass subscription entitlement.

5. `docs/adr/kontava-snapshot-read-model-strategy.md`
   - Snapshot contracts.
   - Fresh/stale/partial/blocked states.
   - Idempotent rebuild expectations.
   - Dashboard fallback behavior.

6. `docs/adr/kontava-redaction-sensitive-data-policy.md`
   - Payroll, supplier bank, payment provider, close, partner, export, and proof-trail data classes.
   - Default mask/redact rules.
   - Fresh-auth, maker-checker, consent, watermark, and audit requirements.

7. `docs/adr/kontava-moat-release-gates.md`
   - Tenant isolation.
   - RBAC plus entitlement.
   - Evidence transitions.
   - Redaction.
   - Snapshot freshness.
   - Signal dedupe.
   - Export/fresh-auth.
   - Existing accounting, POS, inventory, purchasing, payroll, reconciliation, close, finance, and compliance regression gates.

Initial canonical module slugs:

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

Suggested additional governance classification:

```text
settings
users
locations
production
sales
customers
suppliers
presence
content
administration
```

These can either be treated as platform/support modules or mapped into the core commercial module catalog after product packaging is finalized.

## Release Gate Before Skill 2

Before starting `kontava-evidence-proof-trail`, Phase 0 should pass this gate:

- Canonical module slug list approved.
- Route/action/service/report/export/job ownership inventory exists.
- Evidence grade language is documented and conservative.
- Sensitive data classes are documented.
- Entitlement observe-mode vocabulary is documented.
- Release-gate checklist exists.
- No hard module enforcement has been introduced.
- No schema migration has been introduced unless separately approved.
- `git diff --check` passes for governance artifacts.

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Skills push implementation before vocabulary is stable. | High | Orchestrator must require Phase 0 gate before Skill 2. |
| Module gates hide features client-side only. | High | Module control plane must use server-side guards for routes/actions/APIs/reports/exports/jobs. |
| Evidence grades overstate trust. | High | `certified` and `reconciled` require explicit server-side proof. |
| Sensitive proof leaks through JSON, exports, or dashboards. | Critical | Run security redaction guard before broad owner/partner/AI surfaces. |
| Existing tenants lose access when module control begins. | Critical | Use observe mode and legacy/default entitlements before hard enforcement. |
| Dashboards become slow from cross-module live joins. | High | Build snapshot/read models before command-center surfaces. |
| Seed/demo data gives false confidence. | Medium | Seed realistic cross-module scenarios and include negative cases. |

## Next Recommended Skill

Next skill to execute:

```text
kontava-foundation-governance
```

Immediate work:

1. Create the seven Phase 0 governance ADRs listed above.
2. Generate the first route/action/service/report/export/job ownership inventory.
3. Validate with `git diff --check`.
4. Do not introduce schema changes or hard enforcement in this phase.

After the Phase 0 gate passes, the next implementation skill should be:

```text
kontava-evidence-proof-trail
```

Reason:

Evidence proof trails create the trust contract that later snapshots, module surfaces, signals, redaction policies, seed scenarios, and Owner War Room cards must all consume.


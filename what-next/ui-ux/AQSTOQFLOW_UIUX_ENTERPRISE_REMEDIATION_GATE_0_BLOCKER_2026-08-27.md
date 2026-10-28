# Stoquify Enterprise UI/UX Remediation — Gate 0 Current-Truth Ledger and Blocker

Date: 2026-08-27  
Roadmap: `STQ-UIUX-REM-2026-08-06`  
Working-tree posture: **BLOCKED BEFORE PHASE A — external decisions and approvals required**

## Scope completed

This is the required G0-01 current-truth baseline for the Enterprise UI/UX Remediation Roadmap. It revalidated the roadmap structure, workspace shape, selected P0 evidence, graph freshness, module-surface inventory, and static quality gates without changing application code, schemas, migrations, fixtures, entitlement policy, or production state.

It is a timestamped working-tree baseline, not a certification result. The workspace contains 126 dirty entries, so the results must not be attributed to one implementation branch and must be regenerated before every promoted implementation wave.

## Current evidence

| Signal | August roadmap baseline | Current working-tree observation | Result |
| --- | ---: | ---: | --- |
| `page.tsx` files | 140 | 147 | Drifted; canonical route registry is not yet available. |
| Dashboard `page.tsx` files | 124 | 129 | Drifted. |
| App/component TSX files | 549 | 617 | Drifted. |
| Client TSX files | 213 | 245 | Drifted; client-boundary risk needs a refreshed characterization pass. |
| Dirty entries | 67 | 126 | High dirty-worktree risk; do not make broad overlapping changes. |
| Module surfaces | 387 | 410 | Drifted. |
| Module enforcement candidates | 257 | 293 | Still open and larger. |
| Module entries classified `missing permission` | 4 | 79 | Requires classification before entitlement enforcement. |
| Currency/locale heuristic matches | 59 | 130 | Still open; result includes false positives and needs a governed allowlist/classification. |
| Forced-dark/manual-color heuristic | 91 forced-dark lines / 72 files | 618 source matches | Heuristic only; semantic-token decision and source classification remain open. |
| Latest documented ordered graph refresh | 2026-08-09 | 9,484 nodes / 14,371 edges | Useful navigation evidence only; it predates current working-tree changes. |

The current module inventory was built in-memory from `scripts/module-surface-inventory.js` to avoid overwriting existing user evidence in a dirty worktree. It reports 19 catalog modules and 410 surfaces: 145 actions, 16 API routes, 83 navigation entries, 129 pages, 5 exports, and supporting evidence/layout/service surfaces.

## P0 revalidation

| Finding | Current status | Evidence |
| --- | --- | --- |
| P0-01 — inventory headline truth | **Open** | `app/[locale]/(dashboard)/dashboard/inventory/items/page.tsx` still converts five reads to `null`, calculates headline value/profit/stock counts from `initialItemData`, and applies a hard-coded `< 10` low-stock threshold. Organization money formatting is now used, but it does not make the page-sliced KPI calculation trustworthy. |
| P0-02 — display context | **Open** | `lib/i18n/formatters.ts` defaults currency to `USD`; `lib/utils.ts` also hard-codes `en-US`/`USD`. The scan found 130 candidate currency/locale literals across business UI and support code. |
| P0-03 — capability parity | **Open** | `services/modules/module-control-contracts.ts` declares `MODULE_CONTROL_MODE = "observe"`; `services/modules/module-entitlement.service.ts` permits would-block access in observe mode. The current surface inventory has 293 enforcement candidates and 79 missing-permission classifications. |
| P0-04 — action/artifact truth | **Partially revalidated; not closable** | `CustomerQuickActions.tsx` now calls `useCustomerExport`, so the prior simulated customer toast is no longer present there. However, the roadmap requires a full enabled-action inventory and artifact evidence for every export; that contract and inventory do not yet exist. |
| P0-05 — public/auth WCAG | **Open** | Active `/login` renders `EnhancedLoginForm`; active `/register` renders `BeautifulRegisterForm`. These active form sources contain no `aria-invalid`, `aria-describedby`, `aria-live`, or `autocomplete` attributes. No fresh axe, keyboard, 320 px/400% zoom, NVDA, or VoiceOver evidence was produced in this baseline. |

## Verification run

| Command / scan | Result |
| --- | --- |
| `python .../validate_roadmap.py` using bundled workspace Python | Passed: 15 required artifacts, 32 work packages, 19 audit findings, 10 contracts, 16 fixture profiles, 11 route families, acyclic dependency graph; manifest remains `planned-not-certified`. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| Read-only source/route/module/currency/theme/state scans | Completed; counts recorded above. |
| In-memory `buildModuleSurfaceInventory()` | Completed; counts recorded above. |

Not run: Prisma/migration operations, any destructive seed/reset, authenticated browser tests, aXe, screen-reader validation, three-browser evidence, production performance evidence, cohort rollout, rollback rehearsal, or final release verification. None may be inferred from the static pass.

## Files inspected

- `docs/system-audit/STOQUIFY_ENTERPRISE_UI_UX_REMEDIATION_ROADMAP_2026-08-06.md`
- `what-next/ui-ux/enterprise-remediation-roadmap/` (all Gate 0, traceability, verification, gate, and certification-manifest materials)
- `graphify-out/POST_SLICE_438_GRAPH_REFRESH_2026-08-09.md`
- `app/[locale]/(dashboard)/dashboard/inventory/items/page.tsx`
- `services/inventory/inventory-read.service.ts`
- `lib/i18n/formatters.ts`
- `lib/utils.ts`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-entitlement.service.ts`
- `components/customers/CustomerQuickActions.tsx`
- `app/[locale]/(auth)/login/page.tsx`
- `app/[locale]/(auth)/register/page.tsx`
- Active authentication form components under `components/auth/`
- `scripts/module-surface-inventory.js`

## Files changed

- This evidence report only. No application, schema, migration, fixture, configuration, or test files were changed.

## Gate status and blockers

`G0-01` is **ready for review**, not complete: its automated baseline is captured, but named architecture, QA, product, finance, security, and accessibility owners have not accepted their evidence slices.

`G0-02` is **blocked**. The roadmap explicitly prohibits shared-contract implementation until the following decision authority resolves and records ADR-UI-001 through ADR-UI-010:

1. Server-owned DisplayContext scope and fallback policy.
2. Inventory KPI formulas: stock-cost value, retail potential, margin estimate, as-of and partiality semantics.
3. Entitlement source of truth, legacy-package migration, and observe-to-enforce cohort authority.
4. Canonical route and alias choices, including authentication variants.
5. Read-state/error taxonomy and action-artifact retention schema.
6. Supported appearance modes during migration.
7. Legally/security-required signup data versus resumable onboarding data.
8. Supported browser, assistive-technology, viewport, fixture, and release-approval matrices.

`G0-03` is **blocked on the same governance freeze**. A full synthetic tenant/role/package/locale/currency fixture set cannot be safely invented: it encodes commercial packages, authorization policy, country/currency expectations, and payroll/privacy scenarios. The roadmap requires approved role/package fixtures and prohibits destructive reset/seed activity in shared environments.

Therefore Phases A through D are **not started**. Implementing them now would require choosing finance, security, billing, product, accessibility, legal, and release-policy outcomes on behalf of their accountable authorities; that would violate the roadmap's own non-waivable gates.

## Recommended next phase

Complete `G0-02` by recording the ten ADR decisions with accountable approval (or a named blocker), then approve the synthetic fixture catalog for `G0-03`. Once both gates are accepted, begin Phase A in the roadmap order: CT-02/CT-03/CT-06/CT-07 and the entitlement migration design, followed by the inventory KPI cutover, currency migration, capability enforcement pilot, and accessible auth simplification.

## Certification statement

The system is **not certified** for enterprise UI/UX release. This report records evidence and blockers only; it does not replace required human finance/control, security/privacy, accessibility, localization, SRE, domain, and final independent-assurance validation.

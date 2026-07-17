# AqStoqFlow Canonical Module Vocabulary

Date: 2026-07-12
Lane: Phase 1 canonical module vocabulary and dependency freeze
Mode: observe/report only; no hard enforcement enabled
Skill: `aqstoqflow-module-vocabulary-freeze`

## Executive Decision

The frozen vocabulary for the current AqStoqFlow module control-plane program is the 20-slug `COMMERCIAL_MODULE_SLUGS` list in `services/modules/module-control-contracts.ts`. Current code wins over older ADR vocabulary where names have drifted.

This document does not rename routes, change Prisma schema, alter runtime access, enable hard enforcement, or treat sidebar hiding as security. It freezes language for the next lanes: durable entitlement schema, package strategy, surface registry, guard contract, Module Workbench UX, billing boundary, leakage prevention, release gates, and later approved enforcement pilots.

## Evidence Baseline

- `MODULE_CONTROL_MODE` is currently `observe`.
- `hardEnforcementEnabled` is false in current module control data.
- `Organization.requestedModules String[] @default([])` remains present and must be treated as onboarding intent plus future migration evidence, not durable entitlement truth.
- Current inventory baseline before this lane: generated `2026-07-12T05:10:11.334Z`; 20 catalog modules; 306 inventoried surfaces; 266 mapped; 34 unmapped; 16 missing permission; 300 enforcement candidates.
- Verification after saving this lane: `npm run module:surface:inventory` passed and refreshed the inventory at `2026-07-12T05:20:59.768Z` with the same counts: 20 catalog modules; 306 surfaces; 266 mapped; 34 unmapped; 16 missing permission; 300 enforcement candidates.
- Current guard posture is mixed: `protect()`, `requireApiModuleAccess()`, `requirePermission()`, `checkPermission()`, manual `observeModuleAccess()`, sidebar permission filters, and some `guard: none` records.

## Canonical Slug Policy

1. Use only the canonical slug values below in new module-control-plane work.
2. Keep older ADR names as aliases, migration hints, or product vocabulary only.
3. Keep RBAC permissions separate from tenant module entitlement.
4. Do not present sidebar filtering as module security.
5. Reports, analytics, exports, jobs, proof surfaces, and dashboards inherit access from their source modules.
6. `settings`, `administration`, and similar platform domains can appear in the catalog, but they are not automatically sellable SMB modules.
7. Billing-provider state must feed internal package and entitlement records; it must not directly become runtime access truth.

## Frozen Vocabulary

| Canonical slug | Display name | Classification | Owner | Risk | Commercial posture | Primary route prefixes | Current dependency posture |
|---|---|---|---|---|---|---|---|
| `dashboard` | Operating Dashboard | Platform workspace | Platform | Medium | Bundle/core platform surface, not sold alone by default | `/dashboard` | Reads all allowed operational modules; must not bypass source-module guards |
| `inventory` | Inventory | Sellable operational module | Inventory | High | Core SMB module | `/dashboard/inventory`, `/dashboard/items` | No current required edge; purchasing and POS are major consumers |
| `production` | Production | Sellable/adjacent operational module | Operations | Medium | Candidate paid module | `/dashboard/production` | Should depend on inventory semantics before enforcement |
| `sales` | Sales | Sellable commercial workflow | Revenue | High | Core commercial workflow, may bundle with POS | `/dashboard/sales`, `/dashboard/orders`, `/dashboard/customers`, `/dashboard/session-pos-sync` | Feeds POS, finance, reports, and analytics |
| `pos` | POS | Sellable critical module | Revenue | Critical | Paid module or package component | `/dashboard/pos` | Required dependency: `sales`; needs explicit inventory, finance, accounting, and payment evidence semantics by tier |
| `cash_drawer` | Cash Drawer | Sellable control add-on | Finance | Critical | POS/finance add-on or package component | `/dashboard/finance/cash-drawer`, `/dashboard/cashDrawer` | Currently inherits `pos` dependencies; should explicitly declare POS plus finance/accounting/payment evidence semantics |
| `accounting` | OHADA Accounting | Sellable critical module | Accounting | Critical | Core finance/accounting module | `/dashboard/accounting` | No current required edge; many modules post or report through it |
| `close_assurance` | Close Assurance | Sellable assurance module | Accounting | Critical | Premium accounting assurance module | `/dashboard/accounting/close` | Required: `accounting`; recommended: `payment_reconciliation` |
| `compliance` | Compliance | Sellable statutory/compliance module | Compliance | Critical | Paid compliance/country-pack module | `/dashboard/compliance` | Current catalog calls `dependenciesFor("accounting")`, which yields no edge; needs explicit accounting/close semantics |
| `purchasing` | Purchasing and AP | Sellable operational module | Procurement | High | Core SMB operations/AP module | `/dashboard/purchase-orders`, `/dashboard/purchases`, `/dashboard/suppliersSystem` | Recommended: `inventory`; needs accounting/finance/payment evidence semantics |
| `presence` | Presence | Sellable HR add-on candidate | People | Medium | Payroll-adjacent module or HR package component | `/dashboard/presence` | No current edge; should define payroll relationship before package enforcement |
| `payroll` | Payroll | Sellable sensitive module | People | Critical | Paid people/payroll module | `/dashboard/payroll` | Recommended: `accounting`; should define compliance, payment, and close evidence semantics |
| `finance` | Finance | Sellable finance module | Finance | Critical | Core finance module | `/dashboard/finance` | No current required edge; consumes accounting, purchasing, payroll, POS, and reconciliation evidence |
| `payment_reconciliation` | Payment Reconciliation | Sellable finance controls module | Finance | Critical | Paid reconciliation/control module | `/dashboard/finance/reconciliation` | Required: `finance`, `accounting` |
| `analytics` | Analytics | Sellable analytics add-on | Data | Medium | Paid reporting/analytics module or package tier | `/dashboard/analytics` | Recommended: `reports`; must respect source-module access |
| `reports` | Reports | Reporting surface layer | Data | High | Bundle/tier capability, not a security substitute | `/dashboard/reports` | No current edge; must inherit source-module entitlement and RBAC |
| `commercial_agents` | Commercial Agents | Sellable sales/channel add-on | Sales | Medium | Candidate sales/channel module | `/dashboard/commercial-agents` | No current edge; likely depends on sales and finance evidence |
| `content` | Content | Support/growth domain | Growth | Low | Internal/support domain unless product promotes it | `/dashboard/blogs` | No current edge |
| `settings` | Settings | Platform support domain | Platform | Critical | Tenant administration, not sold alone | `/dashboard/settings`, `/dashboard/change-password`, `/dashboard/notifications-demo` | Cross-module support domain; never a substitute for module access truth |
| `administration` | Administration | Platform/internal administration | Platform | Critical | Internal/admin domain, not sold alone | `/dashboard/admin` | Cross-module administration; must stay RBAC and audit heavy |

## ADR Drift Reconciliation

Older ADR vocabulary remains useful history, but new work must use the current canonical values.

| Older term | Frozen handling | Reason |
|---|---|---|
| `payments` | Alias to `finance` in current catalog; use `payment_reconciliation` only for reconciliation workflows | Current catalog maps `payments` to finance while reconciliation has its own canonical slug |
| `reconciliation` | Alias to `payment_reconciliation` | Current catalog has explicit `payment_reconciliation` slug and route |
| `close` | Alias to `close_assurance` | Current catalog uses `close_assurance` |
| `controls` | Not a commercial module slug today | Controls are security, audit, release, cash, compliance, and assurance concerns distributed across modules |
| `partners` | Product concept folded into `commercial_agents` for current catalog work | Current catalog uses `commercial_agents` |
| `users` | Platform support domain under settings/administration | RBAC/user management is not a sellable module by itself |
| `locations` | Platform support domain under settings and operational modules | Location scope supports inventory, POS, purchasing, and reporting |
| `customers` | Sales subdomain | Use `sales` as the owner unless a future package promotes customer management |
| `suppliers` | Purchasing subdomain | Use `purchasing` as the owner unless a future package promotes supplier management |

## Sellable Vs Platform Classification

Sellable or likely sellable modules:
`inventory`, `production`, `sales`, `pos`, `cash_drawer`, `accounting`, `close_assurance`, `compliance`, `purchasing`, `presence`, `payroll`, `finance`, `payment_reconciliation`, `analytics`, `commercial_agents`.

Bundle, tier, or source-aware capability:
`dashboard`, `reports`.

Platform support or internal domains:
`content`, `settings`, `administration`.

This classification is a control-plane input, not pricing finality. The package strategy lane must decide actual packages, tiers, add-ons, bundles, trial rules, read-only retention, suspension behavior, and upgrade paths.

## Security And RBAC Controls

- Tenant module entitlement must be checked server-side before sensitive data access when hard enforcement is later approved.
- RBAC remains necessary after module entitlement. A tenant may own a module while a user still lacks role permission.
- Wildcard/admin RBAC must not bypass tenant module entitlement.
- Observe-mode decisions may record would-block evidence, but they must not deny until an approved pilot changes mode for a bounded surface.
- Export, report, job, webhook, BI, and proof surfaces must declare source modules and cannot rely on page/sidebar visibility.
- Audit evidence must eventually cover entitlement grants, changes, suspensions, expirations, overrides, dependency denials, read-only grants, billing-driven changes, and manual admin actions.

## Current Blockers

1. Durable entitlement truth does not exist yet; runtime decisions still derive from `Organization.requestedModules` and legacy defaults.
2. Dependency semantics are too thin for packaging and enforcement.
3. Surface inventory remains report-only with unmapped and missing-permission records.
4. Guard order and guard implementation differ by surface type.
5. Session `modulesEnabled` claims are hard-coded and not authoritative.
6. UI state is mostly permission-aware, not entitlement-state aware.

## Next Handoff

The next safest lane is `aqstoqflow-module-entitlement-schema`: design additive package, subscription, tenant entitlement, entitlement event, and migration/read-model architecture while keeping observe mode and preserving `Organization.requestedModules` as migration evidence only.


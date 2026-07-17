# AqStoqFlow Module Dependency Matrix

Date: 2026-07-12
Lane: Phase 1 canonical module vocabulary and dependency freeze
Mode: observe/report only; no hard enforcement enabled
Skill: `aqstoqflow-module-vocabulary-freeze`

## Executive Decision

This matrix freezes dependency language for the current 20-module catalog without changing runtime behavior. It separates current code edges from target enterprise semantics so later schema, package, guard, UX, billing, leakage, and release-gate work can advance without debating vocabulary again.

Current code contains explicit dependency edges for `pos`, `payment_reconciliation`, `close_assurance`, `payroll`, `purchasing`, and `analytics`. Several high-risk modules still need richer dependency semantics before hard enforcement.

## Dependency Types

Use these dependency types in new architecture and schema work:

| Type | Meaning | Enforcement implication |
|---|---|---|
| `required_runtime` | The module cannot function correctly without the dependency at runtime | Eligible for future hard deny after pilot approval |
| `required_commercial` | The dependency must be sold/provisioned with the module or package | Package validation, not direct billing-provider authority |
| `recommended_bundle` | Strong default packaging relationship, but not always required | Upgrade and admin guidance |
| `source_evidence` | The dependency supplies audit, posting, reconciliation, proof, or close evidence | Read/report/job/export controls must respect source module state |
| `reporting_source` | The module reads another module for analytics/reports | Deny or redact source-specific data when source access is absent |
| `write_posting` | The module creates records that post into another module | Requires explicit service contract and audit evidence |
| `read_only_retention` | Data may remain visible after downgrade/suspension, but writes stop | Requires typed read-only policy |
| `platform_support` | Cross-cutting support dependency such as settings, users, locations, audit, release gates | Not a sellable dependency by itself |

## Current Code Edges

| Module | Depends on | Current type | Reason from catalog |
|---|---|---|---|
| `pos` | `sales` | required | POS writes sales orders, payments, stock movements, and receipt evidence |
| `payment_reconciliation` | `finance` | required | Reconciliation needs finance cash ledgers and payment-provider accounts |
| `payment_reconciliation` | `accounting` | required | Reconciled payment truth must link back to posted ledger evidence |
| `close_assurance` | `accounting` | required | Close assurance depends on accounting periods, journals, and ledger checks |
| `close_assurance` | `payment_reconciliation` | recommended | Close readiness is stronger when payment reconciliation evidence is available |
| `payroll` | `accounting` | recommended | Payroll becomes enterprise-grade when runs are posted to ledger evidence |
| `purchasing` | `inventory` | recommended | Purchasing decisions are stronger when purchase orders update stock exposure |
| `analytics` | `reports` | recommended | Analytics surfaces depend on report/export semantics and shared read models |

## Target Matrix

| Module | Required dependencies | Recommended, evidence, or reporting dependencies | Downstream consumers | Enterprise note |
|---|---|---|---|---|
| `dashboard` | None | All entitled operational modules as `reporting_source` | Owners, admins, operators | Must show only allowed source data; dashboard access is not a bypass |
| `inventory` | None today | `purchasing` as source evidence; `accounting` for valuation/posting when enabled | POS, purchasing, production, analytics, reports | Add read-only stock-history policy before downgrade/suspension |
| `production` | Proposed: `inventory` | `purchasing`, `accounting`, `payroll` as evidence depending on costing tier | Inventory, accounting, analytics | Define production package before enforcement |
| `sales` | None today | `inventory`, `finance`, `accounting`, `reports` as evidence/reporting | POS, finance, analytics, commercial agents | Sales may remain bundled with POS or become a separate commercial workflow |
| `pos` | Current: `sales` | Proposed: `inventory` source/write, `finance` payment source, `accounting` posting, `payment_reconciliation` evidence, `cash_drawer` control add-on | Sales, cash drawer, finance, accounting, reports | Critical module; do not enforce until direct route/API/action/export guards are proven |
| `cash_drawer` | Proposed: `pos` | `finance`, `accounting`, `payment_reconciliation` as source evidence; settings/locations as platform support | Finance, reconciliation, audit, reports | Current catalog reuses POS dependencies; make this explicit before package strategy |
| `accounting` | None today | `finance`, `payment_reconciliation`, `purchasing`, `payroll`, `pos`, `compliance` as source/posting relationships | Close assurance, compliance, reports, finance | Accounting is a control-plane anchor but still needs source-module-aware report/export controls |
| `close_assurance` | Current: `accounting` | Current: `payment_reconciliation`; proposed: `compliance`, `finance`, `payroll`, `purchasing`, `inventory` as evidence depending on check | Accounting, compliance, owners, auditors | Close readiness should degrade by missing evidence, not blindly block all close views |
| `compliance` | Proposed: `accounting` | `close_assurance`, `finance`, `payroll`, country packs, audit evidence | Reports, statutory proof, owner/admin UX | Current `dependenciesFor("accounting")` yields no edge; add explicit dependency in schema lane |
| `purchasing` | None today | Current: `inventory`; proposed: `accounting`, `finance`, `payment_reconciliation` as evidence/posting | Inventory, AP, finance, accounting, analytics | Decide whether receiving requires inventory entitlement or package bundle |
| `presence` | None today | `payroll` as recommended bundle/evidence | Payroll, HR reports, analytics | Keep payroll-adjacent until package strategy decides HR bundle shape |
| `payroll` | None today | Current: `accounting`; proposed: `compliance`, `finance`, `payment_reconciliation`, `presence` as evidence | Accounting, finance, compliance, close assurance | Sensitive data requires redaction, fresh auth, and read-only retention policy |
| `finance` | None today | `accounting`, `purchasing`, `payroll`, `pos`, `payment_reconciliation` as source evidence | Payment reconciliation, reports, analytics | Finance can be a package hub but must not become an entitlement catch-all |
| `payment_reconciliation` | Current: `finance`, `accounting` | `pos`, `payroll`, `purchasing` as payment-source evidence | Close assurance, finance, reports, audit | Required edges are already present; extend source mapping for reports/jobs/exports |
| `analytics` | None today | Current: `reports`; all source modules as `reporting_source` | Dashboard, owner/admin decisioning | Analytics must filter or redact source-module data by entitlement and RBAC |
| `reports` | None today | All source modules as `reporting_source`; exports as controlled surfaces | Analytics, auditors, admins | Reports are not a module-security bypass; each report must declare source modules |
| `commercial_agents` | None today | `sales`, `finance`, `reports` as recommended/evidence | Sales, finance, partner/channel workflows | Former `partners` concept; preserve consent, redaction, and audit boundaries |
| `content` | None today | Settings/platform support | Public/content workflows | Low-risk support domain unless promoted into a paid module |
| `settings` | None | All modules as `platform_support` | Module Workbench, tenant config, RBAC UI | Settings can administer modules but cannot define entitlement truth by itself |
| `administration` | None | Settings, audit, release gates, users as `platform_support` | Platform/admin operators | Internal/admin domain; keep RBAC, fresh auth, and audit heavy |

## Package Strategy Consequences

- Package definitions must support both module membership and dependency requirements.
- Required dependencies should be validated at package design time and tenant provisioning time.
- Recommended dependencies should drive upgrade guidance, health checks, and owner/admin education.
- Evidence dependencies should degrade assurance quality and report completeness before they become denies.
- Read-only retention must be explicit for downgrades, suspensions, expired trials, and historical proof access.
- Billing-provider webhooks should create internal package or subscription events; internal entitlement services should create runtime-effective module access.

## Guard Contract Consequences

Future `requireModuleAccess()` work should evaluate in this order:

1. Authenticated session.
2. Tenant and organization scope.
3. Tenant module entitlement.
4. Dependency state for the requested access intent.
5. RBAC permission.
6. Fresh-auth, maker-checker, consent, redaction, and audit rules where applicable.

Observe mode may record would-block and dependency-gap evidence, but broad hard enforcement stays off until explicit pilot approval and release-gate evidence exist.

## Surface Registry Consequences

Every page, action, API, report, export, job, webhook, proof surface, BI surface, shell item, and navigation item should eventually declare:

- primary module;
- source modules;
- required RBAC permission;
- access intent: read, write, operate, export, administer, job, webhook, proof;
- guard contract;
- dependency behavior;
- unavailable/read-only/suspended behavior;
- audit event name and redaction policy.

## Current Gaps To Resolve Later

1. `compliance` has no explicit accounting dependency because the catalog uses `dependenciesFor("accounting")`, and `accounting` currently has no edges.
2. `cash_drawer` currently reuses POS dependencies instead of declaring its own control dependencies.
3. `production` has no explicit inventory dependency despite operational reliance.
4. `payroll` has only a recommended accounting edge and needs compliance/payment/close semantics.
5. `reports` and `analytics` need source-module inheritance, not standalone broad visibility.
6. `settings` and `administration` must remain platform domains and not become accidental commercial entitlement truth.

## Verification Result

Baseline verification after saving these artifacts passed:

```powershell
npm run module:surface:inventory
```

The command refreshed `what-next/module-surface-inventory.md` and `what-next/module-surface-inventory.json` at `2026-07-12T05:20:59.768Z` with 20 catalog modules, 306 inventoried surfaces, 266 mapped records, 34 unmapped records, 16 missing-permission records, and 300 enforcement candidates.

Focused Jest and broader release gates are not required for this lane because no application behavior, schema, module service, guard, or inventory logic changed.

## Next Handoff

Run `aqstoqflow-module-entitlement-schema` next. It should design additive Prisma/read-model architecture for:

- commercial module records;
- package and package-module records;
- subscription and tenant package state;
- tenant module entitlement records;
- entitlement event history;
- dependency evaluation records;
- migration from `Organization.requestedModules` and legacy full-suite behavior;
- observe-mode read model and audit evidence.


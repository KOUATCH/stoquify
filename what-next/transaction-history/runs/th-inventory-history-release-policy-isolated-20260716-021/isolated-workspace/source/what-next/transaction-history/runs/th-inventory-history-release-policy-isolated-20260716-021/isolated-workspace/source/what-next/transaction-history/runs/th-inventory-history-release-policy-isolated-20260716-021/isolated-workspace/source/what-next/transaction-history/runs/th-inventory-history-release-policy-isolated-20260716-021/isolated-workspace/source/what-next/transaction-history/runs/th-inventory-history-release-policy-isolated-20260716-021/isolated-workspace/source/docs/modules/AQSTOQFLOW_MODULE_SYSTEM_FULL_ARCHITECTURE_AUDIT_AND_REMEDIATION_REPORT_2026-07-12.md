# AqStoqFlow Module System Full Architecture Audit and Remediation Report

Date: 2026-07-12
Workspace: `E:\ohada saas\Focused projects\stoquify`
Mode: evidence-led architecture, security, product, and SaaS modularity review
Skill used: `aqstoqflow-prompt-architect`

## Executive Verdict

AqStoqFlow has a credible module-system foundation, but it is not yet a full-blown modular SaaS control plane.

The strongest parts are already real:

- a canonical module catalog with 20 slugs;
- route prefixes, permissions, owners, risk levels, dependencies, and aliases;
- observe-mode entitlement decisions;
- RBAC separation from tenant-level module entitlement;
- a Module Control Center page;
- shared enforcement seams in `protect()` and `requireApiModuleAccess()`;
- audit logging for would-block observations;
- module-aware tests and a report-mode module surface inventory.

The system is held back by one central issue: module access truth is not yet durable, authoritative, and enforced everywhere. The current durable field is `Organization.requestedModules`, which is onboarding intent, not a subscription or entitlement lifecycle. Hard enforcement is intentionally off. Many surfaces observe modules manually or not at all. The inventory is report-only and still has unmapped and missing-permission records. The UI is mostly permission-filtered, not entitlement-filtered. There is no complete package, billing, deactivation, read-only, trial, suspension, or historical-data policy.

In short: the platform has moved from "module idea" to "module governance foundation." The next leap is to build the Module Control Plane as a first-class subsystem with persistent entitlements, a complete surface registry, enforceable server-side guards, professional module states in the shell, package provisioning, audit trails, and release gates.

## Evidence Inspected

Core source:

- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`
- `actions/modules/module-control.actions.ts`
- `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx`
- `services/_shared/protect.ts`
- `lib/security/server-authz.ts`
- `lib/security/auth-session.ts`
- `config/sidebar.ts`
- `components/auth/v2/RegisterV2Form.tsx`
- `services/users/user-identity.service.ts`
- `prisma/schema.prisma`
- `scripts/module-surface-inventory.js`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`

Governance and architecture documents:

- `docs/architecture/decisions/0004-kontava-module-vocabulary-and-ownership.md`
- `docs/architecture/decisions/0007-kontava-module-entitlement-observe-mode.md`
- `docs/architecture/decisions/0011-kontava-module-ownership-inventory.md`
- `docs/modules/README.md`
- `docs/modules/AQSTOQFLOW_MODULE_CREATION_SUBSCRIPTION_PACKAGING_RUN_2026-06-25.md`
- `docs/modules/AQSTOQFLOW_MODULE_ORIENTED_SAAS_EXECUTION_PLAN_2026-06-18.md`

Graph evidence:

- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/.graphify_detect.json`
- `app/graphify-out/.graphify_ast.json`
- `actions/graphify-out/.graphify_ast.json`

Focused verification run:

```powershell
npm run module:surface:inventory
```

Result: passed. Wrote 306 records to `what-next/module-surface-inventory.json`.

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "services/modules/__tests__/module-entitlement.service.test.ts"
```

Result: passed. 1 suite, 6 tests.

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "actions/modules/__tests__/module-control.actions.test.ts"
```

Result: passed. 1 suite, 3 tests.

```powershell
npm test -- --runInBand scripts/__tests__/module-surface-inventory.test.js
```

Result: passed. 1 suite, 5 tests.

## Current Module Inventory Snapshot

Generated at: `2026-07-12T03:15:11.388Z`

Current inventory:

- Catalog modules: 20
- Surfaces inventoried: 306
- Surface types: 112 actions, 109 pages, 72 navigation entries, 10 layouts, 3 module-service records
- Mapped surfaces: 266
- Unmapped surfaces: 34
- Missing-permission findings: 16
- Enforcement candidates: 300
- Dashboard-only risk findings: 0 in the refreshed inventory

Guard distribution:

- `sidebar-permission-filter`: 72
- `requirePermission`: 76
- `checkPermission`: 59
- `protect`: 34
- `requireAnyPermission`: 22
- `FinanceRouteAccess`: 13
- `none`: 26
- `requireRbacContext`: 2
- `module-observe`: 1
- `delegated-re-export`: 1

The inventory improvement is meaningful: prior packets had dashboard-only risks; the current report has no dashboard-only-risk rows. But the remaining 34 unmapped and 16 missing-permission records mean the platform is not ready for broad hard enforcement.

## What Is Working

### 1. Canonical module vocabulary exists

`services/modules/module-control-contracts.ts` defines 20 commercial module slugs:

- `dashboard`
- `inventory`
- `production`
- `sales`
- `pos`
- `cash_drawer`
- `accounting`
- `close_assurance`
- `compliance`
- `purchasing`
- `presence`
- `payroll`
- `finance`
- `payment_reconciliation`
- `analytics`
- `reports`
- `commercial_agents`
- `content`
- `settings`
- `administration`

This is a serious foundation. It lets module ownership, navigation, reports, evidence, signals, redaction, billing, and release gates speak one language.

### 2. The catalog has real product metadata

`services/modules/module-catalog.service.ts` gives modules names, owners, statuses, risk levels, route prefixes, permissions, core flags, aliases, and dependency edges.

This is much stronger than a simple sidebar array. It means the platform can evolve toward package design, dependency checks, and module-aware UX without inventing vocabulary in each feature.

### 3. Observe mode is deliberate and correctly cautious

`MODULE_CONTROL_MODE` is currently `observe`. `evaluateModuleEntitlement()` allows access in observe mode while marking `wouldBlock`.

That is the right posture for this phase. Existing tenants should not suddenly lose access while the surface map still has unmapped actions and missing-permission rows.

### 4. RBAC and module entitlement are conceptually separated

The architecture documents make a clean distinction:

- RBAC is user and role level.
- Module entitlement is tenant and subscription level.
- Wildcard/admin RBAC must not bypass module entitlement.

The module entitlement tests verify that wildcard RBAC does not erase would-block decisions.

### 5. There is a real Module Control Center

`/dashboard/settings/modules` is protected by `MANAGE_SYSTEM_SETTINGS`, pulls service-owned data from `getModuleControlCenterData()`, and exposes:

- catalog count;
- entitled count;
- would-block count;
- dependency gap count;
- requested modules;
- unknown requested modules;
- module risk/status/owner/source;
- decision reasons.

This is a good administrative visibility surface. It is not yet a full module-management workbench, but it is a credible control-center baseline.

### 6. Shared guard seams already exist

`services/_shared/protect.ts` supports an optional `module` gate. `lib/security/server-authz.ts` supports API module access through `requireApiModuleAccess()`.

That is important. The future should not add hundreds of bespoke `observeModuleAccess()` calls forever. It should converge on shared server-side gates.

### 7. Module decisions are audit-capable

`recordModuleEntitlementDecision()` writes would-block observations into `AuditLog` as `MODULE_ENTITLEMENT_OBSERVED`.

This is exactly the type of evidence needed before enforcement. It lets the team ask: "If we turned enforcement on, who would be blocked, where, and why?"

### 8. Current tests protect key rules

Focused tests cover:

- requested-module label normalization;
- legacy full-suite observe entitlements;
- wildcard RBAC not bypassing entitlement;
- required dependency gaps;
- read-only enforcement behavior;
- observe-mode audit logging;
- tenant-derived module control actions;
- module surface inventory classification.

## What Is Not Working

### 1. There is no durable entitlement source of truth

The only persistent tenant module field found in `Organization` is:

```prisma
requestedModules String[] @default([])
```

That is registration or onboarding intent. It is not a subscription entitlement model.

Missing persistent concepts:

- commercial package;
- package-module mapping;
- tenant subscription;
- tenant module entitlement;
- entitlement source and precedence;
- trial lifecycle;
- read-only lifecycle;
- suspension and expiration;
- manual override;
- billing-provider state;
- entitlement event history;
- deactivation policy.

The TypeScript types already mention sources like `plan`, `trial`, and `manual_override`, but the database does not persist those as first-class lifecycle records.

### 2. Hard enforcement is not actually enabled platform-wide

The settings UI says hard enforcement is off. The module control data returns `hardEnforcementEnabled: false`. The global module mode is `observe`.

That is safe, but it means the platform is not yet a subscription-enforced modular product.

### 3. Module inventory is not a blocking release gate

`module:surface:inventory` is report mode. `policy:gates` intentionally does not include module surface inventory as a fail-mode gate.

This was correct during early discovery. It is now becoming a blocker to maturity. A professional modular system needs at least a ratchet:

- no new unmapped protected surfaces;
- no new missing-permission surfaces;
- no new dashboard-only access paths;
- no new module-less exports/jobs/APIs;
- no regression in per-module completeness.

### 4. Coverage is broad but inconsistent

There are many `observeModuleAccess()` call sites in pages and actions. There are also centralized module gates through `protect({ module })` and API module access helpers.

The problem is not absence. The problem is inconsistency:

- some routes use page-level `observeModuleAccess()`;
- some actions use `protect({ module })`;
- some actions manually call `observeModuleAccess()`;
- some API routes call `requireApiModuleAccess()`;
- many report/export/job surfaces are not clearly inventoried;
- 26 inventory records still show `guard: none`;
- 34 records remain unmapped;
- 16 records still have missing permission evidence.

This is not yet a uniform security boundary.

### 5. The guard order is not fully aligned with the ADR

ADR 0007 says the server-side order should be:

1. Session.
2. Tenant scope.
3. Module entitlement.
4. RBAC permission.
5. Fresh auth.
6. Maker-checker.
7. Consent.
8. Redaction.
9. Audit.

The current `protect()` implementation does fresh auth, then `requirePermission()`, then module access, then tenant input checks.

That order is acceptable while observing, but it should be reviewed before hard enforcement. Enterprise-grade module entitlement should be evaluated consistently and should not depend on scattered caller order.

### 6. Session module claims are currently hard-coded

`lib/security/auth-session.ts` builds `modulesEnabled` as a hard-coded list:

```ts
["inventory", "pos", "purchasing", "finance", "reports", "admin"]
```

That is not connected to `getModuleControlCenterData()` or durable entitlements. Once module enforcement becomes real, this would become stale or misleading. Session claims must come from the authoritative entitlement service or be removed from claims until trustworthy.

### 7. Catalog and ADR vocabulary have drift

ADR 0004 uses terms such as `payments`, `reconciliation`, `close`, `controls`, and `partners`. The current catalog uses `payment_reconciliation`, `close_assurance`, `cash_drawer`, `commercial_agents`, `reports`, `content`, `settings`, and `administration`.

Some of that evolution is fine. But before billing/package enforcement, the team must freeze one commercial vocabulary and classify support domains separately from sellable modules.

### 8. Dependencies are under-modeled

The catalog has dependency edges, but several are still too thin for enterprise packaging:

- POS currently depends on `sales`, but operationally it also depends on inventory, finance/payment, accounting, and control evidence.
- Cash drawer inherits POS dependencies but should probably express finance/accounting/control dependencies too.
- Compliance calls `dependenciesFor("accounting")`, which currently returns no required accounting dependency.
- Payroll has accounting as recommended, but enterprise payroll close/payment workflows may need stronger dependency states in some package tiers.

Dependencies need product-grade semantics: required, recommended, bundled, add-on, technical dependency, commercial dependency, evidence dependency, and read-only fallback.

### 9. UI is permission-aware, not fully entitlement-aware

`config/sidebar.ts` carries `moduleSlug`, but filtering is by permission. Normal users do not yet get a polished active/trial/read-only/suspended/unavailable module experience.

The Module Control Center is admin-facing observe visibility. It is not yet:

- owner upgrade request flow;
- subscription package editor;
- trial activation surface;
- dependency resolution workflow;
- module deactivation wizard;
- read-only historical access state;
- normal-user unavailable module page.

### 10. Surface inventory is still heuristic

`scripts/module-surface-inventory.js` uses source-text extraction. That is useful, but current evidence shows parser artifacts such as odd permission strings extracted from error-handling branches.

The script currently covers sidebar, dashboard pages, actions, and module services. A complete modular platform also needs first-class inventory of:

- API routes;
- public routes;
- reports;
- exports;
- background jobs;
- scheduled checks;
- webhooks;
- seed/demo scenarios;
- evidence/proof surfaces;
- notification/signal surfaces.

### 11. Deactivation and historical data behavior are not defined in code

A complete module system must answer:

- If payroll is suspended, can payroll history still be read?
- Can already-posted accounting evidence remain visible when a dependent module expires?
- Are reports redacted, denied, or partial?
- Do jobs stop, quarantine, or continue in read-only mode?
- Can APIs still return historical data?
- Can exports be generated after expiry?
- How are cross-module records preserved for audit and close assurance?

The current code has pieces, but no durable, enforceable deactivation policy.

## Why It Is Not Working Yet

### Root cause 1: The system is still migrating from full-suite app to modular SaaS

The original architecture behaves like a full-suite operating system. Modules were added as governance concepts on top of an existing product, not as isolated subscription units from day one. That means there are duplicate/legacy routes, cross-module services, and historical permissions that must be normalized carefully.

### Root cause 2: The correct safety posture delayed hard enforcement

Observe mode was not a mistake. It prevented tenant disruption. The issue is that observe mode now needs a ratchet and a path to enforcement. Without a deadline and fail-mode gates, observe mode becomes permanent documentation.

### Root cause 3: There is no persistent module lifecycle model

Without tenant entitlements, package records, subscription states, and entitlement events, the evaluator must derive truth from `requestedModules` and legacy defaults. That cannot support real billing, trials, suspensions, overrides, or package changes.

### Root cause 4: Guarding is still caller-owned

Many surfaces manually remember to call `observeModuleAccess()`. That is fragile. Enterprise-grade enforcement should live in shared server wrappers and registered surface metadata, with tests proving every protected route/action/API/export/job is covered.

### Root cause 5: Product packaging is not fully settled

Some things are commercial modules. Some are platform domains. Some are support data. Some are bundles. Some are dependencies. Until this is frozen, engineering cannot safely enforce commercial access.

## What Is Holding The System Back From The Dream

The dream is a unified OHADA-zone operating system where modules are subscription-safe, tenant-safe, evidence-safe, and commercially packageable without turning the codebase into fragmented mini-products.

The blockers are:

1. No durable entitlement tables.
2. No package/billing/service boundary.
3. Module inventory is report-only, not a ratchet.
4. Guard coverage is inconsistent.
5. Session module claims are not trusted.
6. Product vocabulary has drift.
7. Dependencies are not commercially or operationally complete.
8. UI module states are admin-observe only.
9. Deactivation/read-only/historical data behavior is unresolved.
10. Reports, exports, APIs, and jobs are not fully module-governed.
11. Cross-module workflows are not always explicit about owner and dependency.
12. Audit captures would-block observations but not the full entitlement lifecycle.

## Target Architecture

### 1. Module Control Plane

Create a service-owned module control plane that owns:

- module catalog;
- package catalog;
- package-module mapping;
- tenant subscription state;
- tenant module entitlement state;
- entitlement events;
- dependency evaluation;
- trial/read-only/suspended/expired logic;
- allow/deny/observe audit;
- module unavailable state contracts.

Suggested service boundary:

- `services/modules/module-catalog.service.ts`
- `services/modules/module-package.service.ts`
- `services/modules/tenant-entitlement.service.ts`
- `services/modules/module-access.service.ts`
- `services/modules/module-surface-registry.service.ts`
- `services/modules/module-audit.service.ts`

### 2. Persistent Schema

Additive Prisma models should include:

- `CommercialModule`
- `CommercialModuleDependency`
- `CommercialPackage`
- `CommercialPackageModule`
- `TenantSubscription`
- `TenantModuleEntitlement`
- `TenantModuleEntitlementEvent`
- `ModuleSurfaceRegistry`
- `ModuleReleaseGateSnapshot`

`Organization.requestedModules` should remain as historical onboarding intent, then become migration input, not live access truth.

### 3. One Guard Contract

Define one canonical server API:

```ts
requireModuleAccess({
  organizationId,
  userId,
  moduleSlug,
  surfaceType,
  surface,
  accessIntent,
  permission,
  mode,
})
```

It should return a typed decision and optionally throw a typed denial. All pages, actions, APIs, exports, reports, and jobs should use this through shared wrappers, not ad hoc calls.

### 4. Release-Gated Surface Registry

Every surface should be registered with:

- file;
- route/action/API/job/export/report identifier;
- module slug;
- permission;
- access intent;
- guard;
- fallback/unavailable state;
- owner;
- risk level;
- evidence/audit requirement;
- enforcement mode;
- release status.

This registry should be machine-checked.

### 5. Module-Native UI

The UI should support:

- active modules;
- trial modules;
- read-only modules;
- suspended modules;
- dependency-missing modules;
- unavailable modules;
- owner upgrade request;
- admin diagnostics;
- normal-user clean hiding or safe unavailable state;
- partial dashboards when optional modules are off.

### 6. Package and Billing Boundary

Billing should be provider-independent:

- internal package state is authoritative;
- billing webhooks are inputs, not direct access truth;
- idempotency keys protect package changes;
- manual overrides are explicit and audited;
- suspension/read-only policy is service-owned.

### 7. Cross-Module Data Policy

Define how modules interact:

- Inventory data used by POS.
- Purchasing data used by inventory and finance.
- Payroll data used by accounting and finance.
- Payment reconciliation used by close assurance.
- Accounting evidence used by compliance and close.

Cross-module reads must honor both source module and consuming module policy.

## Remediation Roadmap

### Phase 1: Freeze vocabulary and classify modules

Goal: remove product/engineering ambiguity.

Actions:

- Reconcile ADR vocabulary with `COMMERCIAL_MODULE_SLUGS`.
- Decide which slugs are commercial modules, platform domains, support data, internal modules, or bundle-only modules.
- Fix dependency edges for POS, cash drawer, compliance, payment reconciliation, payroll, purchasing, and close assurance.
- Add tests for dependency graph expectations.

Exit criteria:

- One canonical vocabulary.
- One dependency map.
- No duplicate "payments vs payment_reconciliation" style ambiguity.

### Phase 2: Add durable entitlement schema

Goal: move access truth out of `Organization.requestedModules`.

Actions:

- Add additive Prisma models for modules, packages, subscriptions, entitlements, and entitlement events.
- Seed catalog and package records.
- Backfill existing tenants from `requestedModules` and legacy full-suite policy.
- Keep observe mode.

Exit criteria:

- Existing tenants have explicit entitlements.
- New tenants can be provisioned from packages.
- No runtime logic depends on `requestedModules` as final truth.

### Phase 3: Upgrade the surface inventory into a registry and ratchet

Goal: make coverage measurable and regression-proof.

Actions:

- Expand inventory to APIs, reports, exports, jobs, webhooks, proof surfaces, and public routes.
- Fix parser false positives.
- Add explicit "not applicable" classifications for real public/internal helper surfaces.
- Add fail-mode ratchet that blocks new unmapped or unguarded surfaces.
- Keep existing baseline until current findings are resolved.

Exit criteria:

- No new unclassified module surface can merge.
- Existing 34 unmapped and 16 missing-permission records are burned down or explicitly classified.

### Phase 4: Centralize module guards

Goal: stop relying on ad hoc caller memory.

Actions:

- Introduce or finalize `requireModuleAccess()`.
- Update `protect()` so module guard order is reviewed and consistent.
- Update route/page helpers to compose tenant, module, RBAC, fresh auth, audit, and unavailable state.
- Replace manual `observeModuleAccess()` calls module by module.
- Fix `modulesEnabled` session claims to derive from entitlements or remove them until authoritative.

Exit criteria:

- One shared guard path for actions.
- One shared guard path for pages.
- One shared guard path for APIs.
- Module claims are trustworthy or absent.

### Phase 5: Build the professional Module Workbench

Goal: make modules operable, not just visible.

Actions:

- Upgrade `/dashboard/settings/modules` from observe dashboard to workbench.
- Add owner/admin flows for request, trial, activate, suspend, read-only, dependency resolution, and package source.
- Add normal-user unavailable states.
- Add module-aware navigation filtering, but only after server enforcement is ready.

Exit criteria:

- Owners/admins understand module state and next actions.
- Normal users do not see confusing or unsafe module controls.

### Phase 6: Pilot enforcement

Goal: prove hard enforcement safely.

Actions:

- Choose one low-risk module or bounded surface group.
- Require clean inventory, tests, unavailable UI, audit, and rollback flag.
- Enable enforce mode for one tenant cohort first.
- Capture allow/deny metrics and support evidence.

Exit criteria:

- Direct URLs deny safely.
- Actions deny safely.
- APIs deny safely.
- Reports/exports/jobs cannot leak.
- Rollback is simple.

### Phase 7: Commercial packaging and billing integration

Goal: make modularity monetizable.

Actions:

- Define packages and add-ons.
- Map packages to modules and dependency rules.
- Add billing-provider adapter boundary.
- Add idempotent provisioning.
- Add dunning/suspension/read-only policy.
- Add invoice/export evidence.

Exit criteria:

- Tenant package state reliably provisions module entitlements.
- Billing provider cannot directly corrupt access truth.
- Overrides are audited.

### Phase 8: Enforce module by module

Goal: turn the whole platform modular without breaking the operating system.

Recommended order:

1. Content/internal low-risk module.
2. Reports/read-only surfaces.
3. Analytics dashboards.
4. Settings support surfaces with careful platform defaults.
5. Purchasing read surfaces.
6. Inventory read surfaces.
7. POS read/support surfaces.
8. Payroll read surfaces.
9. Writes, postings, exports, jobs, and high-risk workflows last.

## Risk Register

| Risk | Severity | Why it matters | Control |
|---|---:|---|---|
| UI hides modules but backend allows access | Critical | Subscription bypass and data leakage | Server-side module gates before UI hiding is trusted |
| Requested modules treated as entitlement truth | Critical | Registration intent becomes commercial access truth | Add durable entitlements and migrate |
| Admin wildcard bypasses modules | Critical | Revenue and compliance leakage | Keep wildcard RBAC-only and test it |
| Reports/exports leak inactive module data | Critical | Trust and audit failure | Report/export registry and denial/redaction tests |
| Existing tenants lose access suddenly | High | Churn and operational breakage | Legacy full-suite migration plus observe mode |
| Dependency gaps block valid workflows | High | Poor customer experience | Package/dependency design with read-only fallback |
| Guard order differs by surface | High | Inconsistent security and audit | One shared guard contract |
| Parser false positives hide real gaps | Medium | Bad inventory data | Move from regex-only inventory to explicit registry |
| Product vocabulary drift | Medium | Confusing packaging and UX | Freeze commercial module taxonomy |
| Billing provider directly controls access | High | Provider errors become access corruption | Internal entitlement truth with billing as input |

## What Must Be Done To Make It Enterprise Grade

1. Make module access truth durable.
2. Make package and entitlement lifecycle explicit.
3. Make module guards centralized.
4. Make inventory fail on regressions.
5. Make session module claims trustworthy.
6. Make direct URL, action, API, report, export, and job access module-safe.
7. Make module unavailable/read-only/suspended states professional.
8. Make cross-module dependencies explicit and tested.
9. Make billing integration provider-independent.
10. Make entitlement changes audited.
11. Make owners/admins capable of managing module state.
12. Make normal users experience only clean active or safe unavailable flows.

## Success Criteria For The Complete Modular System

The system is ready when all of the following are true:

- Every tenant has explicit module entitlements.
- Every commercial package maps to module entitlements.
- Every protected route/action/API/report/export/job has a module owner or an explicit not-applicable classification.
- Every protected surface has RBAC and module access tests.
- Wildcard RBAC cannot bypass module entitlement.
- Direct URL access is denied or safely unavailable when a module is not active.
- Navigation reflects module status only after server-side gates are reliable.
- Reports and exports cannot leak inactive module data.
- Suspended/read-only/trial/expired states have typed behavior.
- Entitlement changes create audit events.
- Module inventory has fail-mode ratchets.
- One pilot module has passed enforce mode before broad rollout.

## Recommended Next Implementation Prompt

Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Act as a senior enterprise module entitlement architecture team:

- Senior enterprise software architect: preserve module boundaries, service ownership, dependency order, platform modularity, and integration contracts.
- Structural UI/UX design expert: build workflow-first, role-aware, ergonomic module-control surfaces only after service-owned read models and state contracts exist.
- Cybersecurity and RBAC specialist: enforce tenant isolation, RBAC, module entitlement, fresh auth, audit trails, redaction, and safe error handling.
- Enterprise finance and controls expert: ensure module gating integrates correctly with ledger posting, reconciliation, close assurance, control evidence, approval flows, exports, and release gates.
- OHADA/SYSCOHADA-aware platform architect: keep statutory, country-pack, tax, accounting, and regulatory configuration separated from code and module packaging.
- SaaS modularity specialist: ensure module access is tenant-safe, package-aware, scalable, observable, and not implemented as sidebar hiding.

Task:

Implement Phase 1 and Phase 2 preparation for the AqStoqFlow module control plane without enabling hard enforcement.

Evidence to inspect:

- `what-next/AQSTOQFLOW_MODULE_SYSTEM_FULL_ARCHITECTURE_AUDIT_AND_REMEDIATION_REPORT_2026-07-12.md`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`
- `prisma/schema.prisma`
- `scripts/module-surface-inventory.js`
- `what-next/module-surface-inventory.json`
- `docs/architecture/decisions/0004-kontava-module-vocabulary-and-ownership.md`
- `docs/architecture/decisions/0007-kontava-module-entitlement-observe-mode.md`
- `docs/architecture/decisions/0011-kontava-module-ownership-inventory.md`

Required output:

- a reconciled module vocabulary and dependency matrix;
- a proposed additive Prisma schema for package/subscription/entitlement lifecycle;
- a migration/backfill plan from `Organization.requestedModules`;
- a release-gated surface registry design;
- a precise enforcement ladder;
- a saved report under `what-next/`;
- no hard enforcement until explicitly approved.

Verification:

```powershell
npm run module:surface:inventory
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "services/modules/__tests__/module-entitlement.service.test.ts"
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "actions/modules/__tests__/module-control.actions.test.ts"
npm test -- --runInBand scripts/__tests__/module-surface-inventory.test.js
```

Non-goals:

- Do not enable hard enforcement.
- Do not hide modules in the sidebar as a substitute for server-side access control.
- Do not introduce billing-provider coupling directly into access decisions.
- Do not delete `Organization.requestedModules`; preserve it as onboarding intent and migration evidence.

## Final Read

The modular system is on the right road. It has vocabulary, observation, diagnostics, tests, and some shared guard seams. It is not failing because the concept is weak. It is incomplete because the platform is still between two worlds: full-suite application and subscription-entitled operating system.

The next decisive move is not UI polish. It is the durable entitlement spine: package state, tenant entitlement state, full surface registry, centralized guards, and release ratchets. Once that spine exists, the UI can become beautiful and module-native without being fake, and the business can sell modules without creating security, compliance, or trust gaps.

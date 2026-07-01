# Kontava/Aqstoqflow Module-Driven Platform Architecture Analysis

Date: 2026-06-24

## Executive Verdict

The system is not starting from zero. It already has many of the right foundations for a module-driven platform: a commercial module catalog, observe-mode module entitlement evaluation, protected server actions, canonical RBAC aliases, dashboard navigation filtering, snapshots, proof/evidence services, redaction policy, audit logging, and domain service folders.

However, it is not yet a true module-driven platform. It is currently module-aware.

The critical gap is that module ownership is not yet the governing source of truth across routes, actions, navigation, snapshots, exports, jobs, and release gates. The module catalog exists, but it is not yet the authoritative control plane that every surface must pass through. Hard enforcement is off, module entitlements are derived from `Organization.requestedModules` rather than persisted as a lifecycle model, and some route/source-module naming already drifts from the catalog.

Recommended next action: do not switch to module enforcement yet. First build a module surface inventory and entitlement kernel in observe mode, fix catalog drift, then introduce module-aware guards through the existing `protect` and dashboard shell patterns.

## Source-Of-Truth Verdict

Transforming the system into a module-driven platform improves the single-source-of-truth philosophy if it is done as a governance layer over existing services and snapshots.

It contradicts that philosophy if each module becomes its own duplicate business logic stack.

The safe interpretation is:

- Services own business truth.
- Snapshot/read-model services own dashboard-ready truth.
- Module catalog owns commercial/module identity.
- Module entitlement service owns tenant access state.
- RBAC owns user capability inside an entitled module.
- Dashboards render server-provided command/read-model data.
- Client components do not compute business truth.
- Navigation is a reflection of module entitlement plus RBAC, not an independent access system.

## Evidence Reviewed

Architecture evidence came from:

- `graphify-out/GRAPH_REPORT.md`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-entitlement.service.ts`
- `actions/modules/module-control.actions.ts`
- `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx`
- `config/sidebar.ts`
- `components/dashboard/Sidebar.tsx`
- `components/dashboard/Navbar.tsx`
- `services/_shared/protect.ts`
- `lib/security/rbac-permissions.ts`
- `services/snapshots/snapshot-contracts.ts`
- `actions/snapshots/snapshot.actions.ts`
- `services/evidence/evidence-contracts.ts`
- `services/security/redaction-policy.service.ts`
- `prisma/schema.prisma`
- `package.json`

The existing graph report was rebuilt on 2026-06-14 and reported 4,121 nodes, 5,321 edges, and 135 communities. It is useful as an architectural map, but file-level observations in this report were checked against the current workspace on 2026-06-24.

The dashboard route inventory is already broad, with about 98 dashboard `page.tsx` routes. The action and service layers are also broad, with roughly 100 server action files and more than 160 service files. This is a large platform surface, so module governance must be incremental and testable.

## What Is Present

### 1. A Commercial Module Catalog

`services/modules/module-catalog.service.ts` defines module slugs, labels, route prefixes, permissions, risk levels, owners, status, and dependencies.

Observed modules include:

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

This is the right starting point. It gives the platform a vocabulary for module identity and dependency rules.

### 2. Module Dependency Rules

The catalog already declares relationships such as:

- POS requires sales.
- Payment reconciliation requires finance and accounting.
- Close assurance requires accounting and recommends payment reconciliation.
- Payroll recommends accounting.
- Purchasing recommends inventory.
- Analytics recommends reports.

This is important because a module-driven platform must not treat modules as isolated menu items. Real business modules depend on upstream truth.

### 3. Observe-Mode Module Entitlement Service

`services/modules/module-entitlement.service.ts` evaluates entitlement decisions and can return `allow`, `would_block`, or `deny` depending on mode.

Current mode is observe:

- `MODULE_CONTROL_MODE = "observe"`
- `hardEnforcementEnabled: false`

This is exactly the right posture before enforcement. The system can learn what would break before it starts blocking tenants.

### 4. Module Control Center UI

`app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx` exposes a Module Control Center for administrators. It shows module status, requested modules, unknown modules, dependency warnings, and observe-mode decisions.

This is useful operationally. It means the system already has a place to explain module state instead of hiding it in code.

### 5. RBAC Foundation

`lib/security/rbac-permissions.ts` contains canonical permissions and aliases for legacy uppercase permissions.

This is a strong migration bridge. It allows the platform to move toward lower-case domain permissions while still recognizing older permission constants.

### 6. Protected Action Wrapper

`services/_shared/protect.ts` is a strong foundation for server actions:

- Authenticated access.
- Permission checks.
- Optional fresh-auth checks.
- Tenant guard validation.
- Safe action error mapping.
- Correlation IDs.

This wrapper is the best insertion point for module-aware access checks.

### 7. Server-Owned Read Models And Snapshots

`services/snapshots/*` and `actions/snapshots/snapshot.actions.ts` show the correct philosophy: server services produce trusted dashboard data and server actions expose it through protected boundaries.

Existing snapshot kinds include:

- tenant operating snapshot
- branch operating snapshot
- payment truth snapshot
- inventory cash snapshot
- close readiness snapshot

This supports the single-source-of-truth rule because dashboards can render trusted server-provided truth instead of computing it in the browser.

### 8. Evidence, Proof, Redaction, And Assurance Foundations

`services/evidence/*` defines proof trails, evidence grades, blockers, audit context, and redaction handling.

`services/security/redaction-policy.service.ts` already has module-aware policy hooks. Sensitive categories include payroll person amounts, supplier bank details, payment provider references, suspense details, fiscal authority payloads, close certification evidence, partner data, export data, and hidden proof identifiers.

This is strategically important. A module-driven platform needs not only "can I open this module?" but also "what sensitive information may this user see inside this module?"

### 9. Dashboard Navigation Exists And Payroll Is Visible

`config/sidebar.ts` currently exposes `HR & Payroll` at `/dashboard/payroll` with `payroll.read`. `components/dashboard/Sidebar.tsx` and `components/dashboard/Navbar.tsx` filter navigation by permission.

This means the immediate payroll visibility issue is not the core architecture blocker anymore. The bigger issue is that sidebar visibility is RBAC-filtered but not yet module-entitlement-filtered.

### 10. Release Gate Baseline Exists

`package.json` has useful gates:

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run service:boundary`
- `npm run inventory:boundary`
- `npm run hard-delete`
- `npm run error:boundary`
- `npm run policy:gates`
- `npm run verify:repo`

The module platform should extend these gates rather than inventing a parallel release discipline.

## What Is Not Present

### 1. Persistent Module Entitlement Lifecycle

There is no durable `TenantModuleEntitlement` or equivalent model in `prisma/schema.prisma`.

Current entitlement state is derived from:

- `Organization.requestedModules`
- explicit runtime inputs
- legacy defaults when no requested modules exist

That is useful for onboarding and compatibility, but it is not enough for a real platform control plane. A module-driven platform needs explicit persisted state for active, trial, suspended, read-only, expired, unavailable, dependency-blocked, and migrated states.

### 2. Module Enforcement Is Not Active

The system is intentionally in observe mode. `hardEnforcementEnabled` is false.

This is acceptable now, but the platform cannot be called module-driven until module gates are consistently evaluated before access to routes, actions, APIs, exports, reports, and jobs.

### 3. Module Access Is Not Integrated Into The Core Action Wrapper

`protect` currently checks permissions and tenant context, but it does not accept module metadata such as:

- `moduleSlug`
- `surfaceType`
- `accessIntent`
- `dependencyPolicy`
- `enforcementMode`

As a result, individual modules can be permission-protected but not module-entitlement-protected through the main action convention.

### 4. Sidebar Is Not Generated Or Validated From The Module Catalog

The sidebar is still a static navigation config filtered by RBAC. It is not derived from the module catalog and it does not currently call entitlement decisions for navigation visibility.

This creates drift risk:

- A module may exist without navigation.
- Navigation may exist without a catalog entry.
- A route may exist without a module assignment.
- A tenant may see a module link that would later be blocked by module controls.

### 5. Route-To-Module Coverage Is Not Yet Guaranteed

The route inventory has many dashboard pages across accounting, assurance, compliance, finance, inventory, payroll, POS, purchasing, sales, settings, analytics, and more.

The catalog has route prefixes, but there is no hard gate proving every dashboard route maps to one and only one module entry.

### 6. Catalog Drift Already Exists

The catalog declares `presence` as available with `/dashboard/presence`, but the current route inventory did not show a matching `app/[locale]/(dashboard)/dashboard/presence/page.tsx`.

This is not catastrophic, but it is exactly the sort of drift a module-driven platform must catch automatically.

### 7. Snapshot Source Module Vocabulary Is Not Fully Aligned

`services/snapshots/snapshot-contracts.ts` uses source module names such as:

- `close`
- `payments`

The module catalog uses:

- `close_assurance`
- `payment_reconciliation`

This mismatch can become a subtle source-of-truth problem if dashboards, redaction policies, proof trails, and entitlements compare module names differently.

### 8. Module-Aware Test Matrix Is Missing

There are tests around module entitlement and module actions, but there is no complete matrix proving:

- Every catalog route prefix exists or is intentionally unavailable.
- Every dashboard page maps to a module.
- Every server action has module metadata or an explicit exemption.
- Every sidebar item maps to a module.
- Snapshot source modules use catalog slugs.
- Redaction policies reference valid catalog slugs.
- Enforce-mode canary modules block correctly.

### 9. No Tenant Module Operations Model Yet

A platform needs operational flows:

- activate module
- suspend module
- resume module
- trial module
- expire module
- downgrade to read-only
- resolve dependencies
- migrate legacy tenants
- explain denial reason
- audit every change

The current system has the foundation for evaluation and audit, but not the complete operations model.

### 10. No Module Release Gates Yet

Existing policy gates are good, but there is no `module:boundary` or `module:surface` gate that fails when module ownership drifts.

## What Is Needed

### 1. Module Entitlement Kernel

Add a persisted module entitlement model and service layer.

Minimum durable model:

- `id`
- `organizationId`
- `moduleSlug`
- `status`
- `mode`
- `source`
- `startsAt`
- `expiresAt`
- `readOnlyAt`
- `suspendedAt`
- `suspendedReason`
- `dependencyState`
- `createdByUserId`
- `updatedByUserId`
- audit metadata

Recommended statuses:

- `active`
- `trial`
- `read_only`
- `suspended`
- `expired`
- `unavailable`
- `legacy_default`
- `system_default`

Do not remove `Organization.requestedModules` immediately. Treat it as onboarding input, then backfill and reconcile into the entitlement table.

### 2. Module-Aware Protect Wrapper

Extend `protect` with optional module controls:

```ts
protect(schema, handler, {
  permission: "payroll.read",
  module: {
    slug: "payroll",
    surfaceType: "action",
    surface: "payroll-control",
    accessIntent: "read payroll control center",
  },
})
```

In observe mode, it should:

- evaluate module access
- log would-block decisions
- continue execution
- attach the decision to audit/redaction context

In enforce mode, it should:

- deny when not entitled
- deny when required dependencies are missing
- return a safe module denial response
- preserve correlation IDs

### 3. Route Module Manifest

Create a generated or maintained manifest that maps:

- dashboard route
- catalog module slug
- required permission
- surface type
- ownership service
- release-gate status

Example:

```ts
{
  route: "/dashboard/payroll",
  moduleSlug: "payroll",
  permission: "payroll.read",
  surfaceType: "page",
  ownerService: "services/payroll/payroll-control.service.ts",
}
```

This manifest should be validated against the file system and module catalog.

### 4. Navigation From Catalog And Manifest

Sidebar navigation should eventually become:

catalog + route manifest + RBAC + entitlement decision = visible navigation

This avoids duplicating module knowledge in `config/sidebar.ts`.

Short-term, keep the static sidebar but add a validation gate that proves every sidebar item maps to a known module.

### 5. Canonical Module Slug Vocabulary

Unify module names everywhere:

- catalog
- snapshots
- evidence
- redaction
- audit logs
- route manifest
- action metadata
- release reports

Use catalog slugs as the canonical vocabulary. For example:

- prefer `close_assurance` over `close`
- prefer `payment_reconciliation` over `payments` when the concept is the reconciliation module

### 6. Module-Owned Read Models

Keep business truth in services, but each module should expose dashboard-safe read models through server-only services.

Example:

- Payroll truth stays in payroll services.
- Payroll dashboard data is produced by a payroll read-model service.
- The page renders that read model.
- The client does not recalculate payroll truth.

### 7. Module Boundary Tests

Add tests/gates for:

- valid catalog slugs
- route prefix existence
- one route to one module mapping
- no orphan dashboard routes
- no orphan sidebar entries
- no unknown snapshot source modules
- no redaction policy module slugs outside the catalog
- no server action without module metadata unless explicitly exempt

### 8. Observe-Mode Analytics Before Enforcement

Before enforcement, collect:

- would-block count by module
- would-block count by tenant
- most common missing dependencies
- stale requested modules
- unknown requested modules
- routes without module mapping
- actions without module mapping
- redaction decisions affected by module state

This lets the system enforce safely rather than breaking legitimate tenants.

### 9. Module Release Gate

Add a new release gate:

```txt
npm run module:surface
```

It should fail when:

- a dashboard route lacks module ownership
- a sidebar item lacks module ownership
- a snapshot source module is not a catalog slug
- a redaction policy references an invalid module slug
- a module routePrefix has no existing route and is not marked unavailable/internal/future
- a server action lacks module metadata and is not in an allowlist

Start in report mode, then ratchet to fail mode.

## What Must First Be Done

### Step 1: Freeze The Canonical Module Catalog

Before building more module UI, decide whether each catalog entry is:

- production
- beta
- internal
- future
- unavailable
- legacy

Immediate catalog questions:

- Is `presence` truly available? If yes, create its route. If no, mark it beta/future/unavailable.
- Should snapshot source module `close` become `close_assurance`?
- Should snapshot source module `payments` become `payment_reconciliation`, `finance`, or a separate catalog module?
- Should `cashDrawer` legacy route be normalized under `cash_drawer`?

### Step 2: Generate A Module Surface Inventory

Create a report artifact, preferably JSON plus Markdown, mapping:

- catalog modules
- route prefixes
- existing dashboard pages
- server action files
- service folders
- sidebar entries
- snapshot source modules
- redaction policy module slugs
- proof/evidence subject modules

The first output should be report-only. Do not block CI until the inventory is accurate.

### Step 3: Add Persistent Entitlements In Observe Mode

Add the entitlement table and service functions while keeping `MODULE_CONTROL_MODE = "observe"`.

Backfill from `Organization.requestedModules`, then compare:

- requested module
- derived entitlement
- actual access observed
- would-block result

### Step 4: Extend `protect` With Optional Module Metadata

Add module metadata support without requiring every action to migrate immediately.

First canary actions:

- payroll
- payment reconciliation
- close assurance
- module control center
- sensitive exports/reports

### Step 5: Add Navigation Entitlement Decisions

Keep the current sidebar structure, but add an entitlement-aware filtering layer.

The sidebar should not expose a module when:

- the user lacks RBAC permission
- the tenant is not entitled in enforce mode
- required module dependencies are missing in enforce mode

In observe mode, it may expose the link but should be able to show admin diagnostics in the Module Control Center.

### Step 6: Fix Known Drift

Minimum fixes before enforcement:

- Resolve the `presence` module route mismatch.
- Align snapshot source module vocabulary with catalog slugs.
- Validate payroll route, sidebar item, action, service, and redaction policies under one `payroll` module identity.
- Normalize mixed uppercase/lowercase permissions in sidebar entries through the canonical alias system.

### Step 7: Enforce One Low-Risk Module First

Do not enforce the whole platform at once.

Recommended first enforcement canary:

- `reports`, `analytics`, or another read-heavy module.

Avoid first enforcement on:

- POS
- accounting postings
- payment reconciliation
- payroll runs
- close assurance

Those are high-impact business workflows and need stronger evidence first.

## Proposed Roadmap

### Phase 0: Module Readiness Audit

Goal: know exactly what exists.

Deliverables:

- `innovation/MODULE_SURFACE_INVENTORY_2026-06-24.md`
- `what-next/module-surface-inventory.json`
- report-only `module:surface` script
- drift list

Exit criteria:

- Every dashboard route is classified.
- Every catalog prefix is matched or intentionally marked future/unavailable.
- Every snapshot source module is mapped to a catalog slug.

### Phase 1: Entitlement Kernel

Goal: make module access durable.

Deliverables:

- Prisma module entitlement model
- module entitlement service
- backfill from `Organization.requestedModules`
- audit log for entitlement changes
- tests for dependency and status decisions

Exit criteria:

- Legacy tenants retain access.
- Requested modules are reconciled.
- Observe decisions match current behavior.

### Phase 2: Guard Integration

Goal: put module decisions at the boundary.

Deliverables:

- module-aware `protect`
- route/page module helper
- action metadata examples
- denial response contract
- tests for observe and enforce behavior

Exit criteria:

- Canary actions report module decisions.
- No behavior breaks in observe mode.

### Phase 3: Navigation Control

Goal: make module visibility governed.

Deliverables:

- sidebar module ownership map
- entitlement-aware sidebar filtering
- module diagnostics in settings
- no orphan sidebar entries

Exit criteria:

- Navigation is RBAC plus entitlement aware.
- Payroll remains visible for entitled users with `payroll.read`.

### Phase 4: Read-Model Alignment

Goal: preserve single source of truth while improving module UX.

Deliverables:

- module-owned dashboard read models
- snapshot source module slug cleanup
- proof/evidence module slug cleanup
- no client-computed business metrics

Exit criteria:

- Dashboards render server-provided command/read-model data.
- No duplicated dashboard-only truth services are introduced.

### Phase 5: Enforcement Canary

Goal: enforce safely.

Deliverables:

- enforce mode for one low-risk module
- module denial UI state
- audit and metric dashboards
- rollback flag

Exit criteria:

- Enforcement blocks only expected access.
- No critical workflow regressions.

### Phase 6: Platform Operations

Goal: operate modules like a real product platform.

Deliverables:

- activate/suspend/resume/trial/expire module actions
- dependency resolution UX
- tenant module history
- admin audit report
- migration dashboard

Exit criteria:

- Admins can explain and change module access safely.

### Phase 7: Release Gates And Ratchets

Goal: prevent drift from returning.

Deliverables:

- `module:surface`
- `module:entitlement`
- `module:navigation`
- `module:snapshot-slugs`
- `module:redaction`

Exit criteria:

- New routes/actions/sidebar entries cannot bypass module ownership.
- Catalog slugs remain canonical.

## Critical Risks

### Risk 1: Treating Modules As UI Buckets

If modules are only sidebar sections, the platform will look organized but stay architecturally loose.

Mitigation: every module must map to services, actions, routes, read models, permissions, entitlements, and release gates.

### Risk 2: Duplicating Business Truth Per Module

If each module creates its own dashboard-specific calculations, the system will become bloated and contradictory.

Mitigation: dashboards only render server read models and snapshots. Services remain the owners of business truth.

### Risk 3: Enforcing Before Inventory

Hard enforcement without route/action inventory could block legitimate tenant workflows.

Mitigation: observe mode first, report would-blocks, fix drift, then enforce by canary.

### Risk 4: Permission And Entitlement Confusion

RBAC answers "what can this user do?" Module entitlements answer "does this tenant have this module?"

Mitigation: keep both. Do not replace RBAC with modules or modules with RBAC.

### Risk 5: Slug Drift

Different names for the same domain create hidden access and reporting bugs.

Mitigation: catalog slugs become the canonical vocabulary for modules.

## Recommended First Implementation Slice

Build a report-only Module Surface Inventory Gate.

Scope:

- Read `services/modules/module-catalog.service.ts`.
- Enumerate dashboard `page.tsx` files.
- Enumerate server actions.
- Read `config/sidebar.ts`.
- Read snapshot source module union.
- Read redaction policy module slugs.
- Produce `what-next/module-surface-inventory.json`.
- Produce `innovation/MODULE_SURFACE_INVENTORY_2026-06-24.md`.

The first gate should not fail CI. It should report:

- orphan routes
- orphan sidebar entries
- missing catalog routes
- invalid snapshot module names
- invalid redaction policy module names
- actions without module metadata
- high-risk modules not ready for enforcement

After the report is trusted, add:

```json
"module:surface": "node scripts/module-surface-gate.js --mode report"
```

Then later:

```json
"module:surface:fail": "node scripts/module-surface-gate.js --mode fail"
```

## Validation Strategy

For each phase, run the smallest useful checks first:

- `npm run prisma:validate`
- focused Jest tests for module entitlement service
- focused Jest tests for module control actions
- focused tests for `protect`
- focused tests for sidebar filtering
- focused tests for redaction policy module decisions
- `npm run typecheck`
- `npm run lint`
- route smoke checks for protected dashboard routes

Only run `npm run verify:repo` when the slice touches shared platform boundaries broadly enough to justify the cost.

## Final Recommendation

Move forward with the module-driven platform transformation, but make the first milestone governance, not UI expansion.

The system already has enough breadth. What it needs next is a disciplined module control plane:

1. Canonical module vocabulary.
2. Route/action/sidebar/snapshot inventory.
3. Persistent entitlement lifecycle.
4. Module-aware boundary guards.
5. Entitlement-aware navigation.
6. Server-owned read models.
7. Release gates that prevent drift.

Done this way, the platform becomes more coherent, easier to sell, easier to operate, and more trustworthy. Done as separate duplicated module stacks, it will bloat the system and weaken the single-source-of-truth architecture.

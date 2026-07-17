# AqStoqFlow Module Workbench UX States

Date: 2026-07-12
Skill: `aqstoqflow-module-workbench-ux-states`
Lane: Module-aware shell, workbench, and UX states
Mode: observe/report only

## Executive Verdict

AqStoqFlow has a useful Module Control Center, but it is still an administrator diagnostic surface, not a complete Module Workbench. The platform already has canonical module slugs, dependency metadata, observe-mode entitlement decisions, would-block audit evidence, and sidebar `moduleSlug` metadata. That is enough foundation to design the next UX layer.

The missing step is a service-owned module state contract that pages, dashboards, reports, exports, jobs, and navigation can consume without inventing their own language. The Workbench must show owners/admins package source, entitlement state, dependency gaps, trial and retention policy, suspension/expiry state, and audit evidence. Normal users must receive calm unavailable/read-only states without billing internals. Sidebar hiding must remain convenience only; direct URLs, actions, APIs, reports, exports, and jobs must stay protected by server-side guards.

No hard enforcement is enabled by this report.

## Source Evidence Inspected

- `docs/modules/AQSTOQFLOW_COMPLETE_MODULE_SYSTEM_ENTERPRISE_ROADMAP_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_FULL_ARCHITECTURE_AUDIT_AND_REMEDIATION_REPORT_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_PACKAGE_STRATEGY_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_SURFACE_REGISTRY_RATCHET_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_ACCESS_GUARD_CONTRACT_2026-07-12.md`
- `docs/architecture/decisions/0004-kontava-module-vocabulary-and-ownership.md`
- `docs/architecture/decisions/0007-kontava-module-entitlement-observe-mode.md`
- `docs/architecture/decisions/0011-kontava-module-ownership-inventory.md`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`
- `actions/modules/module-control.actions.ts`
- `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx`
- `services/_shared/protect.ts`
- `lib/security/server-authz.ts`
- `lib/security/auth-session.ts`
- `config/sidebar.ts`
- `app/globals.css`
- `components/dashboard/Sidebar.tsx`
- `components/dashboard/Navbar.tsx`
- `prisma/schema.prisma`
- `scripts/module-surface-inventory.js`

## Current State

The current module control posture is intentionally observe-mode:

- `MODULE_CONTROL_MODE` is `observe`.
- `ModuleControlCenterData.hardEnforcementEnabled` is `false`.
- `evaluateModuleEntitlement()` returns would-block evidence while allowing traffic in observe mode.
- `recordModuleEntitlementDecision()` writes would-block observations to `AuditLog`.
- `Organization.requestedModules` is still the only persistent tenant module input and is used as registration intent, not durable entitlement truth.
- `/dashboard/settings/modules` is protected by `MANAGE_SYSTEM_SETTINGS` and uses `getModuleControlCenterData()`.
- Current data includes requested modules, normalized requests, unknown requests, catalog count, entitled count, trial count, read-only count, suspended count, would-block count, and dependency-gap count.
- `config/sidebar.ts` includes `moduleSlug` metadata, but dashboard navigation is currently permission-led and search-aware, not entitlement-led.
- The latest inventory baseline before this lane was generated at `2026-07-12T05:40:06.795Z` with 20 catalog modules, 306 inventoried surfaces, 266 mapped surfaces, 34 unmapped surfaces, 16 missing-permission records, and 300 enforcement candidates.

## What Is Working

1. Canonical module vocabulary exists.

   The platform has 20 catalog slugs: `dashboard`, `inventory`, `production`, `sales`, `pos`, `cash_drawer`, `accounting`, `close_assurance`, `compliance`, `purchasing`, `presence`, `payroll`, `finance`, `payment_reconciliation`, `analytics`, `reports`, `commercial_agents`, `content`, `settings`, and `administration`.

2. The catalog is more than navigation.

   `module-catalog.service.ts` provides names, owners, statuses, risk levels, route prefixes, permissions, core flags, and dependency edges. This gives the Workbench an enterprise-grade vocabulary seed.

3. Observe-mode decisions are typed.

   The entitlement service already distinguishes `active`, `trial`, `read_only`, `suspended`, `expired`, `unavailable`, `legacy_default`, and `system_default`.

4. Dependency gaps are visible.

   Required dependency gaps are returned in entitlement decisions and summarized in the Module Control Center.

5. The current UI can become the Workbench.

   `/dashboard/settings/modules` already exposes module state, owner, risk, source, decision reason, and dependency information to administrators.

6. Sidebar shell has a stable design language.

   Desktop and mobile navigation already use consistent `dashboard-enterprise-sidebar`, `dashboard-sidebar-module`, `dashboard-sidebar-submenu`, and `dashboard-sidebar-scroll` patterns. Any module-state UI should extend those patterns, not introduce a detached visual system.

## What Is Not Working

1. The Module Control Center is not yet a product-grade Module Workbench.

   It shows diagnostic state, but does not provide package source, subscription source, upgrade/downgrade flows, deactivation policy, retention policy, support path, audit timeline, or role-specific action guidance.

2. There is no durable module lifecycle source of truth.

   `Organization.requestedModules` cannot represent package purchase, trial start/end, billing status, suspension, read-only retention, manual override, support grant, dependency provisioning, or renewal history.

3. UI state is not service-owned yet.

   Pages, dashboards, reports, exports, and jobs do not yet consume one shared `ModuleWorkbenchState` read model.

4. Normal-user unavailable/read-only states are not complete.

   Direct URL access and dashboard cards need safe states that avoid billing exposure, stack traces, sensitive tenant configuration, and confusing admin terminology.

5. Owner/admin action states are not complete.

   Owners/admins need controlled paths for upgrade request, dependency resolution, trial request, renewal, billing/support escalation, read-only retention review, and audit review.

6. Sidebar behavior is not entitlement-aware.

   Current sidebar filtering is permission-led. It may later reflect module state, but only after server-side access guards and unavailable states are reliable.

7. Session module claims are not trustworthy.

   `modulesEnabled` is currently hard-coded and should not be treated as module truth.

## Why It Is Not Working Yet

The system started as a full-suite platform and is being evolved into a modular SaaS control plane. That means module truth is currently layered on top of existing routes, permissions, actions, reports, and shell navigation. The right path is not to hide links; it is to build durable entitlement truth, expose safe service-owned states, then let the UI render those states consistently.

The Workbench is blocked by three upstream gaps:

- no durable package/subscription/tenant entitlement records;
- no full surface registry for all pages, actions, APIs, reports, exports, jobs, webhooks, and proof surfaces;
- no centralized module access response contract that all callers can use for unavailable/read-only/suspended rendering.

## Service-Owned State Contract

Create a read model owned by `services/modules`, not by individual pages or sidebar components.

Recommended type:

```ts
type ModuleWorkbenchState = {
  organizationId: string
  moduleSlug: CommercialModuleSlug
  displayName: string
  owner: string
  riskLevel: ModuleRiskLevel
  catalogStatus: ModuleCatalogStatus
  lifecycleState:
    | "active"
    | "trial"
    | "trial_expiring"
    | "read_only"
    | "suspended"
    | "expired"
    | "unavailable"
    | "dependency_missing"
    | "legacy_default"
    | "system_default"
    | "observe_would_block"
  entitlementSource:
    | "package"
    | "subscription"
    | "trial"
    | "manual_override"
    | "migration"
    | "requested_modules"
    | "legacy_default"
    | "system_default"
    | "none"
  packageCode: string | null
  subscriptionStatus: string | null
  startsAt: string | null
  endsAt: string | null
  trialEndsAt: string | null
  readOnly: boolean
  allowedIntents: Array<"read" | "write" | "export" | "job">
  blockedIntents: Array<"read" | "write" | "export" | "job">
  missingDependencies: Array<{
    moduleSlug: CommercialModuleSlug
    dependencyType: "required" | "recommended" | "source" | "evidence" | "write" | "reporting"
    reason: string
  }>
  sourceModules: CommercialModuleSlug[]
  normalUserState: {
    title: string
    body: string
    action: "none" | "request_access" | "contact_admin"
  }
  ownerAdminState: {
    title: string
    body: string
    actions: Array<
      | "upgrade"
      | "renew"
      | "request_trial"
      | "resolve_dependency"
      | "review_billing"
      | "contact_support"
      | "view_audit"
    >
  }
  auditEvidence: {
    lastDecisionAt: string | null
    lastDecisionResult: "allow" | "would_block" | "deny" | null
    reason: string
    evidenceIds: string[]
  }
  generatedAt: string
}
```

This contract should be derived from durable entitlement records once they exist. During observe mode, it can be derived from `getModuleControlCenterData()` and marked as diagnostic.

## State Matrix

| State | Normal user UX | Owner/admin UX | Server-side rule |
|---|---|---|---|
| `active` | Show normal module experience subject to RBAC. | Show active package/source and audit links. | Allow when RBAC, tenant, and module checks pass. |
| `trial` | Show normal experience; avoid noisy billing copy. | Show trial source, end date, upgrade path, and impact. | Allow until expiry; audit trial source. |
| `trial_expiring` | Show subtle contact-admin copy only where useful. | Show renewal/upgrade prompt and affected surfaces. | Allow until expiry; record expiry warnings. |
| `read_only` | Show historical data; disable writes with clear copy. | Show retention policy, renewal path, and blocked intents. | Allow approved read surfaces; block writes, exports, and jobs unless explicitly allowed. |
| `suspended` | Show calm unavailable state. | Show support/billing/manual-override resolution path. | Deny module access except approved admin/support/billing surfaces. |
| `expired` | Show unavailable or read-only state per retention policy. | Show renewal and archive-retention options. | Deny or read-only based on entitlement policy. |
| `unavailable` | Show request-access/contact-admin state. | Show upgrade/request-trial path. | Deny direct URLs, APIs, actions, reports, exports, and jobs in enforce mode. |
| `dependency_missing` | Show unavailable state without internal dependency detail. | Show exact missing dependency and package impact. | Deny dependent workflow until required dependency is active. |
| `legacy_default` | Show normal experience. | Show migration warning and source evidence. | Observe only until migrated to durable entitlement. |
| `system_default` | Show normal platform experience. | Show platform foundation, not upsell. | Always available for required platform domains subject to RBAC. |
| `observe_would_block` | No disruption in observe mode. | Show diagnostics and rollout impact. | Allow in observe mode; audit would-block evidence. |

## Role UX Rules

Normal users:

- never see billing internals, package pricing, raw entitlement JSON, or unknown requested-module data;
- see simple unavailable, read-only, or contact-admin states;
- must not be trained to believe hidden navigation is security;
- must receive the same safe state from direct URLs as from dashboard cards.

Owners/admins:

- see module package source, entitlement source, dependencies, trial/expiry/read-only/suspension state, and audit evidence;
- can request upgrades, resolve dependencies, review retention impact, and contact support from controlled flows;
- can inspect unknown requested modules as migration diagnostics;
- must be warned when a downgrade will move surfaces into read-only or unavailable state.

Platform support/admin:

- can see raw diagnostics, evidence ids, subscription/billing event ids, manual override history, and migration records;
- should operate through audited support actions, never by editing `requestedModules` as entitlement truth.

## Module Workbench Information Architecture

Upgrade `/dashboard/settings/modules` into a Workbench with these sections:

1. Overview

   Show mode, hard enforcement flag, generated time, catalog count, entitled count, trial count, read-only count, suspended count, would-block count, and dependency-gap count.

2. Package and source

   Show current package, package modules, add-ons, subscription state, trial modules, manual overrides, and migration source. In observe mode, clearly label derived state as diagnostic.

3. Module states

   Render one row or compact card per module with state badge, owner, risk, package source, entitlement source, blocked intents, dependency gaps, and next action.

4. Dependency map

   Show required and recommended dependencies separately. Required gaps block workflows; recommended gaps explain weaker value without blocking by default.

5. Upgrade and downgrade impact

   Before any package change, show which pages, actions, reports, exports, jobs, and dashboard cards will become active, read-only, suspended, expired, or unavailable.

6. Read-only and retention

   Show historical data guarantees, allowed read surfaces, blocked write/export/job intents, and retention duration.

7. Audit and evidence

   Show entitlement grants, trials, expiries, suspensions, manual overrides, dependency denials, would-block decisions, and rollout changes.

8. Surface coverage

   Link module state to inventory coverage: pages, actions, APIs, reports, exports, jobs, webhooks, proof surfaces, and navigation.

9. Observe diagnostics

   Show would-block decisions, unknown requested modules, hard-enforcement status, and pilot readiness without affecting live access.

## Shell And Sidebar Behavior

Navigation may reflect module state for clarity, but must never substitute for access control.

Rules:

- Sidebar filtering stays subordinate to server-side module guards.
- Direct URL access must return a safe unavailable/read-only/suspended state or a server-side deny.
- Normal users may have unavailable modules hidden after server-side guards are reliable, but owner/admin users should usually see locked/upgradable modules with state badges.
- Read-only modules should remain visible when historical data is allowed.
- Suspended and expired states must not expose billing details to normal users.
- Mobile and desktop sidebar behavior must remain consistent.
- Existing sidebar design tokens and classes should be extended rather than replaced.
- Shell badges should be compact, icon-led, and not cause horizontal overflow.
- Search should match module title, href, permission, and `moduleSlug`, but search visibility is still not authorization.

## Dashboard, Reports, Exports, Jobs, And Cross-Module Data

Dashboards:

- Cards backed by inactive source modules should show partial/unavailable states, not stale or leaked values.
- Cross-module cards should declare owner module and source modules.

Reports:

- A report can be active only if its owner module and required source modules allow the relevant read/export intent.
- Read-only modules may allow report reads while blocking exports depending on policy.

Exports:

- Exports must use explicit module access intent `export`.
- Inactive source modules must be omitted, redacted, or blocked according to surface registry policy.

Jobs:

- Jobs must declare owner module, source modules, write target modules, and allowed lifecycle states.
- Suspended or expired module jobs should stop, quarantine, or run retention-only logic explicitly.

APIs and actions:

- APIs and server actions must use server-side module guards, not UI state.
- RBAC wildcard can satisfy permission checks only; it must not bypass module entitlement.

## Copy Standards

Normal user copy should be short and safe:

- Unavailable: "This module is not available in your workspace. Contact an owner or administrator if you need access."
- Read-only: "This module is available for history only. New changes are not enabled for your workspace."
- Suspended: "This module is temporarily unavailable. Contact an owner or administrator."
- Dependency missing: "This workflow is not available in your workspace."

Owner/admin copy can include next action:

- Unavailable: "This module is not active for this workspace. Review package options or request activation."
- Read-only: "This module is in read-only retention. Historical records remain available; writes, exports, or jobs may be blocked by policy."
- Suspended: "This module is suspended. Review billing, support, or manual override status."
- Expired: "This module has expired. Renew, convert to read-only retention, or remove it from the package."
- Dependency missing: "A required dependency is missing. Activate the dependency before enabling this workflow."

## Implementation Roadmap

1. Add `ModuleWorkbenchState` read-model design to the module contracts.

   Keep it report-only first. Derive from existing `getModuleControlCenterData()` until durable entitlements exist.

2. Create a service-owned state builder.

   Suggested service: `services/modules/module-workbench-state.service.ts`. It should accept org id, actor id, actor permissions, locale, and role context, then return role-filtered states.

3. Replace page-local state labels with shared state rendering.

   `/dashboard/settings/modules` should consume the read model and render state badges, next actions, and audit evidence from the service.

4. Add normal-user unavailable components.

   Create reusable page/card states for unavailable, read-only, suspended, expired, and dependency-missing scenarios.

5. Add owner/admin flows behind explicit permissions.

   Add request-upgrade, request-trial, resolve-dependency, renew, review-retention, view-audit, and contact-support actions as controlled flows after billing/provisioning boundaries are defined.

6. Make shell/sidebar module-aware only after guard confidence.

   Use `moduleSlug` metadata to render badges and locked/upgradable states, but only after server-side access responses are in place.

7. Add dashboard/report/export/job degradation behavior.

   Each cross-module surface must declare owner/source modules and how it behaves when a source is inactive.

8. Add release gates.

   Ratchet toward no unregistered surfaces, no missing unavailable behavior, no missing source modules on cross-module reports, and no sidebar-only security.

## Security, RBAC, Tenant, Audit, Redaction, And Release Controls

- Tenant isolation remains mandatory on every module state query.
- RBAC remains distinct from module entitlement.
- `MANAGE_SYSTEM_SETTINGS` protects the current admin control page.
- Normal-user state responses must be role-filtered and redacted.
- Billing/support detail must be hidden from non-owners.
- Unknown requested modules are migration diagnostics, not user-facing product state.
- Module access decisions must be auditable with organization id, actor id, module slug, surface, intent, decision, reason, dependency gaps, and enforcement mode.
- Session module claims must be derived from durable entitlements or removed until trustworthy.
- Release gates must prove no new page/action/API/report/export/job relies on sidebar hiding as access control.

## Test And Release Gates

Current lane verification is limited to report-mode inventory because this pass changes only documentation.

Future implementation tests:

- `ModuleWorkbenchState` builder covers active, trial, trial-expiring, read-only, suspended, expired, unavailable, dependency-missing, legacy-default, and system-default states.
- Normal users do not receive billing/support internals.
- Owners/admins receive package, dependency, audit, and next-action details.
- RBAC wildcard does not bypass module entitlement.
- Read-only blocks writes, exports, and jobs unless explicitly allowed.
- Suspended, expired, and unavailable states deny direct URLs, APIs, actions, reports, exports, and jobs in enforce mode.
- Sidebar hiding cannot make a route accessible or inaccessible by itself.
- Dashboard cards redact/omit inactive source-module data.
- Reports and exports declare owner/source modules and safe inactive-source behavior.
- Jobs declare owner/source/write-target modules and allowed lifecycle states.
- Accessibility tests cover badges, disabled actions, focus order, mobile sidebar, and state copy.

## Risks And Blockers

| Risk | Severity | Mitigation |
|---|---:|---|
| UI hides modules before server guards are reliable | Critical | Keep sidebar subordinate to server-side module access. |
| `requestedModules` becomes commercial truth | Critical | Migrate to durable entitlements; preserve requested modules as evidence only. |
| Normal users see billing internals | High | Role-filter workbench state and copy. |
| Read-only state allows writes or exports | High | Intent-aware guards and tests for read/write/export/job. |
| Cross-module dashboards leak inactive source data | High | Surface registry source-module metadata and degradation policy. |
| Session module claims drift from entitlement truth | High | Derive from entitlement service or remove until reliable. |
| Owner/admin flows bypass audit | High | Centralize upgrade, trial, suspension, renewal, and override events. |
| Workbench becomes another one-off page | Medium | Build service-owned state contracts before UI polish. |

## Success Criteria

- Every module has a service-owned workbench state.
- Every state has normal-user and owner/admin rendering rules.
- Every direct URL has a safe unavailable/read-only/suspended path or a server-side deny.
- Module Workbench shows package source, entitlement source, dependencies, lifecycle state, blocked intents, audit evidence, and next actions.
- Sidebar reflects module state only after server-side guards are reliable.
- Reports, exports, jobs, APIs, and actions use server-side module access decisions.
- `Organization.requestedModules` is no longer treated as durable entitlement truth.
- Release gates detect new unregistered or module-unsafe surfaces.

## Verification Result

Before this lane:

```powershell
npm run module:surface:inventory
```

Inventory evidence from `what-next/module-surface-inventory.md` before this report:

- Generated at: `2026-07-12T05:40:06.795Z`
- Catalog modules: 20
- Surfaces inventoried: 306
- Mapped: 266
- Unmapped: 34
- Missing permission: 16
- Enforcement candidates: 300
- Report mode: inventory is read-only and does not enforce module entitlements.

After this lane:

- Command: `npm run module:surface:inventory`
- Result: passed. The report-mode inventory rewrote 306 records to `what-next/module-surface-inventory.json`.
- Generated at: `2026-07-12T05:46:00.882Z`
- Catalog modules: 20
- Surfaces inventoried: 306
- Mapped: 266
- Unmapped: 34
- Missing permission: 16
- Enforcement candidates: 300
- Source coverage remained `sidebar=present`, `moduleCatalog=present`, `dashboardRoot=present`, and `actionsRoot=present`.

## Next Handoff

Return to `aqstoqflow-module-control-plane-orchestrator`.

Recommended next lane: `aqstoqflow-module-billing-provisioning-boundary`.

Reason: the Workbench needs a safe package/subscription/billing-provider boundary before owner/admin upgrade, renewal, trial, suspension, and support actions can become real product flows.

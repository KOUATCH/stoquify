---
name: kontava-module-control-plane
description: Build Kontava module catalog, tenant module entitlements, observe-mode subscription control, route/action/API/report/job entitlement guards, module dependency mapping, module admin surfaces, upgrade prompts, and tests proving RBAC and admin wildcard permissions cannot bypass module subscription rules. Use for module-oriented SaaS implementation before hard enforcement.
---

# Kontava Module Control Plane

## Purpose

Use this skill to transform Kontava into a module-oriented SaaS platform safely. Start with observe mode and would-block reporting before enforcing restrictions.

## Upgraded Mission

Build the module operating system foundation without breaking existing tenants. Kontava should become a platform where businesses buy, see, and use only the modules they are entitled to, while owners/admins retain controlled upgrade paths and the system preserves one unified OHADA SMB operating backbone.

The module control plane is a moat because it supports pricing, bundles, partner channels, onboarding clarity, and safe expansion without turning Kontava into disconnected mini-apps.

## Stakeholder Value

- Owners understand what they have, what is available, and what an upgrade unlocks.
- Normal users see only the work they can actually perform.
- Sales can sell focused bundles without promising the full suite to every tenant.
- Partners can attach to authorized modules without broad data access.
- Engineering gets one server-side entitlement decision layer instead of sidebar-only hiding.

## Entitlement Principles

- Module entitlement answers "is this tenant subscribed or allowed?"
- RBAC answers "is this user allowed?"
- Tenant scope answers "which organization is this user acting inside?"
- Consent/fresh auth/maker-checker answer "is this sensitive action allowed now?"

All four layers are independent. Passing one must never imply passing the others.

## Inspect First

Inspect:

- `moat proposals/KONTAVA_MOAT_EXECUTION_SKILL_PROMPTS_UPGRADED_2026-06-19.md`
- `Organization.requestedModules` in `prisma/schema.prisma`
- Registration/auth actions and services.
- `config/sidebar.ts`
- `components/dashboard/Sidebar*`
- `components/dashboard/useShellPermissions.ts`
- `lib/security/rbac.ts`
- `lib/security/rbac-permissions.ts`
- `services/_shared/protect.ts`
- `actions`
- `app/[locale]/(dashboard)/dashboard`

## Product And UX Requirements

Normal users:

- Non-subscribed modules should be invisible in normal navigation.
- Direct URL access must be denied server-side with a safe unavailable or permission state.
- No upgrade marketing should distract users who cannot buy modules.

Owners/admins:

- See subscribed, trial, suspended, read-only, and unavailable modules.
- Understand dependencies and workflow gaps.
- Request upgrades through controlled surfaces.
- See observe-mode would-block diagnostics before hard enforcement.

## Build Order

1. Define module catalog and dependency map.
2. Normalize existing requested modules into future entitlement language.
3. Add durable entitlements only with safe nullable migrations.
4. Implement observe-mode entitlement service.
5. Add would-block logging.
6. Add server-side guard helpers.
7. Apply guards to a narrow low-risk surface.
8. Add Module Control Center UI for owner/admin visibility.
9. Add hard enforcement only after observe reports are clean and user approves.

## Core Models

Possible models:

- `ModuleCatalog`
- `ModuleDependency`
- `SubscriptionPlan`
- `PlanModule`
- `TenantModuleEntitlement`
- `ModuleEntitlementDecisionLog`
- `ModuleUsageSignal`

Keep initial migrations backward-compatible. Existing tenants should receive legacy/default entitlements.

## Guarding Rules

- Subscription entitlement does not grant RBAC permission.
- RBAC permission does not grant subscription entitlement.
- Admin wildcard cannot bypass entitlement, consent, fresh-auth, maker-checker, or certification rules.
- Client-side hiding is never sufficient. Guard pages, actions, APIs, reports, exports, and jobs server-side.

## UI Requirements

For normal users:

- Non-subscribed modules should be invisible.
- Direct access should show safe unavailable/permission states.

For owners/admins:

- Show subscribed modules.
- Show unavailable modules through controlled upgrade/request surfaces.
- Show dependencies and workflow gaps.
- Show observe-mode would-block diagnostics.

## Must Not Do

- Do not turn on hard enforcement globally in the first pass.
- Do not delete or overwrite requested module data.
- Do not make module decisions in only the sidebar.
- Do not break existing tenant workflows.
- Do not let admin wildcard permissions bypass module entitlements.
- Do not enforce hard denial before observe-mode reports are clean and approved.

## Tests

Add tests for:

- Entitlement decision logic.
- Observe-mode logging.
- Direct URL bypass.
- Server action/API bypass.
- Export/report/job bypass.
- RBAC plus entitlement.
- Wildcard cannot bypass entitlement.
- Legacy/default entitlement migration.
- Suspended, read-only, trial, expired, dependency-missing, and legacy tenant decisions.

## Validation

Run:

- `npx prisma validate` if schema changes.
- `npm run typecheck`
- `npm run lint`
- Focused RBAC/permission/entitlement tests.

## Completion Criteria

Finish when module access has a server-side decision service, observe-mode logs are generated, normal users see only allowed modules, owners/admins can understand upgrade paths, and no hard enforcement is enabled without clean validation.

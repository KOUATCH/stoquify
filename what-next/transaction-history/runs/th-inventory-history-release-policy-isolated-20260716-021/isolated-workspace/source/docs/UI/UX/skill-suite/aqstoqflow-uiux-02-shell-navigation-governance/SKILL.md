---
name: aqstoqflow-uiux-02-shell-navigation-governance
description: "Execute Phase 1 of the AqStoqFlow UI/UX revamp: simplify the authenticated shell, sidebar, topbar, and navigation model into a role-aware, professional command interface."
---

# AqStoqFlow UI/UX 02 Shell Navigation Governance

## Mission

Make the authenticated shell focused, role-aware, and calmer. The sidebar should stop behaving like a complete sitemap and start behaving like an operating command interface.

## Inspect First

- `docs/UI/UX/AQSTOQFLOW_UI_CONSTITUTION_2026-06-26.md` if present
- `docs/UI/UX/AQSTOQFLOW_UI_COMPONENT_REGISTRY_2026-06-26.md` if present
- `config/sidebar.ts`
- `components/dashboard/Sidebar.tsx`
- `components/dashboard/Navbar.tsx`
- `components/dashboard/DashboardRouteState.tsx`
- `components/dashboard/DashboardErrorState.tsx`
- `app/[locale]/(dashboard)/layout.tsx`
- Role, permission, module entitlement, and tenant context helpers used by the shell

## Prerequisites

- Phase 01 is complete or explicitly accepted as a blocker.
- Primary roles are known or can be inferred from existing navigation and permissions.
- Daily-use routes and occasional admin/setup routes are separated.
- Existing route permissions are preserved.

## What To Do

1. Group navigation into five primary lanes:
   - Command
   - Operations
   - Finance
   - People
   - Governance
2. Reduce first-level visible links.
3. Keep role and permission filtering.
4. Move rare routes to secondary navigation, settings, or command/search access.
5. Simplify sidebar chrome, repeated badges, and dense explanatory panels.
6. Make the topbar prioritize tenant/location, command/search, urgent alerts, and user controls.
7. Preserve locale-aware routing and existing active-state behavior.

## How To Implement

- Update `config/sidebar.ts` first, then adapt shell rendering only as needed.
- Preserve route IDs and permission checks when regrouping.
- Do not delete routes because they are visually noisy.
- Keep all authorized routes reachable.
- Avoid adding new labels, badges, or panels unless they reduce confusion.
- Use the design constitution for colors, spacing, and density.

## Prompt Contract

```text
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Refactor AqStoqFlow's authenticated shell and navigation into a focused role-aware command interface. Inspect the sidebar config, Sidebar, Navbar, dashboard layout, route state components, RBAC and entitlement behavior. Simplify first-level navigation into Command, Operations, Finance, People, and Governance while preserving route reachability, permissions, locale, tenant safety, and active states. Keep changes surgical and save a phase report.
```

## Acceptance Criteria

- A new user can understand the navigation in under ten seconds.
- Primary navigation no longer feels like a full sitemap.
- Role-specific users see relevant work first.
- Search or command access keeps authorized routes reachable.
- The shell remains usable at common laptop and tablet widths.
- No permission, locale, tenant, or active route behavior is weakened.

## Verification

Run relevant checks:

- `npm run lint`
- `npm run typecheck`
- Focused tests for sidebar/nav config if present
- Browser smoke of `/en/dashboard`, one nested route, and mobile sidebar if possible

## Required Report

Save:

- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_02_SHELL_NAVIGATION_REPORT_<date>.md`


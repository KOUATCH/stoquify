---
name: aqstoqflow-uiux-01-design-system-freeze
description: "Execute Phase 0 of the AqStoqFlow UI/UX revamp: audit, freeze, and document the authenticated dashboard design system so future pages use one modern, professional, robust visual language."
---

# AqStoqFlow UI/UX 01 Design System Freeze

## Mission

Stop authenticated UI drift before adding new surfaces. Establish the single source of truth for AqStoqFlow dashboard styling, page anatomy, component usage, semantic colors, density, and visual restraint.

## Inspect First

- `docs/UI/UX/AQSTOQFLOW_UI_UX_REVAMP_ROADMAP_2026-06-26.md`
- `docs/UI/UX/AQSTOQFLOW_UI_UX_HONEST_REVIEW_2026-06-26.md`
- `app/globals.css`
- `components/dashboard/Sidebar.tsx`
- `components/dashboard/Navbar.tsx`
- `components/dashboard/EnhancedEnterpriseDashboard.tsx`
- `components/finance/FinanceCommandCenterDashboard.tsx`
- `components/payroll/PayrollCommandCenter.tsx`
- `docs/product/user-experience/`

## Prerequisites

- The UI/UX roadmap is readable.
- The current dashboard theme tokens are identifiable.
- Existing competing patterns can be named without rewriting them yet.
- The worktree is checked for unrelated user changes.

## What To Do

1. Inventory active visual systems.
2. Identify the canonical authenticated dashboard theme.
3. Define allowed semantic colors: success, warning, danger, info, trust/gold, brand, neutral.
4. Define allowed surfaces: app canvas, sidebar, raised panel, command panel, table/workbench, drawer, modal.
5. Define typography and density rules for command centers, tables, forms, and public pages.
6. Define when glass panels, gradients, cards, and dark surfaces are allowed.
7. Document discouraged legacy patterns.
8. Save a UI constitution under `docs/UI/UX/`.

## How To Implement

- Prefer documentation and small token cleanup over broad CSS rewrites.
- Keep existing working pages intact unless a small token alias or naming clarification is necessary.
- Do not create a new design system package.
- If CSS edits are needed, keep them in `app/globals.css` and preserve existing working classes.
- Create a component usage registry that maps common needs to preferred primitives.

## Required Output

Save:

- `docs/UI/UX/AQSTOQFLOW_UI_CONSTITUTION_2026-06-26.md`
- `docs/UI/UX/AQSTOQFLOW_UI_COMPONENT_REGISTRY_2026-06-26.md`
- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_01_DESIGN_SYSTEM_FREEZE_REPORT_<date>.md`

## Prompt Contract

```text
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Audit and freeze AqStoqFlow's authenticated dashboard design system. Inspect the roadmap, current CSS tokens, dashboard shell, and representative module dashboards. Document the canonical theme, page anatomy, semantic color rules, allowed surfaces, component registry, discouraged patterns, and verification plan. Keep changes surgical and do not redesign module pages in this phase.
```

## Acceptance Criteria

- A new dashboard page has a clear theme and component path to follow.
- Legacy and competing patterns are documented.
- The system has one authenticated visual language.
- Public marketing styling is separated from authenticated product styling.
- No unrelated module work is changed.

## Verification

Run the smallest relevant subset:

- `npm run lint` if code changed
- `npm run typecheck` if TypeScript changed
- Manual CSS/class search for newly discouraged patterns in touched files


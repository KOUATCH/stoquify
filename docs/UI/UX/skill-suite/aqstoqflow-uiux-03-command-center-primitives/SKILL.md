---
name: aqstoqflow-uiux-03-command-center-primitives
description: "Execute Phase 2 of the AqStoqFlow UI/UX revamp: create the reusable command-center primitives for command briefs, KPI strips, action queues, proof badges, filter bars, evidence timelines, and detail drawers."
---

# AqStoqFlow UI/UX 03 Command Center Primitives

## Mission

Create the reusable building blocks that let every major dashboard share one page anatomy while preserving domain-specific workflows.

## Inspect First

- `docs/UI/UX/AQSTOQFLOW_UI_CONSTITUTION_2026-06-26.md`
- `docs/UI/UX/AQSTOQFLOW_UI_COMPONENT_REGISTRY_2026-06-26.md`
- `components/dashboard/EnhancedEnterpriseDashboard.tsx`
- `components/finance/FinanceCommandCenterDashboard.tsx`
- `components/payroll/PayrollCommandCenter.tsx`
- `components/owner-war-room/OwnerWarRoomDashboard.tsx`
- `components/dashboard/DashboardRouteState.tsx`
- Existing UI primitives under `components/ui/` or equivalent

## Prerequisites

- Phase 01 design-system rules exist or are documented as a blocker.
- Phase 02 shell direction is known.
- The first pilot pages are identified.
- Existing UI library conventions are understood.

## What To Build

Create or normalize reusable primitives for:

- Command brief header
- Status strip
- KPI tile
- Action queue
- Action queue item
- Proof badge
- Evidence timeline
- Filter bar
- Detail drawer
- Permission locked state
- Route state wrapper

## How To Implement

- Prefer composing existing local UI components over inventing a new UI kit.
- Keep primitives data-shape-light and domain-neutral.
- Do not fetch business data inside primitives.
- Accept display-ready values, labels, statuses, actions, and evidence links from parent read models.
- Keep accessibility, keyboard focus, responsive sizing, and text overflow in the component contract.
- Use semantic statuses instead of module-specific color choices.
- Add focused tests for non-trivial behavior.

## Prompt Contract

```text
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Create AqStoqFlow's shared command-center UI primitives from the approved design-system direction. Build reusable, domain-neutral components for command briefs, status/KPI strips, action queues, proof badges, evidence timelines, filter bars, detail drawers, and route states. Do not fetch business truth inside UI primitives. Preserve accessibility, responsive stability, semantic colors, RBAC-safe display, and existing UI conventions.
```

## Acceptance Criteria

- A command-center page can be assembled without custom layout decisions.
- Primitives do not own business data fetching.
- Status colors and proof indicators are consistent.
- Components handle empty and partial data gracefully.
- Text does not overflow common layouts.
- Keyboard focus and labels are usable.

## Verification

Run relevant checks:

- `npm run lint`
- `npm run typecheck`
- Focused component tests where behavior exists
- Visual smoke in at least one pilot route if primitives are integrated

## Required Report

Save:

- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_03_COMMAND_CENTER_PRIMITIVES_REPORT_<date>.md`


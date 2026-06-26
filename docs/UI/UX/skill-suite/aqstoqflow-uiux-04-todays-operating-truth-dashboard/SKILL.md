---
name: aqstoqflow-uiux-04-todays-operating-truth-dashboard
description: "Execute Phase 3 of the AqStoqFlow UI/UX revamp: rebuild the default authenticated dashboard around Today's Operating Truth, action queues, status strips, evidence timelines, and role-aware shortcuts."
---

# AqStoqFlow UI/UX 04 Today's Operating Truth Dashboard

## Mission

Make `/dashboard` the unmistakable center of AqStoqFlow: a first screen that shows the state of the business, what changed, what needs action, and what proof backs it.

## Inspect First

- `components/dashboard/EnhancedEnterpriseDashboard.tsx`
- `app/[locale]/(dashboard)/dashboard/`
- Shared command-center primitives from Phase 03
- Current dashboard data services, hooks, and server actions
- `components/dashboard/Sidebar.tsx`
- `components/dashboard/Navbar.tsx`
- Existing owner, finance, cash, inventory, payroll, compliance, and close dashboard sources

## Prerequisites

- Phase 03 primitives exist or the blocker is documented.
- Available cross-domain metrics are identified.
- Missing data fallback behavior is defined.
- Role-aware ordering rules are known or minimally inferred.

## Target First Viewport

The default dashboard should include:

1. One-sentence command brief.
2. Live status strip for POS, stock, cash, AP, close, payroll, and compliance.
3. Urgent action queue with owner, due state, risk, and proof link.
4. Evidence timeline of recent trusted events.
5. KPI strip for revenue, margin, cash, stock risk, and obligations.
6. Role-aware shortcuts.
7. Secondary analytics below the first decision layer.

## How To Implement

- Use existing trusted data first.
- Do not invent fake business metrics.
- Use partial-data states where a module is unavailable.
- Keep role-specific ordering light before building separate dashboards.
- Keep the first viewport clean and screenshot-worthy.
- Preserve tenant and permission boundaries.
- Keep analytics below the action layer.

## Prompt Contract

```text
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Rebuild AqStoqFlow's default authenticated dashboard as Today's Operating Truth. Use existing trusted read models and shared command-center primitives to show business state, live status, urgent actions, evidence timeline, KPI strip, and role-aware shortcuts. Do not invent fake metrics or client-compute business truth. Preserve tenant safety, RBAC, module entitlement, partial-data handling, responsive layout, and screenshot-worthy first viewport quality.
```

## Acceptance Criteria

- The dashboard answers the four core questions immediately.
- The first viewport feels like a command center, not a card collection.
- Missing module data appears as intentional partial state.
- Important numbers link to evidence or explain their source where possible.
- Role-aware shortcuts are useful and not noisy.
- Desktop, tablet, and mobile layouts do not overlap text.

## Verification

Run relevant checks:

- `npm run lint`
- `npm run typecheck`
- Focused tests for transformed dashboard helpers if added
- Browser smoke of `/en/dashboard`
- Screenshot checks for desktop and mobile if Playwright is available

## Required Report

Save:

- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_04_TODAYS_OPERATING_TRUTH_REPORT_<date>.md`


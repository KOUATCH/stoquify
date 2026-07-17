---
name: aqstoqflow-uiux-05-robust-states
description: "Execute Phase 4 of the AqStoqFlow UI/UX revamp: standardize loading, empty, error, locked, permission, partial-data, and stale-session states across the dashboard experience."
---

# AqStoqFlow UI/UX 05 Robust States

## Mission

Make AqStoqFlow feel reliable when data is loading, missing, unauthorized, blocked, stale, partially available, or broken.

## Inspect First

- `components/dashboard/DashboardRouteState.tsx`
- `components/dashboard/DashboardErrorState.tsx`
- `app/[locale]/(dashboard)/error.tsx`
- `app/[locale]/(dashboard)/not-found.tsx`
- Dashboard pages with inline error, empty, loading, or permission states
- Auth/session/tenant refresh behavior where relevant
- Existing agreed system error page

## Prerequisites

- The design-system direction is known.
- Existing route state components are understood.
- The agreed system error page pattern is located.
- Common failure modes are listed.

## What To Standardize

- Loading state
- Empty state
- Permission denied state
- Locked module state
- Network/server error state
- Stale tenant/session state
- Partial-data state
- Not-found state

## How To Implement

- Use shared components rather than page-specific error markup.
- Keep copy practical: what happened, what it affects, what to do next.
- Provide recovery actions such as retry, return, open command center, contact admin, or refresh session.
- Preserve security by not leaking protected details in errors.
- Do not hide failures behind blank cards.
- Normalize the dashboard route error page before touching many inline states.

## Prompt Contract

```text
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Standardize AqStoqFlow's robust UI states across authenticated dashboard routes. Inspect existing route state, error, not-found, permission, locked-module, loading, empty, stale-session, and partial-data patterns. Promote the agreed system error page where missing. Use shared components, safe copy, clear recovery actions, tenant-safe messaging, and the approved dashboard visual system. Keep changes focused and verify representative routes.
```

## Acceptance Criteria

- Users do not see blank dashboards without explanation.
- Permission failures feel intentional and secure.
- Loading states keep stable layout.
- Error screens match the product visual language.
- Recovery actions are clear.
- Protected details are not leaked.

## Verification

Run relevant checks:

- `npm run lint`
- `npm run typecheck`
- Focused tests for state components if present
- Browser smoke for `/en/dashboard`, not-found, and one forced error path where practical

## Required Report

Save:

- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_05_ROBUST_STATES_REPORT_<date>.md`


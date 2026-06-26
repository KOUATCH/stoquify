---
name: aqstoqflow-uiux-00-orchestrator
description: "Run the AqStoqFlow UI/UX transformation suite orchestrator. Use when sequencing, executing, validating, or blocker-reporting the roadmap to make the system uniform, modern, professional, robust, and stunning without broad unrelated rewrites."
---

# AqStoqFlow UI/UX 00 Orchestrator

## Mission

Coordinate the UI/UX revamp suite in strict order. Select one skill at a time, enforce prerequisites, prevent scope drift, and save a dated report after each slice.

## Source Documents

Read first:

- `docs/UI/UX/AQSTOQFLOW_UI_UX_HONEST_REVIEW_2026-06-26.md`
- `docs/UI/UX/AQSTOQFLOW_UI_UX_REVAMP_ROADMAP_2026-06-26.md`
- `docs/product/user-experience/` when present
- `graphify-out/` when architecture, dependency, route, or impact analysis is needed

## Run Order

1. `aqstoqflow-uiux-01-design-system-freeze`
2. `aqstoqflow-uiux-02-shell-navigation-governance`
3. `aqstoqflow-uiux-03-command-center-primitives`
4. `aqstoqflow-uiux-04-todays-operating-truth-dashboard`
5. `aqstoqflow-uiux-05-robust-states`
6. `aqstoqflow-uiux-06-module-normalization`
7. `aqstoqflow-uiux-07-public-first-impression`
8. `aqstoqflow-uiux-08-onboarding-demo-workspace`
9. `aqstoqflow-uiux-09-accessibility-visual-regression-governance`

## Non-Negotiable Rules

- Touch only the phase scope selected for the current run.
- Keep business truth server-owned. Dashboards render trusted read models and call protected actions.
- Preserve RBAC, tenant isolation, module entitlement, redaction, audit trails, fresh auth where required, and safe error handling.
- Do not introduce a second authenticated theme.
- Do not use decorative gradients, cards, or animation to hide weak information hierarchy.
- Do not add UI copy that explains how to use obvious controls.
- Do not change unrelated payroll, seed, Prisma, or backend work unless a phase explicitly requires it.
- Do not clean up unrelated lint or type errors.

## Prerequisite Gate

Before selecting a phase:

1. Confirm the roadmap and honest review are readable.
2. Inspect current git status and identify unrelated dirty files without reverting them.
3. Confirm the next phase is not blocked by a previous phase.
4. Identify the smallest useful verification command set.
5. If a prerequisite is missing, stop and save a blocker report under `what-next/ui-ux/`.

## Standard Evidence To Inspect

- `app/globals.css`
- `config/sidebar.ts`
- `components/dashboard/Sidebar.tsx`
- `components/dashboard/Navbar.tsx`
- `components/dashboard/EnhancedEnterpriseDashboard.tsx`
- `components/dashboard/DashboardRouteState.tsx`
- `components/dashboard/DashboardErrorState.tsx`
- `components/finance/FinanceCommandCenterDashboard.tsx`
- `components/payroll/PayrollCommandCenter.tsx`
- `components/pos/ProfessionalPOSSystem.tsx`
- `components/owner-war-room/OwnerWarRoomDashboard.tsx`
- `app/[locale]/(home)/page.tsx`
- `components/landing/hero-dashboard.tsx`
- `components/auth/`

## Prompt Contract

```text
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Run the AqStoqFlow UI/UX transformation program in strict phase order. Inspect the source roadmap and current workspace evidence, choose the next safe slice, implement only that slice, verify it with focused checks, and save a dated phase report under what-next/ui-ux/. Preserve tenant safety, RBAC, module entitlement, service-owned business truth, proof/evidence semantics, and dirty-worktree safety.
```

## Required Artifacts

For every phase run, save one of:

- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_<phase>_REPORT_<date>.md`
- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_<phase>_BLOCKER_<date>.md`

Each report must include:

- Scope completed
- Files inspected
- Files changed
- Verification commands and results
- Screenshots or route smoke notes when UI changed
- Remaining blockers
- Recommended next phase

## Verification Menu

Choose the smallest relevant subset:

- `npm run lint`
- `npm run typecheck`
- Focused Jest or component tests for changed behavior
- Playwright route smoke for changed public or dashboard routes
- Visual screenshots for changed shell, landing, login, or dashboard surfaces

## Handoff Criteria

- The selected phase is complete or blocked with a saved report.
- Verification results are recorded.
- The next skill is identified.
- No unrelated work was silently changed.


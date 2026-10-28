---
name: aqstoqflow-uiux-09-accessibility-visual-regression-governance
description: "Execute Phases 8 and 9 of the AqStoqFlow UI/UX revamp: harden accessibility, responsiveness, visual regression, route maturity tracking, and UI governance."
---

# AqStoqFlow UI/UX 09 Accessibility Visual Regression Governance

## Mission

Keep the revamp robust after the first improvements land. Verify accessibility, responsiveness, screenshots, route maturity, and review discipline so the UI does not drift again.

## Inspect First

- `docs/UI/UX/AQSTOQFLOW_UI_CONSTITUTION_2026-06-26.md`
- `docs/UI/UX/AQSTOQFLOW_UI_COMPONENT_REGISTRY_2026-06-26.md`
- Current test scripts in `package.json`
- Existing Playwright or browser smoke setup
- High-value routes:
  - `/en`
  - `/en/login`
  - `/en/dashboard`
  - finance command center
  - payroll command center
  - inventory dashboard
  - POS
- Existing route maturity or UI registry docs

## Prerequisites

- Core shell and dashboard primitives exist.
- At least one priority route has been normalized.
- Verification tooling is identified.
- Responsive breakpoints are agreed.

## What To Do

- Check contrast across dark and light surfaces.
- Verify keyboard navigation for menus, drawers, filters, and action queues.
- Ensure focus states are visible.
- Prevent text overflow in buttons, cards, tables, and sidebar labels.
- Validate mobile, tablet, and desktop layouts.
- Add screenshot smoke coverage for highest-value pages.
- Create a route modernization matrix.
- Add a UI/UX review checklist.

## How To Implement

- Use the repo's existing test tooling first.
- Add small screenshot checks rather than a large brittle visual suite.
- Track route maturity in docs before enforcing everything in CI.
- Keep accessibility fixes close to shared primitives where possible.
- Do not make performance worse with decorative motion or heavy dependencies.

## Prompt Contract

```text
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Harden AqStoqFlow's UI/UX revamp through accessibility, responsiveness, screenshot smoke checks, route maturity tracking, and governance. Inspect the UI constitution, shared primitives, package scripts, Playwright/browser tooling, and high-value routes. Add focused checks and documentation that prevent visual drift without creating brittle or excessive process.
```

## Acceptance Criteria

- Core routes are usable with keyboard.
- Important text does not overlap or truncate badly.
- Dashboard shell works across common viewport sizes.
- High-value route screenshots can catch major layout drift.
- A route maturity matrix exists.
- A UI review checklist exists.
- New UI work has clear governance.

## Verification

Run relevant checks:

- `npm run lint`
- `npm run typecheck`
- Existing Playwright or route smoke command
- Focused accessibility checks where tooling exists
- Screenshot smoke for selected high-value routes

## Required Artifacts

Save:

- `docs/UI/UX/AQSTOQFLOW_UI_ROUTE_MATURITY_MATRIX_2026-06-26.md`
- `docs/UI/UX/AQSTOQFLOW_UI_REVIEW_CHECKLIST_2026-06-26.md`
- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_09_GOVERNANCE_REPORT_<date>.md`


---
name: aqstoqflow-uiux-08-onboarding-demo-workspace
description: "Execute Phase 7 of the AqStoqFlow UI/UX revamp: create a coherent first-run onboarding and demo workspace strategy so the product looks useful before real data exists."
---

# AqStoqFlow UI/UX 08 Onboarding Demo Workspace

## Mission

Make the system impressive and useful before the user has full business data. First-run onboarding and demo data should tell a coherent OHADA SMB operating story.

## Inspect First

- Existing onboarding routes and setup components
- Dashboard empty states
- Module setup pages
- Demo or seed data scripts
- Tenant, organization, location, role, POS, inventory, finance, and payroll setup flows
- `docs/UI/UX/AQSTOQFLOW_UI_UX_REVAMP_ROADMAP_2026-06-26.md`

## Prerequisites

- Default dashboard layout is stable.
- Empty and partial-data states are standardized.
- Required setup steps are known.
- Demo data boundaries are clear.
- The user has approved any seed/demo scope before implementation.

## What To Do

- Design a setup checklist rather than a heavy wizard.
- Make empty states productive.
- Define a coherent demo workspace narrative.
- Make first-run progress visible.
- Ensure demo screenshots show realistic business activity.

## Recommended Setup Steps

1. Company profile and OHADA context.
2. Locations and warehouses.
3. User roles and permissions.
4. Inventory import or starter catalog.
5. POS setup.
6. Finance/accounts setup.
7. Payroll setup where enabled.
8. First proof/evidence checkpoint.

## How To Implement

- Start with planning and UI contracts before seed changes.
- Keep setup optional where advanced configuration is not required.
- Use empty states to guide activation.
- Keep demo data clearly separated from production data.
- Do not alter production seed behavior without explicit approval.
- Preserve tenant isolation and module entitlement.

## Prompt Contract

```text
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Design and implement the AqStoqFlow first-run onboarding and demo workspace experience. Inspect onboarding, setup, empty states, tenant configuration, seed/demo scripts, and dashboard activation paths. Build a coherent setup checklist and demo data strategy that makes the product useful before real data exists, while preserving tenant isolation, module entitlement, production data safety, and clear demo boundaries.
```

## Acceptance Criteria

- New users know what to configure first.
- Empty dashboards do not feel broken.
- Demo mode looks like a realistic OHADA SMB.
- First-run setup produces visible progress.
- Production data safety is preserved.
- Any seed or demo changes are explicitly scoped and verified.

## Verification

Run relevant checks:

- `npm run lint`
- `npm run typecheck`
- Focused tests for setup or demo helpers if changed
- Browser smoke for onboarding/setup pages
- Seed/demo validation only when seed files are in scope

## Required Report

Save:

- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_08_ONBOARDING_DEMO_REPORT_<date>.md`


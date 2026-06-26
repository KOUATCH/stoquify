---
name: aqstoqflow-uiux-06-module-normalization
description: "Execute Phase 5 of the AqStoqFlow UI/UX revamp: normalize high-value modules to the shared command-center anatomy without rewriting domain workflows."
---

# AqStoqFlow UI/UX 06 Module Normalization

## Mission

Bring priority modules into one recognizable visual and interaction language while preserving each module's business workflow and service-owned data.

## Recommended Module Order

1. Finance command center
2. Payroll command center
3. Inventory dashboard and stock movements
4. POS operational shell
5. Purchasing and AP
6. Sales and receivables
7. Compliance and close assurance
8. Owner war room

## Inspect First

- Shared UI constitution and command-center primitives
- `components/finance/FinanceCommandCenterDashboard.tsx`
- `components/payroll/PayrollCommandCenter.tsx`
- `components/payroll/PayrollControlWorkbench.tsx`
- `components/pos/ProfessionalPOSSystem.tsx`
- `components/owner-war-room/OwnerWarRoomDashboard.tsx`
- `components/inventory/`
- `components/purchasing/`
- `components/sales/`
- `components/compliance/`
- Related route files under `app/[locale]/(dashboard)/dashboard/`

## Prerequisites

- Phases 01 through 05 are complete or blockers are documented.
- Shared primitives exist.
- The target module is selected explicitly.
- The target module's read models and protected actions are understood.

## What To Do Per Module

1. Identify the user's primary job.
2. Define the command brief.
3. Identify top statuses or KPIs.
4. Identify actions for the queue.
5. Identify proof or evidence sources.
6. Replace custom layout pieces with shared primitives.
7. Standardize filters and detail drawers.
8. Preserve domain workflow, permissions, and service calls.

## How To Implement

- Normalize one module at a time.
- Do not rewrite business logic to fit the UI.
- Do not merge module-specific data services into shared UI payloads.
- Preserve dense operational UX where required, especially POS and accounting.
- Use proof drawers consistently where trust matters.
- Save a separate report for each module pass.

## Prompt Contract

```text
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Normalize one selected AqStoqFlow module to the approved command-center anatomy. Inspect its route, component, read model, actions, RBAC, module entitlement, proof/evidence behavior, filters, tables, drawers, and robust states. Preserve domain workflow and service-owned truth. Replace only the UI structure and interaction patterns needed to align with the shared system. Do not broaden to other modules in the same run.
```

## Acceptance Criteria

- The selected module uses the approved visual system.
- The page has a clear command brief.
- Next actions are visible.
- Proof/evidence access is consistent.
- Filters and details follow shared patterns.
- Domain behavior is unchanged.
- Verification is recorded for the module.

## Verification

Run relevant checks:

- `npm run lint`
- `npm run typecheck`
- Focused module tests where behavior changed
- Browser smoke for the selected module route
- Desktop and mobile screenshot checks where practical

## Required Report

Save one per module:

- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_06_<module>_NORMALIZATION_REPORT_<date>.md`


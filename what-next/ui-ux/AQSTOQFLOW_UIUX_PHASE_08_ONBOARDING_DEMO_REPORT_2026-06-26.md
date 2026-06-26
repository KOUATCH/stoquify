# AqStoqFlow UI/UX Phase 08 - Onboarding And Demo Workspace Report

Date: 2026-06-26
Workspace: E:\ohada saas\newStockFlow\aqstoqflow
Skill: aqstoqflow-uiux-08-onboarding-demo-workspace

## Mission

Phase 08 makes AqStoqFlow useful before a tenant has a complete operating history. The implementation focuses on a checklist-based first-run workspace, productive empty-state context, and a clear demo data boundary without changing production seed behavior.

## Inspection Summary

Inspected surfaces:

- Main authenticated dashboard route: `app/[locale]/(dashboard)/dashboard/page.tsx`
- Dashboard read model and action boundary: `actions/dashboard/getDashboardData.ts`, `services/dashboard/dashboard-read-model.service.ts`
- Command-center primitives and robust states: `components/dashboard/primitives/command-center-primitives.tsx`, `components/dashboard/DashboardRouteState.tsx`, `components/bi/BIEmptyState.tsx`
- Dashboard operating-truth model: `components/dashboard/todays-operating-truth.ts`
- Main dashboard UI: `components/dashboard/EnhancedEnterpriseDashboard.tsx`
- Existing seed/demo scripts: `prisma/seed.ts`, `prisma/production-seed.ts`, compatibility delegates such as `prisma/seed-finance.ts`
- Roadmap source: `docs/UI/UX/AQSTOQFLOW_UI_UX_REVAMP_ROADMAP_2026-06-26.md`
- Existing graph output: `graphify-out/` contains generic graph artifacts, not the named per-domain graph files from AGENTS.md.

## Implemented Changes

### 1. Tenant-scoped setup progress contract

Added `DashboardSetupProgress` to the dashboard read model. It derives progress from tenant-scoped, server-side sources:

- Company/OHADA profile signals from organization name, currency, country, and tax identifier.
- Active locations.
- Active users and configured roles.
- Inventory starter catalog and tracked items.
- Active POS terminals and session signal.
- Accounting setup status from `OrganizationAccountingSettings`.
- Optional payroll setup signals from payroll employees and periods.
- First proof checkpoint from business events, dashboard activity, alerts, and action signals.

The service exposes required-vs-optional progress without inventing business activity and without relying on client-only assumptions.

### 2. First-run checklist panel

Added a compact `WorkspaceSetupPanel` to the main dashboard. It appears near the top of the command center and shows:

- Required setup progress percentage.
- English/French setup copy.
- Status chips for ready, in progress, to do, and optional steps.
- Direct links into the relevant setup/workflow surfaces.

The panel uses existing dashboard tokens and primitives, keeping the authenticated product style consistent with prior UI/UX phases.

### 3. Productive empty-state path

The dashboard can now distinguish a quiet tenant from a broken dashboard. Empty or partial data can be explained through setup progress instead of leaving users with disconnected blank charts.

### 4. Demo workspace boundary

No seed behavior was changed. Existing canonical demo seeding already lives in `prisma/seed.ts` and creates a separated demo organization, demo users, locations, catalog, accounting setup, production sample data, and POS data. Phase 08 documents and surfaces readiness from the resulting tenant data, but does not alter production seed behavior or add new demo records without approval.

## Demo Workspace Narrative

The coherent demo story should remain:

1. A Cameroon/OHADA SMB tenant with XAF currency and legal/accounting context.
2. A store and warehouse with scoped inventory and POS activity.
3. Admin, manager, and cashier roles that prove RBAC-driven workflows.
4. A starter catalog with stock levels, reorder risk, and item movement.
5. POS terminals and cashier sessions that create sales and cash evidence.
6. Accounting setup that keeps OHADA posting context visible.
7. Payroll as optional until the tenant enables employee/payroll workflows.
8. First proof checkpoint through business events, activity, and assurance surfaces.

## Safety Decisions

- Seed/demo changes were deliberately out of scope because the skill requires explicit approval before altering seed behavior.
- Setup progress is calculated server-side under the existing dashboard RBAC path.
- Tenant isolation is preserved by querying every setup signal with `organizationId` and, where relevant, selected `locationId`.
- Payroll remains optional unless payroll data exists, matching the skill's requirement to keep advanced configuration optional.
- The UI links to existing setup surfaces rather than creating a heavy wizard.

## Files Changed

- `services/dashboard/dashboard-read-model.service.ts`
- `components/dashboard/todays-operating-truth.ts`
- `components/dashboard/EnhancedEnterpriseDashboard.tsx`
- `components/dashboard/__tests__/todays-operating-truth.test.ts`
- `services/dashboard/__tests__/dashboard-read-model.service.test.ts`
- `actions/dashboard/__tests__/getDashboardData.test.ts`
- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_08_ONBOARDING_DEMO_REPORT_2026-06-26.md`

## Acceptance Criteria Status

- New users know what to configure first: complete through the dashboard setup checklist.
- Empty dashboards do not feel broken: improved by setup-progress context.
- Demo mode looks like a realistic OHADA SMB: supported through existing canonical demo seed and surfaced readiness signals.
- First-run setup produces visible progress: complete through `DashboardSetupProgress` and `WorkspaceSetupPanel`.
- Production data safety is preserved: complete; no seed changes were made.
- Seed/demo changes explicitly scoped and verified: complete; seed changes were intentionally not included.

## Verification Plan

Recommended checks for this phase:

- `npm test -- services/dashboard/__tests__/dashboard-read-model.service.test.ts components/dashboard/__tests__/todays-operating-truth.test.ts actions/dashboard/__tests__/getDashboardData.test.ts --runInBand`
- `npm run typecheck`
- `npm run lint`

Browser smoke target after checks pass:

- `/en/dashboard`
- `/fr/dashboard`

Confirm the setup panel renders, progress is visible, links localize under the current dashboard base path, and the existing command-center layout remains stable on desktop and mobile widths.

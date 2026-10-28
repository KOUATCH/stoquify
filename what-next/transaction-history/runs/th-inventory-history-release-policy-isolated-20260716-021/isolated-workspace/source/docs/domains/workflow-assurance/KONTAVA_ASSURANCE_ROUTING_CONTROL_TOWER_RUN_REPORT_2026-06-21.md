# Kontava Assurance Routing Control Tower Run Report - 2026-06-21

## Scope

Executed `kontava-assurance-routing-control-tower` after the evidence-redaction foundation.

The implementation turns Workflow Assurance incidents into manager-actionable, proof-aware, permission-routed surfaces using the dashboard semantic color system.

## Implemented

- Added a Workflow Assurance Control Tower read model:
  - open incidents by severity, workflow, and owner role
  - overdue, redacted, suppressed, waived, and hidden-by-permission counts
  - engine health for stale runs, failed runs, pending alert deliveries, and failed alert deliveries
  - recent check-run visibility
- Added permission-filtered incident routing:
  - incidents are only included when the viewer can open the required workflow permission or has assurance control permissions
  - every visible incident receives a detail route and source workflow route
- Added proof-aware incident presentation:
  - source route
  - source label
  - evidence grade
  - proof subject, when available
  - proof blocker reason
  - redaction state
- Added dashboard-token UI surfaces:
  - `/dashboard/assurance/control-tower`
  - `/dashboard/assurance/control-tower/incidents/[incidentId]`
- Added protected server actions:
  - `getWorkflowAssuranceControlTowerAction`
  - `getWorkflowAssuranceIncidentDetailAction`
- Integrated assurance incidents into Manager Action Center composition as first-class action items.

## Files Changed

- `services/assurance/assurance-control-tower-contracts.ts`
- `services/assurance/assurance-control-tower.service.ts`
- `services/assurance/assurance-incident.service.ts`
- `actions/assurance/workflow-assurance-control-tower.actions.ts`
- `components/assurance/AssuranceControlTowerDashboard.tsx`
- `components/assurance/AssuranceIncidentDetailView.tsx`
- `app/[locale]/(dashboard)/dashboard/assurance/control-tower/page.tsx`
- `app/[locale]/(dashboard)/dashboard/assurance/control-tower/incidents/[incidentId]/page.tsx`
- `services/manager-action-center/manager-action-center-contracts.ts`
- `services/manager-action-center/manager-action-center.service.ts`
- related tests under `services/assurance`, `actions/assurance`, and `services/manager-action-center`.

## Verification

- Focused Jest:
  - `5` suites passed
  - `13` tests passed
- `npm run typecheck`
  - Passed.
- Focused ESLint on touched TypeScript/component files
  - Passed.

## Remaining Gaps

- The Control Tower is currently server-rendered/read-only; mutation buttons for assignment, resolution, suppression, waiver, and reopen can be wired next using the existing protected incident actions.
- Browser smoke testing was not run because no dev server/browser pass was started in this run.

# Owner, Manager, and Finance Load Recovery Report - 2026-06-24

## Scope

Prompt executed in `E:\ohada saas\newStockFlow\aqstoqflow` for these affected surfaces:

- Owner War Room: `/[locale]/dashboard/owner-war-room`
- Manager Action Center: `/[locale]/dashboard/manager-action-center`
- Finance command center and submenu pages under `/[locale]/dashboard/finance/*`

## Diagnosis

The affected pages were not structurally unusable. The route/component/service map showed three failure paths:

1. Owner War Room and Manager Action Center were sound server-rendered command surfaces, but route-level RBAC or stale-organization failures were thrown into generic error boundaries instead of a truthful permission or organization state.
2. Finance submenu routes were mostly thin unguarded client wrappers around shared finance dashboard actions. This left direct route access and action calls dependent on late client/action failures rather than a server-side route boundary.
3. Finance submenu permissions used legacy constants such as `CUSTOMER_RECEIVABLES_READ`, `SUPPLIER_PAYABLES_READ`, `CASH_FLOW_READ`, `CASH_DRAWER_READ`, `COST_ANALYTICS_READ`, and `PROFITABILITY_ANALYTICS_READ`, while the server-side guard ecosystem is converging on dotted permissions.

Graphify and static route inspection confirmed the finance pages share `FinanceCommandCenterDashboard`, `FinanceSpecializedLedgerSurfaces`, `useFinanceDashboard`, `getFinanceDashboardAction`, and `getFinanceDashboard`; Owner and Manager use dedicated server services and dashboard components.

## Remedy Classification

- Owner War Room: Surgical repair. The architecture is valid; the route now catches audited `RbacError` outcomes and renders a truthful route state. Also repaired a stale reconciliation drill-through from `/dashboard/finance/payments/reconciliation` to `/dashboard/finance/reconciliation`.
- Manager Action Center: Surgical repair. Same route-level RBAC state treatment as Owner, preserving the existing service and component contract.
- Finance command center/submenu pages: Proposed third option, stabilization bridge. The existing dashboards are kept, but every affected finance route now passes through a shared `FinanceRouteAccess` boundary, and the finance server action enforces view-specific permissions before reading data.
- Rebuild: Not selected. No evidence showed the pages were mock-only, misleading, or too tangled to recover.

## Files Changed In This Slice

- `components/dashboard/DashboardRouteState.tsx`
- `app/[locale]/(dashboard)/dashboard/owner-war-room/page.tsx`
- `app/[locale]/(dashboard)/dashboard/manager-action-center/page.tsx`
- `app/[locale]/(dashboard)/dashboard/finance/FinanceRouteAccess.tsx`
- `app/[locale]/(dashboard)/dashboard/finance/error.tsx`
- `app/[locale]/(dashboard)/dashboard/finance/loading.tsx`
- Finance route wrappers for overview, analytics, sales, retail, costs, profitability, profit-loss, cash-flow, payments, receivables, payables, cash-drawer, reconciliation, and cash-command.
- `actions/finance/finance-dashboard.actions.ts`
- `services/finance/finance-dashboard-access.ts`
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`
- `lib/security/__tests__/finance-rbac-permissions.test.ts`
- `actions/finance/__tests__/finance-dashboard.actions.test.ts`
- `services/owner-war-room/owner-war-room.service.ts` only for the stale reconciliation URL repair.

## Verification

Passed:

- `npm test -- --runTestsByPath services/owner-war-room/__tests__/owner-war-room.service.test.ts services/manager-action-center/__tests__/manager-action-center.service.test.ts actions/owner-war-room/__tests__/owner-war-room.actions.test.ts actions/manager-action-center/__tests__/manager-action-center.actions.test.ts components/owner-war-room/__tests__/OwnerWarRoomDashboard.test.tsx components/manager-action-center/__tests__/ManagerActionCenterDashboard.test.tsx actions/finance/__tests__/finance-dashboard.actions.test.ts lib/security/__tests__/finance-rbac-permissions.test.ts --runInBand`
- `npm run typecheck`
- Targeted ESLint on changed owner, manager, finance route, action, access, route-state, and focused test files.

Partial / not completed:

- `npm run build:app` was attempted as the Next route compile smoke and timed out after 5 minutes without a diagnostic. Treat as inconclusive, not a passing route-build check.
- Browser-authenticated route probing was not completed in this run; the route guard and component load behavior were verified statically plus through focused tests/typecheck/lint.

## Remaining Risks

- The worktree already contains many unrelated modified and untracked dashboard, Owner War Room, Manager Action Center, Cash Command, and close-invalidation files. This slice avoided reverting them.
- Finance views still share a broad dashboard read model. The new bridge restores truthful loading and RBAC, but a future hardening pass should split data minimization per view if sensitive finance payloads need stricter redaction.
- Full Next build/route smoke should be rerun with a longer window or a warmed `.next` cache before release.

## Next Hardening

1. Add authenticated Playwright route smoke for `/en/dashboard/owner-war-room`, `/en/dashboard/manager-action-center`, and all finance submenu routes with seeded roles.
2. Add a finance read-model minimization pass so each submenu receives only the data required for that view.
3. Promote the finance route-access bridge into a reusable dashboard route guard if other command centers need the same truthful permission/organization/error states.

# AqStoqFlow Dashboard Read Model Service-Boundary Report

Generated: 2026-06-18

## Slice

Moved `actions/dashboard/getDashboardData.ts` to a verified action-edge plus service-owned dashboard read model.

The selected finding cluster was the dashboard read-model boundary breach previously recorded in `what-next/AQSTOQFLOW_ANALYTICS_REPORT_READ_MODEL_SERVICE_BOUNDARY_REPORT_2026-06-17.md`, where `actions/dashboard/getDashboardData.ts` still carried:

- 1 high `DIRECT_PRISMA_DB_IMPORT`
- 1 medium `PRISMA_CLIENT_BOUNDARY_COUPLING`
- 25 high `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE`

Current result for this cluster: 0 active `actions/dashboard/getDashboardData.ts` findings in the rerun service-boundary gate output.

## Files Changed

- `actions/dashboard/getDashboardData.ts`
- `services/dashboard/dashboard-read-model.service.ts`
- `actions/dashboard/__tests__/getDashboardData.test.ts`
- `services/dashboard/__tests__/dashboard-read-model.service.test.ts`
- `what-next/AQSTOQFLOW_DASHBOARD_READ_MODEL_SERVICE_BOUNDARY_REPORT_2026-06-18.md`

## Implementation Notes

- `actions/dashboard/getDashboardData.ts` now requires `dashboard.read` through `requirePermission`, checks the requested organization with `assertCanUseOrganization`, normalizes blank organization input to the verified RBAC organization, and passes a verified `DashboardReadModelContext` into the service.
- `services/dashboard/dashboard-read-model.service.ts` no longer reads the session or performs action-edge auth resolution. It accepts only verified context, keeps all Prisma reads and aggregate/report shaping inside the service, and verifies the organization is active and not deleted through the service-owned organization query.
- The public action response shape is preserved: `getAllDashboardData` and `getDashboardMetrics` still return the dashboard DTO/legacy metrics directly, not a wrapped action envelope.
- Dashboard DTO conversion remains service-owned: Decimal-like values become numbers, Date values become ISO strings, and no Prisma models are returned to UI-adjacent callers.

## Controls Preserved

- Tenant: action edge rejects cross-tenant organization ids unless RBAC marks the caller as superuser; service queries remain scoped to `organizationId`.
- RBAC: dashboard reads require `dashboard.read`.
- Audit: RBAC denial/allowed auditing remains delegated to the existing RBAC helper.
- Report trust: dashboard totals, trend points, top products, location performance, alerts, activity feed, and legacy metrics are still shaped in one server-only read model.
- Ledger/compliance: this slice is read-only and does not create postings, fiscal documents, close evidence, or business events.
- Error behavior: missing/inactive organizations still fail closed through the existing `NotFoundError` path; auth/RBAC failures come from the existing RBAC error path.

## Verification

- `npm test -- actions/dashboard/__tests__/getDashboardData.test.ts services/dashboard/__tests__/dashboard-read-model.service.test.ts --runInBand`
  - Passed: 2 suites, 7 tests.
- `npm run service:boundary`
  - Passed in report mode.
  - Active service-boundary violations: 137.
  - No `actions/dashboard/getDashboardData.ts` findings remained in the report output.
- `npm run service:boundary:ratchet`
  - Passed in fail mode against `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json`.
  - Baseline active violations: 283.
  - Current active violations: 135.
  - Active violation delta: -148.
  - New active findings: 0.
  - Ratchet status: passed.
- `npm run typecheck`
  - Passed.
- `npm run lint`
  - Passed with 0 errors.
  - Existing warnings remain outside this slice: `EmailVerificationForm.tsx`, `ModernItemFormForEditing.tsx`, `custom-carousel.tsx`, `ItemManagement.tsx`, and `config/permissions.ts`.

## Remaining Boundary Work

Next highest-value clusters from the latest gate output:

1. `actions/auth.ts` organization/user registration flow: direct Prisma reads, action-owned mutations, and tenant/RBAC-sensitive account creation.
2. `actions/customers/customerAction2.ts`: direct customer reads/mutations and order read-model shaping.
3. `actions/organization/organization-settings-actions.ts`: organization settings read/write workflow and payment grouping.
4. `actions/users/*`: invite, user listing, reset, OTP, and password flows still own direct Prisma work.
5. Component DTO cleanup for remaining Prisma client type imports in dashboard/forms/settings surfaces.

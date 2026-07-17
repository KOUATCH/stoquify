# AqStoqFlow Analytics Report Read-Model Service Migration Report

Generated: 2026-06-17

## Skills Used

- `nextjs-service-layer-workflow`
- `priority-002-service-boundary-ratchets`
- `priority-008-demo-report-trust-cleaner`

## Objective

Move analytics and report read models out of action-owned Prisma access and behind service-owned DTO boundaries while preserving the Priority 008 provenance contract.

## Workflow Map

Financial reports before:

```text
app/[locale]/(dashboard)/dashboard/analytics/reports/page.tsx
-> ReportsClient.tsx
-> actions/analytics/financial-reports.ts
-> direct Prisma reads and report DTO shaping
```

Financial reports after:

```text
app/[locale]/(dashboard)/dashboard/analytics/reports/page.tsx
-> ReportsClient.tsx
-> actions/analytics/financial-reports.ts
-> services/analytics/financial-reports.service.ts
-> Prisma reads and provenance-backed report DTOs
```

Sales and daily analytics after:

```text
components/analytics/*
-> actions/analytics/get-sales-analytics.ts or actions/analytics/financial-analytics.ts
-> actions/analytics/getSalesAnalytics.ts
-> services/analytics/sales-analytics.service.ts or services/analytics/financial-analytics.service.ts
-> Prisma reads and analytics DTOs
```

## Files Changed

- `services/analytics/financial-reports.service.ts`
  - Added the service-owned analytics report read model.
  - Owns Prisma access, DTO shaping, period normalization, and report provenance generation.
  - Preserves `PRISMA_OPERATIONAL_READ_MODEL`, freshness, source tables, filter hash, and `INTERNAL_REPORT_ONLY` blockers.
- `services/analytics/sales-analytics.service.ts`
  - Added service-owned sales analytics, cash reconciliation, product performance, user performance, and dashboard summary read models.
  - Owns Prisma access and DTO shaping previously held by `actions/analytics/getSalesAnalytics.ts`.
- `services/analytics/financial-analytics.service.ts`
  - Added service-owned daily financial metrics and daily report read models.
  - Owns Prisma access and DTO shaping previously held by `actions/analytics/financial-analytics.ts`.
- `actions/analytics/financial-reports.ts`
  - Replaced direct Prisma/report business logic with a thin server action facade.
  - Adds `reports.read` RBAC enforcement.
  - Adds tenant access validation with `assertCanUseOrganization`.
  - Preserves the previous exported action names used by the report client.
- `actions/analytics/getSalesAnalytics.ts`
  - Replaced direct Prisma analytics reads with a thin action facade.
  - Adds `reports.read` RBAC enforcement and tenant validation.
- `actions/analytics/financial-analytics.ts`
  - Replaced direct Prisma financial analytics reads with a thin action facade.
  - Adds `reports.read` RBAC enforcement and tenant validation.
- `services/analytics/__tests__/financial-reports.service.test.ts`
  - Moved provenance coverage to the service layer.
  - Verifies internal-only report trust metadata and blockers.
- `actions/analytics/__tests__/financial-reports-provenance.test.ts`
  - Removed after moving coverage to the service-owned test location.
- `what-next/AQSTOQFLOW_ANALYTICS_REPORT_READ_MODEL_SERVICE_BOUNDARY_REPORT_2026-06-17.md`
- `what-next/AQSTOQFLOW_ANALYTICS_REPORT_READ_MODEL_SERVICE_BOUNDARY_REPORT_2026-06-17.json`
  - Saved post-migration service-boundary gate output.

## Controls Added Or Preserved

- Service-owned database reads for financial summary, cashier performance, item performance, and cash-flow reports.
- Service-owned database reads for sales analytics, cash reconciliation, product performance, user performance, dashboard summary, financial metrics, and daily report data.
- Tenant guard at the action boundary.
- RBAC guard through `reports.read`.
- Server-only service module using `server-only`.
- Existing provenance contract preserved:
  - `source: PRISMA_OPERATIONAL_READ_MODEL`
  - `sourceLabel: Service-backed operational database read model`
  - `evidenceStatus: OPERATIONAL_READ_MODEL`
  - `certificationStatus: INTERNAL_REPORT_ONLY`
  - source tables, period, generated timestamp, row count, filter hash, and known blockers.

## Verification

- `rg -n "@/prisma/db|@prisma/client|db\\." actions\\analytics\\financial-reports.ts actions\\analytics\\getSalesAnalytics.ts actions\\analytics\\financial-analytics.ts actions\\analytics\\get-sales-analytics.ts`
  - Passed with no matches.
- `npm test -- services/analytics/__tests__/financial-reports.service.test.ts scripts/__tests__/demo-report-trust-gate.test.js --runInBand`
  - Passed: 2 suites, 4 tests.
- `node --check scripts/service-boundary-gate.js`
  - Passed.
- `node scripts/service-boundary-gate.js --mode fail --baseline what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json --out what-next/AQSTOQFLOW_ANALYTICS_REPORT_READ_MODEL_SERVICE_BOUNDARY_REPORT_2026-06-17.md --json-out what-next/AQSTOQFLOW_ANALYTICS_REPORT_READ_MODEL_SERVICE_BOUNDARY_REPORT_2026-06-17.json`
  - Passed.
  - Active service-boundary violations: 165
  - Baseline active violations: 283
  - Active violation delta: -118
  - New active findings: 0
  - Ratchet status: passed
- `npm run demo:trust:fail`
  - Passed with 0 active production trust findings.
- `npm run typecheck`
  - Passed.
- `npm run lint`
  - Passed with pre-existing warnings only:
    - `components/auth/EmailVerificationForm.tsx`
    - `<img>` usage in three existing components.
    - Next lint deprecation notice.

## Remaining Debt

- `actions/accounting/reports.actions.ts` still imports `db` for export auditing and should be cleaned in a separate accounting report export slice.
- Broad dashboard and entity actions still contain direct Prisma access and are tracked by the service-boundary ratchet.
- The report client still calls server actions directly from a client component instead of using a query hook; this was preserved to avoid changing the UI contract in the same migration.
- `services/analytics/financial-analytics.service.ts` preserves existing estimated finance assumptions, such as fixed investing/financing cash-flow placeholders and estimated expenses. A later finance-hardening slice should make these ledger-backed or explicitly label them as estimates in the UI.

## Next Recommended Slice

Move `actions/accounting/reports.actions.ts` export auditing behind an accounting export service method, then continue with `actions/dashboard/getDashboardData.ts` because it is the largest remaining direct Prisma read-model surface.

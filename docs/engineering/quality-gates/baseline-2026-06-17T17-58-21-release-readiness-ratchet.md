# AqStoqFlow Baseline Refresh Ratchet

Run timestamp: 2026-06-17T17-58-21 Europe/Paris  
Git HEAD: `90a67f5`  
Working tree: dirty before this ratchet run; existing unrelated changes were not modified.

## Ratchet Verdict

PASS. The active service-boundary count decreased from the working baseline of `165` to `137`.

| Metric | Count |
| --- | ---: |
| Previous burn-down baseline | 165 |
| Confirmed active service-boundary findings | 137 |
| Net delta | -28 |
| Findings resolved since baseline | 28 |
| Newly introduced findings | 0 |
| Accepted refreshed baseline | 137 |

Baseline source: user-provided current burn-down baseline of `165`, corroborated by `what-next/tomorrow_work.md` and `what-next/AQSTOQFLOW_ANALYTICS_REPORT_READ_MODEL_SERVICE_BOUNDARY_REPORT_2026-06-17.json`.

Ratchet rule applied: `delta = 137 - 165 = -28`. Because `delta <= 0`, the ratchet passes and the accepted refreshed baseline tightens to `137`.

## Check Outcomes

| Order | Check | Status | Counts | Command or Method | Summary |
| ---: | --- | --- | --- | --- | --- |
| 1 | prisma validate | PASS | 1 schema valid | `npm run prisma:validate` | `prisma/schema.prisma` is valid. Prisma emitted a deprecation warning for `package.json#prisma`. |
| 2 | typecheck | PASS | 0 TypeScript errors | `npm run typecheck` | `tsc --noEmit --pretty false` completed successfully. |
| 3 | lint | PASS | 0 errors, 5 warnings | `npm run lint` | Warnings are existing React hook/image/default-export warnings; no lint errors. |
| 4 | service-boundary | PASS | 137 active, 4 allowed, 141 total | `node scripts/service-boundary-gate.js --mode report --out ... --json-out ...` | Active count is below the 165 baseline, so the ratchet passes. |
| 5 | hard-delete | PASS | 0 active, 7 allowed, 7 total | `node scripts/hard-delete-gate.js --mode report --out ... --json-out ...` | No active unsafe hard-delete findings. |
| 6 | demo-trust | PASS | 0 active, 0 allowed, 0 total | `node scripts/demo-report-trust-gate.js --mode report --out ... --json-out ...` | No production-visible demo/report trust findings. |
| 7 | raw-error | PASS | 0 active, 35 allowed, 35 total | `node scripts/raw-error-boundary-gate.js --mode report --out ... --json-out ...` | No active unsafe raw-error findings. |
| 8 | POS tests focused | PASS | 4 suites, 36 tests | `npm test -- --runTestsByPath actions/pos/__tests__/sync.actions.test.ts services/pos/__tests__/receipt-public.test.ts services/pos/__tests__/pos.service.test.ts services/pos/__tests__/offline-sync.service.test.ts --runInBand` | POS-focused Jest suite passed. |
| 9 | compliance tests | PASS | 5 suites, 22 tests | `npm test -- --runTestsByPath services/compliance/__tests__/fiscal-document.service.test.ts services/compliance/__tests__/country-pack-hooks.test.ts services/compliance/__tests__/certification-outbox-processing.test.ts services/compliance/__tests__/cameroon-dgi-sandbox.adapter.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand` | Compliance and country-pack focused Jest suite passed. |

## Service-Boundary Counts

Current active findings by classification:

| Classification | Active Count |
| --- | ---: |
| `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | 55 |
| `ACTION_OWNED_MUTATION` | 34 |
| `DIRECT_PRISMA_DB_IMPORT` | 26 |
| `PRISMA_CLIENT_BOUNDARY_COUPLING` | 22 |

Resolved findings by classification:

| Classification | Resolved Count |
| --- | ---: |
| `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | 25 |
| `DIRECT_PRISMA_DB_IMPORT` | 2 |
| `PRISMA_CLIENT_BOUNDARY_COUPLING` | 1 |

## Resolved Service-Boundary Findings

| # | Classification | Location | Evidence |
| ---: | --- | --- | --- |
| 1 | `DIRECT_PRISMA_DB_IMPORT` | `actions/accounting/reports.actions.ts:6` | `import { db } from "@/prisma/db"` |
| 2 | `DIRECT_PRISMA_DB_IMPORT` | `actions/dashboard/getDashboardData.ts:4` | `import { db } from '@/prisma/db'` |
| 3 | `PRISMA_CLIENT_BOUNDARY_COUPLING` | `actions/dashboard/getDashboardData.ts:13` | `} from '@prisma/client'` |
| 4 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:261` | `? db.user.findUnique({` |
| 5 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:276` | `? db.organization.findUnique({` |
| 6 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:304` | `const activeOrganizations = await db.organization.findMany({` |
| 7 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:358` | `db.organization.findUnique({` |
| 8 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:362` | `db.salesOrder.aggregate({` |
| 9 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:367` | `db.salesOrder.aggregate({` |
| 10 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:372` | `db.payment.aggregate({` |
| 11 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:383` | `db.payment.aggregate({` |
| 12 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:394` | `db.customer.count({ where: { organizationId, deletedAt: null } }),` |
| 13 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:395` | `db.customer.count({ where: { organizationId, deletedAt: null, createdAt: { lt: from } } }),` |
| 14 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:396` | `db.customer.count({ where: { organizationId, deletedAt: null, createdAt: { gte: from, lte: to } } }),` |
| 15 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:397` | `db.location.count({ where: { organizationId, isActive: true } }),` |
| 16 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:398` | `db.pOSSession.count({` |
| 17 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:405` | `db.salesOrder.count({` |
| 18 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:413` | `db.purchaseOrder.count({` |
| 19 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:421` | `db.purchaseOrder.aggregate({` |
| 20 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:430` | `db.item.count({` |
| 21 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:433` | `db.item.findMany({` |
| 22 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:459` | `db.salesOrder.findMany({` |
| 23 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:464` | `db.salesOrderLine.groupBy({` |
| 24 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:480` | `db.location.findMany({` |
| 25 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:500` | `db.salesOrder.findMany({` |
| 26 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:513` | `db.purchaseOrder.findMany({` |
| 27 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:531` | `db.inventoryTransaction.findMany({` |
| 28 | `DIRECT_PRISMA_CALL_OUTSIDE_SERVICE` | `actions/dashboard/getDashboardData.ts:628` | `? await db.item.findMany({` |

## Newly Introduced Findings

No newly introduced service-boundary findings were detected against the 165 baseline JSON.

## Residual Risks

- The service-boundary gate still reports 137 active findings, so the project remains in burn-down mode rather than zero-violation enforcement mode.
- Lint passes, but 5 warnings remain and should be scheduled separately.
- The working tree was already dirty; this ratchet report only records current readiness and does not remediate existing code changes.

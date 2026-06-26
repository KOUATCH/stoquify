# AqStoqFlow Priority 008 Demo Report Trust Cleaner Report

Generated: 2026-06-17

## Skills Run

- `priority-008-demo-report-trust-cleaner`
- `exam-009-aqstoqflow-demo-mock-report-trust-cleaner`

## Objective

Remove production-facing demo/mock/report trust signals, make operational reports honest about provenance and certification status, replace mock monitoring metrics with real data-backed or explicitly unavailable values, and add a ratcheting gate so these risks do not silently return.

## Current Outcome

- Active production demo/mock/report trust findings: 0
- Inventory mock exports previously reported in legacy inventory actions are no longer present.
- Report views now show source, freshness, evidence status, certification status, period, row count, generated time, filter hash, source tables, and known blockers.
- Monitoring refund rate and cash variance calculations no longer use random/mock values.
- Report surfaces explicitly label these outputs as internal operational read models, not statutory certified OHADA exports.
- Service-boundary ratchet remains passed against the existing baseline with no new findings.

## Files Changed

- `actions/analytics/financial-reports.ts`
  - Added `ReportProvenance` metadata and `buildReportProvenance`.
  - Attached provenance to financial summary, cashier performance, item performance, and cash flow reports.
  - Marked report outputs as `INTERNAL_REPORT_ONLY` with explicit certification blockers.
- `components/reports/report-trust-banner.tsx`
  - Added a reusable trust banner for report provenance, freshness, blockers, and internal-only certification state.
- `components/reports/cash-flow-report.tsx`
- `components/reports/financial-summary-report.tsx`
- `components/reports/item-performance-report.tsx`
- `components/reports/cashier-performance-report.tsx`
  - Render the trust banner on report pages.
- `lib/error-handling/monitoring.ts`
  - Replaced random refund-rate and cash-variance calculations with database-backed metrics.
  - Replaced CPU mock metric with an explicit unavailable value until telemetry is wired.
- `components/dashboard/Tables/TableHeader.tsx`
- `components/dashboard/Tables/ModalTableheader.tsx`
  - Replaced “Sample Data” export wording with “Import Template”.
- `app/[locale]/(dashboard)/dashboard/items/new/page.tsx`
  - Replaced the stale “demo route” comment with a legacy alias description.
- `scripts/demo-report-trust-gate.js`
  - Added a reusable scanner for production-facing demo/mock/report trust leakage.
- `scripts/__tests__/demo-report-trust-gate.test.js`
  - Added scanner regression tests.
- `actions/analytics/__tests__/financial-reports-provenance.test.ts`
  - Added provenance regression coverage.
- `package.json`
  - Added `demo:trust` and `demo:trust:fail` scripts.

## Controls Added

- Production report trust gate:
  - Flags legacy inventory mock exports.
  - Flags “Mock implementation” markers in production source.
  - Flags stale demo route markers.
  - Flags stale report TODOs.
  - Flags “Sample Data” labels in production UI.
  - Flags known mock monitoring metric markers.
- Report provenance:
  - Source label: `PRISMA_OPERATIONAL_READ_MODEL`
  - Evidence status: `OPERATIONAL_READ_MODEL`
  - Certification status: `INTERNAL_REPORT_ONLY`
  - Freshness: current or historical based on the requested report period.
  - Stable filter hash for review traceability.
  - Explicit blockers for statutory certification.
- Monitoring integrity:
  - Refund rate and cash variance now read operational database state.
  - Unwired CPU telemetry is explicit instead of random.

## Verification

- `node scripts/demo-report-trust-gate.js --mode report --out what-next/AQSTOQFLOW_PRIORITY_008_DEMO_REPORT_TRUST_GATE_REPORT_2026-06-17.md --json-out what-next/AQSTOQFLOW_PRIORITY_008_DEMO_REPORT_TRUST_GATE_REPORT_2026-06-17.json`
  - Passed with 0 active findings.
- `rg -n "Mock implementation|mockItems|mockTransactions|mockAdjustments|mockTransfers|demo route|TODO: Update the import path|Sample Data|Mock value" actions app components lib services --glob "!**/__tests__/**" --glob "!**/*.test.ts" --glob "!**/*.test.tsx"`
  - Passed with no matches.
- `npm test -- scripts/__tests__/demo-report-trust-gate.test.js actions/analytics/__tests__/financial-reports-provenance.test.ts services/accounting/__tests__/data-trust.service.test.ts actions/_shared/__tests__/safe-action-responses.test.ts services/_shared/__tests__/action-response.test.ts services/_shared/__tests__/action-errors.test.ts --runInBand`
  - Passed: 6 suites, 19 tests.
- `npm run demo:trust:fail`
  - Passed with 0 active findings.
- `npm run typecheck`
  - Passed.
- `npm run prisma:validate`
  - Passed with the existing Prisma configuration deprecation warning.
- `npm run lint`
  - Passed with pre-existing warnings in `EmailVerificationForm`, image usage, and Next lint deprecation.
- `npm run inventory:boundary:fail`
  - Passed with 0 active violations and 22 allowed kernel/test findings.
- `npm run error:boundary:fail`
  - Passed with 0 active unsafe raw-error findings and 35 allowed classified findings.
- `node scripts/service-boundary-gate.js --mode fail --baseline what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json --out what-next/AQSTOQFLOW_PRIORITY_008_SERVICE_BOUNDARY_RATCHET_REPORT_2026-06-17.md --json-out what-next/AQSTOQFLOW_PRIORITY_008_SERVICE_BOUNDARY_RATCHET_REPORT_2026-06-17.json`
  - Passed the ratchet.
  - Baseline active violations: 283
  - Current active violations: 186
  - Active violation delta: -97
  - New active findings: 0

## Remaining Blockers

- These reports are still operational read models, not signed statutory OHADA certified exports.
- Full statutory certification remains owned by the Close & Assurance and certification hardening tracks.
- Service-boundary debt remains at 186 active findings, though the ratchet confirms this slice introduced no new service-boundary regression.
- `actions/analytics/financial-reports.ts` still uses direct Prisma reads and should be moved behind a service-owned reporting/read-model boundary in a later service-boundary migration.
- CPU telemetry should be wired to a real host or APM metric source before it is used for production alerting.

## Next Recommended Slice

Proceed with the next priority hardening slice while keeping this new trust gate active. The highest-value follow-up is to move analytics/report read models behind service-owned DTO methods, preserving the provenance contract added here while eliminating the remaining direct Prisma action boundary findings.

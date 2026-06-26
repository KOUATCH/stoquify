# Demo Report Trust Cleaner Readiness Report

Date: 2026-06-16

Skill: `priority-008-demo-report-trust-cleaner`

## Safe Run Mode

This is a readiness/report-mode run. No application code is changed by this report.

## What This Skill Will Implement

Remove production-visible mock/demo paths and make reports display real provenance, freshness, and certification state.

## Priority Evidence

- Priority 5 and Slice 6 from the examination report.
- Mock inventory, monitoring, and report placeholders can make dashboards and reports appear more operationally trustworthy than their evidence supports.
- Source reports: what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md, what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md, what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md, what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md, what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md, graphify-out/GRAPH_REPORT.md

## Files It Will Inspect

- actions/inventory/inventoryActions.ts
- app/[locale]/(dashboard)/dashboard/items/new/page.tsx
- components/reports/cash-flow-report.tsx
- lib/error-handling/monitoring.ts
- app/**/*report*
- actions/**/*report*
- components/**/*report*

## Gates It Will Enforce

- rg -n "Mock implementation|mockItems|mockTransactions|mockAdjustments|mockTransfers|demo route|TODO: Update the import path" actions app components lib services
- npm test -- actions components services --runInBand
- npm run typecheck

## Success Looks Like

No production route or action exports mock stock, finance, payment, payroll, compliance, or report-trust data.

## Dependencies

priority-001 through priority-007.

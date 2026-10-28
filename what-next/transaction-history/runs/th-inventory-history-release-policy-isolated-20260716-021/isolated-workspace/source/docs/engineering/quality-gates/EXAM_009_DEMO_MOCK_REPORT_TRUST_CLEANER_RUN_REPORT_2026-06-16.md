# Exam 009 Demo Mock Report Trust Cleaner Report-Mode Run

Date: 2026-06-16

Skill: `exam-009-aqstoqflow-demo-mock-report-trust-cleaner`

Mode: report-only first run. No application code changed.

## Risk Class

Mock inventory/report/monitoring paths and report TODOs can make dashboards appear more trustworthy than the backing evidence allows.

## Inputs Read

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_HARDENER_SKILL_RUN_REPORT_2026-06-16.md`
- `graphify-out/GRAPH_REPORT.md`

## First Implementation Slice

Use `$exam-009-aqstoqflow-demo-mock-report-trust-cleaner` to remove or quarantine production-visible mock/demo data and make reports show provenance, freshness, certification, and source status.

Start with these files/patterns:

- `actions/inventory/inventoryActions.ts`
- `components/reports/**/*`
- `lib/error-handling/monitoring.ts`
- `app/**/*reports*`
- `services/**/*report*`

## Required Gates

- no production route/action returns mock business data
- reports expose period/source/freshness/evidence status
- demo-only paths are visibly quarantined

## Verification To Run After Implementation

```powershell
rg -n "Mock implementation|mockItems|mockTransactions|mockAdjustments|mockTransfers|demo route" actions app components lib services
npm run typecheck
```

## Status

Ready for implementation in the ordered suite. Do not skip lower-numbered unresolved risk classes.

# Error Response Normalizer Readiness Report

Date: 2026-06-16

Skill: `priority-007-error-response-normalizer`

## Safe Run Mode

This is a readiness/report-mode run. No application code is changed by this report.

## What This Skill Will Implement

Normalize raw errors into typed, user-safe enterprise errors across priority economic services, actions, and routes.

## Priority Evidence

- Priority 4 and Slice 5 from the examination report, plus the statutory scan raw-error findings.
- Raw throw/rethrow/console error patterns can leak internals, produce inconsistent UX, and bypass error classifications needed for support and controls.
- Source reports: what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md, what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md, what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md, what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md, what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md, graphify-out/GRAPH_REPORT.md

## Files It Will Inspect

- services/_shared/*error*
- lib/error-handling/*
- services/purchase-order/purchase-order.service.ts
- services/pos/pos.service.ts
- services/accounting/posting.service.ts
- services/accounting/journals.service.ts
- actions/inventory/inventoryMovementActions.ts
- app/api/v1/*

## Gates It Will Enforce

- npm test -- services/_shared lib/error-handling actions app/api --runInBand
- npm run typecheck
- rg -n "throw new Error\(|throw error|console.error\(" services actions app lib

## Success Looks Like

New and migrated priority paths return consistent safe errors, and raw internal exceptions cannot cross client boundaries.

## Dependencies

priority-001 through priority-006.

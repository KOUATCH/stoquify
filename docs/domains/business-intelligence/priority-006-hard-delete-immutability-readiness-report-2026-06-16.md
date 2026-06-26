# Hard Delete Immutability Readiness Report

Date: 2026-06-16

Skill: `priority-006-hard-delete-immutability`

## Safe Run Mode

This is a readiness/report-mode run. No application code is changed by this report.

## What This Skill Will Implement

Add and enforce hard-delete policy for evidence-bearing AqStoqFlow records.

## Priority Evidence

- Slice 4 from the examination report and a prerequisite for trustworthy audit, close, and compliance workflows.
- Economic or audit-bearing records can be physically deleted instead of cancelled, reversed, soft-deleted, or draft-cleaned with evidence.
- Source reports: what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md, what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md, what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md, what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md, what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md, graphify-out/GRAPH_REPORT.md

## Files It Will Inspect

- actions/itemsShow/deleteItem.ts
- actions/item/items.ts
- services/purchase-order/purchase-order.service.ts
- services/unit/unit.service.ts
- services/tax-rate/tax-rate.service.ts
- actions/users/deleteUser.ts
- actions/locations/deleteLocation.ts
- prisma/schema.prisma

## Gates It Will Enforce

- node scripts/hard-delete-gate.js --mode report
- npm test -- scripts/__tests__/hard-delete-gate.test.js --runInBand
- npm test -- actions services --runInBand
- npm run typecheck

## Success Looks Like

Every hard delete is intentionally categorized, and forbidden economic deletes are blocked by service code and static gates.

## Dependencies

priority-001 through priority-005 where domain deletes depend on canonical services.

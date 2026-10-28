# Purchasing AP Consolidator Readiness Report

Date: 2026-06-16

Skill: `priority-005-purchasing-ap-consolidator`

## Safe Run Mode

This is a readiness/report-mode run. No application code is changed by this report.

## What This Skill Will Implement

Consolidate legacy purchase-order behavior into the statutory purchasing/AP service path.

## Priority Evidence

- Priority 3 and Slice 3 from the examination report.
- Split ownership between services/purchase-order and services/purchasing can bypass AP controls, raw error handling, receipt stock discipline, ledger evidence, reconciliation, and country-pack blockers.
- Source reports: what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md, what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md, what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md, what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md, what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md, graphify-out/GRAPH_REPORT.md

## Files It Will Inspect

- services/purchase-order/purchase-order.service.ts
- services/purchasing/*
- actions/purchase-order*
- actions/purchasing/*
- components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx
- services/inventory/*
- services/accounting/*
- services/payments/*

## Gates It Will Enforce

- npm test -- services/purchasing services/purchase-order actions/purchasing --runInBand
- npm run inventory:boundary:fail
- node scripts/service-boundary-gate.js --mode report
- npm run typecheck
- npm run prisma:validate

## Success Looks Like

Purchase order, receipt, invoice, supplier payment, stock, ledger, and reconciliation evidence flow through one controlled AP service path.

## Dependencies

priority-001 through priority-004.

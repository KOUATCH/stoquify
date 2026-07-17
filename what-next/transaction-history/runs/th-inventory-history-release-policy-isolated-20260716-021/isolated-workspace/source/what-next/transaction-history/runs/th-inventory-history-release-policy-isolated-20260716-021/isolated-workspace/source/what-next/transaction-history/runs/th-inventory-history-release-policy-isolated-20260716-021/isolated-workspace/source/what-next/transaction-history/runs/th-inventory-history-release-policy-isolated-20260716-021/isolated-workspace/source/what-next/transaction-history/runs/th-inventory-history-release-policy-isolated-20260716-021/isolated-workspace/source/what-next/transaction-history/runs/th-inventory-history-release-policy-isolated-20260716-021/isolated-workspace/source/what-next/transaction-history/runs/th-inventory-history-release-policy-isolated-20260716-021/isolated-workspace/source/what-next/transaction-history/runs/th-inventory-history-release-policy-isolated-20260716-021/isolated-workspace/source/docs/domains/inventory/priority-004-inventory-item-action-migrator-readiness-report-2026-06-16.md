# Inventory Item Action Migrator Readiness Report

Date: 2026-06-16

Skill: `priority-004-inventory-item-action-migrator`

## Safe Run Mode

This is a readiness/report-mode run. No application code is changed by this report.

## What This Skill Will Implement

Finish migration of inventory and item actions into service-owned stock, item, transfer, reservation, count, adjustment, and write-off workflows.

## Priority Evidence

- Priority 2 and Slice 2 from the examination report, plus the 010 continuation blockers.
- Old item and inventory actions still expose direct item mutation, mock inventory data, transfer/reservation logic, hard deletes, and incomplete count/adjustment/write-off service ownership.
- Source reports: what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md, what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md, what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md, what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md, what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md, graphify-out/GRAPH_REPORT.md

## Files It Will Inspect

- actions/inventory/inventoryActions.ts
- actions/inventory/inventoryMovementActions.ts
- actions/item/items.ts
- actions/item/listItemsAction.ts
- actions/itemsShow/*
- services/inventory/*
- services/item/*
- prisma/schema.prisma

## Gates It Will Enforce

- npm run inventory:boundary:fail
- npm test -- services/inventory services/item actions/inventory actions/item actions/itemsShow --runInBand
- node scripts/service-boundary-gate.js --mode report
- npm run typecheck
- npm run prisma:validate

## Success Looks Like

No stock, transfer, reservation, count, write-off, adjustment, or item economic update remains action-owned.

## Dependencies

priority-001 through priority-003.

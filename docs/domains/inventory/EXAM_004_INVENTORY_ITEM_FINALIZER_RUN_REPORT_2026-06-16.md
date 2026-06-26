# Exam 004 Inventory Item Finalizer Report-Mode Run

Date: 2026-06-16

Skill: `exam-004-aqstoqflow-inventory-item-finalizer`

Mode: report-only first run. No application code changed.

## Risk Class

Old inventory and item actions still expose direct item mutation, stock update, transfer/reservation helpers, hard deletes, and mock inventory data adjacent to the modern inventory kernel.

## Inputs Read

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_HARDENER_SKILL_RUN_REPORT_2026-06-16.md`
- `graphify-out/GRAPH_REPORT.md`

## First Implementation Slice

Use `$exam-004-aqstoqflow-inventory-item-finalizer` to migrate inventory and item legacy actions into service-owned inventory/item workflows, remove mock inventory paths, and preserve the inventory boundary gate.

Start with these files/patterns:

- `actions/inventory/**/*`
- `actions/item/**/*`
- `actions/itemsShow/**/*`
- `services/inventory/**/*`
- `services/item/**/*`

## Required Gates

- no stock mutation outside services/inventory
- mock inventory exports removed or demo-quarantined
- item deletion classified

## Verification To Run After Implementation

```powershell
npm run inventory:boundary:fail
npm test -- services/inventory actions/itemsShow --runInBand
npm run typecheck
```

## Status

Ready for implementation in the ordered suite. Do not skip lower-numbered unresolved risk classes.

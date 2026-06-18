# Exam 004 Inventory Item Finalizer Risk Brief

Skill: `exam-004-aqstoqflow-inventory-item-finalizer`

Order: 004

## Risk

Old inventory and item actions still expose direct item mutation, stock update, transfer/reservation helpers, hard deletes, and mock inventory data adjacent to the modern inventory kernel.

## Primary Files

- `actions/inventory/**/*`
- `actions/item/**/*`
- `actions/itemsShow/**/*`
- `services/inventory/**/*`
- `services/item/**/*`

## Expected Outputs

- thin service-backed actions
- removed or quarantined mocks
- inventory/item regression tests

## Source Reports

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_HARDENER_SKILL_RUN_REPORT_2026-06-16.md`

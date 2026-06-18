# Runtime Boundary Card

Skill: exam-004-aqstoqflow-inventory-item-finalizer
Version/date: 2026-06-16

## Trigger Boundary

Use when this suite reaches risk class 004: Exam 004 Inventory Item Finalizer.

Do not use when lower-numbered dependencies are unresolved.

## Input Boundary

Must read:

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `graphify-out/GRAPH_REPORT.md`
- `prisma/schema.prisma`
- `references/risk-brief.md`

## Edit Boundary

May edit:

- `actions/inventory/**/*`
- `actions/item/**/*`
- `actions/itemsShow/**/*`
- `services/inventory/**/*`
- `services/item/**/*`

Must not edit unrelated modules or make destructive evidence changes.

## Gate Boundary

- no stock mutation outside services/inventory
- mock inventory exports removed or demo-quarantined
- item deletion classified

## Output Boundary

Final answer and saved report must include changed files, controls, tests, verification, blockers, and next skill.

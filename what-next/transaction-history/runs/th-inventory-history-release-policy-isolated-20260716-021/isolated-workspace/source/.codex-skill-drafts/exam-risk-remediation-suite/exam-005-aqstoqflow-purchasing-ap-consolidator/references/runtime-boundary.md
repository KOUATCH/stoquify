# Runtime Boundary Card

Skill: exam-005-aqstoqflow-purchasing-ap-consolidator
Version/date: 2026-06-16

## Trigger Boundary

Use when this suite reaches risk class 005: Exam 005 Purchasing AP Consolidator.

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

- `services/purchase-order/**/*`
- `services/purchasing/**/*`
- `actions/purchasing/**/*`
- `components/**/*purchase*`

Must not edit unrelated modules or make destructive evidence changes.

## Gate Boundary

- one service owner for PO receipt/invoice/payment
- goods receipt stock effects use inventory services
- no placeholder approval actor

## Output Boundary

Final answer and saved report must include changed files, controls, tests, verification, blockers, and next skill.

# Runtime Boundary Card

Skill: exam-006-aqstoqflow-hard-delete-immutability-gate
Version/date: 2026-06-16

## Trigger Boundary

Use when this suite reaches risk class 006: Exam 006 Hard Delete Immutability Gate.

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

- `actions/**/*delete*`
- `services/**/*`
- `prisma/schema.prisma`
- `scripts/*gate*.js`

Must not edit unrelated modules or make destructive evidence changes.

## Gate Boundary

- posted/final/certified/reconciled records cannot hard-delete
- draft-only deletes are tested
- soft delete or reversal used for evidence records

## Output Boundary

Final answer and saved report must include changed files, controls, tests, verification, blockers, and next skill.

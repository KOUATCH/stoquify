# Runtime Boundary Card

Skill: exam-007-aqstoqflow-error-response-normalizer
Version/date: 2026-06-16

## Trigger Boundary

Use when this suite reaches risk class 007: Exam 007 Error Response Normalizer.

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

- `lib/error-handling/**/*`
- `services/**/*`
- `actions/**/*`
- `app/api/**/*`

Must not edit unrelated modules or make destructive evidence changes.

## Gate Boundary

- no raw internal errors across client boundary
- domain errors have stable codes
- Prisma errors are classified safely

## Output Boundary

Final answer and saved report must include changed files, controls, tests, verification, blockers, and next skill.

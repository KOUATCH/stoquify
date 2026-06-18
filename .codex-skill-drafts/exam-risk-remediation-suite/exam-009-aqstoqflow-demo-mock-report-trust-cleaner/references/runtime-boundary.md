# Runtime Boundary Card

Skill: exam-009-aqstoqflow-demo-mock-report-trust-cleaner
Version/date: 2026-06-16

## Trigger Boundary

Use when this suite reaches risk class 009: Exam 009 Demo Mock Report Trust Cleaner.

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

- `actions/inventory/inventoryActions.ts`
- `components/reports/**/*`
- `lib/error-handling/monitoring.ts`
- `app/**/*reports*`
- `services/**/*report*`

Must not edit unrelated modules or make destructive evidence changes.

## Gate Boundary

- no production route/action returns mock business data
- reports expose period/source/freshness/evidence status
- demo-only paths are visibly quarantined

## Output Boundary

Final answer and saved report must include changed files, controls, tests, verification, blockers, and next skill.

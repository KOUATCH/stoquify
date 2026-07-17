# Runtime Boundary Card

Skill: exam-002-aqstoqflow-service-boundary-ratchets
Version/date: 2026-06-16

## Trigger Boundary

Use when this suite reaches risk class 002: Exam 002 Service Boundary Ratchets.

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

- `app/**/*`
- `actions/**/*`
- `components/**/*`
- `hooks/**/*`
- `scripts/*gate*.js`

Must not edit unrelated modules or make destructive evidence changes.

## Gate Boundary

- report-mode scan before fail-mode
- no new direct Prisma outside service boundary
- no new action-owned economic mutation

## Output Boundary

Final answer and saved report must include changed files, controls, tests, verification, blockers, and next skill.

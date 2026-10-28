# Runtime Boundary Card

Skill: exam-015-aqstoqflow-ci-release-gate-modernizer
Version/date: 2026-06-16

## Trigger Boundary

Use when this suite reaches risk class 015: Exam 015 CI Release Gate Modernizer.

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

- `package.json`
- `.github/**/*`
- `scripts/**/*`
- `what-next/**/*`

Must not edit unrelated modules or make destructive evidence changes.

## Gate Boundary

- linted build available
- deprecated next lint replaced
- policy gates report or fail intentionally
- release report lists blockers

## Output Boundary

Final answer and saved report must include changed files, controls, tests, verification, blockers, and next skill.

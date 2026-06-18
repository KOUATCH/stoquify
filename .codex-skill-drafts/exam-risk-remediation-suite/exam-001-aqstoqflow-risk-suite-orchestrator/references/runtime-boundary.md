# Runtime Boundary Card

Skill: exam-001-aqstoqflow-risk-suite-orchestrator
Version/date: 2026-06-16

## Trigger Boundary

Use when this suite reaches risk class 001: Exam 001 Risk Suite Orchestrator.

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

- `what-next/*.md`
- `graphify-out/GRAPH_REPORT.md`
- `package.json`

Must not edit unrelated modules or make destructive evidence changes.

## Gate Boundary

- baseline reports exist
- no higher-priority open blocker is skipped
- verification command list is current

## Output Boundary

Final answer and saved report must include changed files, controls, tests, verification, blockers, and next skill.

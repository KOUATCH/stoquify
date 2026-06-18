# Runtime Boundary Card

Skill: exam-012-aqstoqflow-compliance-country-pack-production-gate
Version/date: 2026-06-16

## Trigger Boundary

Use when this suite reaches risk class 012: Exam 012 Compliance Country Pack Gate.

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

- `services/compliance/**/*`
- `services/regulatory/**/*`
- `prisma/schema.prisma`
- `components/compliance/**/*`

Must not edit unrelated modules or make destructive evidence changes.

## Gate Boundary

- REQUIRES_EXPERT_REVIEW blocks statutory certification
- sandbox adapters cannot claim production
- authority credentials are tenant-scoped and secret-safe

## Output Boundary

Final answer and saved report must include changed files, controls, tests, verification, blockers, and next skill.

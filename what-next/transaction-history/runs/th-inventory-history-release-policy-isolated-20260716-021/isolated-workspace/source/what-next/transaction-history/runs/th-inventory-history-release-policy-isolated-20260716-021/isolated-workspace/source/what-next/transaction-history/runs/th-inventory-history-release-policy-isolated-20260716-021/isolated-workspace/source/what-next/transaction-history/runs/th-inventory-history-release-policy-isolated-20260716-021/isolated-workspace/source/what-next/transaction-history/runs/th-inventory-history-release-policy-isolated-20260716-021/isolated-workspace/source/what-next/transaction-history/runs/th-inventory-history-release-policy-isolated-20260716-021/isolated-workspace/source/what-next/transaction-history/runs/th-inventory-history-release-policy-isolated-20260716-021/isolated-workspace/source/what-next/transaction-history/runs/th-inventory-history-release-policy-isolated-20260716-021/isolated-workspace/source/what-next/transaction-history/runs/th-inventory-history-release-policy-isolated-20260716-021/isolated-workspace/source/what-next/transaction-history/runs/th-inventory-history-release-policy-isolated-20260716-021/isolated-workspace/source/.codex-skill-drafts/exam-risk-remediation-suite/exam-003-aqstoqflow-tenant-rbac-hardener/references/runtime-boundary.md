# Runtime Boundary Card

Skill: exam-003-aqstoqflow-tenant-rbac-hardener
Version/date: 2026-06-16

## Trigger Boundary

Use when this suite reaches risk class 003: Exam 003 Tenant RBAC Hardener.

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

- `lib/security/**/*`
- `services/_shared/**/*`
- `actions/**/*`
- `app/api/**/*`
- `services/**/*`

Must not edit unrelated modules or make destructive evidence changes.

## Gate Boundary

- tenant context derived from trusted auth where possible
- RBAC enforced at service boundary
- same-actor approval blocked where required

## Output Boundary

Final answer and saved report must include changed files, controls, tests, verification, blockers, and next skill.

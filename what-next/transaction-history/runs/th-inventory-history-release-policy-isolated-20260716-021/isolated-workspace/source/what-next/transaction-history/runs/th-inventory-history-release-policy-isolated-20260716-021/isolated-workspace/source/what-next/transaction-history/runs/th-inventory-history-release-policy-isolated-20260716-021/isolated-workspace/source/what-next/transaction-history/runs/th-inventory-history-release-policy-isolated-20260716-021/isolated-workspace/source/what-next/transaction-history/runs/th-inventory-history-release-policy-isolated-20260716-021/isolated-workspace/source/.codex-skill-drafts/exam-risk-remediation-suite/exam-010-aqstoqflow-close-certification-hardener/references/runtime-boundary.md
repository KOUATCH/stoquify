# Runtime Boundary Card

Skill: exam-010-aqstoqflow-close-certification-hardener
Version/date: 2026-06-16

## Trigger Boundary

Use when this suite reaches risk class 010: Exam 010 Close Certification Hardener.

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

- `services/accounting/close-assurance*`
- `services/accounting/data-trust.service.ts`
- `services/inventory/inventory-valuation.service.ts`
- `services/compliance/**/*`
- `prisma/schema.prisma`

Must not edit unrelated modules or make destructive evidence changes.

## Gate Boundary

- no legal certification claim without authority adapter and expert review
- certified export blocked on stale inventory valuation evidence
- business event records invalidation

## Output Boundary

Final answer and saved report must include changed files, controls, tests, verification, blockers, and next skill.

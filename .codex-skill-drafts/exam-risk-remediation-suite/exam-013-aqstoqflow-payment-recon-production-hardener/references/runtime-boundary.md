# Runtime Boundary Card

Skill: exam-013-aqstoqflow-payment-recon-production-hardener
Version/date: 2026-06-16

## Trigger Boundary

Use when this suite reaches risk class 013: Exam 013 Payment Recon Production Hardener.

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

- `services/payments/**/*`
- `services/reconciliation/**/*`
- `actions/payments/**/*`
- `components/payments/**/*`
- `prisma/schema.prisma`

Must not edit unrelated modules or make destructive evidence changes.

## Gate Boundary

- provider account mapping complete
- statements are external evidence
- webhooks verify signatures
- suspense blocks close when unresolved

## Output Boundary

Final answer and saved report must include changed files, controls, tests, verification, blockers, and next skill.

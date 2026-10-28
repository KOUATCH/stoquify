# Runtime Boundary Card

Skill: exam-011-aqstoqflow-offline-pos-replay-finalizer
Version/date: 2026-06-16

## Trigger Boundary

Use when this suite reaches risk class 011: Exam 011 Offline POS Replay Finalizer.

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

- `services/pos/offline-sync.service.ts`
- `services/pos/pos.service.ts`
- `services/inventory/**/*`
- `services/compliance/**/*`
- `services/accounting/**/*`
- `actions/pos/**/*`

Must not edit unrelated modules or make destructive evidence changes.

## Gate Boundary

- idempotent replay
- no bypass of POS/inventory/payment/fiscal/ledger services
- conflicts remain quarantined

## Output Boundary

Final answer and saved report must include changed files, controls, tests, verification, blockers, and next skill.

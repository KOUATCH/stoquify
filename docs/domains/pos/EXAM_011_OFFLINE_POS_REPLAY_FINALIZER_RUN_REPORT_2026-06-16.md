# Exam 011 Offline POS Replay Finalizer Report-Mode Run

Date: 2026-06-16

Skill: `exam-011-aqstoqflow-offline-pos-replay-finalizer`

Mode: report-only first run. No application code changed.

## Risk Class

Offline POS sync currently captures evidence and blockers, but accepted envelopes cannot yet become final legal/accounting truth safely.

## Inputs Read

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_HARDENER_SKILL_RUN_REPORT_2026-06-16.md`
- `graphify-out/GRAPH_REPORT.md`

## First Implementation Slice

Use `$exam-011-aqstoqflow-offline-pos-replay-finalizer` to convert PENDING_REPLAY offline POS envelopes into final POS, inventory, payment, drawer, fiscal, and ledger effects through existing services.

Start with these files/patterns:

- `services/pos/offline-sync.service.ts`
- `services/pos/pos.service.ts`
- `services/inventory/**/*`
- `services/compliance/**/*`
- `services/accounting/**/*`
- `actions/pos/**/*`

## Required Gates

- idempotent replay
- no bypass of POS/inventory/payment/fiscal/ledger services
- conflicts remain quarantined

## Verification To Run After Implementation

```powershell
npm test -- services/pos services/inventory services/compliance services/accounting --runInBand
npm run inventory:boundary:fail
npm run typecheck
```

## Status

Ready for implementation in the ordered suite. Do not skip lower-numbered unresolved risk classes.

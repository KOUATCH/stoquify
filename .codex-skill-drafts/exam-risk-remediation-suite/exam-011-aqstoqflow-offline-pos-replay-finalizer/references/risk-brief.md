# Exam 011 Offline POS Replay Finalizer Risk Brief

Skill: `exam-011-aqstoqflow-offline-pos-replay-finalizer`

Order: 011

## Risk

Offline POS sync currently captures evidence and blockers, but accepted envelopes cannot yet become final legal/accounting truth safely.

## Primary Files

- `services/pos/offline-sync.service.ts`
- `services/pos/pos.service.ts`
- `services/inventory/**/*`
- `services/compliance/**/*`
- `services/accounting/**/*`
- `actions/pos/**/*`

## Expected Outputs

- safe replay service
- conflict resolution evidence
- replay regression tests

## Source Reports

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_HARDENER_SKILL_RUN_REPORT_2026-06-16.md`

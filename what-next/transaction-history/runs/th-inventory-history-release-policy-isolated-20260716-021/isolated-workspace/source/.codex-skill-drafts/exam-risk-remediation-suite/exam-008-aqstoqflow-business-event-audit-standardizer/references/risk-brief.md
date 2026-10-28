# Exam 008 Business Event Audit Standardizer Risk Brief

Skill: `exam-008-aqstoqflow-business-event-audit-standardizer`

Order: 008

## Risk

Older mutations and deletes may not consistently emit business events, audit logs, outbox evidence, idempotency keys, or ledger source links.

## Primary Files

- `services/events/**/*`
- `services/accounting/**/*`
- `services/inventory/**/*`
- `services/pos/**/*`
- `services/purchasing/**/*`
- `actions/**/*`

## Expected Outputs

- event adoption report
- business event tests
- audit/source-link evidence

## Source Reports

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_HARDENER_SKILL_RUN_REPORT_2026-06-16.md`

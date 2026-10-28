# Exam 005 Purchasing AP Consolidator Risk Brief

Skill: `exam-005-aqstoqflow-purchasing-ap-consolidator`

Order: 005

## Risk

AP controls can be bypassed through legacy purchase-order code with raw errors, direct Prisma orchestration, hard deletes, and old receiving workflows.

## Primary Files

- `services/purchase-order/**/*`
- `services/purchasing/**/*`
- `actions/purchasing/**/*`
- `components/**/*purchase*`

## Expected Outputs

- canonical purchasing/AP service contract
- migrated callers
- AP ledger/reconciliation blocker tests

## Source Reports

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_HARDENER_SKILL_RUN_REPORT_2026-06-16.md`

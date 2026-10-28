# Exam 003 Tenant RBAC Hardener Risk Brief

Skill: `exam-003-aqstoqflow-tenant-rbac-hardener`

Order: 003

## Risk

Some legacy actions and routes still accept or pass caller-supplied organization scope, and same-actor segregation is not proven across every sensitive workflow.

## Primary Files

- `lib/security/**/*`
- `services/_shared/**/*`
- `actions/**/*`
- `app/api/**/*`
- `services/**/*`

## Expected Outputs

- tenant/RBAC audit fixes
- tests for wrong-tenant and unauthorized actors
- fresh-auth and SoD evidence

## Source Reports

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_HARDENER_SKILL_RUN_REPORT_2026-06-16.md`

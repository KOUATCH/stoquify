# Exam 002 Service Boundary Ratchets Risk Brief

Skill: `exam-002-aqstoqflow-service-boundary-ratchets`

Order: 002

## Risk

Direct Prisma in App Router, components, hooks, or server actions can bypass tenant scope, RBAC, typed errors, audit evidence, and service-owned business rules.

## Primary Files

- `app/**/*`
- `actions/**/*`
- `components/**/*`
- `hooks/**/*`
- `scripts/*gate*.js`

## Expected Outputs

- service-boundary gate
- allowlist or zero-finding report
- migrated route/action evidence

## Source Reports

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_HARDENER_SKILL_RUN_REPORT_2026-06-16.md`

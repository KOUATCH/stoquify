# Exam 013 Payment Recon Production Hardener Risk Brief

Skill: `exam-013-aqstoqflow-payment-recon-production-hardener`

Order: 013

## Risk

Payment reconciliation has durable in-app infrastructure, but production provider credentials/channels, external statements, signing, and completeness gates remain incomplete.

## Primary Files

- `services/payments/**/*`
- `services/reconciliation/**/*`
- `actions/payments/**/*`
- `components/payments/**/*`
- `prisma/schema.prisma`

## Expected Outputs

- provider readiness gates
- statement evidence controls
- suspense and close blocker tests

## Source Reports

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_HARDENER_SKILL_RUN_REPORT_2026-06-16.md`

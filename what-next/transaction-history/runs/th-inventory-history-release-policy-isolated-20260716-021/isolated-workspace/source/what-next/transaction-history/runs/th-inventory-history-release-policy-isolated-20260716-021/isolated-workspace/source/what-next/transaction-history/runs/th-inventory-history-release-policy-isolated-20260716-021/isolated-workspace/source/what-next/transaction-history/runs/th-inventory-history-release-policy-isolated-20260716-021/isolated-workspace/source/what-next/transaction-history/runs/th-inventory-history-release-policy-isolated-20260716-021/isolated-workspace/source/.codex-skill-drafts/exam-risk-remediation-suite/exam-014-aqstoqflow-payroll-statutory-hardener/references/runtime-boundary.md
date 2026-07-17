# Runtime Boundary Card

Skill: exam-014-aqstoqflow-payroll-statutory-hardener
Version/date: 2026-06-16

## Trigger Boundary

Use when this suite reaches risk class 014: Exam 014 Payroll Statutory Hardener.

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

- `services/payroll/**/*`
- `actions/payroll/**/*`
- `components/payroll/**/*`
- `services/regulatory/**/*`
- `prisma/schema.prisma`

Must not edit unrelated modules or make destructive evidence changes.

## Gate Boundary

- country rates are versioned data
- approved payslips immutable
- corrections use corrective runs
- payroll posts liabilities to leaf accounts

## Output Boundary

Final answer and saved report must include changed files, controls, tests, verification, blockers, and next skill.

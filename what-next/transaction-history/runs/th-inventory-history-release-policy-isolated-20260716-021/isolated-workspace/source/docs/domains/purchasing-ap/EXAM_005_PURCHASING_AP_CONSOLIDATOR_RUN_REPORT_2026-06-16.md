# Exam 005 Purchasing AP Consolidator Report-Mode Run

Date: 2026-06-16

Skill: `exam-005-aqstoqflow-purchasing-ap-consolidator`

Mode: report-only first run. No application code changed.

## Risk Class

AP controls can be bypassed through legacy purchase-order code with raw errors, direct Prisma orchestration, hard deletes, and old receiving workflows.

## Inputs Read

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_HARDENER_SKILL_RUN_REPORT_2026-06-16.md`
- `graphify-out/GRAPH_REPORT.md`

## First Implementation Slice

Use `$exam-005-aqstoqflow-purchasing-ap-consolidator` to resolve split ownership between legacy purchase-order workflows and newer purchasing/AP controls.

Start with these files/patterns:

- `services/purchase-order/**/*`
- `services/purchasing/**/*`
- `actions/purchasing/**/*`
- `components/**/*purchase*`

## Required Gates

- one service owner for PO receipt/invoice/payment
- goods receipt stock effects use inventory services
- no placeholder approval actor

## Verification To Run After Implementation

```powershell
npm test -- services/purchasing services/purchase-order actions/purchasing --runInBand
npm run inventory:boundary:fail
npm run typecheck
```

## Status

Ready for implementation in the ordered suite. Do not skip lower-numbered unresolved risk classes.

# Exam 006 Hard Delete Immutability Gate Report-Mode Run

Date: 2026-06-16

Skill: `exam-006-aqstoqflow-hard-delete-immutability-gate`

Mode: report-only first run. No application code changed.

## Risk Class

Hard deletes can remove economic or audit evidence and bypass cancellation, reversal, soft-delete, or corrective event discipline.

## Inputs Read

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_HARDENER_SKILL_RUN_REPORT_2026-06-16.md`
- `graphify-out/GRAPH_REPORT.md`

## First Implementation Slice

Use `$exam-006-aqstoqflow-hard-delete-immutability-gate` to classify and eliminate unsafe hard deletes for evidence-bearing records while adding a reusable hard-delete policy gate.

Start with these files/patterns:

- `actions/**/*delete*`
- `services/**/*`
- `prisma/schema.prisma`
- `scripts/*gate*.js`

## Required Gates

- posted/final/certified/reconciled records cannot hard-delete
- draft-only deletes are tested
- soft delete or reversal used for evidence records

## Verification To Run After Implementation

```powershell
node scripts/hard-delete-gate.js --mode report
npm test -- --runInBand
npm run typecheck
```

## Status

Ready for implementation in the ordered suite. Do not skip lower-numbered unresolved risk classes.

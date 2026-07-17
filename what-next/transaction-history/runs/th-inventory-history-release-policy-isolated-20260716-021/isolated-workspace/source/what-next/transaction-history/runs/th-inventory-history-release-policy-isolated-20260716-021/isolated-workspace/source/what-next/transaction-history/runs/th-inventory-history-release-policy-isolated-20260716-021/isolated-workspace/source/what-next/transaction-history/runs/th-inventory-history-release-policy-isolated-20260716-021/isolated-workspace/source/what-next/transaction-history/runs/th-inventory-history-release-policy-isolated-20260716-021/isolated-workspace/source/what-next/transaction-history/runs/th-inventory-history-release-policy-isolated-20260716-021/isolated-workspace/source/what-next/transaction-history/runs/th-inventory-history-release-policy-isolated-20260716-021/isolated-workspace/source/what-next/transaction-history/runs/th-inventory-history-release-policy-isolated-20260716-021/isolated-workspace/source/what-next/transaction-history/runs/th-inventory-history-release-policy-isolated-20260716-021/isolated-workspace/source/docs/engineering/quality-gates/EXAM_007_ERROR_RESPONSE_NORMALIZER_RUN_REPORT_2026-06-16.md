# Exam 007 Error Response Normalizer Report-Mode Run

Date: 2026-06-16

Skill: `exam-007-aqstoqflow-error-response-normalizer`

Mode: report-only first run. No application code changed.

## Risk Class

Raw throw/rethrow/console error patterns can leak internals, create inconsistent UX, and bypass enterprise error classifications.

## Inputs Read

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_HARDENER_SKILL_RUN_REPORT_2026-06-16.md`
- `graphify-out/GRAPH_REPORT.md`

## First Implementation Slice

Use `$exam-007-aqstoqflow-error-response-normalizer` to replace raw errors and unsafe route/action leakage with typed domain errors and safe client responses.

Start with these files/patterns:

- `lib/error-handling/**/*`
- `services/**/*`
- `actions/**/*`
- `app/api/**/*`

## Required Gates

- no raw internal errors across client boundary
- domain errors have stable codes
- Prisma errors are classified safely

## Verification To Run After Implementation

```powershell
npm test -- lib/error-handling services/_shared actions --runInBand
npm run typecheck
```

## Status

Ready for implementation in the ordered suite. Do not skip lower-numbered unresolved risk classes.

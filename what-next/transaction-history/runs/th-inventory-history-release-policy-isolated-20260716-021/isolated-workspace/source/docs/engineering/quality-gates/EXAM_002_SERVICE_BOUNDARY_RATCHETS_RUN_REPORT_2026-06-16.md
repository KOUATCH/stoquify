# Exam 002 Service Boundary Ratchets Report-Mode Run

Date: 2026-06-16

Skill: `exam-002-aqstoqflow-service-boundary-ratchets`

Mode: report-only first run. No application code changed.

## Risk Class

Direct Prisma in App Router, components, hooks, or server actions can bypass tenant scope, RBAC, typed errors, audit evidence, and service-owned business rules.

## Inputs Read

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_HARDENER_SKILL_RUN_REPORT_2026-06-16.md`
- `graphify-out/GRAPH_REPORT.md`

## First Implementation Slice

Use `$exam-002-aqstoqflow-service-boundary-ratchets` to add and ratchet service-boundary gates that detect direct Prisma access outside services and action-owned economic mutations.

Start with these files/patterns:

- `app/**/*`
- `actions/**/*`
- `components/**/*`
- `hooks/**/*`
- `scripts/*gate*.js`

## Required Gates

- report-mode scan before fail-mode
- no new direct Prisma outside service boundary
- no new action-owned economic mutation

## Verification To Run After Implementation

```powershell
node scripts/service-boundary-gate.js --mode report
npm run typecheck
npm test -- --runInBand
```

## Status

Ready for implementation in the ordered suite. Do not skip lower-numbered unresolved risk classes.

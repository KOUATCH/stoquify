# Exam 015 CI Release Gate Modernizer Report-Mode Run

Date: 2026-06-16

Skill: `exam-015-aqstoqflow-ci-release-gate-modernizer`

Mode: report-only first run. No application code changed.

## Risk Class

Build currently skips lint, next lint is deprecated, and policy gates are not fully ratcheted into a release-ready CI command.

## Inputs Read

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_HARDENER_SKILL_RUN_REPORT_2026-06-16.md`
- `graphify-out/GRAPH_REPORT.md`

## First Implementation Slice

Use `$exam-015-aqstoqflow-ci-release-gate-modernizer` to modernize CI and release gates so Prisma, typecheck, lint, tests, build, and policy scanners enforce enterprise readiness.

Start with these files/patterns:

- `package.json`
- `.github/**/*`
- `scripts/**/*`
- `what-next/**/*`

## Required Gates

- linted build available
- deprecated next lint replaced
- policy gates report or fail intentionally
- release report lists blockers

## Verification To Run After Implementation

```powershell
npm run verify:repo
npm run lint
npm test -- --runInBand
npm run build:linted
```

## Status

Ready for implementation in the ordered suite. Do not skip lower-numbered unresolved risk classes.

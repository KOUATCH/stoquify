# CI Release Gate Modernizer Readiness Report

Date: 2026-06-16

Skill: `priority-012-ci-release-gate-modernizer`

## Safe Run Mode

This is a readiness/report-mode run. No application code is changed by this report.

## What This Skill Will Implement

Create a release-ready verification command that runs Prisma, typecheck, lint, tests, build, and policy gates.

## Priority Evidence

- Slice 8 from the examination report and the final ratchet after priority migrations are underway.
- Deprecated lint commands, no-lint builds, and disconnected policy gates can let regressions pass release checks.
- Source reports: what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md, what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md, what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md, what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md, what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md, graphify-out/GRAPH_REPORT.md

## Files It Will Inspect

- package.json
- .github/**/*
- .husky/**/*
- scripts/*gate*.js
- jest.config*
- next.config*
- eslint.config*

## Gates It Will Enforce

- npm run verify:repo
- npm run lint
- npm test -- --runInBand
- npm run build:linted
- node scripts/service-boundary-gate.js --mode report

## Success Looks Like

A single release verification path exists and cannot hide important lint, type, test, build, Prisma, or service-boundary failures.

## Dependencies

priority-001 through priority-011, or run earlier only in report mode.

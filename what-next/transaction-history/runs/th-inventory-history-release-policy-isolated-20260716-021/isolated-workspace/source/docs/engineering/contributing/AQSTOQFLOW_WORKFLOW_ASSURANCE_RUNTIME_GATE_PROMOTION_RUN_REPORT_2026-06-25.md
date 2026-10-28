# AqStoqFlow Workflow Assurance Runtime Gate Promotion Run Report

Date: 2026-06-25
Scope: Promote the Workflow Assurance runtime table checker into the real release policy path.

## What Changed

- `policy:gates` now runs `npm run workflow:assurance:runtime-check` in fail mode.
- The runtime checker keeps its read-only database behavior and now exposes a small `exitCodeForReport` helper for focused fail-mode coverage.
- Added focused tests proving missing Workflow Assurance runtime tables produce a blocking fail-mode result and that `policy:gates` includes the runtime checker.

## Why It Matters

Owner War Room, Manager Action Center, and the Assurance Control Tower depend on the Workflow Assurance runtime tables. The aggregate release gate now fails before those surfaces can ship against a database missing the required tables or completed migration rows.

## Verification

| Command | Result | Evidence |
| --- | --- | --- |
| `npm test -- --runTestsByPath scripts\__tests__\workflow-assurance-runtime-table-check.test.js scripts\__tests__\policy-gates.test.js --runInBand` | Passed | 2 suites, 8 tests. |
| `npm run policy:gates` | Passed | Inventory boundary, service boundary, Workflow Assurance runtime check, hard-delete, demo-trust, and raw-error gates all passed. Runtime check reported 6/6 tables and 2/2 migration rows present. |

## Notes

- No unrelated Prisma tooling cleanup was included.
- The runtime checker remains a fallback gate; it does not apply migrations or replace healthy Prisma migration workflows.
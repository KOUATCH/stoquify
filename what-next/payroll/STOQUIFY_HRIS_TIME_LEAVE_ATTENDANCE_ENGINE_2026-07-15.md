# Stoquify HRIS Time, Leave, and Attendance Engine

Date: 2026-07-15

## Executive decision

This slice is a controlled payroll-grade certification boundary, not a claim that Stoquify now has a complete operational time and leave ledger.

Payroll now accepts attendance totals only when HRIS supplies a strict, reviewed certification manifest covering policy provenance, schedules, holidays, imported attendance, leave balances, approved leave and overtime, segregation of duties, unresolved-item counts, and exact period totals. Legacy aggregate-only frozen snapshots are blocked from payroll calculation until they are re-certified or backfilled.

## Implemented

- Added a strict versioned HRIS time/leave/attendance certification contract.
- Required reviewed country and company policy evidence, leave and overtime policy hashes, schedule and holiday-calendar hashes, and effective-date coverage.
- Required attendance-import and leave-balance evidence plus approved leave/overtime request hashes when their totals affect pay.
- Enforced preparer/approver separation and bound the certified approver to the authenticated freezer.
- Rejected certification while time, leave, overtime, or correction items remain unresolved.
- Added manager-scoped certification through the existing HRIS people-scope resolver.
- Added tenant-admin correction with source revision checks, immutable correction lineage, redacted reason evidence, event/audit records, and sealed-payroll protection.
- Added HRIS action boundaries with server-derived organization, actor, permissions, fresh-auth gates, and client-field allowlists.
- Required the canonical `payroll.attendance.freeze` permission in the payroll freeze service.
- Enforced certification in payroll input readiness and again when building the certified payroll engine input.
- Pinned the certification hash into readiness evidence and the immutable engine input snapshot.
- Added redacted read models that expose operational state without source hashes or actor identifiers.

## Policy-gate behavior

Payroll refuses to calculate when any employee has:

- no frozen attendance snapshot;
- no attendance source hash;
- no valid HRIS certification manifest;
- unresolved time, leave, overtime, or correction items;
- certification totals that do not match the frozen snapshot;
- policy provenance for the wrong country or outside the payroll period;
- paid leave or overtime without approved-request evidence;
- the same preparer and approver; or
- a certified approver different from the authenticated freezer.

Corrections supersede rather than mutate the prior frozen snapshot. Once a payroll run is calculated or later, attendance correction must flow through the existing payroll correction-run mechanism.

## Verification

- Jest: 3 suites passed, 50 tests passed.
  - `services/hris/__tests__/time-leave.service.test.ts`
  - `actions/hris/__tests__/time-leave.actions.test.ts`
  - complete `services/payroll/__tests__/payroll-control.service.test.ts`
- Focused ESLint: passed for all eight touched implementation and test files.
- TypeScript: isolated `tsc --noEmit --pretty false` passed after concurrent repository compilers cleared (88.9 seconds).

## Data and migration impact

- No Prisma schema or migration was added in this slice.
- The existing `PayrollAttendanceSnapshot.metadata`, `sourceHash`, status, and `correctedFromId` lineage are used for the certified handoff.
- Existing frozen snapshots without the versioned certification payload will now block payroll calculation. A controlled re-certification/backfill plan is required before rollout to tenants with existing payroll data.

## Explicit boundary

The repository still lacks the complete operational models needed for a mature leave and attendance product: policy definitions, accrual ledgers, balances, requests, schedules, holidays, time entries, clock events, overtime requests, delegated approvals, and jurisdiction-specific statutory rules. This slice intentionally does not invent those rules. It provides a fail-closed adapter so payroll can consume only approved, traceable truth while those foundations are built.

## Landing status

Ready for review. Focused behavior, lint, and TypeScript compilation are green. Before landing:

1. Plan re-certification/backfill for legacy frozen attendance snapshots.
2. Review this slice separately from the broad unrelated working-tree changes.

No broad build, browser, accessibility, or full-repository Jest run was claimed for this backend-focused slice.

## Next logical skill

Run `stoquify-hris-11-approval-inbox` next. It should surface pending certifications and corrections without weakening the service-owned manager scope, fresh-auth, or payroll readiness gates established here.

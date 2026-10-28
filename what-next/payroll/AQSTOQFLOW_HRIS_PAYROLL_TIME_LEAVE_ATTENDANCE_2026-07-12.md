# AqStoqFlow HRIS Payroll 08 - Time Leave Attendance

Date: 2026-07-12

## Executive Result

Executed the `aqstoqflow-hris-payroll-08-time-leave-attendance` slice after document-evidence redaction.

The focused hardening now ensures payroll calculation does not treat a frozen attendance snapshot as payroll-ready unless it carries source-hash evidence. Command-center attendance readiness also counts only frozen snapshots with non-empty source-hash proof.

This does not declare unrestricted HRIS/payroll production readiness. It closes the active service-level gap for traceable attendance consumption and hands off to the payroll input readiness gate.

## Scope

- Attendance freeze evidence.
- Frozen attendance consumption during payroll calculation.
- Command-center attendance readiness counting.
- Focused service tests for freeze evidence, calculation denial, and readiness denial.

## Files Inspected

- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-hris-payroll-08-time-leave-attendance\SKILL.md`
- `docs/HR-Payroll/README.md`
- `docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_NEXT_STEPS_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_DOCUMENT_EVIDENCE_REDACTION_2026-07-12.md`
- `prisma/schema.prisma`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-control.schemas.ts`
- `services/payroll/command-read-model.service.ts`
- `services/payroll/payment-evidence.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/payroll/__tests__/payroll-command-read-model.service.test.ts`
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`

## Changes Made

- `services/payroll/payroll-control.service.ts`
  - Payroll calculation now rejects any employee whose frozen attendance snapshot has missing or blank `sourceHash`.
  - Payroll line calculation snapshots now include `attendanceSourceHash`.
  - Payroll run `attendanceSnapshotHash` now hashes the attendance snapshot id plus its source hash, not only the snapshot id.

- `services/payroll/command-read-model.service.ts`
  - Frozen attendance readiness count now requires `sourceHash: { not: "" }`.

- `services/payroll/__tests__/payroll-control.service.test.ts`
  - Added freeze-evidence coverage for source-hash, business event, and audit trail.
  - Added calculation denial coverage for missing frozen attendance source evidence.
  - Updated payroll calculation fixtures to carry real attendance source-hash data.

- `services/payroll/__tests__/payroll-command-read-model.service.test.ts`
  - Added query-shape assertion proving readiness counts only source-hash-backed frozen snapshots.
  - Added readiness-denial coverage when frozen attendance lacks source-hash proof.

## Current Blockers

- No blocker remains for this focused slice.
- Full HRIS-native schedules, leave approval workflows, absence correction workflows, and first-class attendance correction diff services are still downstream/open. The current system has payroll attendance snapshots and correction proof in payroll calculation flows, but the full HRIS time/leave engine is not complete yet.
- Full `git diff --check` is blocked by unrelated pre-existing whitespace:
  - `docs/modules/README.md:36` new blank line at EOF.
  - `what-next/settings-surface-classification.md:93` new blank line at EOF.

## Data Ownership Decision

HRIS remains the intended owner of people, time, leave, and attendance truth. Payroll may consume only frozen, service-owned attendance snapshots with source-hash evidence. Payroll calculation must not invent attendance truth or proceed from a frozen row that lacks traceability.

## Tenant / RBAC Decision

No permissions were changed. Existing payroll attendance permissions remain:

- `payroll.attendance.freeze`
- `payroll.attendance.readiness.read`
- `payroll.command.read`

The service changes remain tenant-scoped by `organizationId` and active employee checks. The command read model still requires command-read permission before exposing readiness composition.

## Audit / Redaction Decision

Attendance freeze continues to emit:

- `attendance.period.frozen` business event.
- `PAYROLL_ATTENDANCE_SNAPSHOT_FROZEN` audit log.
- Source-hash evidence instead of UI-derived truth.

No new client/browser payload was added. Existing `sourcePayload` storage remains service metadata and should stay out of broad read models unless redacted or summarized.

## Verification

Passed:

```text
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts --runInBand
Test Suites: 2 passed, 2 total
Tests: 35 passed, 35 total
```

Passed:

```text
npm run typecheck
```

Passed:

```text
npm run prisma:validate
```

Passed for touched files:

```text
git diff --check -- services/payroll/payroll-control.service.ts services/payroll/command-read-model.service.ts services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts
```

Failed outside this slice:

```text
git diff --check
docs/modules/README.md:36: new blank line at EOF.
what-next/settings-surface-classification.md:93: new blank line at EOF.
```

## Skipped Checks

- Full Jest suite was not run; focused backend payroll suites were used for this slice.
- Browser smoke was not run because no UI/browser behavior changed.
- `npm run policy:gates` was not run because this slice did not touch policy wiring and that gate can refresh unrelated payroll immutability artifacts.

## Residual Risk

- Native HRIS schedule, leave, absence, overtime, and correction workflows still need first-class services and approval state, instead of relying on generic snapshot `sourcePayload`.
- The payroll calculation guard now fails closed on missing attendance source evidence, but downstream input-readiness should consolidate identity, contract, compensation, document, attendance, and payment-destination verdicts into one service-owned readiness decision.
- Attendance correction diff evidence should be strengthened in the dedicated snapshot/correction slice.

## Next Handoff

`aqstoqflow-hris-payroll-09-input-readiness-gate`

The next slice should create or harden the service-owned payroll input readiness verdict so payroll run creation is gated by a single tenant-scoped, auditable readiness decision across employee identity, active contract, compensation evidence, document evidence, attendance source proof, and payment-destination approval.

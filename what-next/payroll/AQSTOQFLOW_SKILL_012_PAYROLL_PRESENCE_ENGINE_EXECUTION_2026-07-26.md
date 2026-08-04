# AqStoqFlow Skill 012 Payroll Presence Engine Execution

**Date:** 2026-07-26  
**Selected skill:** `012-aqstoqflow-payroll-presence-engine`  
**Internal development decision:** READY  
**Full functional-blueprint decision:** PARTIAL  
**Production decision:** NO-GO

## Outcome

The existing HRIS/payroll control spine is implemented and verified for continued
development, synthetic testing, and no-legal-effect sandbox use. Payroll pins
country-pack provenance, consumes certified HRIS and attendance snapshots,
seals calculated runs, preserves emitted payslips, routes post-calculation
changes through correction runs, ties the payroll register to mapped ledger
components, and applies tenant, RBAC, fresh-authentication, segregation,
business-event, audit, notification, and redaction controls.

One explicit Skill 012 gap was found and closed: active employees could share
the same approved payment-destination hash without a payroll-readiness anomaly.
Payroll calculation now fails closed with
`PAYROLL_INPUT_PAYMENT_DESTINATION_DUPLICATE`, creating tenant-scoped,
hash-only evidence for every affected employee before a run or financial event
is created.

## Explicit Skill Gates

| Gate | Result |
|---|---|
| Payroll run pins country-pack version and resolution proof | Passed |
| Approved/emitted payslip cannot be recalculated or mutated in place | Passed |
| Attendance changes after calculation require a correction run | Passed |
| Payroll register and component totals tie to ledger evidence | Passed |
| Ghost-like employee conditions surface through missing HRIS identity/contract proof | Passed |
| Duplicate approved payment destinations surface and block calculation | Passed |
| Payroll approval requires fresh auth and maker-checker separation | Passed |
| Attendance correction emits event, notification, and audit proof | Passed |

## New Regression Ratchet

`npm run payroll:presence:gate` now verifies seven internal invariants and is
wired into both repository policy-gate chains:

1. country-pack version and calculation snapshot pinning;
2. finalized payroll and emitted-payslip database immutability;
3. attendance correction routing after payroll sealing;
4. register-to-ledger and component tie-out;
5. ghost/identity, contract, and duplicate-destination risk visibility;
6. tenant, RBAC, fresh-authentication, and segregation controls;
7. correction event, audit, and notification evidence.

Current result: **7/7 ready, 0 blockers**.

## Verification Evidence

- Core HRIS/payroll bundle: 12 suites, 127 tests passed.
- Focused payroll-control plus readiness-gate bundle: 2 suites, 45 tests passed.
- Payroll-presence gate regression suite: 3/3 tests passed.
- Policy-chain and regulatory-hardcode suites: 2 suites, 10 tests passed.
- Payroll immutability runtime harness:
  - 9/9 required database triggers present;
  - 14/14 forbidden mutations blocked;
  - 3/3 permitted lifecycle mutations accepted.
- Statutory development gate: 11/11 ready.
- Payments/declarations development gate: 9/9 ready.
- Accounting-close development gate: 10/10 ready.
- Synthetic migration/backfill development gate: 11/11 ready.
- TypeScript typecheck: passed.
- Prisma schema validation: passed.
- Focused whitespace validation: passed.

## Full Blueprint Residual Scope

The full Skill 012 product blueprint is not yet complete. The repository has a
certified attendance snapshot and correction boundary, but no dedicated
operational models/services for:

- work schedules and calendars;
- public holidays;
- leave policies and balances;
- leave request/approval ledgers;
- overtime request/approval ledgers;
- raw time-entry/import ledgers;
- employee self-service attendance/leave correction requests.

This absence does not permit payroll to guess those inputs: readiness remains
fail-closed and accepts only approved, certified aggregate attendance evidence.
It does mean the complete HR/time-management product promised by the broad
blueprint remains a separate implementation tranche.

## Production Boundary

The independent country-pack production gate correctly remains blocked at
10/12:

- `source_artifact_hash_verification`
- `source_artifact_expert_approval`

Those blockers do not stop ordinary feature development or synthetic sandbox
testing. They continue to prohibit real payroll reliance, live payments,
legally effective declarations, authority submissions, and production close
certification.

## Files Changed

- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `scripts/payroll-presence-readiness-gate.js`
- `scripts/__tests__/payroll-presence-readiness-gate.test.js`
- `package.json`
- `what-next/payroll/payroll-presence-readiness.md`
- `what-next/payroll/payroll-presence-readiness.json`
- Refreshed development and immutability readiness outputs.
- This execution report.

## Decision

Skill 012's internal payroll-control spine is regression-clean and ready for
continued development. Do not claim the full time-management feature set or
production statutory readiness until the residual operational ledgers and the
two authentic country-pack approvals are completed.

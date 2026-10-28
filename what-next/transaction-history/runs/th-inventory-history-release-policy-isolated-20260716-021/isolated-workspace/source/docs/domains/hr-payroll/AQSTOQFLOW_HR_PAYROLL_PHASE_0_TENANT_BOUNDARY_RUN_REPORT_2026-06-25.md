# AqStoqFlow HR/Payroll Phase 0 Tenant Boundary Run Report

Date: 2026-06-25

Skill: `aqstoqflow-payroll-kernel-hardener`

Slice: Phase 0 tenant-boundary proof for payroll write paths that can affect accounting, payment, declarations, close evidence, or sensitive salary artifacts.

## Decision

Preserve and harden the existing payroll kernel. No production rewrite was needed in this slice because the real service paths already scope their payroll lookups by `organizationId`; the highest-value change was to lock those boundaries with focused tests so future HR/payroll reconstruction work cannot accidentally weaken tenant isolation.

## Code Change

- Added `services/payroll/__tests__/payroll-tenant-boundary.service.test.ts`.

## Coverage Added

- `approveAndPostPayrollRun` now has a focused tenant-boundary test proving an out-of-organization payroll run is treated as not found before sensitive-action approval, ledger posting, payslip emission, business events, certified-close invalidation, audit, or run mutation can start.
- `releasePayrollPaymentBatch` now has a focused tenant-boundary test proving payment release scopes both the idempotency lookup and payroll run lookup to the caller organization before payment batch creation, ledger posting, business events, audit, or run mutation can start.
- `preparePayrollDeclarations` now has a focused tenant-boundary test proving declaration preparation scopes the payroll run lookup to the caller organization before country-pack declaration resolution, declaration creation, business events, or audit can start.

## Preserved Semantics

- Payroll calculation, attendance freeze, payroll posting, payslip emission, payment release, declaration preparation, business-event recording, audit logging, ledger source links, stale-evidence markers, certified export invalidation, and `PAYROLL_RUN_POSTED` close invalidation production behavior were not changed.
- The new tests assert that those downstream semantics remain unreachable for out-of-tenant payroll records, which is the desired security boundary.

## Verification

- Passed: `npm test -- --runTestsByPath services/payroll/__tests__/payroll-tenant-boundary.service.test.ts --runInBand`
  - 1 suite, 3 tests.
- Passed: `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-completion.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand`
  - 3 suites, 16 tests.
- Passed: `npm run policy:gates`
  - Inventory boundary, service boundary, workflow assurance runtime check, hard-delete gate, demo/report trust gate, and raw-error boundary gate all reported zero active violations.
- Passed: `npm run typecheck`

Note: The local sandbox helper failed before some test/status commands could start, so verification commands were rerun outside the sandbox with the same scoped targets.

## Remaining Phase 0 Work

- Add salary-read audit and payroll privacy/redaction tests.
- Add or prove statutory hardcode gates for payroll constants.
- Normalize payroll module identity across routes/actions/read models/redaction.
- Evaluate and implement close invalidation coverage for payment release, declaration state changes, and payroll corrections where those changes can stale certified close evidence.

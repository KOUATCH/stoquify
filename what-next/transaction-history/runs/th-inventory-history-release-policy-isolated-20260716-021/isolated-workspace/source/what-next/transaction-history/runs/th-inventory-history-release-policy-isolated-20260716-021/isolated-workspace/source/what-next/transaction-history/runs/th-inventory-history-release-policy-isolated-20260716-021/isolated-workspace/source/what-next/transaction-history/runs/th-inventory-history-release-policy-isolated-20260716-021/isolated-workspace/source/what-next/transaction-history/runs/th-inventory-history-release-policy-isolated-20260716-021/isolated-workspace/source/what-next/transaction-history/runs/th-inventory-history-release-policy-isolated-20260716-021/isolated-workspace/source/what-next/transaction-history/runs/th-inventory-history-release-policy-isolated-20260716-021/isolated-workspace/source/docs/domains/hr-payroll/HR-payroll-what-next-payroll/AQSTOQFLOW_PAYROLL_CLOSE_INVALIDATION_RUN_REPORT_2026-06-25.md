# AqStoqFlow Payroll Close Invalidation Run Report

Date: 2026-06-25

## Scope

Continued the certified-close invalidation mesh with the highest-value payroll source in the current codebase: payroll run posting.

## Source Selection

Selected `approveAndPostPayrollRun` over payroll payment release because it is the valuation and close-impacting payroll write path that:

- creates the payroll ledger posting batch,
- links accounting source evidence,
- emits and applies `payroll.run.posted`,
- updates the payroll run with posting and document hash evidence.

Payroll payment release also posts payment evidence and remains a reasonable future cash/reconciliation invalidation source, but the payroll run posting is the first payroll close-impacting source.

## Implementation

- Added typed invalidation source metadata for `PAYROLL_RUN_POSTED` in `services/accounting/close-assurance-pack.service.ts`.
- Wired `approveAndPostPayrollRun` to `recordCloseCertificationInvalidationsForSourceInTx` after the payroll posting business event is applied and after payroll posting state is persisted.
- Kept stale close semantics centralized through the existing invalidation helper so certified close runs/exports receive the same stale metadata, stale evidence audit, `close.certification.invalidated` business event, and report-export outbox semantics as payment, ledger, and inventory sources.
- Added focused payroll test coverage proving certified close evidence becomes stale when a payroll run is posted in the certified close period.

## Verification

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand`
- `npm run service:boundary:fail`
- `npm run policy:gates`

Blocked locally:

- `npm run typecheck` could not start. The escalated approval review timed out twice, and the non-escalated retry failed before execution with `windows sandbox: helper_unknown_error: setup refresh had errors`.

## Notes

The change is service-only and does not alter certified close pack export behavior. Existing export semantics remain unchanged except that certified close evidence is now truthfully marked stale when a payroll run posting changes close-impacting payroll evidence.
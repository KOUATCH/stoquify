# AqStoqFlow HR/Payroll Wave 1 Payroll Tax Bracket Topology Hardening Report - 2026-07-01

## Selected Skill

`aqstoqflow-payroll-country-pack-engine`

## Selected Phase And Slice

Phase 3: statutory country-pack and payroll calculation engine hardening.

Executable slice: fail-closed validation for progressive payroll tax bracket topology.

## Decision

This slice makes the payroll tax evaluator stricter, but it does not by itself make HR/Payroll fully production-ready. Full production remains dependent on reviewed statutory fixture breadth, controlled pilot reconciliation, adapter proof, migration/backfill signoff, and release certification.

## What Changed

`services/payroll/payroll-tax-rule-evaluator.ts` now rejects ambiguous progressive tax rule tables before calculation when:

- two or more finite brackets have the same ceiling;
- more than one open-ended final bracket is present.

This prevents a country-pack formula from silently ignoring a duplicate bracket or duplicate final bracket while still returning `CALCULATED`.

## Why This Matters

Country-pack formulas are part of the deepest HR/payroll product claim. If a reviewed or regulator-confirmed fixture accidentally includes duplicate progressive tax ceilings or multiple open-ended brackets, the engine must fail closed. Silent calculation would create false payroll correctness evidence and could flow into payslips, register proof, accounting, declarations, close assurance, and BI.

This change adds structural formula safety without hardcoding any legal value, rate, threshold, or country-specific rule in application logic.

## Tests Added

`services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts` now covers:

- duplicate progressive bracket ceilings are rejected;
- multiple open-ended progressive brackets are rejected.

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts --runInBand`
  - 1 suite passed
  - 9 tests passed
- `npx jest services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand`
  - 3 suites passed
  - 34 tests passed
- `npm run regulatory:hardcode:fail`
  - active findings: 0
- `npm run typecheck`
  - `tsc --noEmit --pretty false` passed
- `npm run service:boundary:fail`
  - active service-boundary violations: 0
- `npm run policy:gates`
  - inventory boundary: passed
  - service boundary: passed
  - workflow assurance runtime check: ready, blockers 0
  - payroll immutability runtime: ready, 9/9 triggers present, 14/14 forbidden mutation checks blocked, blockers 0
  - hard-delete gate: passed
  - regulatory hardcode gate: passed
  - demo/report trust gate: passed
  - raw-error boundary gate: passed

Generated/updated gate evidence:

- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Files Changed

- `services/payroll/payroll-tax-rule-evaluator.ts`
- `services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_WAVE_1_PAYROLL_TAX_BRACKET_TOPOLOGY_HARDENING_REPORT_2026-07-01.md`
- `what-next/payroll/payroll-immutability-runtime-check.md` and `.json` refreshed by `npm run policy:gates`

## Gates Blocked

None for this slice.

## Residual Risk

This does not certify Cameroon IRPP or any other statutory formula as production legal truth. It only strengthens evaluator safety for reviewed/certified formula inputs. Full production still requires fixture breadth and expert/regulator provenance for the formulas themselves.

## Next Recommended Slice

Continue Phase 3 by strengthening statutory fixture breadth around IRPP/YTD/corrections, then continue to payment/declaration adapter certification proof. Operator route or BI polish should continue consuming service-owned proof only after calculation/register truth remains clean.

# AqStoqFlow HR/Payroll Wave 1 IRPP Fixture Output Pinning Gate Report - 2026-07-01

## Selected Skill

`aqstoqflow-payroll-country-pack-engine`

## Selected Phase And Slice

Phase 3: statutory country-pack and payroll calculation engine hardening.

Executable slice: Cameroon IRPP production fixture publish gate requires scenario-family output pins for period, YTD, adjustments, and correction replay.

## Decision

This slice strengthens statutory fixture breadth and publish-time proof, but it does not make HR/Payroll fully production-ready by itself. Full production still requires reviewed statutory fixture breadth across the supported country scope, controlled pilot reconciliation, adapter proof, migration/backfill signoff, and final release certification.

## What Changed

`services/regulatory/country-packs/validation.ts` now validates Cameroon IRPP production-support fixtures with scenario-specific requirements:

- period calculation fixtures must pin taxable base, adjusted taxable base, cumulative taxable base, pre-adjustment tax, tax adjustment, final withholding, status, and currency;
- YTD regularization fixtures must pin taxable base, cumulative taxable base, pre-adjustment tax, tax adjustment, final withholding, status, and currency;
- period adjustment fixtures must pin adjusted taxable base, taxable-base adjustment, pre-adjustment tax, tax adjustment, final withholding, status, and currency;
- YTD correction replay fixtures must pin cumulative taxable base, pre-adjustment tax, tax adjustment, final withholding, status, and currency.

The validator also requires the relevant replay inputs for each scenario family, including YTD inputs and adjustment values where those scenario families claim coverage.

## Why This Matters

Before this change, Cameroon IRPP production validation only required each production fixture purpose to exist with a calculation scenario. A production-support pack could omit important output pins while still passing publish validation, leaving the executable fixture runner to catch the gap later.

For full HR/payroll production, publish validation must fail early when a country pack claims statutory support without enough reviewed outputs to prove payslip/register/tax replay behavior. This closes that gap without adding legal formulas, thresholds, rates, or hardcoded statutory values to application logic.

## Tests Added Or Updated

- `services/regulatory/__tests__/country-pack.service.test.ts`
  - added a regression that rejects Cameroon IRPP production support when the YTD correction replay fixture omits `taxAmountAdjustmentAmount`;
  - updated the accepted IRPP production fixture set to pin the stronger required output fields.
- `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts`
  - updated the supported IRPP test pack so fixture-runner executable evidence aligns with the stricter publish gate.

## Verification

Passed:

- `npx jest services/regulatory/__tests__/country-pack.service.test.ts --runInBand`
  - 1 suite passed
  - 19 tests passed
- `npx jest services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand`
  - 3 suites passed
  - 35 tests passed
- `npm run typecheck`
  - `tsc --noEmit --pretty false` passed
- `npm run regulatory:hardcode:fail`
  - active findings: 0
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

During verification, the wider country-pack test group initially failed because the fixture-runner's supported IRPP test pack did not pin the new required outputs. The test pack was updated, then the same command passed.

Generated/updated gate evidence:

- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Files Changed

- `services/regulatory/country-packs/validation.ts`
- `services/regulatory/__tests__/country-pack.service.test.ts`
- `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_WAVE_1_IRPP_FIXTURE_OUTPUT_PINNING_GATE_REPORT_2026-07-01.md`
- `what-next/payroll/payroll-immutability-runtime-check.md` and `.json` refreshed by `npm run policy:gates`

## Gates Blocked

None for this slice after the fixture-runner test pack was aligned with the stricter publish gate.

## Residual Risk

This does not certify Cameroon IRPP as production legal truth. It strengthens the publish gate so that, when production support is claimed, required reviewed outputs must be pinned. Real production readiness still requires expert-reviewed or regulator-confirmed formulas and fixtures for the actual statutory country-pack release.

## Next Recommended Slice

Continue Phase 3 by expanding fixture proof to remaining statutory/component families, then move into payment/declaration adapter certification proof and controlled pilot-cycle evidence.

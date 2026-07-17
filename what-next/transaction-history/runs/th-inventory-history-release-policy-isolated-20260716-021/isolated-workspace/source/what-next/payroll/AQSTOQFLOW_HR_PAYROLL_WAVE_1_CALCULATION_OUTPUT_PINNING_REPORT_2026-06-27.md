# AqStoqFlow HR/Payroll Wave 1 Calculation Output Pinning Report

Date: 2026-06-27

## Decision

Wave 1 has advanced from "country-pack fixture coverage exists" to "the payroll calculation output is pinned to reviewed statutory evidence for the current Cameroon CNPS pack slice."

This is still not full production readiness. It closes one product-claim blocker: payroll calculation must not silently compute with incomplete statutory inputs or unproven expected outputs.

## Completed Scope

- Pinned the Cameroon CNPS payroll calculation snapshot to a golden expected output for the implemented pension, family allowance, occupational risk, employee deduction, employer charge, gross, social base, and net-pay fields.
- Required payroll calculation snapshots to carry the active country code, country-pack version, schema version, and regulator-confirmed provenance.
- Added a fail-closed calculation guard for missing or invalid reviewed CNPS values instead of allowing null, undefined, empty, invalid, or negative rates to become payroll output.
- Reused country-pack-backed statutory values; no production legal formula was hardcoded into the payroll engine.

## Evidence

Commands run:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand
npm run regulatory:hardcode:fail
npm run typecheck
```

Results:

- Payroll and statutory country-pack suites passed: 2 suites, 21 tests.
- Regulatory hardcode gate passed with 0 active findings.
- Typecheck completed without errors.

## Files Advanced

- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/regulatory/country-packs/validation.ts`
- `services/regulatory/__tests__/country-pack.service.test.ts`

## Remaining Wave 1 Work

- Add reviewed IRPP/income tax formulas with golden fixtures and effective dating.
- Add allowances, taxable benefits, deductions, leave, overtime, caps, and rounding fixtures.
- Add YTD, retro corrections, multi-period recalculation, and immutable correction event coverage.
- Expand employer liabilities beyond the implemented CNPS proof slice.
- Add jurisdiction expansion packs with the same coverage and provenance gate.
- Tie final locked register totals to payslip, declaration, payment, and accounting posting evidence.

## Release Impact

The implemented slice is now stronger evidence for controlled pilot payroll calculation, but it is not enough for unrestricted HR/payroll rollout. Full production remains blocked until all statutory packs, payroll engine lifecycle rules, accounting postings, declaration/payment adapters, self-service workflows, migration evidence, and release gates are closed with proof.

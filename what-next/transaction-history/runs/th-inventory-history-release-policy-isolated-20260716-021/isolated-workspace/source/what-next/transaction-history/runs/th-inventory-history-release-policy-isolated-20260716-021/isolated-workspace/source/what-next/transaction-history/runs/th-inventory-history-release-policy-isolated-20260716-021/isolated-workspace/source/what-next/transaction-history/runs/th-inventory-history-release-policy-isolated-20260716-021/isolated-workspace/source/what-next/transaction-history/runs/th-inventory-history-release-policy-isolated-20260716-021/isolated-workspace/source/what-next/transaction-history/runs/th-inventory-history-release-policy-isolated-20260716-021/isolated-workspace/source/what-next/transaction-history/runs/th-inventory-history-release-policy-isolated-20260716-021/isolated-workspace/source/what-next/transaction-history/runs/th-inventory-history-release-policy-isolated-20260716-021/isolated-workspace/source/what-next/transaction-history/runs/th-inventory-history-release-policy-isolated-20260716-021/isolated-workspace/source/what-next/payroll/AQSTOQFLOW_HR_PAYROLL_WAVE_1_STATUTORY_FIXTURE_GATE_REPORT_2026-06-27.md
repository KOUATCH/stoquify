# AqStoqFlow HR/Payroll Wave 1 Statutory Fixture Gate Report

Date: 2026-06-27
Scope: Roadmap Wave 1 - statutory country-pack and payroll engine hardening

## Outcome

Implemented the first Wave 1 hardening slice from the full HR/payroll production roadmap.

The country-pack publish validation now fails closed when Cameroon payroll-critical golden fixtures are missing, stale, pinned to another pack version, pinned to another country, or outside the country-pack effective window.

This strengthens the statutory release gate before broader payroll calculation expansion, operator routes, finance/BI integration, POS/sales integration, migration/backfill, or unrestricted production release.

## Files Changed

- `services/regulatory/country-packs/validation.ts`
- `services/regulatory/__tests__/country-pack.service.test.ts`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_WAVE_1_STATUTORY_FIXTURE_GATE_REPORT_2026-06-27.md`

## What Changed

### Fixture Scope Validation

Golden fixtures are now checked against the active country pack:

- fixture `countryCode` must match the pack country;
- fixture `expectedPackVersion` must match the pack version;
- fixture `date` must fall inside the pack effective window.

### Cameroon Payroll Fixture Coverage

Published Cameroon packs now require same-pack golden fixture coverage for the payroll-critical CNPS parameters currently used by the payroll engine:

- `payroll.cnps.pensionRatesBps`
- `payroll.cnps.familyAllowanceRatesBps`
- `payroll.cnps.occupationalRiskRatesBps`
- `payroll.cnps.employerRules`

If any of those fixtures are absent or not pinned to the current pack version, `validateCountryPackForPublish` returns a `GOLDEN_FIXTURE_FAILED` error.

### Test Coverage

Country-pack tests now prove:

- the valid Cameroon pack includes the payroll-critical fixture set;
- removing a required payroll fixture blocks publication;
- stale fixture pack-version pinning blocks publication.

## Roadmap Alignment

This directly advances:

- Wave 1 item: country-pack fixture system with regulator/expert provenance, expected outputs, edge cases, golden files, and capability status transitions.
- Execution backlog item 1: statutory parameter matrix and fixture contract.
- Execution backlog item 2: payroll calculation golden tests, because payroll-critical fixture coverage is now enforced before runtime calculation claims can be trusted.

It deliberately does not add:

- new statutory formulas;
- operator routes;
- authority adapters;
- payment automation;
- finance/BI payroll facts;
- POS/sales payroll inputs;
- production backfill mutation.

## Verification

Passed:

```powershell
npm test -- --runTestsByPath services/regulatory/__tests__/country-pack.service.test.ts --runInBand
npm run typecheck
npm run regulatory:hardcode:fail
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts --runInBand
```

Observed results:

- Country-pack tests: 1 suite passed, 13 tests passed.
- Typecheck: passed.
- Regulatory hardcode gate: passed with 0 active findings.
- Payroll-control service tests: 1 suite passed, 7 tests passed.

## Remaining Wave 1 Work

The full Wave 1 is not complete yet. Remaining work includes:

- broaden Cameroon payroll statutory formulas beyond the current CNPS slice;
- add IRPP/income tax, taxable base, allowances, benefits, employer liabilities, leave/overtime, YTD, retro corrections, and rounding fixtures after expert review;
- pin payroll calculation outputs to golden statutory fixtures;
- add correction-run rules for retro salary changes, attendance corrections, statutory updates, and closed periods;
- expand register proof to include every statutory component once formulas are implemented.

## Next Recommended Slice

Implement payroll calculation golden tests that assert current CNPS output against the enforced country-pack fixture set, then extend the country-pack schema and fixtures only for statutory inputs that have expert-reviewed or regulator-confirmed provenance.

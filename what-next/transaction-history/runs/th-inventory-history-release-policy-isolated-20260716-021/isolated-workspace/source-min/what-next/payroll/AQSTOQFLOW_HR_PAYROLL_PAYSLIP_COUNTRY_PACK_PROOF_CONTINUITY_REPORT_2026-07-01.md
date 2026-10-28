# AqStoqFlow HR/Payroll Payslip Country-Pack Proof Continuity Report - 2026-07-01

## Decision

Status: PASS for this execution slice.

This slice extends the payroll calculation/register country-pack proof chain into payslip self-service and payslip archive/export evidence. It does not claim full unrestricted HR/payroll production readiness; it closes a downstream evidence-continuity gap for payslip consumers.

## Implemented Scope

- Payslip self-service now reads the payroll run-line `calculationSnapshot` for emitted payslips.
- Added `PayrollPayslipCountryPackLineProof` to the payslip read model.
- Payslip proof now exposes line-level country-pack provenance status, issues, country-pack identity, statutory scenario coverage hash/status, review evidence hashes, legal refs, rounding/YTD policy hashes, stored provenance hash, and recomputed hash.
- Payslip proof marks missing line provenance as `MISSING` and mismatched line provenance as `MISMATCH` instead of silently trusting the payslip.
- Payslip archive manifest advanced to version 2 and now includes `countryPackLineProof`, so export/document hashes change when source country-pack proof changes.
- Payslip JSON archive export now includes the country-pack line proof in the payload.
- Added tests for matched line proof, missing proof visibility, and export payload proof continuity.

## Changed Files

- `services/payroll/payslip-self-service.service.ts`
- `services/payroll/__tests__/payroll-payslip-self-service.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md` refreshed by policy gate
- `what-next/payroll/payroll-immutability-runtime-check.json` refreshed by policy gate

## Validation Evidence

- `npx jest services/payroll/__tests__/payroll-payslip-self-service.service.test.ts --runInBand` - 5 tests passed.
- `npx jest services/payroll/__tests__/payroll-payslip-self-service.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts --runInBand` - 3 suites passed, 40 tests passed.
- `npm run regulatory:hardcode:fail` - pass, active findings 0.
- `npm run prisma:validate` - schema valid.
- `npm run service:boundary:fail` - active service-boundary violations 0.
- `npm run typecheck` - pass.
- `npm run policy:gates` - pass.

## Production Impact

Employee self-service and payslip archive/export evidence can now prove that a payslip is tied to the same line-level country-pack provenance used by payroll calculation and register certification. Missing or inconsistent source proof is visible in the payslip proof payload instead of being hidden behind a document hash.

## Remaining Roadmap Work

- Propagate the same line/register country-pack proof into declaration payload proof and lifecycle evidence.
- Surface proof status in operator payslip proof drawers and command-center exception counts where appropriate.
- Keep legal-owner country-pack approval breadth and controlled pilot reconciliation as hard blockers for unrestricted production rollout.
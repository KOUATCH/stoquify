# AqStoqFlow HR/Payroll Line Country-Pack Provenance Register Gate Report - 2026-07-01

## Decision

Status: PASS for this execution slice.

This slice hardens the payroll calculation/register truth path by making country-pack provenance line-level, hashed, register-visible, and readiness-blocking. It does not claim full HR/payroll production readiness by itself; it closes a prerequisite evidence gap for downstream payslips, declarations, ledger close, BI, and operator proof drawers.

## Implemented Scope

- Added `countryPackProvenance` and `countryPackProvenanceHash` to payroll run-line `calculationSnapshot` at calculation time.
- The provenance envelope includes country code, pack version, schema version, capability status, country-pack resolution hash, statutory scenario coverage hash/status, review evidence source hashes, legal refs, rounding policy hash, and YTD policy hash.
- Added `PayrollRegisterCountryPackProof` to the register row proof model.
- Register rows now certify line country-pack provenance against the payroll run country-pack fields and run statutory scenario coverage proof.
- Register readiness now blocks missing or mismatched line country-pack proof with:
  - `PAYROLL_REGISTER_COUNTRY_PACK_PROOF_MISSING`
  - `PAYROLL_REGISTER_COUNTRY_PACK_PROOF_MISMATCH`
- Register hash version advanced to include country-pack provenance hashes and country-pack proof statuses.
- Added focused tests for matched country-pack proof and missing line provenance blocking.

## Changed Files

- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-register.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/payroll/__tests__/payroll-register.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md` refreshed by policy gate
- `what-next/payroll/payroll-immutability-runtime-check.json` refreshed by policy gate

## Validation Evidence

- `npx jest services/payroll/__tests__/payroll-register.service.test.ts --runInBand` - 11 tests passed.
- `npx jest services/payroll/__tests__/payroll-control.service.test.ts --runInBand` - 24 tests passed.
- Broader payroll statutory/register/declaration readiness cluster - 9 suites passed, 90 tests passed.
- `npm run regulatory:hardcode:fail` - pass, active findings 0.
- `npm run prisma:validate` - schema valid.
- `npm run service:boundary:fail` - active service-boundary violations 0.
- `npm run typecheck` - pass.
- `npm run policy:gates` - pass.

## Production Impact

The payroll register can now prove not only that line amounts tie out, but that each line was calculated from the same reviewed country-pack and statutory scenario coverage evidence as the run. This strengthens the financial backbone because declarations, payments, accounting postings, close assurance, and BI consumers can reject payroll facts whose calculation source is missing, stale, or inconsistent.

## Remaining Roadmap Work

- Continue statutory country-pack breadth and legal-owner approval closure for all required payroll families.
- Propagate this line-level country-pack proof into payslip proof drawers, declaration payload proof, and close/data-trust summaries where not already consumed.
- Keep operator routes service-backed and proof-backed only after calculation/register truth remains green.
- Run authenticated browser smoke and controlled pilot cycle reconciliation before any unrestricted production rollout claim.
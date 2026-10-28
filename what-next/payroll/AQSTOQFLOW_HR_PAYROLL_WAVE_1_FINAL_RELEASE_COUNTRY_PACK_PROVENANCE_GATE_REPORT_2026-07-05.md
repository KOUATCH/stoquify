# AqStoqFlow HR/Payroll Wave 1 Final Release Country-Pack Provenance Gate Report - 2026-07-05

## Decision

Status: READY FOR NEXT SLICE, NOT FULL PRODUCTION READY.

This slice hardens the final-release readiness pack so country-pack legal-owner approval and statutory setup coverage must point to the same payroll jurisdiction and country-pack version before full-production approval can pass.

## Scope Completed

- Added final-release evidence fields for approved country code, proposed pack version, proposed pack hash, setup statutory country code, and setup statutory pack version.
- Added blocker `FINAL_STATUTORY_COUNTRY_PACK_PROVENANCE_MISSING` when ready statutory setup evidence lacks country/version provenance.
- Added blocker `FINAL_STATUTORY_COUNTRY_PACK_COUNTRY_MISMATCH` when legal-owner approval and setup statutory coverage reference different jurisdictions.
- Added blocker `FINAL_STATUTORY_COUNTRY_PACK_VERSION_MISMATCH` when legal-owner approval and setup statutory coverage reference different country-pack versions.
- Added country-pack review intake blockers for approved certificates missing country or reviewed pack version.
- Made final-release route-smoke evidence selection deterministic by selecting candidate JSON by `checkedAt` before filesystem timestamp.
- Added focused final-release tests for country mismatch, pack-version mismatch, route-smoke latest evidence selection, and redacted evidence propagation.

## Files Changed

- `services/payroll/payroll-final-release-readiness.service.ts`
- `services/payroll/__tests__/payroll-final-release-readiness.service.test.ts`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_WAVE_1_FINAL_RELEASE_COUNTRY_PACK_PROVENANCE_GATE_REPORT_2026-07-05.md`

## Validation

Passed:

- `npm test -- services/payroll/__tests__/payroll-final-release-readiness.service.test.ts --runInBand` - 18 tests
- `npm run typecheck`
- `npm run regulatory:hardcode:fail`
- `npm run service:boundary:fail`
- `npm run prisma:validate`
- `git diff --check -- services/payroll/payroll-final-release-readiness.service.ts services/payroll/__tests__/payroll-final-release-readiness.service.test.ts`

Notes:

- The scoped diff check reported a line-ending normalization warning for the final-release test file only; no whitespace errors were reported.
- No statutory legal values were added. The gate only compares approved provenance already present in service-owned evidence.

## Production Readiness Impact

This closes a release-pack provenance gap: final production approval can no longer pass when country-pack legal approval certifies one country/version while statutory scenario coverage proves another.

Full HR/payroll production readiness is still not claimed. Remaining blockers still include reviewed statutory country-pack breadth for target jurisdictions, real authority/payment adapter credentials and receipts, production migration/backfill signoff, a clean controlled pilot cycle, and accounting/security/operations approval.

## Next Recommended Slice

Continue with payroll run lifecycle and retro-correction hardening against multi-period production histories, then return to statutory jurisdiction expansion only when reviewed country-pack formulas and fixtures are available.

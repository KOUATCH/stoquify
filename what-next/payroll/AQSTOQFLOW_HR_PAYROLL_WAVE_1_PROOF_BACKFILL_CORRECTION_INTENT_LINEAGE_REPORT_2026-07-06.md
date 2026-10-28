# AqStoqFlow HR/Payroll Wave 1 Proof-Backfill Correction Intent Lineage Report - 2026-07-06

## Decision

Status: READY FOR NEXT SLICE, NOT FULL PRODUCTION READY.

This slice hardens multi-period correction safety in the proof-backfill path. A proof-backfill execution certificate can no longer claim correction intents using only a count; each intent now carries redacted payroll period lineage, dry-run evidence linkage, and an immutable no-mutation policy. Reconciliation blocks source certificates that omit or corrupt that lineage.

## Scope Completed

- Added correction-intent lineage fields:
  - `countryCode`
  - `periodStart`
  - `periodEnd`
  - `payDate`
  - `proofBackfillEvidenceRef`
  - `dryRunEvidenceHash`
  - `periodLineageHash`
- Bound every generated proof-backfill correction intent to the dry-run evidence hash and proof-backfill evidence reference.
- Added reconciliation validation blockers:
  - `SOURCE_CORRECTION_INTENTS_MISSING`
  - `SOURCE_CORRECTION_INTENT_COUNT_MISMATCH`
  - `SOURCE_CORRECTION_INTENT_LINEAGE_MISSING`
  - `SOURCE_CORRECTION_INTENT_DRY_RUN_HASH_MISMATCH`
  - `SOURCE_CORRECTION_INTENT_MUTATION_POLICY_INVALID`
- Added redacted reconciliation evidence fields for correction intent lineage hash count and lineage hashes.
- Added focused tests proving generated intents include period lineage and reconciliation rejects missing lineage.

## Files Changed

- `services/payroll/payroll-proof-backfill-executor.service.ts`
- `services/payroll/payroll-proof-backfill-reconciliation.service.ts`
- `services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts`
- `services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_WAVE_1_PROOF_BACKFILL_CORRECTION_INTENT_LINEAGE_REPORT_2026-07-06.md`

## Validation

Passed:

- `npm test -- services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts --runInBand` - 15 tests
- `npm run typecheck`
- `npm run regulatory:hardcode:fail`
- `npm run service:boundary:fail`
- `npm run prisma:validate`
- `git diff --check -- services/payroll/payroll-proof-backfill-executor.service.ts services/payroll/payroll-proof-backfill-reconciliation.service.ts services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts`

Notes:

- The scoped diff check reported line-ending normalization warnings only; no whitespace errors were reported.
- No statutory legal values, provider payloads, authority payloads, person data, salary data, or payment destination data were added to correction intents.

## Production Readiness Impact

This closes one multi-period correction proof gap: proof-backfill reconciliation can now distinguish a real, period-linked correction intent from a count-only certificate. This supports safer retro-correction and YTD proof handling before pilot certification and close recheck.

Full HR/payroll production readiness is still not claimed. Remaining blockers include statutory country-pack breadth for target jurisdictions, live authority/payment adapter credentials and receipts, production migration/backfill signoff, one clean controlled pilot cycle, full operator route/browser validation, and accounting/security/operations approval.

## Next Recommended Slice

Continue with payment/declaration adapter certification or production migration/backfill signoff, because the correction lineage and statutory proof-chain surfaces are now better positioned for downstream pilot-cycle certification.

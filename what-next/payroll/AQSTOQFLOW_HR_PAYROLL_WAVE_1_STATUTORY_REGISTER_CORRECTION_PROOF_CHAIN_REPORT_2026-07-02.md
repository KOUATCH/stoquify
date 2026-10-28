# AqStoqFlow HR/Payroll Wave 1 - Statutory Register Correction Proof Chain Report

Date: 2026-07-02
Decision: Completed for this slice
Scope: Service-owned statutory review evidence continuity across setup readiness, payroll register proof, proof-backfill blocker evidence, correction/recalculation lifecycle proof, and final-release readiness.

## What Changed

- Added a shared statutory reviewed proof-chain contract that carries the coverage hash, review evidence source hashes, downstream register/declaration/payment proof gap counts, correction intent count, and blocker codes.
- Surfaced the reviewed proof chain in setup readiness under `checks.countryPack.calculationFixtures.reviewedProofChain`.
- Extended proof-backfill reconciliation certificates so setup statutory coverage includes the reviewed proof chain and preserves source correction intent evidence.
- Extended final-release readiness so the statutory setup gate and `evidence.proofBackfill` expose the reviewed proof chain and block with `FINAL_STATUTORY_REVIEWED_PROOF_CHAIN_BLOCKED` when it is absent or broken.
- Hardened payroll register proof so line country-pack provenance must carry the same statutory review evidence source hashes as the register coverage proof.
- Bound statutory review evidence source hashes and correction proof identifiers into the immutable payroll register hash and correction run lifecycle proof.
- Added proof-chain identifiers to seed/backfill blocker evidence so setup readiness, final-release readiness, and blocker evidence point at the same reviewed chain.

## Files Touched

- `services/payroll/payroll-statutory-scenario-coverage.service.ts`
- `services/payroll/payroll-setup-readiness.service.ts`
- `services/payroll/payroll-seed-backfill-plan.service.ts`
- `services/payroll/payroll-proof-backfill-reconciliation.service.ts`
- `services/payroll/payroll-final-release-readiness.service.ts`
- `services/payroll/payroll-register.service.ts`
- `services/payroll/payroll-control.service.ts`
- Focused tests in setup readiness, payroll register, proof-backfill reconciliation, and final-release readiness.

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts services/payroll/__tests__/payroll-final-release-readiness.service.test.ts --runInBand`
  - 4 suites passed, 37 tests passed.
- `npm run service:boundary:fail`
  - Pass, 0 active service-boundary violations.
- `npm run regulatory:hardcode:fail`
  - Pass, 0 active findings.
- `npm run policy:gates`
  - Pass, including inventory boundary, service boundary, workflow assurance, payroll immutability runtime, hard-delete, regulatory hardcode, demo trust, and raw-error boundary gates.
- `git diff --check -- <focused payroll files>`
  - Pass.

Attempted but blocked by generated-type state:

- `npm run typecheck`
  - Failed before checking this slice because `tsconfig.json` includes missing `.next/types/app/[locale]/(dashboard)/dashboard/...` generated route files.

## Readiness Position

This closes the requested Wave 1 statutory continuity slice: reviewed statutory scenario evidence now flows through setup readiness, locked register proof, correction/recalculation lifecycle proof, blocker evidence, and final-release readiness as one service-owned proof chain. Full production readiness still depends on the remaining Wave 1 statutory breadth, adapter, pilot, and operational signoff work tracked by the existing payroll roadmap reports.
# AqStoqFlow HR/Payroll Wave 1 Composite Register Proof Read Model Report

Date: 2026-07-02
Skill used: aqstoqflow-payroll-kernel-hardener
Phase: Phase 0 payroll kernel hardening
Executable slice: composite payroll register proof propagation in the register read model

## Scope

This slice makes composite payroll register proof explicit in the service-owned payroll register read model. It does not mutate posted payroll artifacts, add statutory constants, or change schema. The proof is derived from existing immutable payroll run, run-line, payslip, payment, declaration, ledger, country-pack, statutory review, and close evidence.

## Changes Made

- Added `PayrollRegisterCompositeRegisterProof` to `services/payroll/payroll-register.service.ts`.
- Added `tieOut.compositeRegister` to the payroll register read model.
- Built a composite proof hash from component evidence hashes, country-pack proof hashes, component mapping hash, statutory scenario coverage hash, review evidence hashes, payment evidence hashes, declaration payload hashes, source links, and tie-out statuses.
- Included the composite proof hash in the payroll register hash payload and bumped the register hash payload version to 9.
- Added fail-closed aggregate blockers:
  - `PAYROLL_REGISTER_COMPOSITE_PROOF_MISSING`
  - `PAYROLL_REGISTER_COMPOSITE_PROOF_MISMATCH`
- Added focused register tests for a matched composite proof and a missing component-proof composite failure.

## Verification

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-register.service.test.ts --runInBand`
- `npm run typecheck`
- `npm run lint -- --quiet` with 0 errors and 4 existing warnings
- `npm run prisma:validate`
- `npm run regulatory:hardcode:fail`
- `npm run policy:gates`
- `git diff --check -- services/payroll/payroll-register.service.ts services/payroll/__tests__/payroll-register.service.test.ts` with no whitespace errors

## Gates Blocked

None for this slice.

## Residual Risk

The composite proof is now exposed and hashed by the register read model, but downstream declaration/payment/accounting persistence still needs to consistently store and propagate this exact proof hash where provider settlement, statutory declaration, and close certification consume register evidence.

## Next Recommended Slice

Propagate `tieOut.compositeRegister.proofHash` into declaration preparation, payment release/settlement metadata, and accounting data-trust checks so every downstream payroll fact can prove it came from the same composite register truth.
# AqStoqFlow HR/Payroll Wave 1 IRPP Capability Readiness Report

Date: 2026-06-27

## Decision

Wave 1 now carries an explicit Cameroon IRPP income-tax capability boundary. The system no longer treats missing income-tax rules as an invisible gap during setup readiness.

This does not make full payroll production-ready. It makes the blocker first-class, tenant-visible, evidence-backed, and release-gate friendly.

## Completed Scope

- Added `payroll.irpp` to the Cameroon country-pack capability matrix as `REQUIRES_EXPERT_REVIEW`.
- Added an effective-dated `payroll.irpp.incomeTaxRules` parameter that records the production blocker without inventing legal rates or formulas.
- Added a golden fixture for the IRPP blocker value so the gap declaration itself is pinned to the active country-pack version.
- Expanded payroll setup readiness to require the IRPP country-pack path in addition to the current CNPS paths.
- Added readiness evidence so unsupported or review-required IRPP rules block full payroll setup readiness with the exact parameter path and capability status.

## Evidence

Commands run:

```powershell
npm test -- --runTestsByPath services/regulatory/__tests__/country-pack.service.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts --runInBand
npm run regulatory:hardcode:fail
npm run typecheck
```

Results:

- Regulatory, setup-readiness, and payroll-control suites passed: 3 suites, 28 tests.
- Regulatory hardcode gate passed with 0 active findings.
- Typecheck completed without errors.

## Files Advanced

- `services/regulatory/country-packs/cameroon.ts`
- `services/regulatory/__tests__/country-pack.service.test.ts`
- `services/payroll/payroll-setup-readiness.service.ts`
- `services/payroll/__tests__/payroll-setup-readiness.service.test.ts`

## Residual Production Blockers

- Reviewed IRPP brackets, bases, exemptions, caps, dependent treatment, rounding, monthly withholding, annual regularization, and correction fixtures are still missing.
- Payroll calculation still only computes the implemented CNPS proof slice; income-tax withholding is explicitly blocked for full readiness.
- Accounting mappings for income-tax payable and declaration payload mappings must be completed after reviewed IRPP rules exist.

## Next Slice

Build the generic country-pack-driven payroll tax rule evaluator and keep it disabled for Cameroon until reviewed IRPP fixtures are loaded. Then add golden calculation fixtures for taxable base, tax withheld, net pay, declaration liability, and ledger posting tie-out.

# AqStoqFlow HR/Payroll Wave 1 Composite Register Tie-Out Release Binding Report

Date: 2026-07-02
Skill used: aqstoqflow-payroll-country-pack-engine
Roadmap area: statutory country-pack breadth and payroll engine hardening
Decision: release readiness is now blocked unless composite payroll register tie-out coverage is present in statutory setup proof.

## Scope

This slice binds the composite payroll register tie-out fixture into full-production statutory readiness and final release approval. The goal was to prevent stale or narrow statutory evidence from passing full production gates when register-level payroll truth is not proven.

## Changes Made

- Added `COMPOSITE_REGISTER_TIE_OUT` as a required full-production statutory scenario family in `services/payroll/payroll-statutory-scenario-coverage.service.ts`.
- Required the `payroll.composite.registerTieOut` country-pack capability, parameter path, and `PAYROLL_COMPOSITE_REGISTER_TIE_OUT` reviewed fixture purpose for full statutory coverage.
- Updated statutory coverage tests from 9 required families / 12 executable scenarios to 10 required families / 13 executable scenarios.
- Added statutory coverage tests proving the composite family is READY when the reviewed fixture exists and BLOCKED when it is missing.
- Added an explicit final-release blocker: `FINAL_STATUTORY_COMPOSITE_REGISTER_TIEOUT_MISSING`.
- Added final-release evidence fields for required statutory ready families and missing required ready families.
- Updated the final-release happy-path fixture to certify all ten statutory families.
- Added a final-release stale-evidence regression test where setup proof claims READY but omits `COMPOSITE_REGISTER_TIE_OUT`; final approval now blocks.
- Updated command read-model and command-center blocked fixture denominators from `8/9` to `9/10` so UI evidence reflects the ten-family standard.

## Verification

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-final-release-readiness.service.test.ts --runInBand`
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-command-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx --runInBand`
- `npm run prisma:validate`
- `npm run regulatory:hardcode:fail`
- `npm run typecheck`
- `npm run lint -- --quiet` with 0 errors and 4 existing warnings
- `npm run policy:gates`
- `git diff --check -- <touched payroll files>` with no whitespace errors

## Residual Risk

This closes the release-gate gap for composite register tie-out evidence, but it does not complete all statutory country packs, live authority adapters, payment provider settlement proof, tenant migration/backfill, or full production certification. Those remain roadmap blockers for unrestricted rollout.

## Next Recommended Slice

Bind composite register tie-out proof deeper into actual payroll run/register generation: ensure each payroll run emits immutable component-to-register proof, register-to-ledger proof, declaration proof, payment clearing proof, and correction replay proof from the same country-pack-driven calculation surface.
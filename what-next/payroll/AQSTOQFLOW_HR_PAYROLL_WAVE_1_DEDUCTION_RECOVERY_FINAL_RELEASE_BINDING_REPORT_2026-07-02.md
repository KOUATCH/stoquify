# AqStoqFlow HR/Payroll Wave 1 - Deduction Recovery Final Release Binding Report

Date: 2026-07-02
Skill: aqstoqflow-payroll-kernel-hardener
Slice: Deduction/recovery statutory coverage binding into final-release readiness and payroll command read-model evidence.

## Decision

This slice is production-hardening work, not new statutory formula work. It does not add legal constants or hardcoded payroll law. It binds the existing reviewed statutory scenario family `DEDUCTIONS_RECOVERIES` into the final production release gate so full-production approval cannot pass unless deduction/recovery coverage is present in proof-backed setup statutory scenario evidence.

## What Changed

- Final release readiness now requires both required statutory families:
  - `DEDUCTIONS_RECOVERIES`
  - `COMPOSITE_REGISTER_TIE_OUT`
- Missing deduction/recovery readiness now raises critical blocker `FINAL_STATUTORY_DEDUCTION_RECOVERY_COVERAGE_MISSING`.
- Final-release statutory setup summary now exposes:
  - `requiredStatutoryReadyFamilies`
  - `requiredStatutoryReadyFamiliesPresent`
  - `missingRequiredStatutoryReadyFamilies`
- Proof-backfill evidence now carries `setupStatutoryScenarioMissingRequiredReadyFamilies` for downstream release, operator, and close-assurance consumers.
- Payroll command read-model final-release evidence now projects the required-family list, pass/fail boolean, and missing required families into `evidence.finalRelease.statutorySetup`.
- Tests now cover the missing deduction/recovery blocker and read-model propagation.

## Files Touched By This Slice

- `services/payroll/payroll-final-release-readiness.service.ts`
- `services/payroll/command-read-model.service.ts`
- `services/payroll/__tests__/payroll-final-release-readiness.service.test.ts`
- `services/payroll/__tests__/payroll-command-read-model.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md` and `.json` were refreshed by the policy gate.

Note: the worktree already contains other in-progress payroll wave changes and reports. This report covers only the deduction/recovery final-release binding slice.

## Verification

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-final-release-readiness.service.test.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts --runInBand`
  - 2 suites passed
  - 20 tests passed
- `npm run typecheck`
- `npm run regulatory:hardcode:fail`
  - active findings: 0
- `npm run prisma:validate`
- `npm run lint -- --quiet`
  - 0 errors
  - 4 pre-existing warnings remain in unrelated image/default-export files
- `npm run policy:gates`
  - inventory boundary: pass
  - service boundary: pass
  - workflow assurance runtime check: ready
  - payroll immutability runtime: ready
  - hard-delete gate: pass
  - regulatory hardcode gate: pass
  - demo/report trust gate: pass
  - raw error boundary gate: pass

## Assurance Notes

- Tenant/security posture is preserved because this slice only tightens final-release evidence evaluation and read-model projection; it does not introduce bypass writes or direct Prisma UI access.
- Statutory logic remains country-pack/proof driven. The blocker checks for the presence of reviewed scenario-family evidence, not embedded legal calculations.
- Final production approval is now stricter: a payroll system can no longer claim full readiness when deduction/recovery scenario coverage is absent but composite register tie-out is present.
- Operator and finance/BI consumers can now see which required statutory family is missing instead of receiving only a generic statutory setup block.

## Next Recommended Slice

Continue with `aqstoqflow-payroll-accounting-close`: bind deduction/recovery payroll components to ledger mappings, liability/clearing accounts, close blockers, and finance/BI facts so statutory payroll truth flows into accounting close without POS or sales owning payroll truth.
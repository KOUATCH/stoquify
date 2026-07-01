# AqStoqFlow HR/Payroll Wave 1 Effective-Dated Statutory Fixture Requirements Report

Date: 2026-06-30

## Decision

Implemented the next Phase 3 statutory hardening slice from the 2026-06-29 composite scenario gate report: production payroll country-pack support for effective-dated compensation and attendance inputs now requires reviewed executable fixtures with payslip/register tie-out outputs.

## Skill And Boundary

- Requested statutory hardening skill path was unavailable on disk.
- Applied closest installed workflow: `exam-014-aqstoqflow-payroll-statutory-hardener`.
- Cameroon IRPP remains disabled in the active pack: `payroll.irpp` stays `REQUIRES_EXPERT_REVIEW` unless reviewed production rules and required IRPP fixture provenance are added.

## Files Changed

- `services/regulatory/country-packs/validation.ts`
- `services/regulatory/__tests__/country-pack.service.test.ts`
- `services/payroll/payroll-country-pack-fixture-runner.ts`
- `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts`
- `services/payroll/payroll-setup-readiness.service.ts`
- `services/payroll/__tests__/payroll-setup-readiness.service.test.ts`

## Controls Added

- Country-pack publish validation now fails production compensation/attendance capability claims unless reviewed fixtures exist for:
  - taxable allowances;
  - benefits in kind;
  - paid leave effects;
  - unpaid leave effects;
  - overtime premium bases.
- Required fixtures must include effective period inputs and pinned payslip/register tie-out expected outputs.
- The executable fixture runner now validates tie-out output fields such as payslip line amount, register gross/taxable/social bases, leave paid/deduction amounts, overtime base/premium, and register net payable.
- Setup readiness now resolves allowance, benefit, leave, and overtime country-pack paths as required payroll statutory inputs.

## Verification

Passed:

- `npm test -- --runTestsByPath services/regulatory/__tests__/country-pack.service.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts --runInBand`
  - 4 suites passed, 41 tests passed.
- `npm run prisma:validate`
  - Passed.
- `npm run regulatory:hardcode:fail`
  - Passed.
- `git diff --check -- <focused files>`
  - Passed.

Blocked by unrelated existing worktree issue:

- `npm run typecheck`
  - Fails in `services/assurance/assurance-registry.service.ts` at lines 3048 and 3053: `Cannot find name 'now'.`

## Remaining Blockers

- Active Cameroon IRPP is still not production-enabled because reviewed IRPP formulas, provenance, and executable fixture coverage are not present.
- Active Cameroon compensation and attendance production formulas are still not added to the pack; this slice enforces the gate for future reviewed packs.

## Next Slice

Add legally reviewed Cameroon compensation and attendance pack values only when source provenance is available, then run the new fixture requirement gate plus payroll register tie-out proof against those reviewed values.
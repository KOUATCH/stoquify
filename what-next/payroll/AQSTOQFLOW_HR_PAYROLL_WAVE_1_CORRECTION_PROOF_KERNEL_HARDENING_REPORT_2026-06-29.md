# AqStoqFlow HR/Payroll Wave 1 - Correction Proof Kernel Hardening Report

Date: 2026-06-29
Selected skill: aqstoqflow-payroll-kernel-hardener
Selected phase/slice: Phase 0 correction-only mutation rules and immutable correction evidence
Decision: Slice complete and verified. Full HR/payroll roadmap remains in progress.

## Scope Implemented

- Hardened correction-run calculation so corrections fail closed unless the original run has immutable proof anchors:
  - original run document hash
  - original run evidence hash
  - original calculation hash
- Hardened correction employee scope so every corrected employee must have original run-line proof in the posted/paid original run.
- Added a second line-level guard requiring original run-line document hashes for every corrected employee.
- Added run-level `correctionEvidenceHash` creation for correction calculations. The hash pins:
  - original run id
  - original run document/evidence/calculation hashes
  - corrected payroll period id
  - corrected employee ids
  - correction line document hashes
  - calculation hash
  - rule-set hash
  - attendance snapshot hash
- Added `correctionEvidenceHash` to correction run metadata and the `payroll.run.calculated` business-event payload.
- Extended the shared correction metadata extractor so downstream posting, payslip, payment, declaration, and close proof consumers can propagate the same correction evidence hash.
- Added focused tests for missing original run proof and missing original line proof.
- Updated correction posting proof expectation to require propagated `correctionEvidenceHash`.

## Files Changed

- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md` (updated by `npm run policy:gates`)
- `what-next/payroll/payroll-immutability-runtime-check.json` (updated by `npm run policy:gates`)

## Verification Gates

- Passed: `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts --runInBand`
  - 1 suite passed
  - 22 tests passed
- Passed: `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand`
  - 3 suites passed
  - 44 tests passed
- Passed: `npm run typecheck`
- Passed: `npx eslint services/payroll/payroll-control.service.ts services/payroll/__tests__/payroll-control.service.test.ts actions/payroll/payroll-control.actions.ts actions/payroll/__tests__/payroll-control.actions.test.ts services/accounting/close-assurance-pack.service.ts services/accounting/__tests__/close-assurance-pack.service.test.ts`
- Passed: `npm run service:boundary:fail`
  - Active service-boundary violations: 0
- Passed: `npm run policy:gates`
  - inventory boundary: 0 active violations
  - service boundary: 0 active violations
  - workflow assurance runtime tables: ready
  - payroll immutability runtime: ready, 9/9 triggers present, 14/14 forbidden mutation checks blocked
  - hard-delete gate: 0 active unsafe findings
  - regulatory hardcode gate: 0 active findings
  - demo/report trust gate: 0 active findings
  - raw error boundary gate: 0 active unsafe findings
- Passed: `git diff --check -- services/payroll/payroll-control.service.ts services/payroll/__tests__/payroll-control.service.test.ts what-next/payroll/payroll-immutability-runtime-check.md what-next/payroll/payroll-immutability-runtime-check.json`
  - Git reported CRLF normalization warnings only for the standard immutability runtime artifacts.

## Security And Trust Result

- Correction runs now require immutable original proof before any recalculation work proceeds.
- Correction runs cannot silently compute a delta from zero when the corrected employee lacks original run-line proof.
- Correction proof now has a stable hash that propagates through shared correction metadata into downstream financial and compliance evidence.
- No posted payroll run, emitted payslip, released payment batch, submitted declaration, or archived evidence is mutated in place.
- No statutory values were added to application logic.
- PAYROLL_RUN_POSTED close invalidation remains covered by the verified payroll-control and close-assurance pack tests.

## Residual Risk

- This slice does not implement a full correction wizard or operator UX for choosing correction scopes.
- It does not add new statutory formula breadth or country-pack data.
- It does not certify multi-cycle pilot payroll completion.
- Full HR/payroll production readiness still depends on remaining statutory country-pack breadth, authenticated browser smoke, migration/backfill signoff, provider/authority production credentials, and full release certification.

## Worktree Notes

- The repo already contains many modified and untracked payroll files/reports. This slice preserves that state and works with the current files as authoritative.
- The diff stat for `services/payroll/payroll-control.service.ts` and its test is inflated by existing file state/formatting in already-modified files; the verified behavioral change is the correction proof guard and `correctionEvidenceHash` propagation.

## Next Recommended Slice

Continue with correction lifecycle operator/read-model surfacing for `correctionEvidenceHash`, or proceed to authenticated browser smoke for the implemented payroll operator and self-service routes.
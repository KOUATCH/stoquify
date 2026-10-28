# AqStoqFlow HR/Payroll Wave 1 - Final Release Statutory Evidence Continuity Report

Date: 2026-07-01
Selected skill: aqstoqflow-payroll-country-pack-engine
Secondary guardrail: aqstoqflow-payroll-kernel-hardener
Selected phase: Phase 3 country-pack/statutory hardening with Phase 0 release-gate safety
Executable slice: Carry hashed statutory scenario coverage evidence from proof-backfill setup readiness into proof-backfill reconciliation certificates and enforce it in the final release-readiness pack.

## Status

PASS for this execution slice.

This is not a full-production approval. It closes a final-release evidence gap: a proof-backfill reconciliation certificate can no longer satisfy final statutory setup readiness with only `setupGate.status = READY`. Final release readiness now requires a compact statutory scenario coverage status, coverage hash, ready/required family counts, blocker codes, and review-evidence hash counts.

## What Changed

1. Proof-backfill reconciliation certificates now include compact statutory scenario coverage evidence.
   - `services/payroll/payroll-proof-backfill-reconciliation.service.ts:39` adds `PayrollProofBackfillStatutoryScenarioSetupGate`.
   - `services/payroll/payroll-proof-backfill-reconciliation.service.ts:190` builds a compact snapshot from setup readiness scenario coverage.
   - `services/payroll/payroll-proof-backfill-reconciliation.service.ts:566` writes the statutory scenario coverage snapshot into `setupGate.statutoryScenarioCoverage`.
   - `services/payroll/payroll-proof-backfill-reconciliation.service.ts:672` includes the statutory scenario coverage section in the formatted certificate.

2. Final release readiness now consumes and enforces that statutory evidence.
   - `services/payroll/payroll-final-release-readiness.service.ts:112` adds statutory scenario coverage fields to release evidence.
   - `services/payroll/payroll-final-release-readiness.service.ts:316` extracts coverage status/hash/family counts/review evidence from the latest proof-backfill reconciliation audit.
   - `services/payroll/payroll-final-release-readiness.service.ts:622` blocks final release when statutory scenario coverage is missing or not ready.
   - `services/payroll/payroll-final-release-readiness.service.ts:632` blocks final release when the statutory scenario coverage hash is missing.
   - `services/payroll/payroll-final-release-readiness.service.ts:643` blocks final release when review evidence hashes are incomplete.
   - `services/payroll/payroll-final-release-readiness.service.ts:806` uses the statutory scenario coverage hash as the statutory setup gate evidence hash.
   - `services/payroll/payroll-final-release-readiness.service.ts:935` includes statutory scenario evidence in the final readiness pack body.

3. Tests now prove both producer and consumer behavior.
   - `services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts:437` asserts the reconciliation certificate carries READY statutory scenario coverage and a hash.
   - `services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts:492` asserts persisted audit payloads include the statutory scenario coverage proof.
   - `services/payroll/__tests__/payroll-final-release-readiness.service.test.ts:236` asserts a passing final pack uses the statutory coverage hash for the statutory setup gate.
   - `services/payroll/__tests__/payroll-final-release-readiness.service.test.ts:331` asserts final approval is blocked when proof-backfill setup evidence lacks usable statutory scenario coverage proof.

## Why This Matters

The full-production roadmap requires expert-reviewed or regulator-confirmed statutory country-pack formulas and executable golden fixtures before production statutory payroll claims. Before this slice, final release readiness could only see the proof-backfill setup status and blocker count. That was too indirect for a production gate: an old or weak proof-backfill certificate could look setup-ready without carrying the statutory family coverage and review-evidence trail.

After this slice, final release readiness is tied to the same statutory scenario coverage contract used by setup readiness and register proof. This preserves the no-hardcoded-legal-logic rule and strengthens the final go/no-go gate without inventing any Cameroon IRPP or other statutory values.

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts services/payroll/__tests__/payroll-final-release-readiness.service.test.ts --runInBand`
  - Result: 2 suites passed, 11 tests passed.
- `npx jest services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts services/payroll/__tests__/payroll-pilot-cycle-certification.service.test.ts services/payroll/__tests__/payroll-final-release-readiness.service.test.ts --runInBand`
  - Result: 5 suites passed, 35 tests passed.
- `npm run typecheck`
  - Result: passed.
- `npm run service:boundary:fail`
  - Result: passed, 0 active service-boundary violations.
- `npm run regulatory:hardcode:fail`
  - Result: passed, 0 active findings.
- `npm run policy:gates`
  - Result: passed, including payroll immutability runtime.
- `npm run prisma:validate`
  - Result: passed.
- `git diff --check -- services/payroll/payroll-proof-backfill-reconciliation.service.ts services/payroll/payroll-final-release-readiness.service.ts services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts services/payroll/__tests__/payroll-final-release-readiness.service.test.ts`
  - Result: passed.

## Residual Risks

- This does not provide real new statutory legal formulas. Full production remains blocked until the launch jurisdiction's country-pack formulas, fixtures, legal references, and golden outputs are actually reviewed or regulator-confirmed.
- Old proof-backfill reconciliation audit rows without `setupGate.statutoryScenarioCoverage` will now block final release readiness until regenerated from the hardened service path.
- Browser/accessibility, provider/authority automation, tenant migration signoff, and clean pilot-cycle reconciliation are still required for unrestricted rollout.

## Next Recommended Slice

Continue Wave 1 by expanding the final release pack and command center to render this statutory setup gate as a read-only proof drawer/card for release reviewers, or continue deeper country-pack work when expert-reviewed Cameroon IRPP/allowance/benefit/leave/overtime inputs are available. Do not enable new statutory calculations without reviewed country-pack data and executable golden outputs.
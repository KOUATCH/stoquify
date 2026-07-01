# AqStoqFlow HR/Payroll Country-Pack Fixture Provenance Ingestion Report

Date: 2026-07-01
Scope: HR/payroll full-production roadmap, statutory country-pack breadth and payroll engine hardening slice.
Decision: READY for the next controlled rollout slice, not a full HR/payroll production approval by itself.

## Objective

Bind country-pack legal-owner approval to executable statutory fixture provenance so final release readiness can prove that a proposed production country pack is not only approved, but also reconciled to reviewed golden fixtures and canonical fixture-run output hashes.

This advances the full HR/payroll roadmap blocker around statutory country-pack breadth and payroll engine hardening without hardcoding legal formulas into runtime services.

## Implemented

1. Country-pack review intake now emits per-fixture provenance evidence for each certified target family.
   - Fixture id, parameter path, purpose, fixture date, expected pack version, expected legal reference.
   - Expert review status, reviewer, review date, legal reference, and source evidence hash.
   - Expected output hash, actual output hash, proposed pack hash, computed proposed pack hash.
   - A canonical fixture evidence hash for downstream legal-owner approval and release gates.

2. Country-pack review intake now blocks READY target families when executable fixture provenance is missing.
   - New blocker: PAYROLL_COUNTRY_PACK_FAMILY_FIXTURE_PROVENANCE_MISSING.
   - A target family cannot become READY_FOR_LEGAL_OWNER_SIGNOFF unless its reviewed fixtures have executable provenance.

3. Legal-owner approval now preserves fixture and legal review evidence hashes.
   - Approval sourceCertificate carries targetFamilies, reviewEvidenceSourceHashes, and fixtureEvidenceHashes.
   - Approval creation rejects certificates missing target families, legal review source hashes, or fixture evidence hashes.

4. Final release readiness now consumes and enforces the provenance contract.
   - Evidence pack includes reviewEvidenceSourceHashCount, fixtureEvidenceHashCount, reviewEvidenceSourceHashes, and fixtureEvidenceHashes.
   - New blocker: FINAL_COUNTRY_PACK_REVIEW_INTAKE_FIXTURE_PROVENANCE_MISSING.
   - Older/incomplete legal-owner approvals cannot pass the country_pack_review_intake gate if they lack the proof hashes.

5. Tests now cover the new production evidence path.
   - Intake ready certificate asserts fixture provenance envelope and hashes.
   - Approval persistence asserts proof hashes are carried forward.
   - Approval persistence rejects missing fixture provenance.
   - Final release blocks approved country-pack evidence that lacks fixture provenance hashes.

## Files Changed

- services/payroll/payroll-country-pack-review-intake.service.ts
- services/payroll/payroll-country-pack-review-intake-persistence.service.ts
- services/payroll/payroll-final-release-readiness.service.ts
- services/payroll/__tests__/payroll-country-pack-review-intake.service.test.ts
- services/payroll/__tests__/payroll-country-pack-review-intake-persistence.service.test.ts
- services/payroll/__tests__/payroll-final-release-readiness.service.test.ts
- what-next/payroll/payroll-immutability-runtime-check.md
- what-next/payroll/payroll-immutability-runtime-check.json

## Verification

Passed:

- npx jest services/payroll/__tests__/payroll-country-pack-review-intake.service.test.ts services/payroll/__tests__/payroll-country-pack-review-intake-persistence.service.test.ts services/payroll/__tests__/payroll-final-release-readiness.service.test.ts --runInBand
  - 3 suites passed, 17 tests passed.

- npx jest services/payroll/__tests__/payroll-country-pack-review-intake.service.test.ts services/payroll/__tests__/payroll-country-pack-review-intake-persistence.service.test.ts services/payroll/__tests__/payroll-final-release-readiness.service.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand
  - 8 suites passed, 72 tests passed.

- npm run typecheck
  - TypeScript clean.

- npm run prisma:validate
  - Prisma schema valid.

- npm run regulatory:hardcode:fail
  - Status pass, active findings 0.

- npm run service:boundary:fail
  - Active service-boundary violations 0.

- npm run policy:gates
  - Inventory boundary pass.
  - Service boundary pass.
  - Workflow assurance runtime check ready.
  - Payroll immutability runtime ready, required triggers 9/9, blocked mutations 14/14, allowed lifecycle checks 3/3.
  - Hard-delete gate pass.
  - Regulatory hardcode gate pass.
  - Demo/report trust gate pass.
  - Raw error boundary gate pass.

## Security And Trust Impact

- Tenant/legal approval evidence becomes less spoofable because final release no longer trusts a bare approval hash alone.
- Statutory release gates now require a chain from reviewed legal topic evidence to executable golden fixture evidence to final release readiness.
- Raw legal documents, employee data, salary data, payment destinations, provider payloads, and authority payloads remain excluded from the evidence pack.
- No production statutory formula values were introduced in services; runtime statutory values remain country-pack/config driven.

## Remaining Work

This slice does not complete full HR/payroll production readiness. The broader roadmap still needs:

- More reviewed statutory country-pack families and jurisdictions.
- Real authority declaration/payment adapter payload mappings and rejection/amendment lifecycles.
- Operator payroll routes fully backed by service-owned proof drawers and fresh-auth actions.
- Tenant-by-tenant production migration/backfill dry runs and reconciliation signoff.
- One controlled pilot payroll cycle reconciled cleanly across payroll, accounting, declarations, payments, and close assurance.

## Next Recommended Slice

Continue with statutory breadth by expanding reviewed country-pack family coverage beyond IRPP_PERIOD, using the same provenance contract introduced here: reviewed legal topics, executable golden fixtures, fixture-run output hashes, legal-owner approval hashes, and final-release evidence binding.
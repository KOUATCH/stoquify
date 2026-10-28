# AqStoqFlow Cameroon Country Pack Source Hash Binding Report - 2026-08-01

## Selected skill

- `006-aqstoqflow-country-pack-factory`

## Objective

Clear the Cameroon statutory country pack blocker that was caused by symbolic source evidence hashes, while preserving the required report-only/draft status until qualified expert approval and independent checker evidence are complete.

## Work completed

- Bound Cameroon CNPS runtime country-pack review evidence to a real retained source artifact hash.
- Kept the Cameroon CNPS runtime authority status in draft/source-checked mode.
- Updated the Cameroon evidence manifest non-claims so the pack clearly separates source capture/hash binding from qualified legal approval.
- Fixed an adjacent generated-report write blocker in the offline POS fiscal replay gate by reusing the existing generated report writer helper.
- Refreshed the statutory country-pack and offline POS fiscal replay generated readiness reports.

## Files changed

- `services/regulatory/country-packs/cameroon.ts`
- `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/manifest.json`
- `scripts/offline-pos-fiscal-replay-gate.js`
- `what-next/statutory-country-pack-production-readiness.md`
- `what-next/statutory-country-pack-production-readiness.json`
- `what-next/statutory-country-pack-review-preflight.md`
- `what-next/statutory-country-pack-review-preflight.json`
- `what-next/offline-pos-fiscal-replay-readiness.md`
- `what-next/offline-pos-fiscal-replay-readiness.json`

## Source evidence now bound

- CNPS pack source evidence hashes declared: `7/7`
- CNPS pack source evidence hashes valid: `7/7`
- CNPS pack source evidence hashes bound to retained artifacts: `7/7`
- Bound retained artifact hash:
  - `sha256:1e88f488d96e163ded9e204c100c5bbce9e8d4917e6e72387ec6af52e0c90b61`
  - Artifact: `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/source-artifacts/CNPS-Decree-2016-072-contribution-rates.pdf`

## Approval status intentionally unchanged

- Manifest review status: `PENDING_EXPERT_REVIEW`
- Manifest production use allowed: `false`
- Runtime CNPS capability status: `SUPPORTED_DRAFT`
- Runtime CNPS verification status: `SOURCE_CHECKED`
- Approval artifact verified: `false`
- Qualified expert approval complete: `false`
- Runtime CNPS authority binding promoted: `false`

This pass does not fabricate legal, tax, payroll, social-security, fiscal authority, expert approval, or signature evidence.

## Verification commands and results

- `npm test -- scripts/__tests__/statutory-country-pack-production-gate.test.js --runInBand`
  - Passed: 1 suite, 7 tests.
- `node scripts/statutory-country-pack-review-package.js verify-sources`
  - Passed with `SOURCE_BYTES_VERIFIED`.
- `npm run statutory:country-pack:gate`
  - Expected blocked result: `11/12` checks ready.
  - Remaining blocker: `source_artifact_expert_approval`.
- `node scripts/statutory-country-pack-review-package.js fixture-hashes --workbook docs\HR-Payroll\evidence\country-packs\CM\2026-07-19\review-package\fixture-review-workbook.template.json`
  - Expected blocked result: `BLOCKED_INCOMPLETE_INDEPENDENT_REVIEW`.
  - Incomplete fixture families:
    - `payroll.cnps.pensionRatesBps`
    - `payroll.cnps.familyAllowanceRatesBps`
    - `payroll.cnps.occupationalRiskRatesBps`
    - `payroll.cnps.employerRules`
- `node scripts/statutory-country-pack-review-package.js verify-signature --decision docs\HR-Payroll\evidence\country-packs\CM\2026-07-19\review-decision.template.json`
  - Expected blocked result: `BLOCKED_SIGNATURE_VERIFICATION`.
  - Blockers:
    - `signature_method_not_accepted`
    - `signed_artifact_metadata_invalid`
    - `checker_verification_not_verified`
    - `maker_checker_separation_invalid`
    - `checker_verification_metadata_incomplete`
    - `checker_conflict_declaration_missing`
    - `signature_evidence_metadata_invalid`
- `node scripts/statutory-country-pack-review-preflight.js --mode fail --decision docs\HR-Payroll\evidence\country-packs\CM\2026-07-19\review-decision.template.json --out what-next\statutory-country-pack-review-preflight.md --json-out what-next\statutory-country-pack-review-preflight.json`
  - Expected blocked result: `BLOCKED_PENDING_QUALIFIED_REVIEW: 4/12 conditions passed.`
- `node -c scripts\offline-pos-fiscal-replay-gate.js`
  - Passed.
- `npm test -- scripts/__tests__/offline-pos-fiscal-replay-gate.test.js --runInBand`
  - Passed: 1 suite, 3 tests.
- `npm run offline:pos:replay:gate`
  - Passed: `16/16` checks ready, `0` blockers.
- `npm run policy:gates`
  - Blocked at `statutory:country-pack:gate`, now only on `source_artifact_expert_approval`.
- `git diff --check -- <scoped changed files>`
  - Passed. Git reported CRLF-to-LF warnings for the updated manifest and offline POS gate script.

## Remaining country-pack blocker

The remaining blocker is not a code-writing issue. The Cameroon pack still needs qualified expert approval evidence and independent checker verification before it can be promoted from draft/source-checked status.

## Documents that need completion and signing

The signing/review packet is under:

- `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/review-package/`

The reviewer/checker should complete or produce these artifacts:

- `source-hash-verification.template.json`
- `reviewer-qualification-conflict.template.json`
- `fixture-review-workbook.template.json`
- `review-decision.return.template.json`, saved back as `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/review-decision.json`
- `review-decision.signed.pdf`
- `maker-checker-approval.json`
- `signature-verification-evidence-*.json`

## Next required action

1. A qualified Cameroon payroll/CNPS reviewer completes the review packet and signs the decision artifact.
2. An independent checker verifies the signature, source hashes, fixture judgments, conflict declaration, and maker/checker separation.
3. After those artifacts exist, update the Cameroon manifest approval fields and runtime authority status from draft/source-checked to the appropriate approved status.
4. Rerun:
   - `npm run statutory:country-pack:gate`
   - `npm run policy:gates`

## Recommended next numbered skill

- `007-aqstoqflow-pos-ledger-controls`


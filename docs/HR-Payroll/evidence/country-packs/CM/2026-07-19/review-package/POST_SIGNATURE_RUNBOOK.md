# Post-Signature Acceptance and Transition Runbook

## Phase 1 — Receive without altering production state

1. Place returned artifacts in the evidence directory using stable filenames.
2. Keep `manifest.json.reviewStatus` as `PENDING_EXPERT_REVIEW`.
3. Keep every `productionUseAllowed` value `false`.
4. Keep symbolic implementation hashes unchanged.

## Phase 2 — Independent checker acceptance

1. Authenticate reviewer identity, qualification, independence, and authority.
2. Verify the signed approval using `SIGNATURE_VERIFICATION_PROCEDURE.md`.
3. Recompute the signed artifact and verification-evidence SHA-256 digests.
4. Complete `maker-checker-approval.json`.
5. Complete `review-decision.json.signedApprovalArtifact.signatureVerification`.

6. Run the signature and maker-checker evidence validator:

```powershell
node scripts/statutory-country-pack-review-package.js verify-signature `
  --decision docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/review-decision.json
```

Required result:

`SIGNATURE_AND_CHECKER_EVIDENCE_VERIFIED`

## Phase 3 — Enforced preflight

Generate the four deterministic tie-out hashes from the completed independent workbook:

```powershell
node scripts/statutory-country-pack-review-package.js fixture-hashes `
  --workbook docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/review-package/fixture-review-workbook.json
```

Required result:

`TIE_OUT_HASHES_READY`

Copy the four resulting hashes into the matching `review-decision.json.fixtureFamilyDecisions` records, then run:

```powershell
node scripts/statutory-country-pack-review-preflight.js `
  --mode fail `
  --decision docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/review-decision.json `
  --out what-next/statutory-country-pack-review-preflight.md `
  --json-out what-next/statutory-country-pack-review-preflight.json
```

Required result:

`READY_FOR_AUTHORIZED_MANIFEST_TRANSITION: 12/12 conditions passed.`

Stop if the result is not 12/12.

## Phase 4 — Authorized transition

1. Update `manifest.json.requiredApproval` from the authenticated return.
2. Use `EXPERT_REVIEWED` unless actual regulator confirmation is retained.
3. Set production flags only when the signed decision explicitly permits production.
4. Replace the seven decree-backed symbolic hashes with:

`sha256:1e88f488d96e163ded9e204c100c5bbce9e8d4917e6e72387ec6af52e0c90b61`

5. In `services/regulatory/country-packs/cameroon.ts`, promote `CNPS_CAPABILITY_STATUS` from `SUPPORTED_DRAFT` to `SUPPORTED` or `SUPPORTED_CERTIFIED` only within the signed decision scope.
6. Promote `CNPS_VERIFICATION_STATUS` from `SOURCE_CHECKED` to `EXPERT_REVIEWED`. Use `REGULATOR_CONFIRMED` only when actual regulator confirmation of the interpretation or implementation is retained and checker-verified.
7. Record the reviewed change or pull-request reference as `statutory.runtimeAuthorityPromotionReference` in the enterprise external-evidence intake.
8. Recompute any dispatch manifest intended to bind the transitioned packet.
9. Obtain ordinary code review from a person other than the reviewer and checker where policy requires.

The production country-pack gate verifies this runtime authority binding together with the signed manifest. A signed artifact without the corresponding reviewed runtime promotion remains blocked.

## Phase 5 — Release verification

```powershell
npm run statutory:country-pack:gate
npm run policy:gates
npm run release:evidence:gate:release
```

Then rerun `017-aqstoqflow-enterprise-release-gate`.

Production remains blocked if any country-pack, policy, evidence, or enterprise release gate fails.



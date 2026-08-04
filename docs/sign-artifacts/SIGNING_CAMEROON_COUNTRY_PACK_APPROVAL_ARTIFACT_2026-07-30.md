# Signing The Cameroon Country-Pack Approval Artifact

Date: 2026-07-30
Country pack: `CM-2026.1`
Evidence folder: `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19`

## Purpose

This report explains how to create and sign the missing approval artifact required by the Cameroon statutory country-pack production gate.

The current blocker is not a code or generated-report write failure. The gate is blocked because there is no qualified reviewer approval artifact and no checker-verified signature evidence.

## Current Gate Blockers

`npm run statutory:country-pack:gate` is blocked by:

- `source_artifact_hash_verification`
- `source_artifact_expert_approval`

The retained source artifacts exist and hash correctly, but the production gate requires a real reviewer decision, signed approval artifact, checker verification, and then an authorized manifest/code transition.

## What Must Be Signed

You do not sign an artifact that already exists. First, a qualified reviewer completes the review decision and related review files, then signs the approval artifact.

The returned review package should include:

- `source-hash-verification.json`
- `reviewer-qualification-conflict.json`
- `fixture-review-workbook.json`
- `review-decision.json`
- a signed approval artifact, for example `review-decision.signed.pdf`
- `maker-checker-approval.json`
- retained signature-verification output or evidence

## Accepted Signature Methods

Preferred methods:

1. PAdES signed PDF with a verifiable certificate chain and signing time.
2. Qualified or advanced electronic signature with retained validation evidence.
3. Organization-issued digital certificate whose subject and organization match the reviewer.
4. Detached CMS/PKCS#7 signature over the approval artifact.
5. Detached PGP signature where the reviewer key identity was independently verified.

Controlled fallback:

6. Handwritten signature only when the checker separately authenticates identity, authority, document completeness, and artifact integrity and retains verification evidence.

A typed name, pasted signature image, checkbox, email footer, source-control commit, or internally generated signature is not sufficient.

## Hash The Signed Artifact

After the reviewer signs the approval artifact, compute its SHA-256 hash:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath "docs\HR-Payroll\evidence\country-packs\CM\2026-07-19\review-decision.signed.pdf"
```

Record the filename and hash in `review-decision.json`:

```json
"signedApprovalArtifact": {
  "file": "review-decision.signed.pdf",
  "sha256": "<64-character sha256 hash>",
  "signedAt": "<ISO timestamp>",
  "signatureMethod": "PAdES signed PDF"
}
```

## Checker Verification

A different natural person must verify the signed artifact. The checker must:

1. Obtain the signed approval artifact through a controlled review channel.
2. Recompute its SHA-256 hash and compare it with `review-decision.json`.
3. Confirm signer name and organization match the reviewer record.
4. Confirm the signing credential, certificate, or key belongs to the reviewer.
5. Validate certificate/key status and trust at signing time when supported.
6. Verify the signed content covers country-pack version, all four fixture decisions, effective window, limitations, and production-use decision.
7. Save signature-validation output or controlled handwritten verification evidence.
8. Hash the verification evidence.
9. Complete `maker-checker-approval.json`.
10. Copy signature-verification values into `review-decision.json.signedApprovalArtifact.signatureVerification`.

## Validation Command

After the reviewer and checker files are complete, run:

```powershell
node scripts/statutory-country-pack-review-package.js verify-signature --decision docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/review-decision.json
```

Required result:

```text
SIGNATURE_AND_CHECKER_EVIDENCE_VERIFIED
```

## After Signature Verification Passes

Only after the signature and checker evidence pass should an authorized operator:

1. Update `manifest.json.requiredApproval` from the authenticated return.
2. Use `EXPERT_REVIEWED` unless actual regulator confirmation is retained.
3. Set production flags only when the signed decision explicitly permits production.
4. Replace the seven decree-backed symbolic hashes in `services/regulatory/country-packs/cameroon.ts` with the retained source hash:
   `sha256:1e88f488d96e163ded9e204c100c5bbce9e8d4917e6e72387ec6af52e0c90b61`
5. Promote CNPS runtime authority only within the signed decision scope.
6. Rerun:

```powershell
npm run statutory:country-pack:gate
npm run policy:gates
```

## Important Boundary

Codex can prepare files, compute hashes, validate evidence, and perform the authorized transition after valid external approval exists.

Codex cannot legitimately act as the qualified reviewer, create a fake signature, or claim statutory approval without retained reviewer and checker evidence.

# Cameroon CNPS Independent Review Package

Status: `READY_FOR_EXTERNAL_REVIEW`  
Country pack: `CM-2026.1`  
Production use allowed: **No**

## Purpose

This package gives an independent qualified reviewer and an authorized checker everything needed to complete the repository's statutory approval contract without understanding the codebase.

The shortest legitimate approval path is `EXPERT_REVIEWED`. The production gate does not require CNPS to certify Stoquify. `REGULATOR_CONFIRMED` may be used only if a competent authority explicitly confirms the interpretation or implementation in writing.

## Required roles

| Role | Minimum responsibility | Independence |
|---|---|---|
| Evidence verifier | Independently recompute retained-source SHA-256 digests | Must not rely on engineering's recorded digest without recomputation |
| Qualified expert reviewer | Decide 2026 applicability, interpretation, fixtures, limitations, and production suitability | Must not be the implementing developer or automated agent |
| Authorized checker | Authenticate reviewer credentials and signature; verify returned artifacts | Must be a different natural person from the reviewer |
| Release owner | Perform the controlled manifest/code transition and rerun gates | Must not override failed evidence checks |

The evidence verifier may be the qualified reviewer when the reviewer personally performs and records the independent recomputation. The authorized checker must remain separate.

## Package contents

- `evidence-index.json` — source and control inventory.
- `fixture-review-workbook.template.json` — four-family independent review workbook.
- `source-hash-verification.template.json` — independent source-integrity attestation.
- `reviewer-qualification-conflict.template.json` — reviewer eligibility and conflict declaration.
- `expert-review-checklist.md` — professional review checklist.
- `review-decision.return.template.json` — repository-compatible decision return.
- `maker-checker-approval.template.json` — checker acceptance and signature-verification record.
- `SIGNATURE_VERIFICATION_PROCEDURE.md` — accepted signature and verification methods.
- `FIELD_MAPPING.md` — signed-evidence to repository-field mapping.
- `POST_SIGNATURE_RUNBOOK.md` — exact acceptance and transition sequence.
- `REGULATOR_CONFIRMATION_REQUEST_DRAFT.md` — optional correspondence only if the stronger regulator-confirmed claim is required.

## Return requirements

Return all of the following:

1. completed `source-hash-verification.json`;
2. completed `reviewer-qualification-conflict.json`;
3. completed `fixture-review-workbook.json`;
4. completed `review-decision.json`;
5. signed approval artifact;
6. completed `maker-checker-approval.json`;
7. retained signature-verification output or evidence;
8. any additional official source relied on, with provenance and SHA-256.

Do not edit the production manifest, production flags, or implementation hashes as part of the external review.

## Non-claims

- This package is not legal advice or production authorization.
- Engineering has not supplied reviewer identity, decisions, tie-out hashes, signatures, or approval.
- Official publication proves source provenance; it is not regulator approval of Stoquify.
- A typed name, checkbox, or repository commit is not a sufficient signature.


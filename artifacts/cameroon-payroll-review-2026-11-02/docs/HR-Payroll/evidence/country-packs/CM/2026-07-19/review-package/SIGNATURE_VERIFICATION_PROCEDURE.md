# Signature Verification Procedure

## Accepted methods

Preferred:

1. PAdES signed PDF with a verifiable certificate chain and signing time.
2. Qualified or advanced electronic signature with retained validation evidence.
3. Organization-issued digital certificate whose subject and organization match the reviewer.
4. Detached CMS/PKCS#7 signature over the approval artifact.
5. Detached PGP signature where the reviewer's key identity was independently verified.

Controlled fallback:

6. Handwritten signature only when the checker separately authenticates identity, authority, document completeness, and artifact integrity and retains the verification evidence.

A typed name, pasted signature image without identity verification, checkbox, email footer, source-control commit, or internally generated signature is insufficient.

## Required checker procedure

1. Obtain the signed approval artifact directly through the controlled review channel.
2. Recompute its SHA-256 and compare it with `review-decision.json`.
3. Confirm the signer's name and organization match the reviewer record.
4. Confirm the signing credential, certificate, or key belongs to the reviewer.
5. Validate certificate/key status and trust at the signing time when the method supports it.
6. Verify that the signed content includes the country-pack version, all four fixture decisions, effective window, limitations, and production-use decision.
7. Save the signature-validation output, certificate report, PGP/CMS verification output, or controlled handwritten-signature verification record.
8. Hash that verification evidence.
9. Complete `maker-checker-approval.json`.
10. Copy its signature-verification values into `review-decision.json.signedApprovalArtifact.signatureVerification`.

## Minimum machine-readable result

The repository requires:

- status `VERIFIED`;
- checker identity and role;
- verification timestamp;
- verification method;
- checker conflict declaration;
- retained verification-evidence filename;
- SHA-256 matching that retained file;
- checker identity different from reviewer identity.

The repository verifies the retained bytes and checker record. It does not claim to replace certificate-chain, PGP-key, professional-credential, or legal-validity judgment.


# Final authentic evidence return checklist

Use this checklist after a clean immutable release candidate exists. Replace no placeholder with an example, guess, typed name alone, or local-development result.

## 1. Immutable candidate and CI

- [ ] Clean commit SHA and tree SHA
- [ ] Release branch/tag and immutable artifact reference
- [ ] Artifact SHA-256, evidence-bundle SHA-256 and manifest SHA-256
- [ ] CI provider/run URL, source commit, completion timestamp and attestation digest
- [ ] Successful Linux or approved Windows standalone packaging
- [ ] Authenticated EN/FR browser report hash for the exact candidate

Return fields:

```json
{"commitSha":null,"treeSha":null,"artifactReference":null,"artifactSha256":null,"manifestSha256":null,"evidenceBundleSha256":null,"ciRunReference":null,"ciCompletedAt":null,"browserReportSha256":null}
```

## 2. Production target, backup and isolated restore

- [ ] Approved redacted production target identifier and environment classification
- [ ] Target census and migration-history evidence before execution
- [ ] Backup identifier, completion timestamp, integrity digest and retention location
- [ ] Isolated restore target, start/end times, restore result and evidence digest
- [ ] All 13 finding-specific row counts, preservation/mapping plan and reconciliation results
- [ ] Authentication/session regression results on the restored copy
- [ ] Direct Prisma status and schema fingerprint after replay

Complete [05-production-restore-evidence.json](./migration-production-approval-20260817/05-production-restore-evidence.json). The localhost development schemas are not acceptable as production proof.

## 3. Exact-hash migration maker/checker

- [ ] Regenerate hashes after the candidate is clean and unchanged
- [ ] SANGO MALO performs fresh authentication and completes [02-maker-attestation.json](./migration-production-approval-20260817/02-maker-attestation.json)
- [ ] MAXIMILLIANO BONGA independently recomputes every digest, verifies evidence, declares conflicts/independence, authenticates later and completes [03-checker-decision.json](./migration-production-approval-20260817/03-checker-decision.json)
- [ ] Checker manually records `APPROVE_EXACT_HASH` or rejection for every D-001–D-013 entry
- [ ] Final condition is exactly `CLEARED`, `CONDITIONAL`, or `REJECTED`, supported by evidence

Required authentication/signature object for each signer:

```json
{"fullName":null,"role":null,"identityProvider":null,"subjectIdOrRedactedReference":null,"mfaMethod":null,"freshAuthenticatedAt":null,"signedAt":null,"signatureMethod":null,"signatureOrAttestationReference":null,"signatureEvidenceSha256":null}
```

The maker and checker must be different accountable identities; checker time must be later than maker time; both must be later than the final manifest.

## 4. Cameroon qualified review

- [ ] Qualified reviewer completes [CAMEROON_QUALIFIED_REVIEW_RETURN_PREFILLED_20260817.json](./CAMEROON_QUALIFIED_REVIEW_RETURN_PREFILLED_20260817.json)
- [ ] Reviewer independently recomputes all source digests
- [ ] Reviewer supplies qualification and conflict evidence
- [ ] All four CNPS fixture families receive source-cited decisions and effective dates
- [ ] Signed approval artifact is returned and hashed
- [ ] Independent checker verifies the signature/key/certificate and records evidence
- [ ] Separate authority packets cover 2026 tax/IRPP, DGI e-invoicing, labor/payroll, receipts, retention/privacy and corrections as applicable to production scope

## 5. Hardware certification or signed exclusion

- [ ] List every production device model, firmware/driver, connection mode and supported OS/browser
- [ ] Test receipt printing, drawer kick, barcode scanning, payment terminal, customer display, power/network failure and recovery where in scope
- [ ] Bind photos/logs/results by SHA-256
- [ ] If hardware is out of scope, product and controller sign an explicit exclusion that states production consequences and compensating procedures

The current statement “simulated desktop only; browser print preview/PDF” is a development scope declaration, not a signed production exclusion.

## 6. Managed secrets and credential rotation

- [ ] Return only secret-manager references and versions, never values
- [ ] Record owner, security classification, creation/rotation/revocation timestamps
- [ ] Restart dependants, verify the new version and prove old-version rejection
- [ ] Obtain security-owner approval bound to the candidate
- [ ] Rerun the 21-check release-secret preflight

## 7. Operational owners, scheduler, alerting and CI

- [ ] Name distinct primary and backup owners for rollout, rollback, support, pilot, security incident and on-call backup
- [ ] Each owner accepts the runbook, coverage window and escalation path
- [ ] Bind scheduler provider, workload, managed credential and deployment attestation
- [ ] Capture three consecutive successful scheduled windows
- [ ] Prove alert delivery, acknowledgment, retry, dead-letter, recovery and backup escalation over the production-like HTTPS transport
- [ ] Bind all evidence to the release commit, artifact, manifest and environment

## 8. Governance, Phase 2B and Phase 3

- [ ] Validate KOUATCHOUA MARK’s product-approval authority; obtain a fresh artifact-bound decision after freeze
- [ ] Assign a qualified financial controller. `SYSTEM ADMINISTRATION` alone does not prove controller authority
- [ ] Obtain independent security and enterprise release decisions
- [ ] Enter Phase 2B only after its 23 checks and gate 017 are GO
- [ ] Run a bounded allowlisted pilot, preserve incidents and safety counters, obtain four segregated exit approvals
- [ ] Make the Phase 3 decision only after all 34 checks have evidence

## Acceptance rule

Every returned file must include its own SHA-256 or be added to a signed manifest. Evidence created before the final candidate, evidence with an unverifiable identity, stale authentication, self-approval, hash mismatch, secret leakage, or a changed candidate is rejected and must be recaptured.

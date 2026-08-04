# Cameroon CNPS External Review and Signature Enablement Implementation

**Date:** 2026-07-26  
**Country pack:** `CM-2026.1`  
**Implementation status:** `READY_FOR_EXTERNAL_REVIEW`  
**Production status:** `BLOCKED_PENDING_QUALIFIED_REVIEW`

## Outcome

A complete, reviewer-ready approval package and deterministic verification tool have been implemented.

The repository does not require CNPS to certify Stoquify before the country-pack production gate can pass. The legitimate minimum production path is:

1. authentic official sources;
2. independent qualified expert review;
3. independent fixture calculations and tie-out hashes;
4. a signed approval artifact;
5. signature and reviewer authentication by a different authorized checker;
6. a 12/12 qualified-review preflight;
7. a controlled manifest and implementation-hash transition;
8. a 12/12 production country-pack gate.

Explicit CNPS correspondence is necessary only if Stoquify intends to retain `REGULATOR_CONFIRMED` as a claim that the regulator approved the interpretation or implementation. Otherwise, the truthful production classification is `EXPERT_REVIEWED`.

## Review package

Location:

`docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/review-package/`

The package contains:

- a reviewer-facing guide and evidence index;
- a structured four-family fixture workbook;
- six official-source hash-verification entries;
- reviewer qualification, independence, privacy, and conflict declarations;
- a complete expert-review checklist;
- a repository-compatible decision-return template;
- a maker–checker approval template;
- accepted signature methods and verification procedure;
- field-level repository transition mapping;
- an exact post-signature execution runbook;
- an optional CNPS confirmation request draft.

The package envelope is pinned by:

`docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/review-package-manifest.json`

All 12 package files match the manifest byte lengths and SHA-256 digests.

## Reviewer eligibility

The qualified reviewer should have demonstrable competence in at least one relevant discipline:

- Cameroon labour or social-security law;
- Cameroon payroll compliance;
- CNPS administration or practice;
- professional accounting, tax, actuarial, or legal work involving CNPS obligations.

The review record must identify the reviewer, professional capacity, organization, qualification reference, relevant Cameroon/CNPS experience, engagement scope, and conflict declaration.

Sensitive identity documents and personal contact data must remain in a controlled evidence store. The repository should retain only the minimum identity, qualification, authority, conflict, and verification fields needed for auditability.

The implementing developer or automated agent cannot approve its own work.

## Role separation

| Role | May be combined? | Required responsibility |
|---|---|---|
| Source-digest verifier | May be the qualified reviewer | Independently recompute source digests |
| Qualified reviewer | Must be independent of implementation | Own legal interpretation, fixtures, limitations, and approval |
| Authorized checker | Must be a different natural person from the reviewer | Authenticate qualifications, identity, signature, and return integrity |
| Release owner/operator | Acts only after 12/12 preflight | Apply controlled manifest and code transition |

## Accepted signature methods

The new verification tool recognizes:

- `PADES_SIGNED_PDF`
- `QUALIFIED_ELECTRONIC_SIGNATURE`
- `ADVANCED_ELECTRONIC_SIGNATURE`
- `ORGANIZATION_DIGITAL_CERTIFICATE`
- `CMS_PKCS7_DETACHED`
- `PGP_DETACHED`
- `HANDWRITTEN_WITH_CONTROLLED_IDENTITY_VERIFICATION`

The handwritten method is a controlled fallback and requires separately retained identity and authenticity verification.

A typed name, checkbox, email footer, pasted signature image without identity verification, repository commit, or internally generated signature is insufficient.

## Deterministic tooling

Implemented:

`scripts/statutory-country-pack-review-package.js`

It provides three fail-closed operations:

### Verify retained official sources

```powershell
node scripts/statutory-country-pack-review-package.js verify-sources
```

Current result:

`SOURCE_BYTES_VERIFIED`

All six official evidence files match their expected hashes and byte lengths.

### Produce independent tie-out hashes

```powershell
node scripts/statutory-country-pack-review-package.js fixture-hashes `
  --workbook docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/review-package/fixture-review-workbook.json
```

The tool refuses to produce tie-out hashes while independent-review fields are incomplete. It uses deterministic stable-key JSON serialization and emits `sha256:<64 lowercase hex>`.

### Verify signature and maker–checker evidence

```powershell
node scripts/statutory-country-pack-review-package.js verify-signature `
  --decision docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/review-decision.json
```

The check requires:

- an accepted signature method;
- the retained signed artifact and matching SHA-256;
- checker status `VERIFIED`;
- a checker different from the reviewer;
- checker role, timestamp, method, and conflict declaration;
- retained signature-verification evidence and matching SHA-256.

This tool validates the retained evidence chain. The checker remains responsible for certificate-chain, key-identity, professional-credential, authority, and legal-validity judgments.

## Fixture coverage

The workbook covers:

1. `payroll.cnps.pensionRatesBps`
   - below, at, and above the monthly ceiling;
   - employer and employee shares;
   - ceiling and rounding review.
2. `payroll.cnps.familyAllowanceRatesBps`
   - general, agriculture, and private-education sectors;
   - employer-only funding;
   - sector mapping and edge cases.
3. `payroll.cnps.occupationalRiskRatesBps`
   - Groups A, B, and C;
   - employer-only funding;
   - classification, mixed activities, and reclassification.
4. `payroll.cnps.employerRules`
   - registration, declaration, calculation, withholding, payment, and control obligations;
   - current workflow, timing, exceptions, and legal-versus-administrative status.

Engineering supplied the implemented values and system outputs. The independent reviewer must supply the independent outputs, provisions, 2026 applicability conclusion, decisions, comments, limitations, and tie-out hashes.

## Exact transition mapping

After authentic review, the signed evidence populates:

- `review-decision.json.reviewer`
- `review-decision.json.reviewWindow`
- `review-decision.json.sourceArtifacts`
- `review-decision.json.fixtureFamilyDecisions`
- `review-decision.json.finalDecision`
- `review-decision.json.signedApprovalArtifact`
- `manifest.json.requiredApproval`
- manifest and artifact review statuses;
- manifest and artifact production authorization.

Only after the qualified-review preflight reaches 12/12 should the seven decree-backed symbolic hashes be replaced with:

`sha256:1e88f488d96e163ded9e204c100c5bbce9e8d4917e6e72387ec6af52e0c90b61`

The employer-rules decision remains linked to:

`sha256:bc51f74de8dd3b0c7babd86e8f98d92dbdbece214480f66ac89c42d3e894a868`

No hashes or production flags were changed during this implementation.

## Current verification

| Verification | Result |
|---|---|
| Official review-package evidence | `SOURCE_BYTES_VERIFIED` — 6/6 |
| Review-package manifest | 12/12 files match |
| JSON templates | 6/6 parse successfully |
| Qualified-review preflight | `4/12` — correctly blocked |
| Production country-pack gate | `10/12` — correctly blocked |
| Development country-pack gate | `11/11` — passed |
| Focused tests | 5 suites, 46/46 tests passed |

Remaining production blockers:

- `source_artifact_hash_verification`
- `source_artifact_expert_approval`

These blockers remain because no external reviewer return or signature was fabricated.

## Human actions now required

### Compliance/legal owner

1. Appoint an eligible independent reviewer.
2. Verify qualification, organization, engagement scope, independence, and conflicts.
3. Send the pinned review package through a controlled channel.

### Qualified reviewer

1. Independently verify official-source hashes.
2. determine 2026 legal applicability;
3. complete all four fixture-family reviews and independent calculations;
4. generate the deterministic tie-out hashes;
5. complete `review-decision.json`;
6. sign the approval artifact using an accepted method.

### Authorized checker

1. Authenticate reviewer identity and qualification.
2. Verify the signature and signed contents.
3. retain and hash the verification evidence;
4. complete the maker–checker record;
5. run the signature validator and enforced 12/12 preflight.

### Authorized operator

Only after the 12/12 preflight:

1. perform the controlled manifest transition;
2. use `EXPERT_REVIEWED` unless explicit regulator evidence supports the stronger status;
3. replace only approved symbolic hashes;
4. rerun the production, policy, release-evidence, and enterprise release gates.

## Final decision

The technical and procedural work needed to make external review efficient, deterministic, and auditable is complete.

The remaining work is genuinely external human evidence: appointing the reviewer, performing the independent professional review, signing the decision, and authenticating that signature through maker–checker controls.

Development remains available. Production remains correctly blocked until those authentic artifacts are returned.


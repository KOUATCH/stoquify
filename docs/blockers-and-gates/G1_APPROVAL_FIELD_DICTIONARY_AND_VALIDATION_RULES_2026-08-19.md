# G1 approval field dictionary and validation rules - 2026-08-19

## Purpose

This is the field-level acceptance contract for every one of the 33 G1 decision-role obligations. It explains what each value means, where it must come from, who owns it, how it is validated and how to correct a failure.

The machine-readable preparation rows are in `G1_33_OBLIGATION_FINALIZATION_REGISTER_2026-08-19.json`. No field marked human, approval-event or verifier input may be guessed or generated merely to satisfy the validator.

## Field modes

| Mode | Meaning |
| --- | --- |
| Automatic | Deterministically copied or computed from authoritative bytes/system state |
| Authoritative retrieval | Read from an organization-approved identity/authority source, then verified |
| Governance confirmation | A qualified human owner must make or confirm the appointment/policy |
| Deliberate human action | A real authorized person must approve or reject after fresh authentication |
| Independent verification | A separate verifier must reproduce and confirm the evidence |

## Contract-binding fields

| Field | Type / required | Source and owner | Validation rule | Failure and correction | Mode |
| --- | --- | --- | --- | --- | --- |
| `decisionId` | String; yes | Frozen contract; gate owner | Exactly one of `D-01` through `D-11`; appears once at decision level | Unknown/duplicate ID: discard record and recreate from frozen contract | Automatic |
| `decisionTitle` | String; yes for packet | Frozen contract; gate owner | Exact title from matching decision | Mismatch: recopy from contract; do not hand-edit | Automatic |
| `selectedOption` | String; yes | Frozen contract; decision owner | Exact byte-for-byte option for the decision | Any mismatch receives no gate credit; recopy from unchanged contract | Automatic |
| `contractArtifactId` | String; yes | Frozen contract; gate owner | Equals `STOQUIFY-POS-G1-CONTRACT-FREEZE-0.2.0-20260817` | Mismatch: stop; bind to correct artifact | Automatic |
| `contractVersion` | String; yes | Frozen contract; gate owner | Equals `0.2.0` for this freeze | Mismatch: stop and investigate artifact version | Automatic |
| `contractPath` | Repository-relative path; yes | Frozen contract/register; gate owner | Exact normalized path; must resolve within repository | Missing/outside path: reject; use canonical repository-relative path | Automatic |
| `contractSha256` | Lowercase 64-hex string; yes | Exact frozen bytes; gate owner/verifier | Recompute SHA-256; must equal `11434eb...a36db` | Drift: invalidate all approvals and create a new governed freeze | Automatic plus independent verification |

## Approver identity fields

| Field | Type / required | Source and owner | Validation rule | Failure and correction | Mode |
| --- | --- | --- | --- | --- | --- |
| `accountableApprover` | Non-empty display name; yes at approval | Canonical identity/authority roster; governance owner | Must describe the same person as `stableSubjectId`; never the identity key | Typed/ambiguous name: reject and resolve through authoritative directory | Authoritative retrieval |
| `stableSubjectId` | Immutable string; yes for assurance even though current script does not inspect it | Organization IdP/HR identity master; security/HR owner | Unique, stable, non-display identifier; resolves to signer; tenant appropriate | Missing/mutable ID: reject; provide IdP subject or approved identity ID | Authoritative retrieval |
| `identityProvider` | Controlled provider code/URI; yes | Security-approved identity configuration | Provider must be organization-controlled and resolvable | Unknown provider: reject; approve provider or use accepted IdP | Governance confirmation plus retrieval |
| `organizationId` | Stable organization ID; yes | Tenant/authority source; governance owner | Must be the organization granting authority | Wrong/missing organization: reject and reissue appointment | Authoritative retrieval |
| `tenantId` | Stable tenant ID; yes | Auth session and policy; security owner | Must match G1 approval tenant and authentication organization | Cross-tenant mismatch: reject; never translate IDs manually | Automatic/retrieval |
| `membershipId` | Stable membership reference; conditional | Organization membership system; security owner | Active membership for signer/tenant at approval time | Missing when policy requires it: resolve active membership | Authoritative retrieval |

## Role and authority fields

| Field | Type / required | Source and owner | Validation rule | Failure and correction | Mode |
| --- | --- | --- | --- | --- | --- |
| `approverRole` | Exact string; yes | Frozen contract and authority roster | Case-insensitive match to one required role; one entry per exact role | Alias/ordinary app role: reject; use exact G1 authority label | Automatic plus governance confirmation |
| `authorityReference` | Durable reference; yes | Canonical authority/delegation system; governance owner | Resolves to signer, exact role, tenant, scope and active dates | Locally invented/unresolvable value: reject; issue real appointment reference | Governance confirmation/retrieval |
| `authoritySourcePathOrUri` | Path/URI; yes | Approved roster source; governance owner | Resolves to authoritative record; local files also require content hash | Broken/mutable-only source: reject; use controlled source and hash/export | Authoritative retrieval |
| `authorityAssignmentId` | Stable ID; yes when registry supports it | Authority registry; governance owner | Unique, tenant-scoped, non-reused appointment identifier | Missing/reused ID: reissue controlled assignment | Authoritative retrieval |
| `delegationReference` | Durable reference; conditional | Delegation register; delegating authority | Required when authority is delegated; must specify delegator, scope and expiry | Informal delegation: reject; record bounded formal delegation | Governance confirmation |
| `authorityEffectiveFrom` | ISO-8601 timestamp; yes | Authority record; governance owner | At/before approval time | Future start: signer not authorized; wait or correct source error | Authoritative retrieval |
| `authorityEffectiveTo` | ISO-8601 timestamp or governed no-expiry value; yes by policy | Authority record; governance owner | After approval and review period, unless policy permits earlier expiry with invalidation | Expired/ambiguous: renew or appoint another person | Authoritative retrieval |
| `authorityVerifiedAt` | ISO-8601 timestamp; yes | Authority verifier clock | At/after source retrieval and before approval import | Missing/stale verification: reverify | Independent verification |
| `authorityVerifiedBy` | Stable verifier identity; yes | Verification record; governance owner | Not an anonymous agent/display-name-only value | Missing/unproven verifier: appoint and record qualified verifier | Independent verification |
| `segregationOfDutiesResult` | Enum `PASS`, `FAIL`, `REVIEW_REQUIRED`; yes | Approved SoD policy; governance/control owner | Must be `PASS` for import; evaluates same-person and producer/verifier combinations | Fail/unknown: reassign roles or obtain approved exception where policy allows | Governance confirmation plus independent verification |
| `conflictOfInterestResult` | Enum `PASS`, `FAIL`, `REVIEW_REQUIRED`; yes | Conflict policy/declaration; governance owner | Must be `PASS` or approved documented exception | Missing/fail: resolve conflict or reassign signer | Governance confirmation |

## Decision fields

| Field | Type / required | Source and owner | Validation rule | Failure and correction | Mode |
| --- | --- | --- | --- | --- | --- |
| `approvalStatus` | Enum; yes | Controlled workflow; signer/verifier | Working packet stays pending; live decision equals `APPROVED` only after all three roles verify | Premature `APPROVED`: revert to pending and complete evidence | Deliberate human action plus verifier |
| `decisionIntent` | Enum `APPROVE` or `REJECT`; yes | Signer action | Must be deliberate, recorded after fresh auth and bound to decision/hash | Implicit intent/page view: reject; obtain explicit action | Deliberate human action |
| `rationale` | Non-empty string; yes | Accountable decision record; decision owners | Must explain why option is accepted with limitations/evidence | Draft/copied generic text only: accountable owners confirm or replace | Deliberate human action |
| `effectiveVersion` | Non-empty version string; yes | Contract/deployment policy; decision owner | Valid version in which decision applies; current preparation value `0.2.0` | Missing/incorrect: governance confirms exact effective version | Automatic plus governance confirmation |
| `reviewOrExpiryAt` | ISO-8601 timestamp; yes | Governance policy; decision owner | Parseable, future at approval time and policy-compliant | Null/expired: set approved review date or reapprove | Governance confirmation |
| `evidenceLinks` | Non-empty array; yes | Contract/template plus signed evidence; evidence owner | Every reference resolves; local paths are content-hash checked | Broken/stale link: replace with durable evidence and reverify | Automatic collection plus human review |
| `affectedCapabilities` | Non-empty unique string array; yes | Contract/template; product/domain owners | Complete for decision; values normalized and not empty | Missing capability: correct packet and reapprove if signed scope changes | Automatic preparation plus human confirmation |
| `rollbackOrDisablePolicy` | Non-empty string; yes | Contract/template; domain/control owners | Fail-closed, operationally actionable and accepted by all decision owners | Vague/missing: rewrite before signing | Governance confirmation |

## Fresh-authentication fields

| Field | Type / required | Source and owner | Validation rule | Failure and correction | Mode |
| --- | --- | --- | --- | --- | --- |
| `authenticationMethod` | Controlled string; yes | Trusted identity workflow | Organization-approved method; repository currently supports tenant-bound password assurance | Unknown/self-declared method: reject; use approved workflow | System generated |
| `authenticationAssuranceLevel` | Number/controlled enum; yes | Trusted auth service; security owner | Meets approved minimum; current `requireFreshAuth` minimum is password level | Below level: require stronger reauthentication | System generated |
| `mfaMethod` | Controlled string; conditional/preferred | Trusted auth provider | Required if governance policy mandates MFA; must match provider audit | Typed MFA claim: reject; obtain provider event | System generated |
| `authenticationOrganizationId` | Stable tenant ID; yes | Auth assurance record | Equals signer authority tenant and G1 tenant | Wrong tenant/null: reject and reauthenticate in correct tenant | System generated |
| `authenticationSessionId` | Redacted durable reference; yes for audit, never raw token | Auth service | Resolves internally without exposing session token; session active/not revoked | Raw token exposure: revoke/redact; missing ref: reauthenticate | System generated |
| `freshAuthenticatedAt` | ISO-8601 timestamp; yes | Trusted workflow clock | Valid, not future-dated, tenant-bound and recent | Missing/stale/future: reauthenticate | System generated |
| `authenticationEvidenceReference` | Durable reference; yes | Auth/audit service | Resolves to method, assurance, subject, tenant and timestamp | Typed/local value: reject; export controlled audit reference | System generated |

The repository function `requireFreshAuth(300)` rejects missing, stale, future-dated, wrong-tenant and below-level assurance. The G1 gate separately permits at most ten minutes between `freshAuthenticatedAt` and `approvedAt`. Governance should choose the stricter applicable rule; five-minute fresh assurance plus approval within ten minutes is acceptable only if the workflow keeps the original assurance event trustworthy.

## Signature and evidence fields

| Field | Type / required | Source and owner | Validation rule | Failure and correction | Mode |
| --- | --- | --- | --- | --- | --- |
| `approvedAt` | ISO-8601 timestamp; yes | Trusted workflow clock | At/after fresh auth and no more than ten minutes later | Outside window: reauthenticate and approve again | System generated by deliberate action |
| `signatureReference` | Durable provider-neutral reference; yes | Approval/e-sign workflow | Resolves to immutable approval record and audit trail | Invented/broken URI: reject; export real envelope reference | System generated |
| `signatureProvider` | Controlled provider code; yes | Approved workflow configuration | Provider is organization-approved and verification method documented | Unknown provider: reject or approve provider through governance | Governance plus system |
| `signatureEnvelopeId` | Stable envelope/record ID; yes | Signing/approval provider | Unique, immutable and corresponds to signer/decision/hash | Missing/reused ID: export correct final envelope | System generated |
| `signatureEvidencePathOrUri` | Path/URI; yes | Evidence repository/provider | Resolves to final immutable export; local path stays within approved evidence root | Missing/mutable-only path: archive final export and record path/hash | System generated/exported |
| `signatureAuditTrailPathOrUri` | Path/URI; yes | Provider/evidence repository | Resolves to identity, auth, intent and timestamps | No audit trail: approval receives no credit | System generated/exported |
| `signatureEvidenceSha256` | Lowercase 64-hex; yes | Exact final evidence bytes | Regex `^[a-f0-9]{64}$` and independent recomputation match | Uppercase, malformed or mismatch: recompute exact final bytes; investigate drift | Automatic plus independent verification |
| `signatureCertificateReference` | Durable certificate ref; conditional | Digital-signature provider/PKI | Required for certificate-backed signatures; chain and validity check | Missing/invalid chain: reject that signature method | System plus verifier |
| `trustedTimestampReference` | Durable timestamp ref; conditional | Trusted timestamp/provider | Required when policy/signature method uses trusted timestamping | Missing/invalid: obtain valid timestamp evidence or use approved method | System plus verifier |
| `evidenceExportedAt` | ISO-8601 timestamp; yes | Evidence export service | At/after approval; corresponds to final export | Export predates approval or changed later: export again and rehash | System generated |
| `evidenceRetentionClass` | Controlled enum; yes | Records policy; records owner | Approved retention, access, redaction and deletion rules | Undefined class: governance must approve before collection | Governance confirmation |

## Independent-verification fields

| Field | Type / required | Source and owner | Validation rule | Failure and correction | Mode |
| --- | --- | --- | --- | --- | --- |
| `verifiedBy` | Stable subject/reference; yes | Verification workflow | Qualified person, distinct where policy requires; no anonymous agent | Missing/same prohibited producer: appoint independent verifier | Independent verification |
| `verifierRole` | Exact controlled role; yes | Verification policy/authority roster | Holds verification authority for scope | Ordinary app role: reject; prove verifier appointment | Independent verification |
| `verificationOrganizationId` | Stable tenant/org ID; yes | Verifier authority/session | Matches governed organization or approved independent party | Wrong/unapproved org: reject | Independent verification |
| `verifiedAt` | ISO-8601 timestamp; yes | Trusted verifier workflow clock | After final evidence export and hash computation | Earlier/missing timestamp: rerun verification | Independent verification |
| `verificationMethod` | Controlled enum/string; yes | Verification policy | Documents identity, authority, hash, signature and timing checks | Vague `manual review`: reject; record reproducible method | Independent verification |
| `verificationResult` | Enum `PASS` or `FAIL`; yes | Verification engine/person | Must be `PASS` before import | Fail/unknown: do not import; remediate and reverify | Independent verification |
| `verificationEvidenceReference` | Durable ref; yes | Verification record | Resolves to immutable checklist/result | Missing/unresolvable: rerun and export verification evidence | Independent verification |
| `recomputedSignatureEvidenceSha256` | Lowercase 64-hex; yes | Independent read of final export | Exact match to `signatureEvidenceSha256` | Mismatch: quarantine evidence and investigate | Independent verification |
| `contractHashMatch` | Boolean; yes | Independent contract hash | Must be `true` | False: invalidate approval; never rewrite stored hash to match |
| `roleAuthorityMatch` | Boolean; yes | Authority and obligation comparison | Must be `true` | False: appoint correct role and collect a new approval |
| `freshAuthenticationWindowValid` | Boolean; yes | Auth/approval timestamp comparison | Must be `true`; zero-to-ten-minute interval | False: new fresh auth and approval required |
| `signatureReferenceResolved` | Boolean; yes | Provider/evidence resolution | Must be `true` | False: restore durable evidence or recollect approval |
| `segregationOfDutiesValid` | Boolean; yes | Approved SoD policy evaluation | Must be `true` | False: reassign signer/verifier or obtain permitted governed exception |

## Operational fields

| Field | Type / required | Source and owner | Validation rule | Failure and correction | Mode |
| --- | --- | --- | --- | --- | --- |
| `fieldOwner` | Non-empty function/person reference; yes | Completion plan; governance owner | Names the function responsible for closing the row | Generic `team`: assign accountable function | Governance confirmation |
| `resolutionAction` | Non-empty actionable text; yes | Blocker register; control owner | States exact next action and evidence expected | Vague action: rewrite with owner/output/validation | Automatic draft plus human confirmation |
| `blockerStatus` | Controlled status; yes | Completion workflow | Open until all checks pass; closed only after independent verification/import | Premature close: reopen and investigate | Automatic/system |
| `blockingReason` | Non-empty text while open; yes | Validation result | Matches failed fields; no hidden failures | Missing/stale reason: regenerate from field results | Automatic/system |
| `invalidationConditions` | Non-empty enum array; yes | Policy; governance/control owners | Covers contract drift, authority change, auth/timing, evidence/hash and SoD/review failures | Missing conditions: use approved common list before signing | Governance confirmation |
| `lastValidatedAt` | ISO-8601 timestamp; yes | Validation runner clock | Updated only when checks actually run | Invented/stale timestamp: rerun validation | Automatic/system |

## Current live-validator rules

`scripts/pos-g1-contract-gate.js` currently requires:

1. A matching decision record and exact selected option.
2. Non-empty rationale and effective version.
3. Parseable review/expiry timestamp.
4. Non-empty evidence links and affected capabilities.
5. Non-empty rollback/disable policy.
6. `approvalStatus = APPROVED`.
7. At least one approval and complete coverage of every required role.
8. Non-empty accountable name, exact role and authority reference.
9. Parseable fresh-authentication and approval timestamps.
10. Approval at/after fresh authentication and within ten minutes.
11. Non-empty signature reference.
12. Lowercase 64-character evidence SHA-256.
13. Exact register binding to contract artifact, version, path and recomputed hash.

## Important checks not enforced by the current script

The script validates shape and timing but does not itself:

- resolve `authorityReference` against an authoritative source;
- prove that `accountableApprover` maps to a stable subject ID;
- verify tenant/organization binding;
- verify authority start/end, revocation, delegation or scope;
- verify reviewer qualification;
- enforce approved same-person/SoD combinations;
- prove MFA or authentication method;
- resolve `signatureReference`;
- read and rehash the signature evidence bytes;
- validate certificates or trusted timestamps;
- verify post-signature immutability;
- enforce verifier independence;
- detect later authority, policy or evidence revocation.

These checks are mandatory independent pre-import controls even though the narrow script does not inspect them yet.

## Automatic versus human responsibility

| Activity | Automation permitted? | Human action required? |
| --- | --- | --- |
| Read contract IDs/options/roles and compute hash | Yes | Independent review of final binding |
| Locate candidate names | Yes | Governance decides identity and authority |
| Assign a G1 authority | No autonomous assignment | Yes, authorized governance owner |
| Generate fresh-auth timestamp | Trusted auth service only | Signer must actually reauthenticate |
| Approve or reject | No agent approval | Yes, authorized signer |
| Export and hash evidence | Yes | Custodian confirms final export |
| Verify hashes and rules | Yes | Independent verifier accepts responsibility |
| Set live decision to `APPROVED` | Controlled import after pass | Human governance approval must already exist |

## Acceptance rule

A role obligation is acceptable only when every mandatory field passes. A G1 decision is acceptable only when all three exact role obligations pass. G1 is acceptable only when all 11 decisions pass against the unchanged frozen contract hash and the actual gate reports `PASSED`.

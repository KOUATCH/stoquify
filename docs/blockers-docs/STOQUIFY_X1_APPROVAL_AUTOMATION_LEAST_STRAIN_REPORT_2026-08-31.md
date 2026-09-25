# Stoquify X1 approval automation: least-strain implementation report

**Report date:** 2026-08-31  
**Status:** Technical implementation guidance; not an approval or legal opinion  
**Scope:** X1 Finance/Accounting table remediation approval, authenticated evidence and technical-gate workflow

## Executive conclusion

Most retrieval, validation, document completion, hashing and gate evaluation can be automated. The irreducible human action is the initial grant of authority unless an existing signed governance instrument already delegates the exact bounded decisions to automation.

The lowest-strain safe model is a **standing bounded delegation**. Authorized people sign the delegation once. A named service principal may then create approval records and issue machine attestations only when predetermined rules pass. It must block and escalate every exception. It must never impersonate a person or generate a human signature.

## What can be automated

| Information or action | Authoritative source | Automation treatment |
| --- | --- | --- |
| Candidate names, user IDs and tenant roles | Stoquify database | Retrieve and validate automatically |
| Tenant IDs, permissions and module configuration | Stoquify database/control plane | Retrieve and validate automatically |
| Directory IDs and service principals | Approved identity provider | Retrieve through a workload identity |
| Authority appointment references | Governance or delegated-authority register | Retrieve if the register exposes a controlled API |
| Approval record ID | Authoritative approval system | Create a draft record and retrieve the immutable ID |
| Contract URI and hashes | Repository and approved CI run | Generate automatically |
| Proposed effective and expiry dates | Signed standing policy | Calculate within the policy's maximum validity |
| Deterministic pass/fail decision | Signed rules and immutable evidence | Evaluate automatically |
| Discretionary approval, waiver or risk acceptance | Formally appointed human authority | Must remain human |
| Human signature | Approved signature workflow | Human signs; automation retrieves the certificate/reference |
| Final manifests and release-gate state | Approval/evidence workflow | Generate automatically and audit |

## Recommended least-strain workflow

1. Establish and sign `STOQ-X1-POL-004`, the bounded automation-authority delegation.
2. Create distinct workload identities for approval orchestration, evidence capture and independent verification.
3. Configure the approval-system adapter to create records and retrieve immutable IDs.
4. Retrieve directory identities, appointment references and technical scope from authoritative systems.
5. Fill the policy and evidence templates without copying secret values.
6. Freeze and hash the exact contract, policy and evidence artifacts.
7. Evaluate only the deterministic rules authorized by the signed standing delegation.
8. Record `AUTO_APPROVED_WITHIN_DELEGATION` only when every mandatory rule passes.
9. Record `BLOCKED_REQUIRES_HUMAN_DECISION` for missing facts, failures, exceptions, ambiguity or expired authority.
10. Retain the machine identity, policy version, input hashes, output, timestamps and reason codes in tamper-evident audit storage.

## Safe document and signature sequence

```text
Create approval/envelope record
-> obtain immutable record or envelope ID
-> fill the document
-> freeze and hash the document
-> upload the frozen artifact
-> authorized human signs the standing delegation
-> retrieve the external signature certificate
-> activate the delegation for its bounded validity period
-> generate machine attestations under the service-principal identity
```

Do not edit a signed or hashed document. Post-signature decision metadata belongs in the approval system and a separate final approval manifest. Editing the signed source document would invalidate its hash.

## Where each remaining human fact comes from

### Formal authority appointment

Obtain it from the delegated-authority register, governance charter, board or executive appointment, security authority register, test-data custody register, or release-management charter. An application role proves technical access, not formal authority.

### Explicit decision

The authorized signer must personally choose `APPROVE`, `REJECT` or `REVISE` for the standing delegation. Automation must not infer consent from role membership, silence, prior activity or document labels.

### Signature

The signer authenticates through the approved workflow. Automation may retrieve the resulting envelope ID, signature certificate, signer directory ID and signed timestamp. It may not create or imitate a human signature.

## Minimum human involvement

The minimum safe human effort is one authenticated signing round:

- A single umbrella-authority signer may sign only if an existing authority instrument expressly covers product budgets, security and credential use, fixture-data custody and independent release delegation.
- Otherwise, use parallel co-signatures from the product authority, security/control and data-custody authorities, and an independent release authority.
- The approval workflow should prefill all repository, database, identity, contract and hash values so signers review only the decision and validity period.

## Required integration inputs

The following non-secret information is needed once:

- Approval platform name and non-production workspace/project identifier.
- Approval template or workflow identifier.
- Identity-provider tenant and workload/service-principal object IDs.
- Governance or authority-register location.
- Secret-manager reference for the automation credential, never the secret itself.
- Approved non-production callback or webhook location.
- Tamper-evident evidence-store URI and retention-policy reference.

## Control boundary

A standing delegation can authorize a machine decision under a named service identity. It does not convert that machine action into a human signature. It cannot delegate authority the signer does not possess, and it cannot eliminate legally or organizationally required segregation of duties.

The correct target is therefore **one-time human authorization followed by fail-closed deterministic automation**, not zero-accountability autonomous approval.


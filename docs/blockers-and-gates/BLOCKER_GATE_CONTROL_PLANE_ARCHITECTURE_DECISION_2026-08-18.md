# ADR: Extend Workflow Assurance for approvals, evidence and gates

- Status: Proposed
- Date: 2026-08-18
- Decision owners required: Platform architecture, security/IAM, controls, product and data governance
- Initial domain: POS G1

## Context

Stoquify needs to reduce manual blocker/gate work by discovering objective facts, routing approvals, binding decisions to exact artifact hashes, verifying evidence and explaining next actions. The platform must not infer governance authority or perform human approval automatically.

The repository already contains a broad Workflow Assurance capability: versioned check definitions, tenant-scoped runs/findings/incidents, alert delivery, waivers, a control-tower UI, fresh authentication, RBAC, business events/outbox, evidence grading and several domain approval/sign-off patterns.

The remaining gaps are authority/delegation, artifact/policy versioning, general authenticated approvals, immutable evidence envelopes, independent verification and persistent composite gate dependencies.

## Decision

Implement the capability as an additive extension of the existing Workflow Assurance modular monolith under `services/assurance/`, with protected actions and extensions to the existing Assurance Control Tower.

Keep domain business truth in domain services and consume it through governed evidence adapters. Use the existing business-event/outbox and scheduler/alert infrastructure. Keep an optional provider-neutral external e-signature adapter at the boundary.

Preserve module interfaces so high-volume verification, artifact storage or external-signature integration may be extracted later when evidence supports separate deployment.

## Alternatives considered

### A. New standalone control-plane microservice now

Advantages:

- Strong deployment and administrative isolation.
- Independent scaling and technology choices.

Disadvantages:

- Duplicates existing assurance, auth, incident, alert and evidence capabilities.
- Adds network failure, distributed transaction, identity propagation and operational overhead.
- Risks creating two sources of blocker truth.

Disposition: rejected for the first implementation.

### B. Extend Workflow Assurance in the existing application

Advantages:

- Reuses mature tenant, RBAC, fresh-auth, incident, outbox and UI foundations.
- Supports transactional evidence creation with current domain services.
- Lowest migration and operational risk.

Disadvantages:

- Increases the importance and size of the existing deployment.
- Requires strong internal module boundaries to prevent cross-domain coupling.

Disposition: selected.

### C. Build a complete internal e-signature platform

Advantages:

- Full control over signing workflow.

Disadvantages:

- Certificate issuance, external identity proofing, trusted timestamps, key custody and long-term legal validation are specialist capabilities.
- High security, compliance and operational cost unrelated to most internal approval needs.

Disposition: rejected. Build internal attestation; integrate an external provider when policy requires legally portable signatures.

### D. Continue with repository JSON and manual signature documents

Advantages:

- No runtime implementation cost.

Disadvantages:

- Manual, error-prone, difficult to scale and unable to provide trustworthy runtime identity/authority/fresh-auth evidence.

Disposition: retained only as a fail-closed transition and audit comparison mechanism.

## Consequences

Positive:

- One assurance/control-tower source of operating truth.
- Faster blocker routing and evidence collection.
- Reusable approvals across Stoquify domains.
- Exact artifact/policy drift invalidation.
- Strong boundary between AI evidence assistance and human approval.

Negative:

- New governance and authority-data stewardship is required.
- Additive schema and UI complexity.
- Control-plane defects have broader impact.
- Stronger retention, privacy and recovery operations are necessary.

## Security and data impact

- Application roles remain separate from governance authority.
- Stable user IDs, not display names, bind approvals.
- Sensitive actions require server-side permission, tenant, entitlement, authority and fresh-auth checks.
- Approval/evidence history is append-oriented and corrected through invalidation/supersession.
- The system stores authentication assurance metadata, not authentication secrets.
- Evidence exports are permissioned, redacted and hash-verifiable.
- Automated evidence production and independent verification remain distinct capabilities.

## Migration and rollback

- Use additive migrations only.
- Import G1 artifact and policy; do not backfill old handwriting images as approvals.
- Run in observe mode and compare runtime manifests with existing scripts.
- If the pilot fails, disable its actions/UI and continue the current fail-closed G1 gate.
- Preserve all created evidence; do not destructively roll back historical approval records.

## Extraction triggers

Reconsider a separate service only when one or more are proven:

- independent availability or administrative boundary;
- regulated cryptographic-key isolation;
- verification workloads materially harm the transactional application;
- multiple separately deployed products require the capability;
- provider or artifact processing needs independent scaling.

## Decision conditions

This ADR may move to `Accepted` only after:

- governance approves the authority source and SoD model;
- security approves authentication assurance and permissions;
- data governance approves retention/redaction;
- G1 owners approve the versioned decision policy; and
- schema/migration design receives independent review.

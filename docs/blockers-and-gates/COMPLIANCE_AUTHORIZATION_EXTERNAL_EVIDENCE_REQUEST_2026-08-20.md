# Compliance authorization external and qualified-review evidence request — 2026-08-20

Classification: **UNAPPROVED HANDOFF TEMPLATE — NOT AUTHORIZATION EVIDENCE**

Complete these requests only through the stated authoritative source. Engineering must not prefill decisions, signatures, qualifications, appointments, regulator attestations, or legal conclusions.

## Organization Identity

- Related claims: Organization
- Accountable owner: Stoquify organization administrator
- Required evidence: Current organization record and, if legal identity is claimed, official registration evidence bound to the tenant ID.
- Authoritative source: Tenant organization record and official registration evidence.
- Acceptance test: Independent checker matches the name and tenant identifier to the retained authoritative record.
- Development effect: Display-label use is permitted after database reconciliation.
- Integration effect: No blocker while tenant IDs remain authoritative.
- Production effect: Does not establish legal identity without verified registration evidence.
- Engineering-completable: yes
- Submitted evidence path: ____________________
- Submitted evidence SHA-256: ____________________
- Signer/reviewer stable subject ID: ____________________
- Signature/approval method and timestamp: ____________________
- Independent checker stable subject ID and later timestamp: ____________________
- Independent checker result: ____________________

## Migration Authority

- Related claims: Migration operator, Migration checker, Migration decision, Operator/checker authentication attestation
- Accountable owner: Database change owner, operator, and independent checker
- Required evidence: Authenticated subject IDs, appointments, conflict declaration, target proof, final evidence hashes, separate signatures, and ordered timestamps.
- Authoritative source: Enterprise identity, change-approval, and migration evidence systems.
- Acceptance test: Operator and checker are distinct; target and hashes match; checker signs after final execution evidence.
- Development effect: Static and non-destructive development checks may continue.
- Integration effect: No destructive or production execution authority is granted.
- Production effect: Blocks controlled migration approval claims.
- Engineering-completable: no
- Submitted evidence path: ____________________
- Submitted evidence SHA-256: ____________________
- Signer/reviewer stable subject ID: ____________________
- Signature/approval method and timestamp: ____________________
- Independent checker stable subject ID and later timestamp: ____________________
- Independent checker result: ____________________

## Workflow Appointments

- Related claims: Maker
- Accountable owner: Workflow authority owner
- Required evidence: Stable subject IDs and effective appointments for the exact role, organization, decision, and period.
- Authoritative source: Enterprise IAM and authority register.
- Acceptance test: Independent checker verifies appointment scope, effective dates, and segregation of duties.
- Development effect: Seeded personas may exercise development workflows.
- Integration effect: Fail-closed maker-checker integration testing may continue.
- Production effect: No production decision authority is established.
- Engineering-completable: no
- Submitted evidence path: ____________________
- Submitted evidence SHA-256: ____________________
- Signer/reviewer stable subject ID: ____________________
- Signature/approval method and timestamp: ____________________
- Independent checker stable subject ID and later timestamp: ____________________
- Independent checker result: ____________________

## Identity Conflict Resolution

- Related claims: Checker
- Accountable owner: HRIS, IAM, and workflow authority owners
- Required evidence: Stable subject IDs, authoritative names, appointments, effective dates, and independent verification.
- Authoritative source: Enterprise IAM, HRIS, and authority register.
- Acceptance test: The conflict is resolved without name-only matching or silent subject merging.
- Development effect: Existing distinct seeded personas may continue for development tests.
- Integration effect: The conflict must remain visible in evidence exports.
- Production effect: Blocks reliance on the conflicting identity as an approver or checker.
- Engineering-completable: no
- Submitted evidence path: ____________________
- Submitted evidence SHA-256: ____________________
- Signer/reviewer stable subject ID: ____________________
- Signature/approval method and timestamp: ____________________
- Independent checker stable subject ID and later timestamp: ____________________
- Independent checker result: ____________________

## Product Approval

- Related claims: Product approver, Supplied approval timestamp, Product approver signature
- Accountable owner: Product governance owner and authorized product approver
- Required evidence: Authenticated identity, appointment, scope, signature, timestamp, and exact candidate hash.
- Authoritative source: Product governance and enterprise approval records.
- Acceptance test: Independent checker verifies appointment and signature against the exact frozen artifact hash.
- Development effect: Candidate persona may exercise development approval tests.
- Integration effect: No production authority is inferred from seed data or DOCX metadata.
- Production effect: Blocks product approval claims.
- Engineering-completable: no
- Submitted evidence path: ____________________
- Submitted evidence SHA-256: ____________________
- Signer/reviewer stable subject ID: ____________________
- Signature/approval method and timestamp: ____________________
- Independent checker stable subject ID and later timestamp: ____________________
- Independent checker result: ____________________

## Controller Approval

- Related claims: Controller approver
- Accountable owner: Finance governance owner and authorized controller
- Required evidence: Authenticated identity, verified professional capacity, appointment, scope, conflict declaration, signature, and timestamp.
- Authoritative source: Finance governance, HRIS, and enterprise approval records.
- Acceptance test: Independent checker verifies capacity, appointment, signature, and separation from the maker.
- Development effect: Candidate persona may exercise development approval workflows.
- Integration effect: Fail-closed control integration testing may continue.
- Production effect: Blocks controller and accounting-certification claims.
- Engineering-completable: no
- Submitted evidence path: ____________________
- Submitted evidence SHA-256: ____________________
- Signer/reviewer stable subject ID: ____________________
- Signature/approval method and timestamp: ____________________
- Independent checker stable subject ID and later timestamp: ____________________
- Independent checker result: ____________________

## Scratch Target Verification

- Related claims: Development certification schema
- Accountable owner: Database test operator
- Required evidence: Verified host, database, schema, environment, and non-production boundary.
- Authoritative source: Database connection preflight and target-verification artifact.
- Acceptance test: All non-secret target coordinates match the retained preflight hash before any operation.
- Development effect: A verified scratch target may support development rehearsal.
- Integration effect: It must remain isolated from public and production schemas.
- Production effect: No production authority.
- Engineering-completable: yes
- Submitted evidence path: ____________________
- Submitted evidence SHA-256: ____________________
- Signer/reviewer stable subject ID: ____________________
- Signature/approval method and timestamp: ____________________
- Independent checker stable subject ID and later timestamp: ____________________
- Independent checker result: ____________________

## Restore Rehearsal

- Related claims: Restore rehearsal schema, Restore rehearsal result
- Accountable owner: Database recovery operator and independent checker
- Required evidence: Verified scratch target, timestamped restore run, integrity checks, result, and independent verification.
- Authoritative source: Controlled restore execution and database verification artifacts.
- Acceptance test: Restore succeeds on a verified non-production target and the checker validates integrity from retained hashes.
- Development effect: Documentation and dry-run validation may continue.
- Integration effect: Recovery readiness remains unproven until execution evidence exists.
- Production effect: Blocks production recovery-readiness claims.
- Engineering-completable: yes
- Submitted evidence path: ____________________
- Submitted evidence SHA-256: ____________________
- Signer/reviewer stable subject ID: ____________________
- Signature/approval method and timestamp: ____________________
- Independent checker stable subject ID and later timestamp: ____________________
- Independent checker result: ____________________

## Production Authorization

- Related claims: Production authorization
- Accountable owner: Authorized product, finance, security, compliance, and release approvers
- Required evidence: Completed release evidence, verified appointments, authentic signatures, qualified review, external prerequisites, and passing production gates bound to one frozen candidate.
- Authoritative source: Independent release decision and applicable external authority evidence.
- Acceptance test: Every mandatory production gate passes without override and independent approvers sign after the final evidence timestamp.
- Development effect: No effect; development is controlled by a separate gate.
- Integration effect: Core integration remains non-production and fail-closed.
- Production effect: Production use remains blocked.
- Engineering-completable: no
- Submitted evidence path: ____________________
- Submitted evidence SHA-256: ____________________
- Signer/reviewer stable subject ID: ____________________
- Signature/approval method and timestamp: ____________________
- Independent checker stable subject ID and later timestamp: ____________________
- Independent checker result: ____________________

## Qualified Country Pack Review

- Related claims: Statutory/fiscal certification authorization, CNPS signature / qualified source approval, Qualified Cameroon country-pack review
- Accountable owner: Compliance/legal owner and appointed independent Cameroon reviewer
- Required evidence: Verified identity, professional capacity, qualification reference, scope, conflict declaration, review window, recomputed source digests, family decisions, tie-out hashes, signature, and independent checker record.
- Authoritative source: Qualified signed review decision bound to retained official sources and the frozen country-pack candidate.
- Acceptance test: Qualified-review preflight and statutory production gate pass for the same candidate without override.
- Development effect: Development and sandbox work may continue fail-closed.
- Integration effect: Production activation and legal-effect execution remain disabled.
- Production effect: Blocks statutory, fiscal, payroll, and CNPS production reliance.
- Engineering-completable: no
- Submitted evidence path: ____________________
- Submitted evidence SHA-256: ____________________
- Signer/reviewer stable subject ID: ____________________
- Signature/approval method and timestamp: ____________________
- Independent checker stable subject ID and later timestamp: ____________________
- Independent checker result: ____________________

## External Authority Conformance

- Related claims: DGI signature / authority evidence, MINFI signature / authority evidence
- Accountable owner: DGI/MINFI liaison, security owner, integration owner, and qualified fiscal reviewer
- Required evidence: Applicable official contract or decision, endpoints, credential process, sandbox conformance, response fixtures, signature/transport controls, scope, date, and retained hashes.
- Authoritative source: Official authority channels and independently verified conformance evidence.
- Acceptance test: Every applicable external-authority checklist row passes and an independent checker verifies origin, applicability, scope, signatures, and hashes.
- Development effect: Sandbox-shaped adapter development may continue.
- Integration effect: Live authority calls remain disabled.
- Production effect: Blocks DGI/MINFI production-authority claims.
- Engineering-completable: no
- Submitted evidence path: ____________________
- Submitted evidence SHA-256: ____________________
- Signer/reviewer stable subject ID: ____________________
- Signature/approval method and timestamp: ____________________
- Independent checker stable subject ID and later timestamp: ____________________
- Independent checker result: ____________________

## Qualified Accounting Review

- Related claims: Qualified accounting review
- Accountable owner: Finance governance owner and appointed qualified accounting reviewer
- Required evidence: Verified qualification, appointment, scope, conflict declaration, reviewed evidence, decision, signature, and independent check.
- Authoritative source: Qualified signed accounting review packet.
- Acceptance test: Reviewer capacity and every conclusion are independently verified against the frozen evidence set.
- Development effect: Accounting workflow development may continue with non-certification labels.
- Integration effect: No certified accounting conclusion may be exposed.
- Production effect: Blocks accounting certification claims.
- Engineering-completable: no
- Submitted evidence path: ____________________
- Submitted evidence SHA-256: ____________________
- Signer/reviewer stable subject ID: ____________________
- Signature/approval method and timestamp: ____________________
- Independent checker stable subject ID and later timestamp: ____________________
- Independent checker result: ____________________

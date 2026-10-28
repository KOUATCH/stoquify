# AqStoqFlow HRIS/Payroll Employee Identity Report

Date: 2026-08-19  
Scope: Produce a governance-approved G1 17-person roster without manufacturing people truth  
Status: **BLOCKED ON AUTHORITATIVE EMPLOYER, IDENTITY AND APPOINTMENT EVIDENCE**

## Current evidence result

- Application tenants: 2; neither is yet proven to be the Stoquify Cameroon legal employer.
- Users: 28; none is currently accepted as a G1 identity.
- Payroll employees: 24; all are `DRAFT`, all have `userId = null`, and all require source evidence.
- Page-6 G1 candidates: 17.
- Exact normalized candidate-to-database matches: 0.
- Verified `User.id` + `PayrollEmployee.id` bindings for the roster: 0/17.
- Database writes performed in the assessment: none.

## Database decision

Do not reseed. Do not delete or relabel current rows to fit page-6 names. Quarantine/classify unverified development rows and onboard real people through a controlled, tenant-scoped service workflow.

The core HRIS models already exist: `PayrollEmployee`, `HrisOrgUnit`, `HrisPosition`, `HrisEmploymentAssignment`, `HrisReportingRelationship` and `HrisManagerDelegation`. A later narrow enhancement may make the `PayrollEmployee.userId` binding evidence-grade and add a separate governance-authority registry, but neither change may fabricate identity or authority.

## Required roster classification

For each of the 17 canonical roles, governance must choose exactly one evidence-backed outcome:

1. `EXISTING_VERIFIED`: an existing user and employee record belong to the real person and pass tenant, identity, employment and duplicate checks.
2. `PAGE6_RETAIN_NEW_BINDING`: the page-6 person is confirmed, but a missing user/employee record or link must be created through controlled onboarding.
3. `FORMALLY_REPLACED`: governance appoints a different verified person and records the replacement decision and authority.
4. `UNRESOLVED`: evidence is insufficient; the role and all dependent approvals remain blocked.

No current record qualifies as `EXISTING_VERIFIED` from repository evidence alone.

## Evidence required per person

- Legal employer and tenant binding.
- Legal name and an authorized identity-document reference; report only a redacted reference and content hash.
- Stable IAM subject (`User.id`) and verified account ownership.
- Stable HRIS subject (`PayrollEmployee.id`) and employee number.
- Employment contract or appointment evidence, hire/status/effective dates and CNPS evidence where applicable.
- Organization unit, position and effective-dated employment assignment.
- Canonical G1 role appointment, appointing-body authority reference, scope and effective dates.
- Qualification evidence where the role requires a Cameroon or accounting reviewer.
- Independent duplicate, SoD and conflict-of-interest results.
- Independent checker identity, decision, timestamp and evidence hash.

## Controlled workflow

1. Governance confirms the exact legal employer, establishment and matching `Organization.id`.
2. HR/security creates a sealed intake packet for the 17 page-6 candidates and any proposed replacements.
3. Two people independently reconcile each person against IAM, HR records, employment evidence and CNPS/tax records; name similarity alone is prohibited.
4. Existing rows are retained only after evidence proves they belong to the person. Ambiguous or synthetic rows remain quarantined.
5. Missing `User` or `PayrollEmployee` records are created only after identity approval; existing records are linked only after tenant and duplicate checks.
6. HR creates effective-dated org units, positions and employment assignments from approved organization records.
7. Governance issues a separate appointment for each canonical G1 role. Job title and application RBAC are not appointment evidence.
8. Controls/assurance performs SoD, conflict and qualification review. Conflicts are remediated or left blocked; no silent exception.
9. The authorized governance owner and independent checker sign the final roster artifact. Its immutable export is hashed and preserved.
10. Only after the roster is accepted may the 17 role-holders provide the 33 decision-role approvals using fresh authentication and artifact-bound evidence.

## Roster fields

`canonicalRoleCode`, `page6CandidateName`, `finalLegalName`, `classification`, `organizationId`, `userId`, `payrollEmployeeId`, `employeeNumber`, `employmentStatus`, `orgUnitId`, `positionId`, `employmentAssignmentId`, `identityEvidenceRef`, `identityEvidenceSha256`, `employmentEvidenceRef`, `employmentEvidenceSha256`, `appointmentAuthorityRef`, `appointmentArtifactRef`, `appointmentArtifactSha256`, `effectiveFrom`, `effectiveTo`, `qualificationEvidenceRef`, `sodResult`, `coiResult`, `makerSubjectId`, `checkerSubjectId`, `checkedAt`, `governanceDecision`, `governanceDecisionRef`, `governanceArtifactSha256`.

## Tenant, RBAC, audit and redaction

- Every lookup and write must include the authoritative `organizationId`.
- Cross-tenant matches are hard failures.
- Application roles grant access only; they do not prove employment or governance authority.
- Identity-document bytes and raw statutory identifiers remain restricted; reports use masked references and hashes.
- Every create/link/replace/reject decision is audited with actor, source, before/after state and reason.

## Verification posture

No code or database mutation was authorized. Therefore no tenant-isolation, duplicate-prevention or access-denial test was rerun in this advisory slice. Current roster readiness remains 0/17 verified identities and G1 remains 0/33 approved obligations.

## Next handoff

After the employer/tenant and the first verified identity packet are supplied, execute a one-person dry run of the controlled identity workflow. If it passes independent review, repeat it for all 17 and then hand off to `aqstoqflow-hris-payroll-04-org-structure-manager-scope`.

# Cameroon employment and HRIS/payroll document requirements matrix

Prepared 2026-08-19  
Classification: **REQUIREMENTS ASSESSMENT — NOT COMPLIANCE CERTIFICATION**  
LEGAL REVIEW REQUIRED — not a legal-compliance certification.

## Classification key

- `STATUTORY_MANDATORY`: the reviewed source expresses a legal duty; current applicability still requires qualified confirmation.
- `CONDITIONAL_STATUTORY_MANDATORY`: applies only when the stated condition is present.
- `OFFICIAL_*`: regulator-issued evidence or procedure.
- `INTERNAL_*`: not created by Cameroon statute; required by Stoquify to establish authority and approval integrity.
- `LEGAL_APPLICABILITY_DECISION`: cannot be decided safely until entity, sector, worker and establishment facts are known.

## Document requirements

| ID | Document | Class | Basis | Proves | G1 use | Resolution action |
| --- | --- | --- | --- | --- | --- | --- |
| CAM-EMP-01 | Enterprise opening/change/closure declaration | STATUTORY_MANDATORY | Labour Code s.114 | Declared establishment status | Employer provenance only | Obtain filed copy and receipt; verify legal entity and establishment scope. |
| CAM-EMP-02 | Manpower situation declaration | STATUTORY_MANDATORY | Labour Code s.115; implementing order to verify | Reported workforce population | Cross-check employee population; not role authority | Obtain latest accepted return and current filing rule. |
| CAM-EMP-03 | Employer's register | STATUTORY_MANDATORY_SUBJECT_TO_IMPLEMENTING_RULES | Labour Code s.116 | Current employment-control information | Employment cross-check | Obtain current register, applicable form/order and restricted evidence extract. |
| CAM-EMP-04 | Employment relationship evidence | STATUTORY_EVIDENCE | Labour Code ss.23-24 | Service under employer authority for remuneration | Employment layer only | Collect contract or other admissible evidence; use written contracts as the controlled HRIS source. |
| CAM-EMP-05 | Written employment contract when legally required | CONDITIONAL_STATUTORY_MANDATORY | Labour Code s.27 | Terms for specified-duration >3 months, displacement or foreign worker | Employment status and scope | Classify each worker; obtain inspector copy/foreign-worker endorsement where applicable. |
| CAM-EMP-06 | Written probationary hiring record | CONDITIONAL_STATUTORY_MANDATORY | Labour Code s.28 | Probation terms and duration | Prevents treating probation as settled authority without review | Collect if applicable and block long-lived control appointment beyond employment authority. |
| CAM-EMP-07 | Internal regulations and Labour Inspector endorsement | CONDITIONAL_STATUTORY_MANDATORY | Labour Code s.29; threshold/order to verify | Approved work, discipline, safety and hygiene rules | Governance context only | Determine workforce threshold and obtain endorsed version if applicable. |
| CAM-EMP-08 | Employment certificate at departure | STATUTORY_MANDATORY | Labour Code s.44 | Entry/departure dates and posts held | Terminates/supersedes active authority eligibility | Capture termination certificate reference and immediately revoke control assignments. |
| CAM-PAY-01 | Wage-payment evidence and individual pay voucher | STATUTORY_MANDATORY | Labour Code ss.68-69 | Wage period, payment and worker-level voucher | Payroll status only | Retain evidence under restricted access; do not use voucher signature as G1 approval. |
| CAM-HS-01 | Occupational-health service and examination evidence | STATUTORY_OR_CONDITIONAL_REQUIREMENT | Labour Code ss.98-100 and implementing orders | Required medical service/examination completion | No control-role authority | Confirm applicable orders; store only status/reference, not unnecessary medical details. |
| CAM-CNPS-01 | CNPS employer registration | OFFICIAL_STATUTORY_REGISTRATION | CNPS law/procedure | Employer registration with CNPS | Employer provenance | Obtain employer number and CNPS-issued confirmation; mask in general reports. |
| CAM-CNPS-02 | CNPS worker registration and insurance number | OFFICIAL_STATUTORY_REGISTRATION | Decree 74-733 arts.5-8; current procedure to verify | Worker's CNPS insurance identity/history | Employment cross-check only | Obtain CNPS confirmation with consent/authority; store masked value and keyed hash, never as app subject ID. |
| CAM-CNPS-03 | CNPS hiring/cessation notice | OFFICIAL_STATUTORY_NOTICE | Decree 74-733 art.9; CNPS official form | Hiring/cessation date reported to CNPS | Effective-date and revocation cross-check | Obtain filed notice and acceptance/receipt; reconcile the applicable filing deadline with CNPS. |
| CAM-CNPS-04 | Insurance booklet or CNPS individual account evidence | OFFICIAL_SOCIAL_INSURANCE_RECORD | Decree 74-733 arts.7-8,16 | Employment periods and monthly insured salary history | Employment corroboration | Use a redacted verification result; never expose family or identity data unnecessarily. |
| CAM-CNPS-05 | Nominative salary/contribution declaration | STATUTORY_MANDATORY | Decree 74-733 arts.13-15; current e-filing procedure to verify | Worker list, insurance numbers and remuneration base | Payroll-employment tie-out | Obtain accepted declaration and reconcile employee/status counts. |
| CAM-CNPS-06 | CNPS contribution payment receipt | STATUTORY_PAYMENT_EVIDENCE | CNPS contribution rules and official account | Declared contribution payment | Payroll compliance status only | Reconcile receipt to declaration and period; independently verify source. |
| CAM-TAX-01 | Payslip salary-tax notation | STATUTORY_MANDATORY | CGI 2024 art.81; 2026 reconciliation required | Tax withheld on taxable remuneration | Payroll status only | Confirm current 2026 rule/rates; retain payslip under employee-confidential access. |
| CAM-TAX-02 | Payroll-tax remittance and DIPE evidence | STATUTORY_MANDATORY | CGI 2024 arts.82-84; 2026 reconciliation required | Withheld tax remittance and payroll declaration | Payroll compliance status only | Obtain DGI-generated filing/payment evidence and reconcile period totals. |
| CAM-TAX-03 | Annual employee remuneration declaration | STATUTORY_MANDATORY | CGI 2024 arts.101-102; 2026 reconciliation required | Employee-level annual remuneration declaration | Employee/payroll cross-check | Obtain accepted filing; validate legal identity and tax-ID treatment under restricted access. |
| CAM-ACC-01 | Payroll journals and SYSCOHADA accounting records | ACCOUNTING_REQUIREMENT | AUDCIF/SYSCOHADA; detailed treatment review required | Payroll financial recognition and audit trail | Accounting-role context, not appointment | Tie payroll register to journals and obtain qualified reviewer conclusion. |
| CAM-CBA-01 | Applicable collective agreement determination | LEGAL_APPLICABILITY_DECISION | Labour Code ss.52-56 | Sector/territory agreement applicability | Qualification and employment terms | Determine Stoquify legal entity, sector and establishment before selecting an agreement. |
| CAM-FOR-01 | Foreign-worker contract endorsement/work authorization | CONDITIONAL_STATUTORY_MANDATORY | Labour Code ss.25(2),27(2)-(5),113 | Authority for covered foreign worker to work | Employment eligibility only | Classify nationality/work location; obtain endorsement before authority assignment if applicable. |
| STQ-INT-01 | Identity-to-employee verification record | INTERNAL_CONTROL_REQUIRED_FOR_G1 | Stoquify identity and evidence control | User.id belongs to the verified employee | Stable subject binding | Verify legal identity, User.id, PayrollEmployee.id and tenant; store evidence hash and checker. |
| STQ-INT-02 | Position and organizational assignment | INTERNAL_HRIS_CONTROL | HrisPosition/HrisEmploymentAssignment | Position, unit, dates and status | Eligibility context only | Create effective-dated assignment after employment evidence is verified. |
| STQ-INT-03 | G1 control-role appointment | INTERNAL_GOVERNANCE_CONTROL_REQUIRED_FOR_G1 | Frozen G1 contract plus governance authority policy | Exact canonical control role, scope and dates | Authority reference | Issue signed/hash-bound appointment; independent verifier confirms issuer and scope. |
| STQ-INT-04 | Delegation of G1 authority | INTERNAL_GOVERNANCE_CONTROL | Approved delegation policy | Bounded temporary delegated authority | Delegated eligibility | Record role, decision/scope, start/end, reason, evidence hash and non-conflict check. |
| STQ-INT-05 | Delegation/appointment revocation | INTERNAL_GOVERNANCE_CONTROL | Authority lifecycle policy | Authority no longer active | Immediate invalidation | Revoke eligibility, invalidate affected unconsumed approvals and emit audited event. |
| STQ-INT-06 | SoD and conflict-of-interest assessment | INTERNAL_CONTROL_REQUIRED_FOR_G1 | Approved G1 SoD/COI policy | Assignment conflicts reviewed | Eligibility gate | Evaluate all same-person combinations and evidence-producer/checker conflicts; never self-certify. |
| STQ-INT-07 | Independent evidence verification record | INTERNAL_ASSURANCE_CONTROL_REQUIRED_FOR_G1 | Evidence-integrity policy | Artifact resolved, rehashed and matched | Approval-credit prerequisite | Resolve immutable bytes, recompute SHA-256 and record pass/fail separately from producer. |
| STQ-INT-08 | Fresh-authenticated approval envelope | INTERNAL_APPROVAL_CONTROL_REQUIRED_FOR_G1 | G1 validator and approved authentication policy | Deliberate approval of exact decision/contract | Actual G1 approval | Require fresh authentication, role eligibility, exact contract hash, decision option, timestamp and independent verification. |

## Required data classification and validation

| Field | Type | Authoritative source | Owner | Sensitivity | Validation rule | Expiry/invalidation | If missing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| tenantId | string/cuid | User.organizationId / Organization.id | IAM/platform | INTERNAL | Exact tenant match across user, employee, assignment, evidence and approval | Organization deactivation | Block eligibility |
| stableSubjectId | string/cuid | User.id | IAM | RESTRICTED | Active verified account; tenant match; not display name/email | Account revoked/deleted | Do not assign authority |
| employeeId | string/cuid | PayrollEmployee.id | HR | RESTRICTED | Tenant match, verified employment evidence, non-deleted | Employment end does not erase history | Block authority |
| employeeNumber | string | PayrollEmployee.employeeNumber / employer register | HR | RESTRICTED | Unique within tenant; tie to employer register | Never reused | Resolve before assignment |
| legalName | string | Verified identity and employment records | HR | PERSONAL | Exact controlled cross-check; variants recorded, not silently normalized | Update on legal-name change with provenance | Block identity verification |
| identityVerificationReference | URI/opaque ID | Restricted HR identity evidence | HR/security | HIGHLY_RESTRICTED | Resolvable, access-controlled, hash-bound | Document expiry/change | Block stable link |
| employerIdentifier | string | Organization/corporate records | Governance/legal | INTERNAL | Legal entity and establishment scope | Entity change | Block employer provenance |
| cnpsEmployerReference | masked string + keyed hash | CNPS employer registration | Payroll/compliance | RESTRICTED | CNPS-issued, legal-entity match | CNPS status change | Flag statutory gap; do not synthesize |
| cnpsEmployeeReference | masked string + keyed hash | CNPS worker registration | Payroll/HR | HIGHLY_RESTRICTED | CNPS-issued and employee match; never app identity key | Corrected/superseded record | Flag statutory gap |
| employmentContractReference | opaque ID/URI | Signed employment evidence | HR/legal | HIGHLY_RESTRICTED | Resolvable, parties/scope/dates match | Amendment/termination | Block verified-employment status |
| employmentContractSha256 | 64-char hex | Exact contract bytes | Evidence service | INTERNAL | Recompute and match | Any byte change | Evidence remains unverified |
| employmentStatus | enum | PayrollEmployee.status + employment evidence | HR | RESTRICTED | Effective-dated; termination/suspension rules | Status event | Not eligible |
| positionId | string/cuid | HrisPosition.id | HR | INTERNAL | Active/effective and tenant-scoped | Position end | Block organizational context |
| orgUnitId | string/cuid | HrisOrgUnit.id | HR | INTERNAL | Active/effective and tenant-scoped | Unit end/reorganization | Block scoped authority |
| employmentAssignmentId | string/cuid | HrisEmploymentAssignment.id | HR | RESTRICTED | Employee, position and unit match; active period | Assignment end/suspension | Control role cannot be activated |
| canonicalControlRole | versioned code | G1 authority-role catalog | Governance | INTERNAL | Exact canonical code; not job title/RBAC role | Policy version superseded | No G1 role match |
| authorityReference | opaque ID/URI | Signed appointment/resolution | Governance | RESTRICTED | Issuer authorized; exact role/scope/dates/tenant; artifact hash match | End/revocation/policy drift | Zero approval credit |
| appointmentEvidenceSha256 | 64-char hex | Exact appointment bytes | Evidence service | INTERNAL | Recompute and match | Any byte change | Authority unverified |
| delegationReference | opaque ID/URI | Controlled delegation instrument | Governance | RESTRICTED | Delegator eligible; bounded role/scope/dates; no self-delegation | Mandatory end/revocation | No delegated eligibility |
| authorityScope | structured JSON | Appointment/delegation | Governance | INTERNAL | Tenant, decisions, locations/capabilities and exclusions explicit | Scope/policy change | Fail closed |
| effectiveFrom/effectiveTo | timestamps | Appointment/assignment/delegation | HR/governance | INTERNAL | No inverted/future-invalid periods; approval time inside interval | At effectiveTo | No active eligibility |
| appointingAuthoritySubjectId | string/cuid | User.id plus corporate authority evidence | Governance | RESTRICTED | Issuer themselves authorized; no self-certification | Issuer authority change affects new appointments | Appointment invalid |
| sodResult | PASS/FAIL/EXCEPTION_PENDING | Independent SoD assessment | Internal controls | RESTRICTED | Policy-versioned matrix; producer/checker and maker/checker tested | Assignment/policy/team change | Block eligibility |
| coiResult | PASS/FAIL/DISCLOSED_REVIEW_REQUIRED | Signed COI declaration and review | Governance/HR | HIGHLY_RESTRICTED | Current declaration; reviewer not subject | Periodic or event-driven renewal | Block where policy requires |
| qualificationEvidenceReference | opaque ID/URI | Professional/legal qualification evidence | Governance/compliance | RESTRICTED | Issuer, scope, validity and Cameroon/accounting relevance | Credential expiry/suspension | Block qualified-reviewer roles |
| evidencePathOrUri | content-addressed URI | Evidence vault | Evidence custodian | VARIES | Allowlisted scheme, tenant scope, immutable version, hash match | Retention expiry only after hold review | Evidence unresolved |
| evidenceSha256 | 64-char hex | Exact artifact bytes | Evidence service | INTERNAL | Independent recomputation | Any byte drift invalidates | No verification |
| verifiedBy/verifiedAt | subject ID + timestamp | Independent verification event | Assurance | RESTRICTED | Verifier differs from producer/subject; active authority | Underlying evidence drift | Not verified |
| freshAuthenticatedAt | timestamp | Controlled auth session assurance | IAM | SECURITY | Same subject/tenant/session; not future; approval within 10 minutes | 10 minutes for G1 approval | Approval rejected |
| authenticationAssurance | method + level | Session assurance record | IAM | SECURITY | Policy-approved method; password step-up exists, MFA decision unresolved | Policy/max-age/revocation | Approval rejected |
| decisionIntent | APPROVE/REJECT/ABSTAIN | Human approval UI/API | Human approver | INTERNAL | Explicit action; no role-assignment implication | Superseded decision only | No approval |
| contractArtifactId/version/path/hash | structured binding | Frozen G1 contract | Product/governance | INTERNAL | Exact path and SHA-256; hash currently 11434e…36db | Any contract byte/version change | Approval rejected |
| signatureReference | provider-neutral opaque ID | Controlled approval/e-signature adapter | Approval service | RESTRICTED | Resolvable to immutable evidence and audit trail | Revocation/provider invalidation/artifact drift | Zero G1 credit |
| approvedAt | timestamp | Controlled approval service | Approval service | INTERNAL | At/after fresh auth, within 10 minutes, inside authority period | Underlying binding drift | No approval |
| revocationOrSupersessionStatus | enum + event ref | HR/governance lifecycle event | HR/governance | INTERNAL | Append-only state transition, reason hash and actor | N/A | Treat ambiguous authority as inactive |

## Minimum evidence chain for one G1 signer

1. `User.id` is active, verified and tenant-bound.
2. `PayrollEmployee.id` is linked to that subject using controlled identity evidence.
3. Employment status is corroborated by employer and, where applicable, CNPS records.
4. An active `HrisEmploymentAssignment` identifies position and organizational scope.
5. A separate governance appointment grants the exact canonical G1 control role.
6. Independent SoD/COI and qualification checks pass.
7. The human signs the exact decision through fresh authentication.
8. The final artifact is exported, rehashed and independently verified.

No step may be inferred solely from the one before it.

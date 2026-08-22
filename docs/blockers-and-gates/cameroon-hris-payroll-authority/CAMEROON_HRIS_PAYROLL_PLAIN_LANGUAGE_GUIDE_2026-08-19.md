# Cameroon HRIS/payroll authority evidence — plain-language guide

Prepared 2026-08-19  
Status: **DESIGN AND EVIDENCE ASSESSMENT ONLY**  
LEGAL REVIEW REQUIRED — not a legal-compliance certification.

## The short answer

There is no single Cameroon document called a “Stoquify HRIS/payroll statute” that can fill the G1 names, roles and approvals automatically. The legal sources tell the employer what employment, payroll, social-security, tax and recordkeeping evidence to maintain. Stoquify's employer and governance owners must still identify the real people, verify their employment, appoint them to exact control roles, check conflicts, and obtain their deliberate approvals.

## What the repository actually contains

- The HRIS tables are **not absent**. Prisma contains `PayrollEmployee`, `HrisOrgUnit`, `HrisPosition`, `HrisEmploymentAssignment`, `HrisReportingRelationship` and `HrisManagerDelegation`.
- The foundation migration creates tenant-scoped foreign keys, effective dates, evidence hashes, delegation expiry and revocation checks.
- The controlled read-only assessment recorded 2 organizations, 28 users and 24 payroll employees, but **0 employment assignments** and **0 manager delegations**.
- None of the 17 page-6 candidate names matched an authoritative user or employee record exactly, and the asserted tenant value did not match the configured organizations.
- G1 therefore remains **0/11 decisions and 0/33 role obligations approved**.

## The four separate proof layers

| Layer | Question answered | Example |
| --- | --- | --- |
| Law and regulator rules | What must an employer keep or file? | Labour Code, CNPS notice, DGI declaration |
| Employment evidence | Is this person really employed by this entity? | Contract, employer register, CNPS record |
| Authority evidence | May this person act as the Product owner or Financial controller for G1? | Appointment or bounded delegation |
| Approval evidence | Did that authorized person approve this exact contract decision? | Fresh-authenticated, hash-bound approval envelope |

Passing one layer never automatically passes the next. A CNPS number is not a Stoquify user ID. A job title is not a G1 appointment. A role assignment is not a decision. A signature image is not an authenticated approval trail.

## What “statut” can mean

| Possible meaning | What to obtain |
| --- | --- |
| Statutory legal pack | Dated Labour Code, CNPS, DGI and OHADA sources plus qualified review |
| Employer status | Corporate record, labour-inspector declaration, CNPS employer registration and DGI taxpayer evidence |
| Employee status | Identity check, employment contract/evidence, employer-register entry and CNPS hiring/worker record |
| Payroll status | Payroll register, payslip, DIPE/tax evidence, CNPS declaration/payment and accounting tie-out |
| Governance status | Position assignment, exact G1 appointment/delegation, dates, scope and SoD/COI decision |
| Approval status | Fresh-authenticated human decision bound to the frozen G1 contract and independently verified |

## What to do first

1. **Name the legal employer and evidence owner.** Confirm the exact Stoquify legal entity, tenant, CNPS employer reference, DGI taxpayer reference and the accountable HR/governance custodian.
2. **Build the employee master from real records.** For each proposed person, obtain authorized identity and employment evidence, create or verify `User.id` and `PayrollEmployee.id`, and never match only by display name.
3. **Create effective-dated HR assignments.** Populate position, organizational unit and employment assignment from verified HR evidence. Termination or suspension must close eligibility automatically.
4. **Issue separate G1 appointments.** An authorized governance body must appoint each person to the exact canonical G1 role, scope and dates. Run independent SoD/COI and qualification checks.
5. **Only then collect approvals.** Require fresh authentication, exact contract hash `11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db`, explicit decision intent, immutable evidence and independent rehashing.

## Who provides what

| Provider | Expected evidence | Cannot prove by itself |
| --- | --- | --- |
| MINTSS/Labour Inspectorate | Applicable labour texts, establishment filings, contract endorsement where required, employer-register rules | Who holds an internal G1 role |
| CNPS | Employer/worker registration, hiring/cessation notices, declarations, account and payment evidence | Stoquify stable subject ID or G1 approval |
| DGI | Taxpayer, payroll-tax filing and payment evidence | Employment appointment or control authority |
| Employer HR | Identity cross-check, contract, employee record, position and effective dates | Deliberate G1 approval |
| Employer governance | Control-role appointment, delegation, SoD/COI policy and decision | Employment or regulator filing unless separately evidenced |
| Human approver | Explicit approval through controlled authentication | Independent verification of their own evidence |
| Independent verifier | Artifact resolution, rehash, authority and conflict checks | The approval itself |

## Safe interim process

Until the module exists, HR and governance can operate the templates in this pack manually. Keep original evidence in a restricted repository; place only opaque references, masked identifiers and SHA-256 values in the working register. A second person must verify every identity, appointment and evidence artifact. Candidate names remain candidates until this process completes.

## Current disposition

The architecture can be built, and the repository already has useful foundations. The release blocker cannot be cleared by legal documents alone. It clears only after authentic employment and appointment records exist and the actual G1 validator accepts all 11 human-approved decisions.

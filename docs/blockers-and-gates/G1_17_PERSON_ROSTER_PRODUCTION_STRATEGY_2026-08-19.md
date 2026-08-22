# G1 17-Person Roster Production Strategy

Prepared: 2026-08-19  
Classification: **OPERATIONAL HANDOFF — NOT IDENTITY, AUTHORITY OR APPROVAL EVIDENCE**  
Legal status: **LEGAL REVIEW REQUIRED**

## Executive answer

Do not refactor or reseed the database merely to obtain names, positions or signatures. The existing schema can store employee, organization, position and assignment truth. The missing element is authoritative real-world evidence and governance action.

A narrow later enhancement is justified for an evidence-grade user/employee binding and a separate G1 authority registry. It must be designed after the employer/tenant and governance policy are confirmed, and must not be used to manufacture approvals.

## Three-layer model

| Layer | What it proves | Source | Must not be used as |
| --- | --- | --- | --- |
| Employment/HRIS | The person works for the legal employer in an effective-dated job/assignment | HR records, contract, CNPS evidence, identity verification | Automatic G1 authority |
| Governance appointment | The person is authorized for one exact canonical G1 control role and scope | Board/executive/governance appointment artifact | Automatic approval intent |
| Decision approval | The appointed person deliberately approves a specific decision and frozen artifact | Fresh-auth approval envelope and independent verification | Reusable approval after drift |

## What regulatory documents can provide

Cameroon and OHADA sources can provide legal employer fields, employee legal-name fields, CNPS employer/insured numbers, hiring/cessation dates, contract and wage-record duties, tax/declaration duties, company-signature/stamp fields and accounting-record requirements.

They cannot provide the names of Stoquify's Product owner, Security owner, Financial controller or other G1 control owners. They also cannot provide those people's signatures. Stoquify governance must appoint the people, and each person must personally authenticate and approve.

## Minimum evidence packet

### Employer packet

- Legal entity name and registration evidence.
- RCCM/statutes or equivalent constitutive record.
- DGI taxpayer/NIU evidence.
- CNPS employer matricule and establishment evidence.
- Evidence identifying who may appoint internal control owners.
- Mapping from the legal employer to the exact Stoquify `Organization.id`.

### Person packet

- Authorized identity evidence.
- Employment contract/appointment and active status.
- CNPS insured number or registration evidence where applicable.
- Existing IAM and payroll identifiers, if any.
- Organization/position assignment.
- Required professional qualification evidence.
- Conflict/SoD declaration.

### G1 appointment packet

- Exact canonical role code and description.
- Named appointee bound to `User.id` and `PayrollEmployee.id`.
- Scope, tenant, effective dates and revocation conditions.
- Appointing authority reference.
- Maker/checker and conflict result.
- Immutable appointment artifact and SHA-256.

## Decision rule for current data

- Do not promote any of the 28 users or 24 draft payroll employees solely because they exist.
- Do not replace a page-6 candidate using a fuzzy name match.
- Keep all 17 page-6 names as `CANDIDATE — UNVERIFIED` until HR/security evidence resolves them.
- Create a new account or employee record only after governance confirms the real person and reconciliation proves no valid record already exists.
- Keep unrelated seed/development records separate or quarantined; do not destroy them during G1 work.

## Completion order

1. Legal employer and tenant decision.
2. Governance owner and appointing-authority decision.
3. Seventeen-person evidence collection and reconciliation.
4. Controlled account/employee creation or binding.
5. Organization, position and employment assignment.
6. Separate G1 appointments and qualification checks.
7. SoD/COI resolution and independent roster approval.
8. Fresh-auth collection of 33 decision-role approvals.
9. Independent evidence rehash and validator replay.

G1 remains blocked until the real validator accepts all 11 decisions and all 33 obligations.

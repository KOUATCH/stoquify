# HRIS/payroll unresolved evidence register

Prepared 2026-08-19  
Status: **OPEN — G1 REMAINS 0/11 AND 0/33**

## Current database facts

| Record | Count |
| --- | --- |
| organizations | 2 |
| users | 28 |
| payrollEmployees | 24 |
| orgUnits | 0 |
| positions | 0 |
| employmentAssignments | 0 |
| reportingRelationships | 0 |
| managerDelegations | 0 |
| freshAssuranceSessions | 0 |

Additional facts:

- All 24 payroll employees are `DRAFT`.
- Linked `User.id` values: 0.
- Payroll contracts: 24, active contracts: 0, signed-document hashes: 0.
- Application role links: 0.
- Application tenant records: 2; legal-employer selection: unresolved.

## Required resolutions

| ID | Unresolved requirement | Owner | Acceptance evidence |
| --- | --- | --- | --- |
| EMPLOYER-01 | Confirm the exact Cameroon legal employer and establishment | Corporate governance/legal | Signed corporate decision plus registry evidence |
| TENANT-01 | Select the application tenant that represents that legal employer | Governance/platform owner | Tenant-to-legal-entity binding |
| CNPS-01 | Obtain the CNPS employer registration reference and current-status evidence | Payroll/compliance | CNPS-issued evidence, masked/hash recorded |
| DGI-01 | Confirm the DGI taxpayer reference for the selected legal employer | Tax/legal | DGI-issued evidence reconciled to legal entity |
| OWNER-01 | Appoint accountable HR and governance evidence custodians | Corporate governance | Stable IDs, authority references, scope and dates |
| IDENTITY-01 | Verify all 17 page-6 people | HR/security | Controlled identity evidence and exact User.id↔PayrollEmployee.id binding |
| EMPLOYMENT-01 | Activate evidence-backed employee masters | HR | Employment source evidence, active status and signed-document hash |
| ASSIGN-01 | Create effective-dated org units, positions and assignments | HR | Approved assignment records; termination/suspension fail-closed |
| AUTH-01 | Issue 17 exact G1 role appointments or bounded delegations | Governance | Issuer authority, tenant, scope, dates and evidence hash |
| SOD-01 | Run independent SoD/COI and qualification checks | Controls reviewer | Stable-ID results and approved exceptions if any |
| APPROVAL-01 | Collect 33 deliberate fresh-authenticated approvals | Human signers/IAM | Ten-minute window, explicit intent and exact contract hash |
| VERIFY-01 | Independently resolve and rehash every evidence envelope | Independent verifier | Pass/fail verification record |

## Gate boundary

The database can provide stable identifiers only after an authentic person/employee binding exists. It cannot issue corporate authority, SoD clearance or human approval. `policy:gates` and `verify:release` remain out of scope until the actual G1 validator is eligible.

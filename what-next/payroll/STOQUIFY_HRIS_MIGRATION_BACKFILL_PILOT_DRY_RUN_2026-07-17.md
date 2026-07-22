# Stoquify HRIS Migration/Backfill Pilot Dry Run

Generated: 2026-07-17T05:04:15.793Z
Status: BLOCKED
Dry-run only: yes
Mutation mode available: no

## Scope

- Organization: organization:0a89d2168fda329b
- Compatibility storage: PayrollEmployee_and_related_payroll_source_tables
- Target ownership: HRIS_PEOPLE_CORE
- Employee scan limit: 250
- Employees scanned: 1
- Scan truncated: false

## Reconciliation

- Employees: 1
- Contracts: 1
- Compensation assignments: 1
- Payment-destination requests: 1
- Attendance snapshots: 2
- Payroll runs: 2
- Adoptable projections: 0
- Legacy-unverified projections: 1
- Blockers: 5
- Warnings: 0

## Data-Quality Gaps

| Code | Severity | Count | Reason |
| --- | --- | ---: | --- |
| ACTIVE_COMPENSATION_APPROVAL_PROOF_MISSING | BLOCKER | 1 | An active compensation assignment lacks maker-checker approval proof. |
| ACTIVE_CONTRACT_APPROVAL_PROOF_MISSING | BLOCKER | 1 | An active contract lacks HRIS maker-checker activation proof. |
| ACTIVE_CONTRACT_DOCUMENT_PROOF_MISSING | BLOCKER | 1 | An active contract lacks governed signed-document evidence. |
| EMPLOYEE_SOURCE_PROOF_MISSING | BLOCKER | 1 | A compatibility employee row has no complete HRIS source-system, source-record, and source-hash proof. |
| PAYMENT_DESTINATION_APPLIED_PROOF_MISSING | BLOCKER | 1 | The current payment destination is not tied to a complete applied approval record. |

## Correction-Only Plan

| Gap | Operation | Count | Idempotency key | Instruction |
| --- | --- | ---: | --- | --- |
| ACTIVE_COMPENSATION_APPROVAL_PROOF_MISSING | APPEND_CORRECTION | 1 | hris-migration-correction:5cd0b1d9c5117c07 | Re-review the legacy assignment and append approval evidence and a business event; do not edit historical payroll outputs. |
| ACTIVE_CONTRACT_APPROVAL_PROOF_MISSING | APPEND_CORRECTION | 1 | hris-migration-correction:a8ec1a6655f9fb07 | Re-review the legacy activation and append approval and activation business-event evidence without rewriting the contract. |
| ACTIVE_CONTRACT_DOCUMENT_PROOF_MISSING | APPEND_CORRECTION | 1 | hris-migration-correction:4cbbdd04a68dafbf | Capture and approve signed-document evidence under retention, malware-scan, and legal-hold controls. |
| EMPLOYEE_SOURCE_PROOF_MISSING | APPEND_CORRECTION | 1 | hris-migration-correction:c06e9b9da9a47225 | Append reviewed HRIS source proof or classify the row as legacy-unverified; never invent historical identity facts. |
| PAYMENT_DESTINATION_APPLIED_PROOF_MISSING | APPEND_CORRECTION | 1 | hris-migration-correction:0558ca3b8257934e | Reconcile the destination hash to an applied request with document, approval, and business-event proof. |

## Evidence

- Source projection hash: sha256:f2a9f18dbbcc36170bd37221a905f9fb05960892fe381493154a41c522095796
- Correction plan hash: sha256:8fd13d3004a375fad5f06d9dc52f1a4be5226edb0f8945a468f7574c1c3fc60f
- Immutable evidence hash before: sha256:34af8a4c7429451ecdcb66e88319aefba5d8356608a23d57656cbb9fab25a237
- Immutable evidence hash after: sha256:34af8a4c7429451ecdcb66e88319aefba5d8356608a23d57656cbb9fab25a237
- Reconciliation hash: sha256:5a748cf6e836ca8eb82330021a9a4c6f403a9e08e2172cf84b8f35fd49c25f31
- Plan hash: sha256:d7f13d84f046a7796c0c3bdd859442ef2ad7d6182ce21ffd91baf11a0be6ff93

## Rollback Simulation

- Strategy: CORRECTION_ONLY
- Mutation count: 0
- Destructive operations: 0
- Immutable evidence preserved: true
- Result: NO_OP_DRY_RUN

## Pilot Close Pack

- Status: BLOCKED
- hr-owner: PENDING
- payroll-owner: PENDING
- accounting-controller: PENDING
- security-privacy: PENDING
- operations-owner: PENDING

## Redaction

- Raw person data included: false
- Raw salary included: false
- Raw payment destination included: false
- Raw document content included: false
- Raw proof hashes included: false

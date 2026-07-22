# Stoquify HRIS Migration/Backfill Pilot Dry Run

Generated: 2026-07-17T05:40:12.903Z
Status: READY_FOR_OWNER_SIGNOFF
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
- Adoptable projections: 1
- Legacy-unverified projections: 0
- Blockers: 0
- Warnings: 0

## Data-Quality Gaps

| Code | Severity | Count | Reason |
| --- | --- | ---: | --- |
| None | - | 0 | No data-quality gaps detected. |

## Correction-Only Plan

| Gap | Operation | Count | Idempotency key | Instruction |
| --- | --- | ---: | --- | --- |
| None | REVIEW_ONLY | 0 | none | No correction steps required. |

## Evidence

- Source projection hash: sha256:505d71157d80e7a4111f22c1aec277e260f3d966432d1e42bd20787fe9895c6c
- Correction plan hash: sha256:4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
- Immutable evidence hash before: sha256:b6669fa086160dcf839c8eef3a18295cde6bd0e59bb1575ea3145c42eeefbc46
- Immutable evidence hash after: sha256:b6669fa086160dcf839c8eef3a18295cde6bd0e59bb1575ea3145c42eeefbc46
- Reconciliation hash: sha256:fd48b8f98d09e01b0d6630f78718f2207edd461bdc8dc8e7e3401555740cccfa
- Plan hash: sha256:3a04f52c32263fb704b9905f31dfac7562a677e3cd17f27097b621796a41db4d

## Rollback Simulation

- Strategy: CORRECTION_ONLY
- Mutation count: 0
- Destructive operations: 0
- Immutable evidence preserved: true
- Result: NO_OP_DRY_RUN

## Pilot Close Pack

- Status: PENDING_OWNER_SIGNOFF
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

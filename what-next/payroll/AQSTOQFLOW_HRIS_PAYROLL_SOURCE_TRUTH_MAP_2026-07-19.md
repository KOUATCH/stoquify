# AqStoqFlow HRIS–Payroll Source-of-Truth Map

Date: 2026-07-19  
Skill: `aqstoqflow-hris-payroll-02-source-truth-map`  
Status: **ownership frozen for phased migration**

## Ownership rules

| Truth or artifact | Canonical owner | Current physical source | Authorized consumers | Mutation rule | Audit/redaction rule |
|---|---|---|---|---|---|
| Employee identity and profile | HRIS | `PayrollEmployee` compatibility row | Payroll, manager/self-service read models | HRIS facade only; legacy actions become adapters | Tenant-scoped; identifiers redacted by permission |
| User-to-employee mapping | HRIS | Payroll employee compatibility relation | Self-service, Payroll readiness | Server-derived authenticated mapping; duplicate mapping fails closed | Never trust submitted user/employee IDs |
| Employment lifecycle | HRIS | Employee metadata compatibility projection | Payroll readiness, access, reporting | Audited effective-dated workflow; migrate to relational model | Redacted event payload and reason evidence |
| Organization, position, manager | HRIS | Location responsibility plus partial metadata | Manager scope, approvals, cost allocation | Durable effective-dated relationship required | No scope inferred from navigation |
| Contract and amendments | HRIS | `PayrollContract` compatibility row/metadata | Payroll snapshot, documents | Approved effective-dated contract only | Document access audited and role-redacted |
| Compensation and benefits | HRIS | Payroll assignment/salary-change tables | Payroll snapshot | Approved effective-dated record; maker-checker | Salary hidden outside explicit permission |
| Payment destination evidence | HRIS | Payroll destination-change/evidence storage | Payroll payments | Fresh-auth maker-checker; Payroll is read consumer | Only masked destination and proof hashes by default |
| Documents and retention | HRIS | Contract/employee metadata and evidence references | Readiness, self-service, audit | Authorized evidence service; relational governance target | No raw content in default lists/reports |
| Schedule, leave, attendance, overtime | HRIS | Certified aggregate and `PayrollAttendanceSnapshot` compatibility row | Payroll snapshot | Approved source events; freeze then correction/supersession | Manager scope and audit required |
| HRIS readiness verdict | HRIS | `services/hris/payroll-readiness-contract.ts` | Payroll run orchestration, assurance | Deterministic, tenant-scoped, fail closed | Blocker codes; no unnecessary PII |
| Payroll input snapshot | Payroll boundary consuming HRIS proof | Hash-bound run evidence and compatibility snapshot rows | Calculation and assurance | Persist immutable versioned aggregate; no live mutable reads | Hashes, versions, approvals, correction lineage |
| Payroll calculation/run lines | Payroll | Payroll run/run-line tables | Payslip, register, accounting | Certified snapshot inputs only; correction run after finalization | Immutable finalized evidence |
| Country-pack rules | Regulatory/Compliance | Country-pack registry and fixtures | Payroll calculation, declarations | Effective-dated, source-hashed, expert reviewed | Unsupported state blocks, never warns-only |
| Payment batch and settlement | Payroll | Payment batch/allocation/reconciliation tables | Provider, accounting, assurance | Approved destination/run proof required | Mask destination; preserve provider proof hash |
| Declaration and authority proof | Payroll/Compliance | Declaration/evidence and adapter records | Authority, close assurance | Reviewed payload and auditable callback lifecycle | Redacted payload summaries and proof hashes |
| Ledger entries and balances | Accounting | Accounting ledger/source links | Close, reporting, assurance | Balanced source-linked posting/reversal only | Financial audit rules apply |
| Release and close evidence | Assurance | Reports, proof packs, hashes, gates | Auditors, operators, release owners | Evidence-only; cannot mutate business truth | Redacted, dated, scoped, reproducible |

## Current direct-writer inventory

| Surface | Current state | Migration decision |
|---|---|---|
| `actions/payroll/payroll-employee.actions.ts` | Directly invokes Payroll employee physical writers | First tranche: delegate through HRIS facade |
| `actions/payroll/payroll-contract.actions.ts` | Direct contract writer | Later bounded adapter tranche |
| `actions/payroll/payroll-compensation.actions.ts` | Direct compensation writer | Later bounded adapter tranche |
| `actions/payroll/payroll-payment-evidence.actions.ts` | Direct destination writer | Later bounded adapter tranche |
| HRIS lifecycle/document/time services | Write Payroll-named compatibility storage | Retain temporarily; replace through relational migrations and snapshot boundary |

## Boundary and graph evidence

- HRIS employee facade: Services graph Community 13.
- Payroll and HRIS employee action surfaces: Actions graph Communities 36 and 47.
- Related contract, compensation, destination, and lifecycle writer clusters: Services Communities 37, 28, 39, and 41.
- Graphs are advisory: they do not prove Prisma ownership, database triggers, or module entitlement and were supplemented by code and schema inspection.

## Tenant/RBAC and audit decision

All reads and writes derive organization and actor context server-side. Legacy action adapters retain current Payroll module/RBAC contracts during migration, while service ownership moves to HRIS. Sensitive data stays redacted; fresh authentication and maker-checker controls remain mandatory for high-risk changes.

## Stop conditions

Stop a migration if it creates two masters, bypasses the HRIS facade, weakens existing Payroll controls, cannot reconcile old/new results, or cannot preserve evidence and rollback/correction lineage.

## Verification and handoff

The matrix contains one owner for HRIS, Payroll, Accounting, Assurance, Compliance/Country Packs, plus explicit consumers, mutation rules, and audit/redaction rules. Next handoff: the employee writer-consolidation slice of `aqstoqflow-hris-payroll-03-employee-identity`.


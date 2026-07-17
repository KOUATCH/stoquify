# AqStoqFlow Payroll-Grade HRIS First Blueprint

Date: 2026-07-12

## What We Are Building

We should solve the HR/payroll sequencing problem by creating an HRIS foundation layer that becomes the people and source-data truth, then make payroll consume that truth through readiness gates.

We should not throw away the payroll work already built. We should preserve it, freeze it as the payroll/control kernel, and progressively move employee, contract, compensation, attendance, leave, document, approval, and payment-destination truth into a stronger HRIS core.

## Language Locked

- HRIS: the authoritative employee, contract, compensation, attendance, leave, document, org-structure, approval, and audit system.
- Payroll: the statutory and financial engine that calculates, posts, pays, declares, and proves payroll using HRIS truth.
- Payroll-grade HRIS: not a generic HR dashboard; it must be tenant-safe, audited, RBAC-controlled, approval-driven, evidence-backed, and immutable where required.
- Readiness gate: payroll must refuse to run when required HRIS data is missing, unapproved, stale, contradictory, or not traceable.

## Core Principle

HRIS owns people truth.

Payroll owns financial and statutory pay truth.

Accounting owns ledger truth.

Assurance proves the whole chain.

## The Spine

- State: HRIS owns employee truth. Payroll derives payable truth from approved HRIS snapshots. Accounting owns ledger truth. Assurance proves the chain.
- Data model: introduce or strengthen HRIS entities for employee profile, org unit, position, manager, contract, compensation package, benefits, leave, attendance, documents, approvals, and audit events.
- Contract: payroll consumes HRIS through service-owned read models like `getPayrollInputReadiness`, `getEmployeePayrollProfile`, and `freezePayrollInputSnapshot`.
- Trust boundary: all HRIS mutations go through server actions and services with tenant isolation, RBAC, fresh auth for sensitive changes, maker-checker approvals, audit logs, and redaction.
- Sync model: HRIS changes are request/approval based; payroll takes immutable period snapshots, not live mutable reads.
- Failure handling: fail closed. No complete HRIS proof, no payroll run.

## Smooth Build Order

### 1. Stabilize Current Payroll As A Consumer

Keep the existing payroll kernel, reports, routes, immutability, and close-pack evidence.

Reframe the existing payroll module as a consumer of certified HRIS truth, not the owner of employee truth.

### 2. Build HRIS Core Foundation

Implement or strengthen:

- Employee master data.
- Organization structure.
- Branch, department, position, and manager hierarchy.
- Employment status.
- Contract lifecycle.
- Compensation package.
- Payment destination.
- Documents and evidence.
- Approvals.
- Audit trail.
- Tenant isolation.
- RBAC and redaction.

### 3. Add HRIS Readiness Scoring

Each employee should have a payroll-readiness state:

- `ready`
- `blocked`
- `needs_approval`
- `missing_evidence`
- `stale_contract`
- `invalid_payment_destination`
- `missing_attendance`
- `unsupported_country_pack`

Payroll should be able to explain why an employee or period is not ready.

### 4. Build Time, Leave, And Attendance

Implement or strengthen:

- Work schedules.
- Leave policies.
- Absences.
- Leave balances.
- Overtime.
- Attendance corrections.
- Approvals.
- Country calendars.
- Frozen attendance snapshots.

### 5. Create Payroll Input Snapshot

Payroll should run only from a locked snapshot of HRIS data for a period.

The snapshot should include:

- Employee identity.
- Contract.
- Compensation.
- Benefits and deductions.
- Attendance.
- Leave.
- Overtime.
- Payment destination.
- Country pack and statutory context.
- Approval and evidence links.

Later HRIS changes should create corrections, not silently mutate payroll truth.

### 6. Reconnect Payroll Engine

Payroll calculation should read from the snapshot:

- Contract terms.
- Salary.
- Rubriques.
- Benefits.
- Deductions.
- Attendance.
- Leave.
- Overtime.
- Payment destination.
- Statutory country pack.

The payroll engine should produce:

- Payroll run.
- Run lines.
- Payslips.
- Register.
- Payment batch.
- Declarations.
- Accounting posting evidence.
- Close assurance evidence.

### 7. Add Employee And Manager Self-Service

Employees should be able to:

- View payslips.
- Request profile changes.
- Request payment destination changes.
- Upload documents.
- Request leave.
- Track approval status.

Managers should be able to:

- Approve leave.
- Approve attendance corrections.
- Review team payroll readiness issues.
- Approve scoped HR changes where policy allows.

### 8. Certify The Whole Chain

Before unrestricted production, certify:

- Browser route smoke.
- RBAC negative tests.
- Tenant isolation.
- Immutability checks.
- Statutory fixtures.
- Provider and authority proof.
- Audit/export redaction.
- Policy gates.
- Release evidence.

## Key Decisions

### HRIS First, Payroll Second, Accounting Third

Default decision: build the payroll-grade HRIS foundation first, then make payroll consume it, then let accounting and assurance prove the financial chain.

Tradeoff: this is slower than adding payroll screens, but much safer and more professional.

### Payroll Snapshots Instead Of Live HR Reads

Default decision: payroll runs from frozen period snapshots.

Tradeoff: this requires correction workflows, but prevents fragile recalculation and audit confusion.

### Service-Owned HRIS Read Models Before UI

Default decision: build APIs, services, state contracts, and read models before building new dashboard surfaces.

Tradeoff: less visual progress at first, but it avoids building attractive screens on weak truth.

### Maker-Checker For Sensitive HR Changes

Default decision: salary, contract, payment destination, termination, and retroactive attendance changes require approval.

Tradeoff: more workflow complexity, but essential for enterprise trust.

## Quality Risks Handled

- Wrong payslips: blocked by HRIS readiness gates and payroll snapshots.
- Duplicate employees: blocked by identity/user matching and duplicate checks.
- Weak audit trail: solved through HRIS event history and approval evidence.
- Bad declarations: payroll can declare only from certified statutory and HRIS snapshots.
- Fragile corrections: handled through correction runs and adjustment evidence.
- Data leaks: controlled through redaction and RBAC by role, scope, tenant, and export type.

## Build Order For The Dream System

1. Canonical HRIS/payroll architecture report under `docs/HR-Payroll` and `what-next/payroll`.
2. HRIS core schema and service design.
3. Employee master data and organization structure.
4. Contract and compensation lifecycle.
5. Payment destination and document evidence.
6. Time, leave, and attendance engine.
7. Payroll input readiness gate.
8. Payroll snapshot and correction model.
9. Payroll engine integration.
10. Employee and manager self-service.
11. Full release, security, and browser certification.

## Out Of Scope For The First Slice

Do not start with:

- Recruitment.
- Performance reviews.
- Training.
- AI insights.
- Complex BI.
- A huge HR dashboard.

Those come after the source-of-truth foundation is strong.

## Recommendation

Begin with a narrow HRIS Core Foundation plus Payroll Input Readiness Gate program.

That gives the platform a clean spine:

- HRIS owns people truth.
- Payroll consumes certified snapshots.
- Accounting records the money truth.
- Assurance proves everything.

Blueprint ready.

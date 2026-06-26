# AqStoqFlow 012 Payroll Presence Architecture Gate Report

Date: 2026-06-15

Skill run: `012-aqstoqflow-payroll-presence-architect`

Installed skill path: `C:\Users\J COMPUTER\.codex\skills\012-aqstoqflow-payroll-presence-architect`

Base implementation skill: `012-aqstoqflow-payroll-presence-engine`

Gate result: `PARTIAL - CONTINUE 012, DO NOT ADVANCE TO 013 YET`

## Purpose

This report records the architecture run for the HR, presence, attendance, payroll, payslip, declaration, ledger, payment, RBAC, and verification slice of AqStoqFlow 012.

The installed architecture skill complements the existing implementation skill. It defines the enterprise boundaries and gates that must be satisfied before the payroll/presence engine is treated as complete.

## Evidence Used

- `graphify-out/GRAPH_REPORT.md` identifies payroll/presence as an existing architectural community: Community 181 includes Payroll Approval Workflows, Dedicated Payroll Tables, and Real-Time Payroll Calculation Engine.
- `what-next/AQSTOQFLOW_ORDERED_IMPLEMENTATION_CHUNKS_AND_SKILL_SUITE_2026-06-14.md` defines Chunk 11 as HR, Presence, Payroll, Payslips, and Payroll Payments.
- `what-next/AQSTOQFLOW_011_AP_FINALIZER_CLOSURE_REPORT_2026-06-15.md` confirms 011 AP finalizer closure, with AP posting recipes, AP workbench, supplier payment reconciliation evidence, country-pack AP status, and validation evidence.
- The current repo now contains a first payroll foundation slice in Prisma schema, accounting posting recipes, RBAC permission mapping, and sensitive-action controls.

## Current State

The run classifies 012 as `PARTIAL`.

Foundation now present:

- Tenant-scoped payroll/presence Prisma models and enums for employees, contracts, periods, attendance snapshots, payroll runs, run lines, payslips, payslip lines, declarations, payment batches, and payment allocations.
- Payroll posting-rule amount sources for net payable, employee deductions, and employer charges.
- Default SYSCOHADA payroll posting recipes for payroll runs and payroll payments.
- Payroll permissions added to centralized permission configuration.
- Payroll RBAC compatibility aliases and critical-risk classification.
- Sensitive-action controls for payroll run approval and payroll payment release.
- Focused tests for default payroll posting rules, sensitive payroll action checks, and RBAC compatibility.

Still missing:

- `services/hr/*`, `services/presence/*`, and `services/payroll/*` control services.
- Server actions, hooks, and workbench UI for HR, attendance, payroll review, payslips, declarations, and payment batches.
- Payroll calculation service that resolves all country-pack rates by effective date and records parameter provenance.
- Business event/outbox emission for attendance freeze, payroll run approval, payslip issue, declaration preparation, and payment batch release.
- Payroll payment reconciliation integration with the existing payment evidence moat.
- Immutable payslip/correction workflow tests.
- Payroll declaration fixtures and expert-validated legal formulas per country pack.

## Architecture Contract

The 012 module must remain ledger-first, tenant-scoped, country-pack-driven, and event-backed.

Every approved payroll run must have:

- Organization and tenant scope on every row and service call.
- Effective-dated country-pack provenance for payroll, tax, social, and declaration parameters.
- Immutable attendance snapshot input after payroll calculation starts.
- Maker-checker approval before posting or payment release.
- Balanced SYSCOHADA journal entries before any payment batch is released.
- Source links from payroll run lines, payslips, declarations, payment allocations, journal entries, and business events.
- Typed error and notification paths for missing contracts, unresolved country-pack parameters, unbalanced postings, stale payroll periods, duplicate approvals, and reconciliation exceptions.

## Three Integration Options

### Option A: Kernel-First Payroll Control Plane

Build the HR/presence/payroll service layer first, then expose actions and UI after the domain controls are testable.

This is the recommended path.

Why:

- Best fit for ledger-first implementation.
- Keeps payroll calculations deterministic and testable before UI complexity.
- Lets RBAC, fresh-auth, SoD, idempotency, event outbox, and rollback tests harden the risky operations early.
- Allows later UI screens to consume truthful read models instead of inventing state.

Tradeoff:

- Users do not see a finished workbench immediately.

### Option B: Workbench-First Read Model

Build the AP-style payroll workbench shell first, with read-only payroll period, attendance, and run status cards, then attach service actions.

Why:

- Useful for stakeholder review and navigation validation.
- Makes certification and close blockers visible early.

Tradeoff:

- Higher risk of UI state drifting from legal/accounting truth unless actions remain disabled until services are complete.

### Option C: Event-First Parallel Integration

Start with payroll business events, outbox contracts, and replay/idempotency tests, then connect services and UI.

Why:

- Strongest fit if 012 is being coordinated with offline sync, accountant portal, or compliance certification.
- Reduces later integration risk with 004 business events and 013 reporting.

Tradeoff:

- More upfront infrastructure work before HR/payroll workflows are usable.

Recommended sequence: Option A, then a read-only subset of Option B, then Option C expansion where event replay and certification surfaces are needed.

## Recommended Module Shape

Services:

- `services/hr/employee.service.ts`
- `services/hr/contract.service.ts`
- `services/presence/attendance-snapshot.service.ts`
- `services/payroll/payroll-run.service.ts`
- `services/payroll/payroll-calculation.service.ts`
- `services/payroll/payslip.service.ts`
- `services/payroll/payroll-declaration.service.ts`
- `services/payroll/payroll-payment.service.ts`
- `services/payroll/payroll-posting.service.ts`

Actions:

- `actions/payroll/employee.actions.ts`
- `actions/payroll/attendance.actions.ts`
- `actions/payroll/payroll-run.actions.ts`
- `actions/payroll/payslip.actions.ts`
- `actions/payroll/declaration.actions.ts`
- `actions/payroll/payment-batch.actions.ts`

Hooks:

- `hooks/payrollHooks/usePayrollPeriods.ts`
- `hooks/payrollHooks/usePayrollRuns.ts`
- `hooks/payrollHooks/useAttendanceSnapshots.ts`
- `hooks/payrollHooks/usePayslips.ts`
- `hooks/payrollHooks/usePayrollPayments.ts`

UI:

- `app/[locale]/(dashboard)/dashboard/hr/*`
- `app/[locale]/(dashboard)/dashboard/presence/*`
- `app/[locale]/(dashboard)/dashboard/payroll/*`
- `components/payroll/*`

## Business Events

Minimum events for 012:

- `HR_EMPLOYEE_CREATED`
- `HR_CONTRACT_ACTIVATED`
- `ATTENDANCE_SNAPSHOT_FROZEN`
- `ATTENDANCE_CORRECTION_REQUESTED`
- `PAYROLL_RUN_CALCULATED`
- `PAYROLL_RUN_REVIEWED`
- `PAYROLL_RUN_APPROVED`
- `PAYROLL_RUN_POSTED`
- `PAYSLIP_ISSUED`
- `PAYROLL_DECLARATION_PREPARED`
- `PAYROLL_PAYMENT_BATCH_RELEASED`
- `PAYROLL_PAYMENT_RECONCILED`

Each event must include tenant scope, actor, source aggregate, idempotency key, correlation ID, and immutable payload hash where the source state becomes legal or accounting evidence.

## RBAC And SoD Matrix

Minimum permissions:

- HR clerk: read/manage employees and contracts, but cannot approve payroll or release payments.
- Presence manager: freeze attendance and request corrections, but cannot approve payroll runs.
- Payroll preparer: calculate and review payroll, but cannot approve their own run.
- Payroll approver: approve payroll runs with fresh authority and SoD enforcement.
- Accountant: post payroll journals and review liabilities.
- Finance approver: release payroll payment batches with fresh authority and reconciliation evidence.
- Auditor/accountant portal: read source-linked payroll reports and exports only.

Critical controls:

- `payroll.runs.approve` must be fresh-auth and SoD protected.
- `payroll.runs.post` must require balanced journal preview and open fiscal period.
- `payroll.payments.release` must require approved payroll run, posted journals, payment batch controls, and fresh authority.

## Ledger Posting Design

Payroll run posting should debit salary expense and employer-charge expense, then credit employee net payable and statutory/social liabilities.

Payroll payment posting should debit employee net payable and credit bank or cash clearing. Payment release must not occur unless the payable balance matches the approved payroll batch and payment evidence can be reconciled.

Every posting must reference:

- Payroll run ID.
- Payroll period ID.
- Payslip or employee line where applicable.
- Country-pack version and parameter paths used for payroll/tax/social calculations.
- Business event and correlation ID.

## UI Workbench Design

The 012 workbench should follow the AP workbench pattern but expose truthful payroll statuses only:

- Period readiness: contracts complete, attendance frozen, country pack valid, fiscal period open.
- Payroll run state: draft, calculated, review, approved, posted, paid, cancelled, reversed.
- Blocking exceptions: missing contract, attendance anomaly, country-pack parameter missing, journal preview unbalanced, payment mismatch.
- Payslip status: draft, issued, voided, corrected.
- Declaration status: draft, prepared, submitted, accepted, rejected, corrected.
- Payment status: draft, approved, released, partially reconciled, reconciled, exception.

No UI should claim legal submission, statutory acceptance, payroll correctness, or payment reconciliation until the corresponding service evidence exists.

## Verification Run

Passed:

- Installed skill validation: `quick_validate.py` reported `Skill is valid!`
- Prisma schema validation: `npm run prisma:validate`
- Focused Jest suites: `npm test -- --runTestsByPath services/accounting/__tests__/default-posting-rules.service.test.ts services/controls/__tests__/sensitive-action.service.test.ts lib/security/__tests__/rbac-permissions.test.ts --runInBand`
- TypeScript check: `npm run typecheck`

Known environment note:

- A full `prisma generate` previously hit a Windows Prisma query-engine DLL rename lock. `npx prisma generate --no-engine` completed successfully as a safe fallback for client type generation.

## Stop Conditions Before 013

Do not advance to 013 until 012 has:

- Payroll control services with tenant-scope tests.
- Attendance freeze and correction workflows with rollback/idempotency tests.
- Payroll calculation fixtures proving country-pack parameter provenance.
- Approval, posting, payslip issue, declaration preparation, and payment release events in the outbox.
- Balanced payroll journal tests, including rollback on posting failure.
- Payroll payment reconciliation evidence and exception handling.
- Workbench UI that only exposes truthful receipt/status fields.
- Full focused verification evidence saved in `what-next/`.

## Next Execution Path

Run `012-aqstoqflow-payroll-presence-engine` next using this architecture report as the gate contract.

The first implementation slice should be:

1. Payroll period and attendance snapshot services.
2. Payroll run calculation service with country-pack provenance.
3. Approval and posting orchestration with outbox events.
4. Idempotency and rollback tests.
5. Read-only payroll workbench status cards.

The current state is ready to continue 012, but it is not ready to move to 013.

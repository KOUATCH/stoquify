# Aqstoqflow HRIS/payroll time, leave, and protected-action run report

Date: 2026-08-22
Result: `APPROVED_FOR_WP5_INTERNAL_ENGINEERING_ONLY`

## Outcome

The payroll Trust Spine now exposes independent, protected review, approval, payslip-emission, and posting commands. All sensitive context is derived from the authenticated server boundary, and declaration preparation now requires step-up authentication.

Approved leave now produces a canonical `LEAVE_APPROVED` business event with durable request linkage, outbox evidence, audit evidence, and leave-balance debit inside one tenant-scoped transaction. The event is marked applied last. Requester self-approval, insufficient certified balance, missing approval evidence, cross-scope employee access, and event-persistence failure continue to fail closed.

## Proof

- Focused protected-action and operational-time suites: 32/32 passed.
- Combined canonical-event, transition-ledger, lifecycle, protected-action, leave, and attendance suites: 72/72 passed.
- Full TypeScript compile: passed with no diagnostics.
- Focused lint and diff whitespace checks: passed.
- No collapsed `approveAndPostPayrollRunAction` export remains.

## Ownership and trust decision

- HRIS remains the owner of leave/request and balance truth.
- Payroll consumes approved, traceable HRIS evidence and does not invent leave state.
- Business-event, outbox, request linkage, balance mutation, audit, and applied status share the transaction.
- Tenant, actor, permissions, and fresh-auth facts remain server-derived.

## Honest limit and handoff

This is internal engineering readiness, not production or statutory certification. WP5 may now extend certified-close invalidation and data-trust blockers without duplicating existing hooks. Real PostgreSQL concurrency/failure injection remains reserved for WP7.

Next numbered HRIS skill after the broader Trust Spine closes this boundary: `aqstoqflow-hris-payroll-09-input-readiness-gate`.
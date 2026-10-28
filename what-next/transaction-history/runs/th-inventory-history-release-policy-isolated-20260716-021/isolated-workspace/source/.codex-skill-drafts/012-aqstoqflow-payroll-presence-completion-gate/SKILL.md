---
name: 012-aqstoqflow-payroll-presence-completion-gate
description: Complete the AqStoqFlow 012 payroll/presence process using Route 2 vertical slices after 011 AP gates pass. Use when finishing payroll payment release and outbound reconciliation, payroll declarations, server actions, TanStack hooks, payroll/presence workbench UI, DB immutability hardening, RBAC, typed errors, notifications, audit evidence, and release gates for the OHADA SMB platform.
---

# AqStoqFlow 012 Payroll Presence Completion Gate

Use this skill to finish the 012 payroll/presence suite step without weakening the ledger-first, country-pack, RBAC, and payment-reconciliation controls already established by the platform.

This skill complements `012-aqstoqflow-payroll-presence-engine`; it does not replace it. The engine skill owns the base HR, presence, payroll, payslip, payment, declaration, and ledger workflow. This completion skill owns the remaining 012 gates and the Route 2 execution order.

## Required Starting Point

Before editing, read:

- `C:\Users\J COMPUTER\.codex\skills\000-aqstoqflow-execution-suite\SKILL.md`
- `C:\Users\J COMPUTER\.codex\skills\012-aqstoqflow-payroll-presence-engine\SKILL.md`
- `C:\Users\J COMPUTER\.codex\skills\012-aqstoqflow-payroll-presence-architect\SKILL.md` when available
- `what-next/AQSTOQFLOW_012_PAYROLL_PRESENCE_ARCHITECTURE_GATE_REPORT_2026-06-15.md`
- `what-next/AQSTOQFLOW_012_PAYROLL_PRESENCE_ENGINE_SLICE_REPORT_2026-06-15.md`
- `what-next/AQSTOQFLOW_011_AP_FINALIZER_CLOSURE_REPORT_2026-06-15.md`
- `graphify-out/GRAPH_REPORT.md` when present
- `prisma/schema.prisma`
- Existing payroll, purchasing/AP, payment reconciliation, RBAC, control, and accounting services/tests.

If the AP finalizer report or current code shows that 011 is not complete, stop and report that 012 cannot proceed. Do not build payroll payment release on top of unfinished supplier payment and reconciliation truth.

## Companion Skills

Use these skills together, in this order:

1. `000-aqstoqflow-execution-suite` for numbered-suite legality and stop gates.
2. `012-aqstoqflow-payroll-presence-engine` for the base implementation contract.
3. `ohada-payroll-engine` for payroll doctrine, payslip immutability, payroll controls, and country-pack resolution.
4. `regulatory-country-pack-factory` for effective-dated payroll, social, tax, declaration, deadline, and filing parameters.
5. `ledger-first-business-events` for event-to-ledger atomicity, idempotency, source links, outbox, and close blockers.
6. `payment-reconciliation-moat` for payroll outbound payment truth, payment transaction state, exception queues, and reconciliation evidence.
7. `rbac` for permission, fresh-auth, tenant, and segregation-of-duties enforcement.
8. `enterprise-fraud-and-controls` for maker-checker, self-approval refusal, threshold/server-truth, and audit trail.
9. `enterprise-error-handling` for typed errors, safe action responses, rollback, and no sensitive leakage.
10. `review` before declaring 012 complete.

## Route 2 Execution

Route 2 means finish 012 through narrow vertical slices that each produce usable system behavior and pass local gates before the next slice starts.

Follow `references/012-route-2-completion-blueprint.md` exactly.

### Slice 0: Entry Gate

Verify 011 completion from code and reports. Required evidence:

- AP workbench exists or the report says it was intentionally read-model first.
- AP server actions are tenant-scoped and RBAC/fresh-auth protected.
- Supplier invoice and payment posting uses balanced SYSCOHADA posting recipes or explicit close blockers.
- Supplier payment release produces outbound payment reconciliation evidence or an explicit exception/blocker.

If any item fails, stop at 011.

### Slice 1: Payroll Payment Release

Implement `releasePayrollPaymentBatch` as a server-only service operation:

- Only posted payroll runs can be paid.
- Payslip allocations must belong to the run, tenant, employee, and emitted payslip.
- Allocation total must equal the batch amount and may not exceed unpaid net payable.
- Payment destination evidence is required for every employee unless an explicit, visible blocker is created.
- Requester, approver, and releaser cannot collapse into the same actor where SoD requires separation.
- The operation must be idempotent by key and reject same-key different-payload replays.
- It must create a payroll payment batch, payment allocations, a payroll payment ledger posting, payment transaction, payment exception or match-ready status, business event, outbox notifications, and audit evidence in one transaction.

### Slice 2: Payroll Declaration Preparation

Implement declaration preparation as a read-model/service operation:

- Only posted payroll runs can prepare declarations.
- Declarations must pin country-pack version, schema, resolution hash, authority, declaration type, due date provenance, and payload hash.
- Missing or unsupported declaration parameters produce typed blockers, not fabricated legal certainty.
- Prepared declarations are immutable unless corrected by an explicit corrective declaration.

### Slice 3: Server Actions, Hooks, And UI

Expose only service-backed server actions:

- Derive `organizationId`, actor ID, and permissions from the authenticated context.
- Do not trust client-supplied tenant, approver, released-by, posted-by, or country-pack values.
- Use protected action wrappers, fresh-auth where required, and typed safe errors.
- Add TanStack hooks that consume safe action results and surface useful error messages.
- Add dense read-model workbench UI for payroll period readiness, attendance freeze status, payroll run status, payslip status, payment status, declaration status, ledger status, reconciliation status, and blockers.
- UI must never claim legal submission, statutory acceptance, payment settlement, or reconciliation before service evidence exists.

### Slice 4: DB Immutability Hardening

Add database-level guardrails:

- Emitted payslips cannot be updated or deleted except through an approved correction/void workflow.
- Posted payroll runs cannot have amounts, hashes, country-pack provenance, ledger references, or status mutated directly.
- Released payroll payment batches cannot have allocations, amount, hashes, payment method, payment date, ledger references, reconciliation references, or actor fields mutated directly.
- Prepared/submitted declarations cannot have payload hash, authority, period, amount, country-pack provenance, or type mutated directly.
- Triggers must allow creation and legitimate status progression but block silent mutation.

### Slice 5: Release Gate To 013

Do not advance to `013-aqstoqflow-data-trust-accountant-portal` until all gates pass:

- Payroll payment release creates ledger and reconciliation evidence or explicit blockers.
- Declaration preparation exists with country-pack provenance and typed blockers.
- Server actions, hooks, and UI exist for the completed workflow.
- DB immutability is enforced by tests or migration evidence.
- Focused Jest tests, Prisma validation, typecheck, and hardcode scans pass or are documented with truthful blockers.

## Stop Conditions

Stop and report instead of forcing progress when:

- 011 AP finalizer is not complete.
- Payroll rates, social charges, declaration deadlines, or legal labels are hardcoded in engines.
- A payroll payment can be final without a payment transaction, match record, suspense item, or open payment exception.
- A posted payroll run can be changed without a corrective event.
- An emitted payslip can be silently edited or deleted.
- Actions trust client-supplied organization, approval, release, or country-pack fields.
- UI imports Prisma or writes payroll, ledger, or payment facts directly.
- Tests cannot prove rollback around payroll ledger/payment/event mutations.

## Output Contract

When finished, save a report in `what-next/` with:

- Selected route and skills used.
- 011 entry-gate evidence.
- Files changed.
- Gate-by-gate implementation evidence.
- Tests and static scans run.
- Remaining blockers, if any.
- Next recommended numbered skill.


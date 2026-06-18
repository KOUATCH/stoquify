# 012 Route 2 Completion Blueprint

Route 2 finishes payroll/presence through ordered vertical slices. Each slice must leave the product more coherent and must not hide unfinished financial, legal, or reconciliation truth.

## Slice 0: Entry Gate

Inputs:

- `what-next/AQSTOQFLOW_011_AP_FINALIZER_CLOSURE_REPORT_2026-06-15.md`
- `what-next/AQSTOQFLOW_012_PAYROLL_PRESENCE_ARCHITECTURE_GATE_REPORT_2026-06-15.md`
- `what-next/AQSTOQFLOW_012_PAYROLL_PRESENCE_ENGINE_SLICE_REPORT_2026-06-15.md`

Pass criteria:

- 011 AP finalizer confirms AP posting recipes, AP workbench route/read model, supplier payment reconciliation evidence, country-pack AP status, and validation.
- 012 foundation confirms period, attendance snapshot, payroll calculation, payroll posting, payslip emission, RBAC/fresh-auth, ledger, country-pack, event/outbox, and rollback tests.

Fail behavior:

- Stop at the earliest open numbered gate.
- Save a report explaining what must be repaired.

## Slice 1: Payroll Payment Release Service

Service contract:

- Function name: `releasePayrollPaymentBatch`.
- Input schema: `releasePayrollPaymentBatchInputSchema`.
- Operation boundary: one transaction.
- Required status: payroll run is `POSTED`.
- Required payslip status: `EMITTED`.
- Required country-pack provenance: inherited from payroll run and payslips.
- Required ledger source: `AccountingSourceType.PAYROLL_PAYMENT`.
- Required posting purpose: `AccountingPostingPurpose.PAYROLL_PAYMENT`.
- Required business event: `payroll.payment_batch.released`.
- Required payment truth: outbound `PaymentTransaction` plus open `PaymentException` until statement/provider evidence matches.

Controls:

- `payroll.payments.release` permission.
- Fresh authentication.
- Maker-checker: requester cannot approve or release; approver/releaser separation follows the shared sensitive-action policy.
- Tenant, employee, payslip, payroll run, and payment allocation scoping.
- Idempotency with payload hash comparison.

Errors:

- `NotFoundError`: run, payslip, or employee not found in tenant.
- `BusinessRuleError`: run not posted, empty allocation, duplicate payslip allocation, missing employee payment destination, allocation mismatch, amount <= 0, destination changed or missing, payment already paid.
- `ConflictError`: same idempotency key reused with different payload.

Notifications:

- `payroll_payment_batch.released` to accounting/payroll.
- `payroll_payment.reconciliation_required` to reconciliation.
- Critical notification if payroll payment posting is blocked.

Tests:

- Releases posted payroll batch and creates ledger/payment/reconciliation evidence.
- Rejects self-approval or self-release before service mutation.
- Rejects mutated idempotency replay.
- Rejects missing destination evidence.
- Rejects duplicate or overpaid payslip allocations.
- Rolls back event/payment state on ledger failure.

## Slice 2: Payroll Declaration Preparation

Service contract:

- Function name: `preparePayrollDeclarations`.
- Required status: payroll run is `POSTED` or later.
- Creates or returns prepared declarations for supported country-pack declaration types.
- Uses country-pack resolution for authority labels, declaration type, due date, payload schema, and capability status.
- Stores payload hash and legal provenance in metadata.

Default safe behavior:

- If exact country-pack declaration definitions are missing, create a truthful `PREPARED` internal payroll liability declaration with `expertReviewRequired: true`, or stop with a typed blocker when the country pack says unsupported.
- Do not claim authority submission, acceptance, or statutory compliance without adapter evidence.

Notifications:

- `payroll_declaration.prepared` to payroll/accounting.
- Warning notification when expert review or country-pack expansion is required.

Tests:

- Prepares declaration with country-pack provenance.
- Idempotently returns existing declaration.
- Blocks unposted payroll runs.
- Does not hardcode legal rates or deadlines.

## Slice 3: Actions, Hooks, And UI

Actions:

- `actions/payroll/payroll-control.actions.ts`
- Protect reads with `payroll.read`.
- Protect run calculation with `payroll.runs.calculate`.
- Protect run approval with `payroll.runs.approve` and fresh auth.
- Protect payment release with `payroll.payments.release` and fresh auth.
- Protect declaration preparation with `payroll.declarations.prepare`.

Hooks:

- `hooks/payroll/usePayrollWorkbench.ts`
- Mutation hooks for payment release and declaration preparation.
- Hooks unwrap protected action results and throw safe user messages.

UI:

- `app/[locale]/(dashboard)/dashboard/payroll/page.tsx`
- `components/payroll/PayrollControlWorkbench.tsx`

Required UI states:

- Period open, inputs locked, calculated, posted, paid, closed.
- Attendance frozen, corrected, blocker.
- Payroll run calculated, posted, ledger blocked, rollback/error.
- Payslips emitted or pending.
- Payment released, awaiting statement match, ledger blocked, exception.
- Declarations prepared, expert review required, adapter unsupported.
- Permission denied, stale auth, validation error, empty state, degraded state.

Design:

- Dense enterprise workbench, no marketing hero.
- No Prisma import in UI.
- No client-side financial truth.
- Buttons/actions disabled when the service would reject.

## Slice 4: DB Immutability

Migration requirements:

- PostgreSQL trigger function for payroll immutability.
- Block updates/deletes of emitted payslips and lines unless status is moved through approved correction or void fields.
- Block sensitive field changes on posted payroll runs.
- Block sensitive field changes on released payment batches and payment allocations.
- Block sensitive field changes on prepared/submitted declarations.

Allowed:

- New records.
- Updating metadata with system evidence only if immutable evidence hashes and amounts do not change.
- Updating reconciliation references on payroll payment batch after release when payment moat produces real evidence.
- Corrective runs, corrective declarations, void/correction workflows.

Verification:

- `npx prisma validate` or `npm run prisma:validate`.
- Service tests or migration review proving trigger intent.

## Slice 5: Release Gate

The 012 step is complete only when:

- Payroll payment release is ledger-first and reconciliation-aware.
- Declaration preparation is country-pack-provenanced.
- Actions and UI consume service read models.
- Payroll/payslip/payment/declaration immutability is enforced.
- Tests prove idempotency, rollback, tenant scoping, SoD, RBAC/fresh-auth, payment exception generation, and no hardcoded payroll rates.

Next skill:

- `013-aqstoqflow-data-trust-accountant-portal`, only after all gates pass.


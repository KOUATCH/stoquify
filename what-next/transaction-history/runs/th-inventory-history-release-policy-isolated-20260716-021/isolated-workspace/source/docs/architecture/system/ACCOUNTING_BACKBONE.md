# Accounting Backbone Status And Next Steps

Date: 2026-06-09

Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`

## Executive Summary

The project has moved from accounting planning into a real ledger-first control plane. The foundation now exists for OHADA/SYSCOHADA-aware accounting: organization-scoped accounting settings, fiscal years, accounting periods, chart of accounts, journals, posted journal entries, journal lines, posting batches, source links, posting rules, audit events, typed errors, permission hardening, and focused tests.

The current operational posting chain has begun. `post-sale.ts` now recognizes POS sales into receivables, revenue, tax, and optional cost lines through posting rules. `post-payment.ts` now clears receivables through payment-specific tender or clearing accounts. The system is not yet fully wired into live POS commit because posting rules and account mappings must be seeded and verified for every accounting-ready tenant before checkout can safely depend on the ledger.

Latest accounting readiness audit: 52 present, 13 missing, 0 partial.

## Guiding Proposal From The Start

The strategic direction is to build a ledger-first retail operating system for OHADA/SYSCOHADA, not a POS system with accounting screens attached afterward.

The permanent target is:

- Every money or stock event becomes an auditable, balanced, tenant-scoped journal projection.
- Operational tables remain source documents, not statutory accounting truth.
- Posting commands are idempotent by source event and posting purpose.
- Period gates, source traceability, and account mappings decide whether automation can run.
- Reports read from the ledger when they present accounting truth.
- Corrections use reversals, refunds, voids, or adjustment postings, never mutation of posted entries.

## Hardening Proposals Already Adopted

1. Remove `accountingEnabled` and `setupStatus` from generic settings updates.
   These fields are now controlled through readiness workflows, not casual settings edits.

2. Strengthen setup readiness.
   `markAccountingSetupReady` now depends on required account mappings, default journals, an open period, active posting-rule scaffolds, and SYSCOHADA class/reference checks.

3. Add strict period-close preflight.
   Period close now checks draft entries, unresolved batches, posted entries without batch trace, and trial-balance imbalances before closing.

4. Classify critical accounting permissions.
   Sensitive accounting operations are separated into critical permissions, with fresh-auth expected for post, reverse, close, setup lock, and export workflows.

5. Lock chart-account structural fields after usage.
   Structural account changes are guarded once journal usage exists, reducing the risk of corrupting historical ledger meaning.

6. Replace raw `protect()` failures with typed safe errors.
   Shared error primitives now support client-safe responses and avoid leaking raw internal failure text across action boundaries.

7. Add focused tests.
   Tests now cover setup gates, period close, journal posting, manual journals, account immutability, posting rules, source traceability, reconciliation failures, sale posting, and payment posting.

## Control Plane Implemented

### Schema And Ledger Kernel

The active Prisma schema contains the core accounting models:

- `OrganizationAccountingSettings`
- `FiscalYear`
- `AccountingPeriod`
- `ChartOfAccount`
- `Journal`
- `JournalEntry`
- `JournalEntryLine`
- `LedgerPostingBatch`
- `AccountingSourceLink`
- `PostingRule`
- `PostingRuleLine`
- `LedgerAuditEvent`

These give the system the required accounting spine: periods, accounts, journals, postings, idempotency, source trace, and audit.

### Core Services

The accounting service directory now includes:

- `accounts.service.ts`
- `accounting-settings.service.ts`
- `periods.service.ts`
- `journals.service.ts`
- `posting.service.ts`
- `posting-rules.service.ts`
- `source-link.service.ts`
- `reports.service.ts`
- `reconciliations.service.ts`
- `invariants.ts`

The most important additions for operational automation are:

- `posting-rules.service.ts`: validates active event-to-account rules, leaf accounts, mapped accounts, and line structure.
- `source-link.service.ts`: creates and validates trace links between operational documents, posting batches, and journal entries.
- `reconciliations.service.ts`: detects orphaned or inconsistent posted ledger/batch/source-link states.

## Operational Posting Implemented

### `post-sale.ts`

Purpose: `POS_SALE / SALE_COMPLETION`

Behavior:

- Loads only completed POS sales for the tenant.
- Requires an open accounting period.
- Requires an active sales journal.
- Requires an active sale completion posting rule.
- Uses rule amount sources such as gross, net, tax, and optional cost.
- Creates a posted journal entry.
- Creates an idempotent ledger posting batch.
- Creates an accounting source link.
- Writes ledger audit events.

Accounting shape:

- Debit accounts receivable for gross sale value.
- Credit sales revenue for net sale value.
- Credit output VAT for tax value.
- Optional cost lines can debit COGS and credit inventory when the posting rule includes cost sources and a cost basis is available.

### `post-payment.ts`

Purpose: `POS_PAYMENT / PAYMENT_RECEIPT`

Behavior:

- Loads captured POS payments for the tenant.
- Requires the related sale posting source trace before clearing receivables.
- Rejects on-account credit rows because the sale posting already carries the receivable.
- Rejects split-tender aggregate rows; individual payment rows must be posted.
- Supports posting-rule conditions for payment method and mobile-money provider.
- Requires an open period and an active cash, bank, or general journal depending on tender method.
- Creates a posted journal entry, posting batch, source link, and audit event.

Accounting shape:

- Debit cash, bank, card clearing, mobile-money clearing, cheque clearing, or store-credit account based on the posting rule.
- Credit accounts receivable.

## Current Verification Status

The following checks passed after the latest work:

- `npm test -- services/accounting/postings/post-payment.test.ts --runInBand`
  - 5 tests passed.
- `npm test -- services/accounting services/_shared --runInBand`
  - 12 suites passed.
  - 42 tests passed.
- `npm run typecheck`
  - Passed.
- `npm run prisma:validate`
  - Prisma schema is valid.
- Accounting readiness audit
  - 52 present.
  - 13 missing.
  - 0 partial.

## Where We Are Now

The system is in early operational-posting phase.

Done:

- Accounting kernel exists.
- Setup readiness gates exist.
- Period close preflight exists.
- Posting rules exist.
- Source trace exists.
- Reconciliation checks exist.
- Manual journal and posting infrastructure exists.
- POS sale posting exists.
- POS payment posting exists.
- Shared typed error foundation exists.
- Accounting permissions and fresh-auth classification are substantially in place.

Not done yet:

- POS `commitPOSSale()` is not yet wired to call `postSale()` and `postPayment()` in the same transaction.
- Default account mappings and posting rules for all real tender/accounting cases still need to be seeded or verified.
- Refund, void, cash drawer close, inventory, purchasing, supplier, customer settlement, expense, payroll, and production postings remain missing.
- Full real-database integration tests are not yet in place for POS-to-ledger atomicity.
- Accountant review/exceptions UI is not complete.
- Statutory OHADA reports are not yet fully ledger-backed and production complete.

Current worktree note:

- Accounting/action/UI service directories are currently untracked in git.
- Shared RBAC/protect files and `docs/ACTIVE_SURFACE_MAP.md` are modified.
- Nothing should be reverted; these are part of the hardening stream unless reviewed otherwise.

## Remaining Gaps From Readiness Audit

1. `prisma/schema-financial.prisma`
   Draft finance schema reference is missing. This may remain optional if the active schema is now the canonical source, but the docs/audit expectation should be reconciled.

2. `post-refund.ts`
   Needed to reverse payment and sale effects for refunds.

3. `post-void.ts`
   Needed to void sale documents without mutating posted ledger truth.

4. `post-cash-drawer-close.ts`
   Needed for cash over/short, drawer reconciliation, and shift-close accounting.

5. `post-goods-receipt.ts`
   Needed to post inventory receipt or GRNI effects.

6. `post-supplier-invoice.ts`
   Needed to recognize supplier payables and input VAT.

7. `post-supplier-payment.ts`
   Needed to settle supplier payables.

8. `post-customer-settlement.ts`
   Needed for non-POS customer receivable settlement.

9. `post-expense.ts`
   Needed to post approved expenses and payment effects.

10. `post-inventory-adjustment.ts`
   Needed for shrinkage, write-offs, gains/losses, and inventory variance.

11. `post-payroll-run.ts`
   Needed to recognize payroll expense and liabilities.

12. `post-payroll-payment.ts`
   Needed to settle payroll liabilities.

13. `post-production-batch.ts`
   Needed for production costing and finished-goods recognition.

## Recommended Continuation Plan

### Phase 1: Stabilize And Commit The Control Plane

Target duration: 1 to 2 days.

Steps:

1. Review the current untracked accounting files and modified shared security files.
2. Run the full accounting/shared test slice.
3. Run typecheck and Prisma validation.
4. Commit the accounting control plane and the first two posting modules as a coherent checkpoint.
5. Update `docs/ACTIVE_SURFACE_MAP.md` to reflect that `postSale()` and `postPayment()` exist but are not yet wired into POS commit.

Success criteria:

- Clean known diff for accounting work.
- Repeatable verification commands.
- No accidental rollback of user or prior generated work.

### Phase 2: Seed And Verify Posting Rules

Target duration: 2 to 3 days.

Steps:

1. Define canonical mapping keys for payment clearing:
   - `CASH_ON_HAND`
   - `BANK`
   - `ACCOUNTS_RECEIVABLE`
   - `CARD_CLEARING`
   - `MOBILE_MONEY_CLEARING`
   - `CHEQUE_CLEARING`
   - `STORE_CREDIT_LIABILITY`
2. Decide whether additional clearing mappings become required readiness gates or optional posting-rule mappings.
3. Seed sale completion rules:
   - AR debit.
   - Revenue credit.
   - Output VAT credit.
   - Optional COGS and inventory lines.
4. Seed payment receipt rules:
   - Tender/clearing debit by method condition.
   - AR credit.
5. Add tests that setup readiness fails if required live mappings/rules are missing.

Success criteria:

- A ready tenant has working sale and payment posting rules.
- Every rule resolves only to active leaf accounts.
- Cash, card, mobile money, bank transfer, cheque, and store credit can be routed.

### Phase 3: Wire POS Commit To Ledger Posting

Target duration: 2 to 4 days.

Steps:

1. Modify `commitPOSSale()` so the existing Prisma transaction calls:
   - `postSale(organizationId, { salesOrderId, actorId, costAmount }, tx)`
   - `postPayment(organizationId, { paymentId, actorId }, tx)` for each captured non-credit payment.
2. Preserve on-account behavior:
   - `CREDIT` creates receivable through `postSale()`.
   - No `postPayment()` call until a real settlement occurs.
3. Ensure cost amount is passed from the sale commit's inventory costing calculation, not recomputed later from changed stock state.
4. Add rollback tests:
   - Posting failure rolls back sale completion.
   - Payment posting failure rolls back inventory/payment/drawer/session writes.
   - Idempotent retry does not duplicate journal entries.

Success criteria:

- One sale commit creates operational sale, inventory movement, payments, drawer movement, sale journal, payment journals, source links, and audit in one transaction.
- Failed accounting posting leaves no partial POS sale state.

### Phase 4: Build Refund, Void, And Cash Drawer Close

Target duration: 1 week.

Order:

1. `post-refund.ts`
   - Reverse payment settlement.
   - Reverse revenue/tax or create refund expense/contra-revenue according to accountant-approved policy.
   - Link to original payment and sale.
2. `post-void.ts`
   - Void unfulfilled or reversible sales through explicit reversal logic.
   - Never mutate posted journal entries.
3. `post-cash-drawer-close.ts`
   - Post cash over/short.
   - Tie to POS session and drawer close.
   - Add reconciliation checks.

Success criteria:

- Refunds and voids preserve audit trace and do not corrupt posted entries.
- Drawer close can prove expected vs actual cash with ledger trace.

### Phase 5: Inventory And Purchasing Posting

Target duration: 1 to 2 weeks.

Order:

1. `post-inventory-adjustment.ts`
2. `post-goods-receipt.ts`
3. `post-supplier-invoice.ts`
4. `post-supplier-payment.ts`

Success criteria:

- Inventory changes reconcile to inventory asset and variance accounts.
- Supplier invoices create AP.
- Supplier payments clear AP.
- GRNI or equivalent receipt-not-invoiced handling is defined.

### Phase 6: Customer, Expense, Payroll, Production Posting

Target duration: 2 to 3 weeks.

Order:

1. `post-customer-settlement.ts`
2. `post-expense.ts`
3. `post-payroll-run.ts`
4. `post-payroll-payment.ts`
5. `post-production-batch.ts`

Success criteria:

- Customer settlements reconcile to A/R.
- Expenses post with payment method and VAT treatment.
- Payroll is recognized separately from payroll payment.
- Production converts inputs into finished goods with auditable costing.

### Phase 7: Accountant Workflow And Reporting

Target duration: 2 to 4 weeks.

Steps:

1. Build posting exception queue.
2. Build source trace drill-down from journal to POS/payment/inventory/purchase document.
3. Complete ledger-backed reports:
   - General ledger.
   - Trial balance.
   - Livre-journal.
   - Balance generale.
   - VAT summary/declaration support.
   - Income statement and balance sheet.
4. Add export permissions and fresh-auth enforcement for sensitive exports.
5. Add close checklist UI using period-close preflight.

Success criteria:

- Accountant can diagnose missing mappings, failed batches, unlinked source docs, and close blockers without developer help.
- Reports read ledger lines, not operational tables posing as accounting truth.

### Phase 8: Enterprise Hardening

Target duration: ongoing, first full pass 2 to 3 weeks.

Steps:

1. Add real Postgres integration tests for POS sale plus accounting rollback.
2. Add reconciliation jobs or admin checks for:
   - Posted journals without source links.
   - Batches without journal entries.
   - Source docs without required postings.
   - A/R and A/P control account mismatches.
3. Add structured observability:
   - Posting batch status.
   - Failed posting reasons.
   - Source trace completeness.
   - Period close blockers.
4. Add CI gates:
   - Prisma validate.
   - Typecheck.
   - Accounting/shared Jest slice.
   - Future integration tests.
5. Add runbooks:
   - Failed POS posting.
   - Failed payment posting.
   - Reversal/refund handling.
   - Period close remediation.

Success criteria:

- The accounting engine is not merely tested at unit level; it is operationally diagnosable, auditable, and recoverable.

## Immediate Next Action

The next practical step is not another UI screen. It is to seed and verify live posting rules for sale and payment, then wire `commitPOSSale()` to call `postSale()` and `postPayment()` inside the same transaction.

Recommended exact order:

1. Build or update the posting-rule seed for `SALE_COMPLETION` and `PAYMENT_RECEIPT`.
2. Add focused tests for method-conditional payment mappings.
3. Patch `commitPOSSale()` to call `postSale()` after the sale is completed and before transaction return.
4. Patch payment creation to retain created payment IDs, then call `postPayment()` for each non-credit paid payment.
5. Pass `totalCost` from the POS transaction into `postSale()` so COGS does not depend on a later inventory snapshot.
6. Add rollback tests for accounting failure during POS commit.
7. Run:
   - `npm test -- services/accounting services/pos services/_shared --runInBand`
   - `npm run typecheck`
   - `npm run prisma:validate`
   - accounting readiness audit

After that, build `post-refund.ts`.

## Quality Bar Going Forward

To reach the requested professional, robust, enterprise-grade accounting level, every future posting module must satisfy this checklist:

- Tenant-scoped read/write paths.
- Open period required.
- Active rule required.
- Active leaf accounts required.
- Balanced journal lines required.
- Idempotent posting batch required.
- Source link required.
- Audit event required.
- Typed client-safe errors required.
- Focused tests for happy path, missing setup, idempotency, and failure rollback.
- Reconciliation proof or reconciliation failure test.

The project is on the correct path. The control plane is no longer theoretical; the first two operational modules now exist and pass tests. The next leap is to make POS commit ledger-backed in one atomic transaction, then extend the same pattern across refund, void, cash, inventory, purchasing, supplier, customer, expense, payroll, and production workflows.

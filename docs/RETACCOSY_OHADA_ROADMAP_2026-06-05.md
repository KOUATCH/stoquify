# RETACCOSY OHADA Roadmap

Date: 2026-06-05

Project name: RETACCOSY

Working definition: Retail Accounting Operating System. RETACCOSY is the target evolution of StockFlow into a full operating system for retail SMBs: POS, inventory, purchasing, suppliers, customers, cash, finance, accounting, HR, payroll, reporting, audit, and OHADA/SYSCOHADA compliance.

## 1. Strategic Goal

Build a retail SMB platform where day-to-day operations automatically produce accountant-grade, OHADA/SYSCOHADA-compliant books.

The moat is not simply "retail software" or "accounting software". The moat is the integration layer between operational reality and statutory accounting:

- Every sale, refund, stock movement, purchase, receipt, payment, payroll run, expense, and cash drawer close becomes a controlled accounting event.
- Every accounting event is posted through deterministic, testable, organization-scoped posting rules.
- Every posted journal is immutable and auditable.
- Every correction is a reversal or an adjustment entry, never a silent mutation.
- Every OHADA report can be traced back to source documents.

## 2. OHADA Context

Official OHADA sources establish the compliance target:

- OHADA exists to harmonize business law in Africa and guarantee legal and judicial security for investors and companies in member states.
- OHADA has 17 member states: Benin, Burkina Faso, Cameroon, Central African Republic, Cote d'Ivoire, Congo, Comoros, Gabon, Guinea, Guinea Bissau, Equatorial Guinea, Mali, Niger, DRC, Senegal, Chad, and Togo.
- The OHADA Uniform Act on Accounting Law and Financial Reporting, adopted on 2017-01-26 and published on 2017-02-15, includes the revised OHADA accounting system, SYSCOHADA.
- The updated UAAFR/SYSCOHADA became the accounting reference in OHADA member states from 2018-01-01 for personal accounts and from 2019-01-01 for consolidated/combined/IFRS-related statements.

Sources:

- https://www.ohada.org/en/general-overview/
- https://www.ohada.org/en/publication-of-a-new-uniform-act-on-accounting-law-and-financial-reporting-uaafr/
- https://www.ohada.org/en/uniform-acts/

## 3. Current StockFlow Baseline

The project already has many of the operational primitives required for RETACCOSY:

- Multi-tenant organization model.
- Locations and POS stations.
- Users, roles, permissions, invitations, sessions, audit logs.
- Items, units, brands, categories, tax rates.
- Inventory levels, transactions, serial numbers, adjustments, transfers.
- Suppliers, item suppliers, purchase orders, goods receipts.
- Customers, sales orders, sales order lines.
- Daily sales reports and cash events.
- POS sessions, cash drawers, cash drawer transactions.
- Payments and refunds.
- Recipes and production batches.
- Expense categories and expenses.
- Customer and supplier ledger entries.
- Stronger security baseline after the 2026-06-02 hardening pass.

The architecture reports also show active modernization:

- Components: 1,623 nodes across 502 communities.
- Actions: 1,242 nodes across 245 communities.
- App routes: 689 nodes across 209 communities.
- Hooks: 671 nodes across 137 communities.

This breadth is a strength, but it must be turned into a single coherent product line.

## 4. Main Weaknesses To Resolve Before The Moat

1. Parallel implementations

   POS, dashboard, finance, inventory, analytics, and reporting have multiple generations. This creates drift and makes accounting correctness hard.

2. No central double-entry accounting engine

   Customer and supplier ledger entries exist, but there is no canonical immutable journal engine with debit/credit validation, fiscal periods, posting batches, and OHADA financial statement output.

3. Draft finance and HR surfaces

   Several finance, payroll, and presence surfaces exist but should not be treated as production accounting foundations until reconciled with the active Prisma schema.

4. Incomplete authorization rollout

   Security hardening has started, but POS, inventory, finance, supplier, payroll, and reporting actions need consistent permission and tenant checks.

5. Testing gap around financial correctness

   The product needs posting-rule tests, invariant tests, and reconciliation tests before it can be trusted as accounting infrastructure.

## 5. Product Principles

These rules should govern every phase:

1. Accounting logic belongs in `services/accounting/*`, never directly inside UI components.
2. Server actions stay thin: authenticate, authorize, validate, call service, invalidate cache.
3. Every accounting write is organization-scoped.
4. Every posting is idempotent by source document.
5. Every journal entry must balance.
6. Posted entries are immutable.
7. Corrections use reversals and adjustments.
8. Fiscal periods close and lock.
9. Every report must trace to journal lines and source documents.
10. Every feature must have a clear verification gate.

## 6. Target Architecture

RETACCOSY should use an event-to-ledger architecture.

Flow:

1. Operational event happens:
   - POS sale completed.
   - Payment received.
   - Refund processed.
   - Goods received.
   - Supplier invoice recorded.
   - Expense approved.
   - Payroll run approved.
   - Stock adjustment approved.
   - Cash drawer closed.

2. Domain service validates the operation.

3. Domain service emits an accounting command:
   - `PostSaleCommand`
   - `PostPaymentCommand`
   - `PostPurchaseReceiptCommand`
   - `PostSupplierInvoiceCommand`
   - `PostExpenseCommand`
   - `PostPayrollRunCommand`
   - `PostInventoryAdjustmentCommand`
   - `PostCashDrawerCloseCommand`

4. Accounting posting service resolves:
   - Organization accounting settings.
   - Fiscal period.
   - Source document idempotency key.
   - Applicable posting rule.
   - SYSCOHADA account mappings.
   - Tax handling.
   - Currency and rounding policy.

5. Ledger service writes:
   - `LedgerPostingBatch`
   - `JournalEntry`
   - `JournalEntryLine`
   - source links
   - audit log

6. Reports read from the ledger, not from operational tables.

## 7. Roadmap Overview

The roadmap is intentionally sequential. Each layer creates the foundation for the next.

### Phase 0: Stabilize The Production Baseline

Goal: Make the codebase safe enough for accounting work.

Functionality order:

1. Keep `npm run verify:repo` passing.
2. Preserve active app typecheck and Prisma validation.
3. Identify one active implementation per domain:
   - POS
   - inventory
   - purchase
   - finance
   - customer
   - supplier
   - dashboard
   - reporting
4. Quarantine old/draft modules that should not affect production.
5. Finish tenant and permission guards on active high-risk server actions.
6. Add regression tests for:
   - cross-tenant denial
   - protected POS operations
   - protected inventory operations
   - protected finance operations
   - protected report exports

Technical deliverables:

- `docs/ACTIVE_SURFACE_MAP.md`
- `docs/LEGACY_QUARANTINE_MAP.md`
- `services/_shared/protect.ts` standardized across active server actions.
- Permission matrix for active retail operations.

Done criteria:

- `npm run verify:repo` passes.
- Active app paths are known.
- No active write action lacks organization scoping.
- No accounting work depends on quarantined code.

### Phase 1: Accounting Domain Foundation

Goal: Add the core accounting schema without wiring it into all operations yet.

Functionality order:

1. Add organization accounting settings.
2. Add fiscal years and accounting periods.
3. Add OHADA chart of accounts.
4. Add journals.
5. Add journal entries and journal lines.
6. Add posting batches.
7. Add source document links.
8. Add posting rule tables.
9. Add ledger audit events.

Proposed models:

- `OrganizationAccountingSettings`
- `FiscalYear`
- `AccountingPeriod`
- `ChartOfAccount`
- `Journal`
- `JournalEntry`
- `JournalEntryLine`
- `PostingRule`
- `PostingRuleLine`
- `LedgerPostingBatch`
- `AccountingSourceLink`

Key service modules:

- `services/accounting/accounts.service.ts`
- `services/accounting/periods.service.ts`
- `services/accounting/journals.service.ts`
- `services/accounting/posting.service.ts`
- `services/accounting/source-link.service.ts`
- `services/accounting/invariants.ts`

Done criteria:

- Accounts can be seeded per organization from a SYSCOHADA template.
- Periods can be opened and closed.
- Journal entry service rejects unbalanced entries.
- Posted entries cannot be edited.
- Reversal entries can be created.
- Idempotency prevents duplicate posting for the same source document.

### Phase 2: OHADA Account Plan And Setup Wizard

Goal: Make onboarding practical for real SMBs.

Functionality order:

1. Create SYSCOHADA account templates.
2. Map common retail accounts:
   - cash on hand
   - bank
   - customer receivables
   - supplier payables
   - inventory
   - sales revenue
   - sales discounts
   - VAT/tax collected
   - VAT/tax deductible
   - cost of goods sold
   - inventory variance
   - payroll expense
   - social/tax liabilities
   - expense categories
3. Build accounting setup wizard:
   - country
   - currency
   - fiscal year start
   - tax regime
   - default cash/bank accounts
   - default inventory method
   - default journals
4. Add organization-level accounting readiness checklist.

Technical deliverables:

- `prisma/seed-ohada-chart.ts`
- `services/accounting/templates/syscohada.ts`
- `components/accounting/setup/*`
- `actions/accounting/setup-actions.ts`

Done criteria:

- A new organization can initialize accounting in under 10 minutes.
- Required default account mappings are present.
- Setup cannot be marked complete while required mappings are missing.

### Phase 3: Manual Journal And Ledger MVP

Goal: Create a usable accounting module before automatic postings.

Functionality order:

1. Chart of accounts page.
2. Journal list page.
3. Manual journal entry form.
4. Journal entry detail page.
5. Journal reversal action.
6. General ledger page.
7. Trial balance page.
8. Period close draft workflow.

Technical deliverables:

- `app/[locale]/(dashboard)/dashboard/accounting/accounts/page.tsx`
- `app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx`
- `app/[locale]/(dashboard)/dashboard/accounting/ledger/page.tsx`
- `app/[locale]/(dashboard)/dashboard/accounting/trial-balance/page.tsx`
- `services/accounting/reports.service.ts`

Done criteria:

- Accountants can create, post, reverse, and inspect journal entries.
- General ledger balances equal trial balance totals.
- Closed periods reject new postings unless reopened by authorized users.

### Phase 4: POS Sale Posting

Goal: The first operational-to-accounting automation.

Functionality order:

1. Identify the single active POS sale completion path.
2. Add source document idempotency key to sale completion.
3. Post sale revenue.
4. Post tax collected.
5. Post cash/card/mobile money/customer receivable.
6. Post cost of goods sold.
7. Credit inventory asset.
8. Handle discounts.
9. Handle multi-payment sales.
10. Show posting status on receipt/sale detail.

Example posting:

- Debit cash/bank/receivable.
- Credit sales revenue.
- Credit tax collected, where applicable.
- Debit cost of goods sold.
- Credit inventory.

Technical deliverables:

- `services/accounting/posters/post-sale.ts`
- `services/pos/sale-completion.service.ts`
- sale source document links
- posting tests for cash, card, credit, discount, tax, and mixed payment scenarios

Done criteria:

- Every completed POS sale creates exactly one ledger posting batch.
- Re-running sale completion cannot duplicate accounting entries.
- Sale receipt links to journal entry.
- Trial balance changes correctly after sale posting.

### Phase 5: Payments, Refunds, Voids, And Cash Drawer

Goal: Make POS accounting trustworthy in real retail operations.

Functionality order:

1. Payment received posting.
2. Customer credit settlement.
3. Refund posting.
4. Void reversal.
5. Cash drawer opening.
6. Cash in/out.
7. Cash drawer close.
8. Cash variance posting.
9. Deposit to bank.
10. Cash reconciliation report.

Technical deliverables:

- `services/accounting/posters/post-payment.ts`
- `services/accounting/posters/post-refund.ts`
- `services/accounting/posters/post-cash-drawer.ts`
- cash reconciliation dashboard

Done criteria:

- Cash drawer expected balance reconciles to ledger cash account.
- Refunds reverse original sale accounting cleanly.
- Cash over/short is posted to configured variance accounts.

### Phase 6: Inventory Accounting

Goal: Make stock value and operational stock movements match the ledger.

Functionality order:

1. Inventory valuation settings:
   - weighted average first
   - FIFO later if required
2. Goods receipt inventory capitalization.
3. Stock adjustment gain/loss posting.
4. Stock transfer non-posting or location memo posting, depending on policy.
5. Production material consumption.
6. Finished goods capitalization.
7. Inventory valuation report.
8. Inventory-to-ledger reconciliation.

Technical deliverables:

- `services/accounting/posters/post-goods-receipt.ts`
- `services/accounting/posters/post-inventory-adjustment.ts`
- `services/accounting/posters/post-production.ts`
- `services/inventory/valuation.service.ts`

Done criteria:

- Inventory asset balance reconciles to inventory valuation report.
- Negative stock policies are explicit.
- Adjustments require authorization and reason codes.

### Phase 7: Purchasing And Supplier Accounting

Goal: Complete procure-to-pay accounting.

Functionality order:

1. Supplier invoice model or invoice state on purchase/goods receipt.
2. Supplier payable posting.
3. Purchase tax handling.
4. Supplier payment posting.
5. Credit note posting.
6. Supplier aging report.
7. Supplier statement.
8. Purchase-to-ledger reconciliation.

Technical deliverables:

- `SupplierInvoice`
- `SupplierInvoiceLine`
- `services/accounting/posters/post-supplier-invoice.ts`
- `services/accounting/posters/post-supplier-payment.ts`

Done criteria:

- Supplier payable subledger reconciles to control account.
- Every supplier payment links to source invoices.
- Supplier aging is ledger-backed.

### Phase 8: Customers, Credit, And Receivables

Goal: Support retail SMBs that sell both cash and credit.

Functionality order:

1. Customer credit settings.
2. Customer invoice or credit sale flow.
3. Customer payment allocation.
4. Customer credit note.
5. Customer aging report.
6. Customer statement.
7. Credit limit enforcement in POS.
8. Bad debt workflow later.

Technical deliverables:

- `CustomerInvoice`, if sales orders are not sufficient.
- `PaymentAllocation`
- `services/accounting/posters/post-customer-settlement.ts`
- customer statement and aging views

Done criteria:

- Customer receivable subledger reconciles to control account.
- POS blocks credit sales beyond configured policy.
- Customer statement is explainable from ledger lines and source documents.

### Phase 9: Expenses And Cash/Bank

Goal: Cover ordinary SMB back-office spending.

Functionality order:

1. Expense approval workflow.
2. Expense posting.
3. Petty cash expense posting.
4. Bank payment posting.
5. Bank deposit and withdrawal.
6. Bank reconciliation import.
7. Cash and bank dashboard.

Technical deliverables:

- `BankAccount`
- `BankTransaction`
- `BankReconciliation`
- `services/accounting/posters/post-expense.ts`
- `services/accounting/bank-reconciliation.service.ts`

Done criteria:

- Bank/cash balances reconcile to ledger.
- Expense categories map to accounts.
- Approval thresholds are permission-controlled.

### Phase 10: OHADA Financial Statements

Goal: Produce the statutory reports that make the product defensible.

Functionality order:

1. Trial balance.
2. General ledger.
3. Balance sheet.
4. Income statement.
5. Cash flow support report.
6. Account schedules.
7. Tax/VAT report.
8. Period close pack.
9. Excel export.
10. PDF export.

Technical deliverables:

- `services/accounting/statements/trial-balance.ts`
- `services/accounting/statements/balance-sheet.ts`
- `services/accounting/statements/income-statement.ts`
- `services/accounting/statements/tax-report.ts`
- `components/accounting/reports/*`

Done criteria:

- Reports read from journal lines, not operational tables.
- Every report line can drill down to account, journal entry, and source document.
- Exports are stable enough for accountant review.

### Phase 11: Payroll And HR Accounting

Goal: Turn HR/payroll into a financially integrated module.

Functionality order:

1. Stabilize employee model.
2. Stabilize attendance/presence model.
3. Payroll components:
   - base salary
   - allowances
   - overtime
   - deductions
   - advances
   - employer charges
4. Payroll run approval.
5. Payroll posting:
   - debit payroll expense
   - credit employee payable
   - credit taxes/social liabilities
6. Payroll payment posting.
7. Payslip generation.
8. Payroll reports.

Technical deliverables:

- `Employee`
- `PayrollRun`
- `PayrollRunLine`
- `PayrollPayment`
- `services/payroll/payroll-run.service.ts`
- `services/accounting/posters/post-payroll-run.ts`

Done criteria:

- Payroll run cannot be edited after approval without reversal.
- Payroll liabilities reconcile to payments.
- Payslip totals reconcile to payroll journal.

### Phase 12: Production And Cost Accounting

Goal: Serve retail SMBs that also produce, transform, or bake goods.

Functionality order:

1. Recipe costing.
2. Raw material consumption posting.
3. Production batch labor/overhead capture.
4. Finished goods capitalization.
5. Waste and variance posting.
6. Batch profitability.
7. Product margin reporting.

Technical deliverables:

- `services/production/costing.service.ts`
- `services/accounting/posters/post-production-batch.ts`
- production cost reports

Done criteria:

- Produced item cost flows into inventory valuation.
- Batch variance is visible and posted.
- Margin reports use real cost layers.

### Phase 13: Accountant Portal

Goal: Make the system lovable for accountants, not only store owners.

Functionality order:

1. Accountant role and permissions.
2. Client organization switcher.
3. Review queue:
   - unposted documents
   - failed postings
   - mapping gaps
   - suspicious transactions
4. Adjustment and reversal tools.
5. Period close checklist.
6. Export pack.
7. Accountant comments and evidence attachments.

Technical deliverables:

- `app/[locale]/(dashboard)/dashboard/accountant/*`
- `AccountingReviewItem`
- `AccountingEvidence`
- `services/accounting/review.service.ts`

Done criteria:

- Accountant can close a month without direct database access.
- Every unresolved accounting problem appears in a queue.
- Close pack is exportable and reproducible.

### Phase 14: Reporting Command Center

Goal: Turn RETACCOSY into an executive cockpit.

Functionality order:

1. Daily retail health dashboard.
2. Cash position dashboard.
3. Inventory valuation and aging.
4. Gross margin by product/category/location.
5. Supplier payables.
6. Customer receivables.
7. Payroll cost.
8. Tax position.
9. Store performance.
10. Accountant readiness score.

Technical deliverables:

- `services/reporting/kpi.service.ts`
- ledger-backed analytics tables or materialized summaries
- role-specific dashboards for owner, cashier, accountant, manager

Done criteria:

- Owner sees operational and accounting truth in one place.
- KPIs reconcile to source modules.
- Dashboard shows data freshness and posting exceptions.

### Phase 15: Multi-Country OHADA Packs

Goal: Become the default platform for OHADA retail SMBs.

Functionality order:

1. Country profile:
   - currency
   - fiscal year norms
   - tax labels
   - common invoice wording
   - default account mappings
2. French-first bilingual UI, then English where useful.
3. Country-specific export templates.
4. Accountant review with local labeling.
5. Local partner/accountant onboarding materials.

Technical deliverables:

- `CountryAccountingPack`
- `TaxRegime`
- `FiscalDocumentTemplate`
- `services/accounting/country-packs/*`

Done criteria:

- New organization can choose an OHADA country pack.
- Reports and labels match local expectations.
- Local accountants can validate the output.

### Phase 16: Offline POS And Sync

Goal: Win real retail environments with unstable internet.

Functionality order:

1. Offline POS cart.
2. Local transaction queue.
3. Idempotent sync protocol.
4. Conflict resolution.
5. Offline receipt numbers.
6. Offline accounting source event staging.
7. Sync health dashboard.

Technical deliverables:

- local IndexedDB store
- sync API
- `OfflineEvent`
- `SyncConflict`
- idempotent ledger posting after sync

Done criteria:

- Cashier can sell while offline.
- Sync cannot duplicate sales or accounting entries.
- Manager sees unsynced risk clearly.

### Phase 17: Compliance, Security, And Trust

Goal: Make the platform bank/accountant/investor-grade.

Functionality order:

1. MFA for privileged roles.
2. Session revocation on role/password changes.
3. Distributed rate limiting.
4. Full server-action permission rollout.
5. Audit log viewer.
6. Immutable accounting event log.
7. Security regression suite.
8. Dependency CVE scanning.
9. Backup and restore drills.
10. Role-based export controls.

Technical deliverables:

- `services/security/*`
- `components/security/audit-log-viewer.tsx`
- SCA pipeline
- backup runbook

Done criteria:

- Security regression tests pass in CI.
- Privileged actions require MFA.
- Accounting audit trail is tamper-evident at application level.

### Phase 18: Ecosystem And APIs

Goal: Expand the moat through integrations.

Functionality order:

1. Public API for sales, inventory, customers, and reports.
2. Webhooks for accounting postings and POS events.
3. Importers:
   - items
   - customers
   - suppliers
   - opening balances
   - chart of accounts
4. Exporters:
   - accountant pack
   - sales data
   - inventory valuation
   - journal entries
5. Partner accountant workspace.
6. Marketplace for country/accountant templates.

Technical deliverables:

- API keys with scoped permissions.
- Webhook delivery logs.
- Import validation pipeline.
- Export job queue.

Done criteria:

- Integrations cannot bypass permissions.
- Imports are validated before committing.
- Exports are reproducible and audit logged.

## 8. Release Train

### Release A: Foundation Ready

Scope:

- active surface map
- security and authorization sweep
- verification gate
- legacy quarantine

Outcome:

- safe base for accounting work

### Release B: Accounting Kernel

Scope:

- fiscal periods
- chart of accounts
- journals
- posting batches
- manual journal
- trial balance

Outcome:

- real double-entry accounting exists

### Release C: POS-To-Ledger

Scope:

- sale posting
- payment posting
- refund/void
- cash drawer close
- receipt-to-journal traceability

Outcome:

- retail transactions produce books automatically

### Release D: Inventory And Purchasing Accounting

Scope:

- inventory valuation
- goods receipt posting
- supplier invoice and payment
- stock adjustments
- supplier aging

Outcome:

- stock and procurement reconcile to ledger

### Release E: OHADA Reporting Pack

Scope:

- general ledger
- trial balance
- balance sheet
- income statement
- tax reports
- period close pack

Outcome:

- accountant-grade OHADA outputs

### Release F: HR, Payroll, Production, Advanced Finance

Scope:

- payroll posting
- expense workflows
- production costing
- bank reconciliation
- cash flow reporting

Outcome:

- full SMB operating system

### Release G: Moat Expansion

Scope:

- accountant portal
- country packs
- offline POS
- partner APIs
- benchmark analytics

Outcome:

- RETACCOSY becomes hard to replace

## 9. First 20 Technical Tickets

These are the recommended next implementation tickets, in order:

1. Create `docs/ACTIVE_SURFACE_MAP.md`.
2. Decide the single active POS sale completion path.
3. Decide whether existing draft finance schema is merged, rewritten, or discarded.
4. Add accounting permission constants and roles.
5. Add `OrganizationAccountingSettings`.
6. Add `FiscalYear` and `AccountingPeriod`.
7. Add `ChartOfAccount`.
8. Add `Journal`.
9. Add `JournalEntry` and `JournalEntryLine`.
10. Add `LedgerPostingBatch` and source idempotency fields.
11. Add `AccountingSourceLink`.
12. Implement `assertBalancedJournalEntry`.
13. Implement `createManualJournalEntry`.
14. Implement `postJournalEntry`.
15. Implement `reverseJournalEntry`.
16. Seed initial SYSCOHADA retail chart template.
17. Build accounting setup service.
18. Build chart of accounts page.
19. Build manual journal page.
20. Build trial balance report.

Only after these should POS sale posting begin.

## 10. Posting Rule Matrix

Initial mandatory posting rules:

| Source event | Posting service | Required before |
| --- | --- | --- |
| Manual journal | `posting.service.ts` | Accounting MVP |
| POS sale completed | `post-sale.ts` | POS accounting |
| POS payment received | `post-payment.ts` | Cash/bank truth |
| Refund/void | `post-refund.ts` | Correct POS lifecycle |
| Cash drawer close | `post-cash-drawer.ts` | Retail cash control |
| Goods receipt | `post-goods-receipt.ts` | Inventory valuation |
| Supplier invoice | `post-supplier-invoice.ts` | Payables |
| Supplier payment | `post-supplier-payment.ts` | Payables settlement |
| Customer credit payment | `post-customer-settlement.ts` | Receivables |
| Expense approved | `post-expense.ts` | Back-office finance |
| Payroll run approved | `post-payroll-run.ts` | HR/payroll |
| Stock adjustment | `post-inventory-adjustment.ts` | Inventory audit |
| Production batch complete | `post-production-batch.ts` | Manufacturing/production |

## 11. Database Invariants

These invariants should be enforced through services, tests, and where practical database constraints:

1. Journal entries must balance by currency.
2. Posted journal entries cannot be edited.
3. Posted journal entries can only be reversed.
4. A source document can post only once per posting purpose.
5. Journal entry date must belong to an open accounting period.
6. Account organization must equal journal organization.
7. Source document organization must equal posting organization.
8. Trial balance total debit must equal total credit.
9. Subledgers must reconcile to control accounts.
10. Cash drawer close must reconcile to expected cash variance.

## 12. Moat Strategy

The moat compounds from five layers:

1. Compliance moat

   SYSCOHADA account plan, OHADA reports, period close, accountant workflows, and auditability.

2. Operational moat

   POS, inventory, purchases, cash drawer, payments, customers, suppliers, payroll, and production all work together.

3. Automation moat

   Retail events post automatically to the ledger, reducing accountant workload and owner confusion.

4. Trust moat

   Immutability, reversals, audit logs, role controls, MFA, and explainable reports.

5. Local market moat

   OHADA country packs, French-first workflows, accountant partnerships, SMB onboarding, and offline POS for real-world retail environments.

## 13. Key Product Promise

For a retail SMB owner:

"Run your shop. RETACCOSY keeps your stock, cash, sales, suppliers, payroll, and OHADA books aligned automatically."

For an accountant:

"Review, adjust, close, and export compliant books with every number traceable to source documents."

For the business:

"One operating system instead of disconnected POS, Excel inventory, manual accounting, and late reports."

## 14. Recommended Immediate Next Step

Start Phase 0 and Phase 1 together, but keep implementation order strict:

1. Map active production surfaces.
2. Add accounting schema and services.
3. Seed SYSCOHADA retail chart.
4. Build manual journal and trial balance.
5. Only then connect POS sale posting.

This sequence prevents the common failure mode: wiring accounting directly into unstable POS/finance UI code before the ledger engine exists.

## 15. Decision To Make Before Coding

Before creating migrations, decide:

1. Should the accounting module be enabled for all organizations or behind an `accountingEnabled` flag?
2. Which OHADA country pack should be the first pilot?
3. Which POS sale path is the production path?
4. Should existing `CustomerLedgerEntry` and `SupplierLedgerEntry` remain as subledger views, or be replaced by ledger-derived records?
5. Should draft finance schema files be discarded or reconciled?

Recommended answers:

1. Use `accountingEnabled` and a setup wizard.
2. Pilot the country where the first real customer/accountant validation is available.
3. Choose one production POS path and quarantine the rest.
4. Move toward ledger-derived subledgers, keeping existing tables only as migration aids if needed.
5. Reconcile only useful concepts; do not build core accounting on stale draft finance models.

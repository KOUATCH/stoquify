# RETACCOSY OHADA Accounting Engine Proposal

Prepared: 2026-06-05

Project: RETACCOSY

Base product: StockFlow

Target market: Retail SMBs operating in OHADA member states

Canonical project input: User-provided RETACCOSY OHADA Roadmap pasted into Codex on 2026-06-05.

Working definition: RETACCOSY is the evolution of StockFlow from a POS and inventory platform into a retail business operating system where sales, cash, stock, purchasing, customers, suppliers, payroll, expenses, and statutory OHADA/SYSCOHADA accounting run from one controlled source of truth.

## 1. Executive Summary

RETACCOSY should become the operating system for retail SMBs in the OHADA zone.

The product should not be positioned as another POS, another inventory tool, or another accounting module. Its core promise is stronger:

> Run the shop normally. RETACCOSY keeps sales, cash, stock, suppliers, customers, payroll, and OHADA books aligned automatically.

The strategic opportunity is the gap between how retail SMBs actually operate and how their books must be maintained. Many merchants sell through POS terminals, track stock manually or semi-manually, pay suppliers outside the system, and then ask accountants to reconstruct books from receipts, spreadsheets, mobile money statements, and cash notes. This creates late reports, unreliable stock valuation, weak cash control, and compliance risk.

RETACCOSY should close that gap by creating an accounting engine underneath the operational platform. Every approved retail event becomes a deterministic, organization-scoped accounting event. Every posting is balanced, immutable after posting, traceable to source documents, reversible through controlled corrections, and reportable under OHADA/SYSCOHADA expectations.

The recommended build path is ledger-first:

1. Stabilize the active StockFlow product surface.
2. Build the accounting kernel: fiscal periods, chart of accounts, journals, posting batches, journal lines, source links, invariants, and audit trail.
3. Seed a practical SYSCOHADA retail chart template and onboarding wizard.
4. Build manual journals, general ledger, and trial balance before automation.
5. Automate POS sales, payments, refunds, cash drawer closes, inventory valuation, purchasing, expenses, payroll, production, and statutory reports in that order.

This sequencing protects accounting correctness. It also turns existing StockFlow breadth into a defensible product moat.

## 2. Compliance Context

OHADA is the Organization for the Harmonization of Business Law in Africa. Its official mission is to harmonize business law in Africa in order to support legal and judicial security for investors and companies in member states.

Official OHADA references establish these baseline facts for the proposal:

| Topic | Compliance Reference Point |
| --- | --- |
| Member states | OHADA lists 17 member states: Benin, Burkina Faso, Cameroon, Central African Republic, Cote d'Ivoire, Congo, Comoros, Gabon, Guinea, Guinea Bissau, Equatorial Guinea, Mali, Niger, Democratic Republic of Congo, Senegal, Chad, and Togo. |
| Accounting act | The Uniform Act on Accounting Law and Financial Reporting was adopted on 2017-01-26 and published in the OHADA Official Gazette on 2017-02-15. |
| SYSCOHADA | The act includes the revised OHADA accounting system, SYSCOHADA, including the OHADA general accounting plan and consolidated/combined accounting rules. |
| Effective dates | The updated UAAFR/SYSCOHADA became the accounting reference from 2018-01-01 for personal accounts and from 2019-01-01 for consolidated accounts, combined accounts, and IFRS-related financial statements. |

Official source pages:

- https://www.ohada.org/en/general-overview/
- https://www.ohada.org/en/publication-of-a-new-uniform-act-on-accounting-law-and-financial-reporting-uaafr/
- https://www.ohada.org/en/uniform-acts/
- https://www.ohada.org/en/ohada-accounting-law/

Implementation note: this proposal defines product and engineering direction. Final account mappings, financial statement layouts, tax treatment, payroll liabilities, local country packs, and export formats should be validated with qualified OHADA accountants in the pilot countries.

## 3. Strategic Thesis

RETACCOSY can win by owning the chain from retail operation to statutory accounting.

Most SMB software choices force a tradeoff:

- POS tools capture sales but do not produce trusted statutory books.
- Inventory tools track stock but do not always reconcile to general ledger value.
- Accounting tools record journals but often require manual reconstruction of retail operations.
- Spreadsheets fill gaps but create errors, weak controls, and no audit trail.

RETACCOSY should remove that tradeoff. The system should make the operational event the source of accounting truth.

The moat is the controlled integration layer:

- A sale is not just a receipt; it is revenue, tax, payment method, receivable if credit, cash drawer movement, inventory reduction, cost of goods sold, customer history, and audit evidence.
- A purchase receipt is not just stock entry; it is inventory value, supplier obligation, tax deductibility if applicable, landed cost, batch traceability, and future margin truth.
- A cash drawer close is not just cashier workflow; it is a reconciliation event between expected cash, counted cash, variance, payment methods, journals, and audit trail.
- A payroll run is not just HR; it is wage expense, employee liability, tax/social liability, payment settlement, and period reporting.

The product should become hard to replace because it combines day-to-day retail usability with accountant-grade books.

## 4. Product Vision

RETACCOSY should become a complete retail SMB operating system with these modules:

| Module | Business Purpose | Accounting Impact |
| --- | --- | --- |
| POS | Sell quickly, accept payments, print/send receipts, manage returns and voids. | Revenue, tax collected, payment clearing, cash drawer, receivables, COGS. |
| Inventory | Track stock by item, location, batch, serial, reorder point, and valuation. | Inventory asset, stock variance, COGS, write-offs, production input/output. |
| Purchasing | Manage suppliers, purchase orders, receipts, supplier invoices, and payments. | Inventory capitalization, supplier payables, deductible tax, payment settlement. |
| Customers | Manage credit customers, limits, settlements, statements, and aging. | Accounts receivable, bad debt/write-off, customer control reconciliation. |
| Suppliers | Manage supplier terms, balances, payments, and aging. | Accounts payable, supplier control reconciliation. |
| Cash and Bank | Control cash drawers, cash movements, bank/mobile money, deposits, and reconciliation. | Cash, bank, mobile money clearing, variances, bank reconciliation. |
| Expenses | Capture operating expenses, approvals, receipts, and payment methods. | Expense accounts, deductible tax, payables or cash/bank settlement. |
| HR and Payroll | Track employees, attendance, pay runs, deductions, and payments. | Payroll expense, employee liabilities, tax/social liabilities, settlements. |
| Production | Support recipes, production batches, wastage, output costing, and transformation. | Raw material consumption, finished goods, labor/overhead, production variance. |
| Accounting | Maintain chart, periods, journals, ledger, trial balance, statements, close, and exports. | Statutory books and reporting source of truth. |
| Reporting | Give owners, managers, and accountants reconciled dashboards and exports. | Operational KPIs tied back to ledger and source documents. |

## 5. Current StockFlow Baseline

StockFlow already contains many primitives needed for this operating system:

- Multi-tenant `Organization`, user, role, permission, session, invite, MFA, and audit foundations.
- `Location`, `POSStation`, `POSSession`, `CashDrawer`, and `CashDrawerTransaction` for retail cash operations.
- `Item`, `Category`, `Brand`, `Unit`, `InventoryLevel`, `InventoryTransaction`, and serial/stock controls.
- `Supplier`, `ItemSupplier`, `PurchaseOrder`, `PurchaseOrderLine`, and `GoodsReceipt`.
- `Customer`, `SalesOrder`, `SalesOrderLine`, `Payment`, and `PaymentRefund`.
- `ExpenseCategory` and `Expense`.
- `Recipe`, `RecipeIngredient`, and `ProductionBatch`.
- Existing `CustomerLedgerEntry` and `SupplierLedgerEntry` subledger-style records.
- A clean OHADA preparation baseline in `docs/OHADA_ACCOUNTING_READINESS.md`.

The generated architecture reports show that the codebase is broad enough to support the vision:

| Area | Graph Size |
| --- | ---: |
| Components | 1,623 nodes across 502 communities |
| Server actions and business logic | 1,242 nodes across 245 communities |
| App routes and pages | 689 nodes across 209 communities |
| Hooks and data fetching | 671 nodes across 137 communities |
| Type definitions | 69 nodes across 35 communities |

That breadth is an advantage only if it is disciplined. Accounting needs one authoritative operational path per domain.

## 6. Strategic Gaps

### 6.1 No Canonical Double-Entry Engine

Customer and supplier ledger entries exist, but they are not enough for statutory accounting. RETACCOSY needs a canonical general ledger with journals, debit/credit lines, fiscal periods, posting batches, immutable posted entries, reversals, source links, and reportable account balances.

### 6.2 Parallel Or Draft Implementations

The repository contains multiple generations of POS, dashboard, inventory, finance, analytics, and reporting work. This is manageable for product exploration but unsafe for accounting automation. A ledger cannot post correctly if the platform has more than one possible source of truth for the same business event.

### 6.3 Finance Schema Drift

`prisma/schema-financial.prisma` contains useful accounting concepts, but it is separate from the active Prisma schema. It should be treated as a reference, not as the production accounting foundation. Useful ideas should be reconciled into the active schema deliberately.

### 6.4 Authorization And Tenant Scope

Accounting data is high-risk. POS, inventory, finance, supplier, payroll, reports, and accounting actions must enforce organization scoping and permission checks consistently.

### 6.5 Financial Correctness Tests

The system needs tests for ledger invariants, posting rules, idempotency, closed-period rejection, source-document traceability, subledger reconciliation, and cross-tenant denial.

## 7. Design Principles

These principles should govern the accounting engine:

1. Accounting logic belongs in `services/accounting/*`.
2. Server actions stay thin: authenticate, authorize, validate, call service, invalidate cache.
3. Every accounting model and query is organization-scoped.
4. Every posting is idempotent by source document and posting purpose.
5. Every posted journal balances by currency.
6. Posted journal entries are immutable.
7. Corrections use reversal or adjustment entries.
8. Fiscal periods can be opened, closed, locked, and reopened only by authorized users.
9. Reports read from journal lines, not from operational tables.
10. Statement totals drill down to account, journal entry, posting batch, and source document.
11. Accounting setup cannot be marked complete until required SYSCOHADA mappings exist.
12. Automation starts only after manual ledger workflows and trial balance are correct.

## 8. Target Architecture

RETACCOSY should use an event-to-ledger architecture.

```text
Operational UI
  -> thin server action
  -> domain service
  -> database transaction
  -> accounting command
  -> posting service
  -> posting batch
  -> journal entry and journal lines
  -> source link and audit event
  -> ledger-backed reports
```

The domain service owns the retail operation. The accounting service owns the financial interpretation.

### 8.1 Operational Events

Initial events to support:

- POS sale completed.
- POS payment received.
- Refund processed.
- Void approved.
- Cash drawer closed.
- Goods received.
- Supplier invoice recorded.
- Supplier payment made.
- Customer credit settlement received.
- Expense approved.
- Stock adjustment approved.
- Stock transfer completed.
- Payroll run approved.
- Production batch completed.

### 8.2 Accounting Commands

Domain services should emit explicit commands:

- `PostSaleCommand`
- `PostPaymentCommand`
- `PostRefundCommand`
- `PostVoidCommand`
- `PostCashDrawerCloseCommand`
- `PostGoodsReceiptCommand`
- `PostSupplierInvoiceCommand`
- `PostSupplierPaymentCommand`
- `PostCustomerSettlementCommand`
- `PostExpenseCommand`
- `PostInventoryAdjustmentCommand`
- `PostPayrollRunCommand`
- `PostProductionBatchCommand`

### 8.3 Posting Service Responsibilities

The posting service resolves:

- Organization accounting settings.
- Accounting status and setup completion.
- Fiscal year and open accounting period.
- Source document idempotency key.
- Posting purpose.
- Posting rule and rule lines.
- SYSCOHADA account mappings.
- Tax treatment.
- Currency and rounding policy.
- Source document links.
- Audit metadata.

### 8.4 Reporting Rule

Statutory and accounting reports must read from the ledger:

- General ledger.
- Account balance.
- Trial balance.
- Balance sheet.
- Income statement.
- Cash flow or treasury view where required.
- Tax summary.
- Period close pack.
- Audit trail.

Operational dashboards can still read domain tables, but any financial number presented as accounting truth must reconcile to journal lines.

## 9. Proposed Accounting Domain Model

The active Prisma schema should gain a focused accounting kernel:

| Model | Purpose |
| --- | --- |
| `OrganizationAccountingSettings` | Enables accounting, country pack, currency policy, fiscal defaults, rounding, setup status. |
| `FiscalYear` | Defines organization fiscal years and close status. |
| `AccountingPeriod` | Defines monthly or custom posting periods and lock state. |
| `ChartOfAccount` | Organization account plan seeded from SYSCOHADA template and extended by tenant. |
| `Journal` | Sales, cash, bank, purchase, payroll, inventory, general, and adjustment journals. |
| `JournalEntry` | Header for draft, posted, reversed, and voided entries. |
| `JournalEntryLine` | Debit/credit lines with account, amount, currency, dimensions, and memo. |
| `LedgerPostingBatch` | Atomic batch created from a source event and posting purpose. |
| `AccountingSourceLink` | Traceability from journal/posting batch to sale, payment, receipt, expense, payroll, or stock event. |
| `PostingRule` | Organization or template-level rule for mapping source events to accounts. |
| `PostingRuleLine` | Debit/credit calculation line, account mapping key, tax behavior, and dimensions. |
| `LedgerAuditEvent` | Accounting-specific audit trail for posting, reversal, period close, and setup changes. |

Important design notes:

- `CustomerLedgerEntry` and `SupplierLedgerEntry` should become migration aids or ledger-derived subledger views. They should not remain independent sources of financial truth.
- `Payment.idempotencyKey` is already useful for payment retry protection; accounting needs equivalent source-posting idempotency across all operational events.
- Inventory valuation should use the existing weighted average fields on `InventoryLevel`, but the ledger should become the accounting source for inventory asset value after integration.

## 10. Core Services

Recommended service layout:

```text
services/accounting/
  accounts.service.ts
  accounting-settings.service.ts
  periods.service.ts
  journals.service.ts
  posting.service.ts
  posting-rules.service.ts
  source-link.service.ts
  reports.service.ts
  reconciliations.service.ts
  invariants.ts
  postings/
    post-sale.ts
    post-payment.ts
    post-refund.ts
    post-cash-drawer-close.ts
    post-goods-receipt.ts
    post-supplier-invoice.ts
    post-supplier-payment.ts
    post-customer-settlement.ts
    post-expense.ts
    post-inventory-adjustment.ts
    post-payroll-run.ts
    post-production-batch.ts
```

Required invariants:

- Debit equals credit per journal entry and currency.
- Journal line accounts belong to the same organization as the journal entry.
- Source documents belong to the posting organization.
- Source document plus posting purpose is unique.
- Entry date belongs to an open accounting period.
- Posted entries cannot be edited or deleted.
- Reversal entries point to the original entry.
- Trial balance debit total equals credit total.
- Subledgers reconcile to control accounts.
- Cash drawer close reconciles counted cash to expected cash and variance.

## 11. SYSCOHADA Retail Account Mapping

The first chart template should be pragmatic rather than exhaustive. It should seed the accounts required for retail operations, then allow accountant-controlled extension.

Initial mapping groups:

| Mapping Group | Examples |
| --- | --- |
| Cash and bank | Cash on hand, cash drawer, bank, mobile money clearing, card clearing. |
| Receivables | Customer receivables, doubtful accounts, customer deposits. |
| Inventory | Merchandise inventory, raw materials, finished goods, inventory variance, write-off. |
| Payables | Supplier payables, payroll liabilities, tax liabilities, social liabilities. |
| Revenue | Retail sales, discounts, returns, service income if enabled. |
| Tax | VAT/tax collected, VAT/tax deductible, tax payable, tax adjustments. |
| Cost and expense | COGS, freight/landed cost, rent, utilities, wages, bank fees, repairs, transport. |
| Equity/opening | Opening balances, retained earnings or equivalent local mapping. |

The setup wizard should require accountant review for:

- Country pack.
- Fiscal year start.
- Base currency.
- Tax regime and rates.
- Required control accounts.
- Default journals.
- Inventory valuation policy.
- Payment clearing accounts.
- Posting rule activation.

## 12. Posting Rule Matrix

Initial mandatory posting rules:

| Source Event | Posting Module | Financial Result |
| --- | --- | --- |
| Manual journal posted | `posting.service.ts` | Accountant-controlled balanced journal. |
| POS sale completed | `post-sale.ts` | Revenue, tax collected, receivable or payment clearing, inventory/COGS when stock is tracked. |
| POS payment received | `post-payment.ts` | Cash/bank/mobile money/card clearing settlement. |
| Refund processed | `post-refund.ts` | Reversal of revenue/tax/payment effects, inventory return where applicable. |
| Void approved | `post-void.ts` | Controlled cancellation or reversal according to status. |
| Cash drawer closed | `post-cash-drawer-close.ts` | Cash confirmation and variance posting. |
| Goods received | `post-goods-receipt.ts` | Inventory asset recognition or goods received not invoiced. |
| Supplier invoice recorded | `post-supplier-invoice.ts` | Supplier payable, deductible tax, inventory or expense recognition. |
| Supplier payment made | `post-supplier-payment.ts` | Payable settlement and cash/bank decrease. |
| Customer settlement received | `post-customer-settlement.ts` | Receivable settlement and cash/bank increase. |
| Expense approved | `post-expense.ts` | Expense, deductible tax if applicable, cash/bank/payable. |
| Stock adjustment approved | `post-inventory-adjustment.ts` | Inventory variance or write-off. |
| Payroll run approved | `post-payroll-run.ts` | Wage expense and payroll/tax/social liabilities. |
| Payroll paid | `post-payroll-payment.ts` | Liability settlement and cash/bank decrease. |
| Production batch completed | `post-production-batch.ts` | Raw material consumption, finished goods capitalization, variance. |

## 13. Product Experience

RETACCOSY should expose accounting without making cashiers think like accountants.

### Owner Experience

- Daily sales, cash, stock value, margin, payables, receivables, and cash position.
- Alerts for unposted events, cash variances, overdue suppliers, overdue customers, low stock, and closing exceptions.
- Simple drill-down from KPI to receipt, stock movement, payment, or journal.

### Cashier Experience

- Fast POS, barcode scanning, split payments, refunds, receipts, customer credit, and offline-ready flow.
- No journal screens in cashier flow.
- Clear end-of-shift cash drawer close.

### Inventory Manager Experience

- Stock on hand, available, reserved, in transit, on order, reorder, transfer, adjustment, count, and valuation.
- Stock events become accounting sources only after approval where needed.

### Accountant Experience

- Chart of accounts.
- Fiscal periods.
- Journals.
- Manual journal entry.
- Posting exceptions queue.
- Trial balance.
- General ledger.
- Account drill-down.
- Reversals and adjustments.
- Period close checklist.
- OHADA report pack.
- Export pack for external accountants and auditors.

### Administrator Experience

- Accounting setup wizard.
- Country pack selection.
- Permission matrix.
- Posting rule configuration.
- Audit log and data retention settings.

## 14. Roadmap

The roadmap should be sequential. Each phase creates the foundation for the next.

| Phase | Name | Objective | Done Gate |
| ---: | --- | --- | --- |
| 0 | Stabilize Production Surface | Identify active implementations and quarantine duplicates. | `npm run verify:repo` passes; active POS, inventory, purchase, finance, reporting paths are documented. |
| 1 | Accounting Domain Foundation | Add schema, services, invariants, source links, posting batches, and ledger audit events. | Accounts, periods, journals, posting batches, source links, and invariants work. |
| 2 | OHADA Account Plan And Setup Wizard | Seed SYSCOHADA retail templates and make accounting onboarding practical. | Required mappings exist before accounting can be activated. |
| 3 | Manual Journal And Ledger MVP | Build chart, journals, general ledger, trial balance, and period basics. | Trial balance reconciles and reports read from journal lines. |
| 4 | POS Sale Posting | Automate the first operational-to-accounting flow. | Each completed sale creates exactly one posting batch per purpose. |
| 5 | Payments, Refunds, Voids, Cash Drawer | Complete POS financial lifecycle. | Refunds reverse cleanly; cash drawer closes reconcile to ledger. |
| 6 | Inventory Accounting | Post COGS, stock adjustments, transfers, valuation, write-offs, and production stock effects. | Inventory asset balance reconciles to inventory valuation. |
| 7 | Purchasing And Supplier Accounting | Post goods receipts, supplier invoices, supplier payments, credit notes, and aging. | Supplier subledger reconciles to payable control account. |
| 8 | Customers, Credit, And Receivables | Support customer credit, payment allocation, credit notes, aging, and statements. | Receivables reconcile to customer statements and control account. |
| 9 | Expenses And Cash/Bank | Post expenses, petty cash, deposits, withdrawals, and bank reconciliation. | Cash/bank balances reconcile to ledger and source payments. |
| 10 | OHADA Financial Statements | Produce statutory reports, tax summaries, close packs, and exports. | Reports drill down to journal lines and source documents. |
| 11 | Payroll And HR Accounting | Post payroll runs, deductions, liabilities, payments, and payslip evidence. | Payroll liabilities reconcile to payslips and settlements. |
| 12 | Production And Cost Accounting | Post recipe consumption, finished goods capitalization, waste, and variance. | Produced item costs flow into inventory valuation. |
| 13 | Accountant Portal | Build review, close, export, and client collaboration workflows. | Accountant can close periods without database access. |
| 14 | Reporting Command Center | Build owner, manager, cashier, and accountant dashboards tied to source truth. | KPIs reconcile to source modules and show posting exceptions. |
| 15 | Multi-Country OHADA Packs | Add country-specific labels, defaults, exports, tax settings, and local accountant validation. | Pilot country pack is validated by local accountant. |
| 16 | Offline POS And Sync | Support unreliable internet environments with idempotent sync. | Offline sales sync without duplicate sales or postings. |
| 17 | Compliance, Security, And Trust | Harden MFA, permissions, audit logs, backups, exports, and security regression checks. | Security regression tests pass and the accounting audit trail is tamper-evident at application level. |
| 18 | Ecosystem And APIs | Add APIs, webhooks, imports, exports, partner accountant workspace, and template marketplace. | Integrations enforce permissions and all imports/exports are validated and audit logged. |

### 14.1 Detailed Delivery Roadmap

The proposed project should remain implementation-oriented. Each phase below names the build focus, the technical deliverables, and the gate that prevents the project from moving forward too early.

| Phase | Build Focus | Technical Deliverables | Verification Gate |
| ---: | --- | --- | --- |
| 0 | Keep the production baseline safe while removing ambiguity. Identify one active implementation for POS, inventory, purchase, finance, customer, supplier, dashboard, and reporting. Quarantine old or draft modules. Finish tenant and permission guards on high-risk writes. | `docs/ACTIVE_SURFACE_MAP.md`, `docs/LEGACY_QUARANTINE_MAP.md`, standardized protection helper, permission matrix. | `npm run verify:repo` passes; active app paths are known; no accounting work depends on quarantined code. |
| 1 | Add the accounting foundation before wiring operations into it. Create accounting settings, fiscal years, periods, chart, journals, entries, lines, posting batches, source links, posting rules, and audit events. | `OrganizationAccountingSettings`, `FiscalYear`, `AccountingPeriod`, `ChartOfAccount`, `Journal`, `JournalEntry`, `JournalEntryLine`, `PostingRule`, `PostingRuleLine`, `LedgerPostingBatch`, `AccountingSourceLink`. | Accounts can be seeded; periods can open and close; unbalanced entries are rejected; posted entries cannot be edited; reversals and idempotency work. |
| 2 | Make onboarding usable for real SMBs and accountants. Seed SYSCOHADA retail templates and require default mappings for cash, bank, receivables, payables, inventory, revenue, tax, COGS, variance, payroll, and expenses. | `prisma/seed-ohada-chart.ts`, `services/accounting/templates/syscohada.ts`, accounting setup components, setup server actions. | A new organization can initialize accounting quickly; setup cannot be marked complete while required mappings are missing. |
| 3 | Build the accountant MVP before automation. Provide chart of accounts, journals, manual entry, entry detail, reversal, general ledger, trial balance, and draft period close. | Accounting route pages under `app/[locale]/(dashboard)/dashboard/accounting/*`, `services/accounting/reports.service.ts`. | Accountants can create, post, reverse, and inspect entries; general ledger balances equal trial balance totals; closed periods reject new postings. |
| 4 | Connect the first operational flow: completed POS sale. Post revenue, tax, payment clearing or receivable, discounts, COGS, and inventory asset movement. | `services/accounting/posters/post-sale.ts`, active sale completion integration, source document links, sale posting tests. | Every completed sale creates exactly one posting batch; retries do not duplicate entries; receipt links to the journal. |
| 5 | Complete the POS financial lifecycle. Add payment received, customer credit settlement, refund, void reversal, cash drawer opening, cash in/out, drawer close, variance, deposit, and cash reconciliation. | `post-payment.ts`, `post-refund.ts`, `post-cash-drawer.ts`, cash reconciliation dashboard. | Cash drawer expected balance reconciles to ledger cash; refunds reverse original sale accounting; cash over/short posts to configured variance accounts. |
| 6 | Align inventory value with the ledger. Start with weighted average valuation, then support goods receipt capitalization, adjustment gain/loss, transfer policy, production consumption, finished goods, valuation report, and ledger reconciliation. | `post-goods-receipt.ts`, `post-inventory-adjustment.ts`, `post-production.ts`, `services/inventory/valuation.service.ts`. | Inventory asset balance reconciles to inventory valuation; negative stock policy is explicit; adjustments require authorization and reason codes. |
| 7 | Complete procure-to-pay. Add supplier invoice state or model, payable posting, purchase tax, supplier payment, credit note, supplier aging, supplier statement, and purchase-to-ledger reconciliation. | `SupplierInvoice`, `SupplierInvoiceLine`, `post-supplier-invoice.ts`, `post-supplier-payment.ts`. | Supplier payable subledger reconciles to the control account; payments link to source invoices; supplier aging is ledger-backed. |
| 8 | Support cash and credit retail sales. Add customer credit settings, invoice or credit sale flow, payment allocation, credit note, aging, statement, POS credit-limit enforcement, and later bad debt workflow. | `CustomerInvoice` if sales orders are insufficient, `PaymentAllocation`, `post-customer-settlement.ts`, customer statement and aging views. | Receivables reconcile to the control account; POS blocks credit sales beyond policy; statements are explainable from ledger lines and source documents. |
| 9 | Cover ordinary SMB back-office spending. Add expense approval, expense posting, petty cash expenses, bank payments, deposits, withdrawals, reconciliation import, and cash/bank dashboard. | `BankAccount`, `BankTransaction`, `BankReconciliation`, `post-expense.ts`, `bank-reconciliation.service.ts`. | Bank and cash balances reconcile to ledger; expense categories map to accounts; approval thresholds are permission-controlled. |
| 10 | Build the OHADA reporting pack. Produce trial balance, general ledger, balance sheet, income statement, cash flow support, schedules, tax/VAT report, close pack, Excel export, and PDF export. | `services/accounting/statements/*`, accounting report components. | Reports read from journal lines; every report line drills down to account, journal entry, and source document; exports are stable for accountant review. |
| 11 | Integrate HR and payroll financially. Stabilize employee and attendance models, payroll components, payroll run approval, payroll posting, payroll payment, payslips, and payroll reports. | `Employee`, `PayrollRun`, `PayrollRunLine`, `PayrollPayment`, `payroll-run.service.ts`, `post-payroll-run.ts`. | Approved payroll cannot be edited without reversal; liabilities reconcile to payments; payslips reconcile to payroll journals. |
| 12 | Serve retail businesses that produce or transform goods. Add recipe costing, raw material consumption, labor/overhead capture, finished goods capitalization, waste and variance posting, batch profitability, and product margin reporting. | `services/production/costing.service.ts`, `post-production-batch.ts`, production cost reports. | Produced item cost flows into inventory valuation; batch variance is visible and posted; margin reports use real costs. |
| 13 | Make the product useful for accountants. Add accountant role, client switcher, review queue, failed postings, mapping gaps, suspicious transactions, adjustment tools, close checklist, export pack, comments, and evidence attachments. | Accountant dashboard routes, `AccountingReviewItem`, `AccountingEvidence`, `services/accounting/review.service.ts`. | Accountant can close a month without database access; unresolved accounting problems appear in a queue; close pack is reproducible. |
| 14 | Turn the system into an executive cockpit. Add daily retail health, cash position, valuation, aging, gross margin, payables, receivables, payroll cost, tax position, store performance, and accountant readiness score. | `services/reporting/kpi.service.ts`, ledger-backed analytics summaries, role-specific dashboards. | Owner sees operational and accounting truth together; KPIs reconcile to source modules; dashboard shows freshness and posting exceptions. |
| 15 | Localize for the OHADA zone. Add country profile, fiscal norms, tax labels, invoice wording, default mappings, French-first bilingual UI, country exports, local review, and accountant onboarding material. | `CountryAccountingPack`, `TaxRegime`, `FiscalDocumentTemplate`, `services/accounting/country-packs/*`. | New organization can choose an OHADA country pack; reports and labels match local expectations; local accountants validate outputs. |
| 16 | Support unstable internet. Add offline cart, local transaction queue, idempotent sync, conflict resolution, offline receipt numbers, staged accounting source events, and sync health dashboard. | IndexedDB local store, sync API, `OfflineEvent`, `SyncConflict`, idempotent ledger posting after sync. | Cashier can sell offline; sync cannot duplicate sales or entries; manager sees unsynced risk clearly. |
| 17 | Make the platform trust-grade. Add MFA for privileged roles, session revocation, distributed rate limiting, full permission rollout, audit viewer, immutable accounting event log, security regression suite, backup drills, and export controls. | `services/security/*`, audit log viewer, dependency scanning, backup runbook. | Security regression tests pass; privileged actions require MFA; accounting audit trail is tamper-evident at application level. |
| 18 | Expand through integrations. Add public APIs, webhooks, importers for items/customers/suppliers/opening balances/chart, exporters for accountant packs/sales/inventory/journals, partner accountant workspace, and template marketplace. | Scoped API keys, webhook delivery logs, import validation pipeline, export job queue. | Integrations cannot bypass permissions; imports validate before commit; exports are reproducible and audit logged. |

## 15. Release Proposal

| Release | Scope | Outcome |
| --- | --- | --- |
| A: Foundation Ready | Active surface map, duplicate quarantine, authorization sweep, verification gate. | Safe base for accounting work. |
| B: Accounting Kernel | Fiscal periods, chart, journals, posting batches, manual journal, reversals, trial balance. | Real double-entry accounting exists. |
| C: POS Accounting | Sale, payment, refund, void, cash drawer close, receipt-to-journal traceability. | Retail transactions produce books automatically. |
| D: Inventory And Purchasing | Inventory valuation, COGS, goods receipt, supplier invoice, supplier payment, aging. | Stock and procurement reconcile to ledger. |
| E: OHADA Reporting | General ledger, trial balance, financial statements, tax summaries, close pack, exports. | Accountant-grade OHADA reporting exists. |
| F: Operating System Expansion | Payroll, production costing, bank reconciliation, expense workflows, accountant portal. | Full SMB business operating system. |
| G: Market Moat | Country packs, offline sync, accountant partnerships, APIs, benchmark analytics. | RETACCOSY becomes difficult to replace. |

## 16. First Implementation Tickets

Recommended first tickets, in order:

1. Create `docs/ACTIVE_SURFACE_MAP.md`.
2. Select the single active POS sale completion path.
3. Select the single active inventory adjustment and stock transfer paths.
4. Decide whether `prisma/schema-financial.prisma` is merged, rewritten, or discarded.
5. Add accounting permissions and role defaults.
6. Add `OrganizationAccountingSettings`.
7. Add `FiscalYear` and `AccountingPeriod`.
8. Add `ChartOfAccount`.
9. Add `Journal`.
10. Add `JournalEntry` and `JournalEntryLine`.
11. Add `LedgerPostingBatch`.
12. Add `AccountingSourceLink`.
13. Add posting-purpose idempotency constraints.
14. Implement `assertBalancedJournalEntry`.
15. Implement `createManualJournalEntry`.
16. Implement `postJournalEntry`.
17. Implement `reverseJournalEntry`.
18. Seed initial SYSCOHADA retail chart template.
19. Build accounting setup service.
20. Build chart of accounts page.
21. Build manual journal page.
22. Build trial balance report.
23. Add accounting invariant tests.
24. Add closed-period rejection tests.
25. Add source idempotency tests.

POS automation should begin only after these tickets produce a working ledger foundation.

## 17. Verification Strategy

Every accounting phase should ship with verification gates:

| Gate | Required Proof |
| --- | --- |
| Schema gate | `npm run prisma:validate` passes. |
| Type gate | `npm run typecheck` passes. |
| Repo gate | `npm run verify:repo` passes. |
| Invariant gate | Balanced journal, immutable posting, reversal, idempotency, and period-lock tests pass. |
| Reconciliation gate | Trial balance totals reconcile; subledgers reconcile to control accounts. |
| Authorization gate | Cross-tenant and permission-denial tests pass. |
| Source trace gate | Report line drills down to account, journal, posting batch, and source document. |

Suggested accounting test groups:

- `services/accounting/invariants.test.ts`
- `services/accounting/posting.service.test.ts`
- `services/accounting/manual-journal.test.ts`
- `services/accounting/periods.service.test.ts`
- `services/accounting/postings/post-sale.test.ts`
- `services/accounting/reconciliations.test.ts`

## 18. Risk Register

| Risk | Impact | Control |
| --- | --- | --- |
| Multiple active POS paths | Duplicate or missing ledger postings. | Select one production POS path before POS posting work. |
| Draft finance schema reused prematurely | Ledger foundation conflicts with active schema. | Use draft schema only as reference; implement in active schema deliberately. |
| Missing tenant scoping | Cross-organization financial data exposure. | Standardize protection helpers and test cross-tenant denial. |
| Missing idempotency | Duplicate journals from retries, offline sync, or repeated actions. | Unique source-document plus posting-purpose constraints. |
| Reports read operational tables | Statement totals drift from ledger truth. | Require statutory reports to read from journal lines. |
| Posted journals can be mutated | Audit trail becomes unreliable. | Enforce immutable posted entries and reversal-only correction. |
| Closed periods accept postings | Close process loses authority. | Reject closed-period postings except controlled reopen workflows. |
| Country packs are generic | Local adoption suffers. | Validate first pack with local OHADA accountant and pilot customer. |
| Inventory valuation drift | Gross margin and assets become unreliable. | Reconcile inventory valuation to ledger after each close. |
| Offline sync duplicates events | Cash, stock, and ledger become unreliable. | Use event staging, idempotency keys, and conflict handling. |

## 19. Governance

Accounting features should be governed more strictly than ordinary UI features.

Recommended controls:

- Architecture decision records for accounting schema and posting design.
- Accountant review for SYSCOHADA chart mapping and report layouts.
- Permission review for each accounting action.
- Migration notes for any change to posted-entry behavior.
- Seed data that demonstrates a complete retail accounting cycle.
- Release checklist for accounting invariants and reconciliations.
- Audit log review for setup changes, posting, reversal, period close, and export.

## 20. Key Decisions Needed

| Decision | Recommended Direction |
| --- | --- |
| First pilot country | Choose the country where accountant/customer validation is immediately available. |
| Accounting activation | Use `accountingEnabled` plus setup wizard completion, not automatic activation for every organization. |
| Draft finance schema | Reconcile useful concepts into active schema; do not use stale delegates as foundation. |
| Customer/supplier ledgers | Move toward ledger-derived subledgers; keep existing tables only as migration aids or denormalized views. |
| Inventory valuation policy | Start with weighted average because current `InventoryLevel` already tracks average cost and total value. |
| Offline POS | Add after POS-to-ledger is deterministic and idempotent. |
| Country packs | Start with one validated pilot, then generalize. |

## 21. Business Case

RETACCOSY can create value for three buyer groups:

| Buyer | Pain | RETACCOSY Value |
| --- | --- | --- |
| Retail owner | Does not know true stock, cash, profit, receivables, or payables until too late. | Daily operating cockpit with numbers tied to source events and ledger. |
| Accountant | Reconstructs books manually from messy operational evidence. | Review-ready journals, trial balance, exports, and source-document drill-down. |
| Manager/cashier | Needs fast daily workflows, not accounting complexity. | POS, stock, cash drawer, and purchasing flows that automatically feed books. |

The strongest commercial position is:

> RETACCOSY is the OHADA retail operating system that turns every shop transaction into clean books.

This supports pricing beyond basic POS because the product reduces accounting labor, compliance friction, inventory leakage, cash variance, and management uncertainty.

## 22. Final Recommendation

RETACCOSY should proceed as a ledger-first transformation of StockFlow.

The immediate goal is not to bolt accounting screens onto the current product. The immediate goal is to create a trustworthy accounting kernel that can receive operational events safely. Once that kernel exists, POS sale posting becomes the first automation wedge, followed by payments, cash drawers, inventory valuation, suppliers, receivables, expenses, OHADA reports, payroll, production costing, accountant workflows, country packs, offline sync, and APIs.

The sequencing rule is simple:

> Build the ledger engine first, prove it manually, then automate operational posting.

That approach protects statutory correctness, gives accountants confidence, lets owners trust the numbers, and gives RETACCOSY the foundation to become the default operating system for retail SMBs in the OHADA zone.

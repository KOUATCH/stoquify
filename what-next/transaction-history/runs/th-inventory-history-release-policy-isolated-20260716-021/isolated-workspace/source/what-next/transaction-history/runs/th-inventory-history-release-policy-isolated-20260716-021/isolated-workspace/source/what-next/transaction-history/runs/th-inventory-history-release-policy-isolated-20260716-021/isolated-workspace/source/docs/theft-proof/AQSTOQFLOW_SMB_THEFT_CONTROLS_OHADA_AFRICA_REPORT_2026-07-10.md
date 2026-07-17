# AqStoqFlow SMB Theft Controls For OHADA And African Markets

Original report date: 2026-07-10
Regenerated on: 2026-07-11
Workspace: E:\ohada saas\Focused projects\stoquify
Folder: docs/theft-proof

## Executive Summary

SMB theft is rarely one isolated event. It is usually a repeated control failure.

Examples include:

- cash collected but not recorded
- stock moved without evidence
- fake supplier invoices
- duplicate payments
- inflated payroll
- false expenses
- unauthorized discounts
- shared passwords
- quiet manual corrections

For OHADA-zone and African SMBs, these risks are intensified by cash-heavy sales, mobile-money settlements, manual purchasing, multi-branch stock movement, informal supplier relationships, intermittent connectivity, and owners who cannot watch every cashier, warehouse, driver, branch, and approver at once.

The system should not promise that theft is physically impossible. A stronger and more truthful promise is:

> AqStoqFlow turns theft-prone operations into evidence-controlled workflows. It makes unauthorized removal, silent correction, fake documentation, collusion, and repeated suspicious behavior harder to execute, faster to detect, harder to hide, and easier to investigate.

## Why Theft Damages SMB Efficiency

Theft hurts more than the amount stolen.

It also causes:

- weak margins
- stockouts
- cash-flow pressure
- wrong reports
- delayed supplier payments
- customer disputes
- staff mistrust
- tax and audit risk
- owner overload

When the owner cannot trust the system, every decision becomes slower. The owner buys too much, pays too late, suspects honest staff, and spends time investigating instead of growing the business.

## Major Theft Patterns And Controls

### 1. Inventory Theft And Shrinkage

**How it happens:** Goods leave without sale, transfer, damage, or approved write-off.

**Consequence:** Stockouts, lower margins, false inventory reports.

**Controls:** Inventory ledger, physical count, blind count, variance workflow, maker-checker approval, owner shortage dashboard.

### 2. Fake Damage, Expiry, And Write-Offs

**How it happens:** Staff claim goods were damaged, expired, stolen, or written off to hide removal.

**Consequence:** False losses and hidden theft.

**Controls:** Evidence requirements, reason codes, approval thresholds, repeated-pattern alerts.

### 3. Cash Skimming

**How it happens:** Cash is collected but the sale is not recorded, or the receipt is not issued.

**Consequence:** Direct revenue loss and unreliable branch sales reports.

**Controls:** Receipt numbering, cash drawer close, cash count variance, sales-to-cash reconciliation.

### 4. Void And Cancellation Abuse

**How it happens:** A real sale is cancelled after the customer leaves.

**Consequence:** Cash disappears while the system shows no sale.

**Controls:** Void approval, reason codes, audit trail, repeated void alerts.

### 5. Refund And Return Fraud

**How it happens:** Fake refunds are created, or returned goods are kept outside the system.

**Consequence:** Cash and stock both leak.

**Controls:** Refund linked to original sale, stock return verification, high-value approval.

### 6. Unauthorized Discounts And Price Overrides

**How it happens:** Staff sell below approved price or give private discounts.

**Consequence:** Margin erosion and distorted performance reports.

**Controls:** Discount permission tiers, margin floors, price override approval, discount dashboard.

### 7. Supplier Overbilling

**How it happens:** Supplier prices are inflated through weak review or collusion.

**Consequence:** Cost of goods rises and margin falls.

**Controls:** Purchase order approval, price variance alerts, supplier price history.

### 8. Fake Supplier Invoices

**How it happens:** The business is billed for goods or services not received.

**Consequence:** Direct cash loss and false expenses.

**Controls:** Three-way match between purchase order, goods receipt, and invoice.

### 9. Duplicate Supplier Payments

**How it happens:** Same invoice is entered or paid more than once.

**Consequence:** Cash loss and supplier reconciliation problems.

**Controls:** Duplicate invoice detection, duplicate payment blocker, document hash comparison.

### 10. Supplier Payment Diversion

**How it happens:** Supplier bank or mobile-money details are changed to an account controlled by a fraudster.

**Consequence:** Supplier remains unpaid and cash is lost.

**Controls:** Maker-checker for supplier payment details, fresh authentication, owner alert before first payment to changed details.

### 11. Short Receiving From Suppliers

**How it happens:** Supplier delivers less than ordered, but full receipt is recorded.

**Consequence:** Business pays for goods it did not receive.

**Controls:** Goods receipt counting, receiving evidence, PO-to-receipt-to-invoice matching.

### 12. Branch Or Warehouse Transfer Leakage

**How it happens:** Sent quantity differs from received quantity.

**Consequence:** Branch disputes and missing stock.

**Controls:** Transfer dispatch, transfer receipt, sent-versus-received reconciliation, variance workflow.

### 13. Customer Collection Theft

**How it happens:** Collector receives money but customer remains marked unpaid.

**Consequence:** Cash loss and customer disputes.

**Controls:** Customer receipts, customer ledger, collector reconciliation, statement confirmation.

### 14. Unauthorized Receivable Write-Offs

**How it happens:** Customer debt is cancelled without valid approval.

**Consequence:** Hidden collection theft and false receivable reports.

**Controls:** Write-off approval, evidence, owner alerts, aging dashboard.

### 15. Payroll Ghost Workers

**How it happens:** Fake or inactive employees remain on payroll.

**Consequence:** Monthly recurring cash leakage.

**Controls:** Employee master-data approval, payroll register review, payment reconciliation.

### 16. Fake Overtime And Attendance Manipulation

**How it happens:** Hours, shifts, or attendance records are inflated.

**Consequence:** Payroll costs rise without real productivity.

**Controls:** Attendance-to-payroll link, overtime approval, late edit audit trail.

### 17. Expense, Petty Cash, And Advance Abuse

**How it happens:** Fake receipts, duplicate claims, inflated expenses, and unretired advances.

**Consequence:** Small repeated losses become large.

**Controls:** Expense approval, receipt hash, duplicate detection, petty cash ledger, advance aging.

### 18. Bank, Mobile-Money, And Settlement Leakage

**How it happens:** Sales do not match bank or mobile-money settlement records.

**Consequence:** Owner cannot tell what money truly arrived.

**Controls:** Bank/mobile-money import, sale-to-payment matching, short settlement alerts.

### 19. Master-Data Tampering

**How it happens:** Prices, units, supplier details, tax codes, accounts, or user roles are changed to enable fraud.

**Consequence:** Fraud hides inside configuration.

**Controls:** Version history, maker-checker, fresh auth, owner alerts, close blockers.

### 20. Shared Passwords And Excessive Permissions

**How it happens:** Staff share logins or hold more access than their job requires.

**Consequence:** Nobody is accountable.

**Controls:** RBAC, least privilege, session audit, user deactivation, segregation-of-duty checks.

## Platform Control Mechanisms

### Service-Owned Truth

Important business records should be created by trusted workflows, not manual edits.

### Immutable Ledgers

The system should preserve history. Corrections should be recorded as corrections, not silent overwrites.

### Maker-Checker

The person who starts a sensitive action should not approve it alone.

### Evidence Requirements

Sensitive actions should require proof such as receipts, count sheets, delivery notes, payment confirmations, photos, signed approvals, or document hashes.

### Reconciliation

The system should compare records that must agree:

- sales versus cash
- sales versus mobile-money settlements
- PO versus receipt versus invoice
- stock sent versus stock received
- payroll register versus payment batch
- fiscal documents versus ledger

### Owner Exception Dashboard

Owners should see unresolved risk directly:

- stock shortages
- cash drawer shortages
- repeated voids
- large refunds
- duplicate invoices
- supplier price spikes
- changed payment details
- open advances
- payroll changes
- settlement differences
- accounting close blockers

## Product Claim Recommendation

Avoid:

> Theft-proof system.

Use:

> Theft-resistant operating system for SMBs.

Stronger wording:

> AqStoqFlow gives owners an evidence-controlled business. Stock, cash, supplier payments, payroll, and expenses can no longer disappear quietly. Every sensitive action leaves a trail, every difference becomes an exception, and repeated suspicious behavior rises to the owner before it becomes a crisis.

## Implementation Order

1. Finish inventory controls.
2. Harden POS cash controls.
3. Harden purchasing and supplier payments.
4. Add bank and mobile-money reconciliation.
5. Harden payroll controls.
6. Harden expenses and advances.
7. Harden master data and user access.
8. Build a cross-module owner exception dashboard.

## Final Summary

The system does not make theft impossible. It makes dishonest behavior harder to hide.

The business becomes safer because stock, cash, payments, payroll, expenses, and settings become traceable, approved, reconciled, and visible to the owner.

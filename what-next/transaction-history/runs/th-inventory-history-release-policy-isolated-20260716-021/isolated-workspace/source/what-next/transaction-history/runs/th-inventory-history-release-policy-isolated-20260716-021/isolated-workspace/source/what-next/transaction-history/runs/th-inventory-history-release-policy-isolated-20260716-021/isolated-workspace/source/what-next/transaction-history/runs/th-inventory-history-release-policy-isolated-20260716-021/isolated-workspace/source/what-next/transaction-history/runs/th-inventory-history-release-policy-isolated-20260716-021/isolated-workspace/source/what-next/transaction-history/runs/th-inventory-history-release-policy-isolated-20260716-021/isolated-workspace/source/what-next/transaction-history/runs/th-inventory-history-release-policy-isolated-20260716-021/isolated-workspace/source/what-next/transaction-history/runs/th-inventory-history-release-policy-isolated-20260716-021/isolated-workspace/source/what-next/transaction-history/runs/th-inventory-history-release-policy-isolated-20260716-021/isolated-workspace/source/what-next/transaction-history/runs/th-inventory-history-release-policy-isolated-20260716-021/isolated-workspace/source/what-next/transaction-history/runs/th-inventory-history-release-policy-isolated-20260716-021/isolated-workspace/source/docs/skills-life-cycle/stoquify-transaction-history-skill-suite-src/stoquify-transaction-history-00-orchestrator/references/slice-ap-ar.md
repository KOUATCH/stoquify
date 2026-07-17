# Slice: AP and AR Control Histories

## Prerequisite

Require `gates.foundationInventory.status: PASS` with evidence. `cash-payment` is the default earlier priority but not a hard technical prerequisite.

Requested lanes: one or both of `ap`, `ar`.

## AP lane

- Trace PO, receipt, supplier invoice, match, approval, payment, reconciliation, posting, and reversal.
- Prove opening balance + movements = closing balance.
- Tie the supplier subledger to the AP control account when making accounting claims.
- Preserve duplicate-invoice fingerprints, bank-detail holds, approval evidence, and source links.

## AR accounting prerequisite gate

Before Stage 04 may operate on lane `ar`, require `gates.arAccountingPrerequisites.status: PASS` with evidence for:

- invoice versus sales-order semantics
- receipt allocation and allocation reversal
- due dates and open-item state
- credits, refunds, and credit notes
- bad-debt/write-off approval and correction
- customer ledger and GL source links
- aging and control-account tie-out rules

If the gate does not pass:

- Add `ar` to blocked lanes.
- Continue AP-only when lane `ap` remains.
- Stop an AR-only run with code `AR_ACCOUNTING_PREREQUISITES_NOT_PASSED`.
- Never substitute recent payments, orders, or UI arithmetic for a receivable statement.

## Stage gates

- Stage 02: supplier bank, customer credit, contact, tax, and provider fields have table/drawer/export redaction rules.
- Stage 03: AP and requested AR invariants have evidence; posted history is corrected or reversed, not edited.
- Stage 04: statement balances, aging, summaries, rows, and export share one filter and as-of contract.
- Stage 05: lifecycle drawers retain domain meaning instead of flattening AP and AR into generic events.
- Stage 06: blocked AR is not exposed by route, action, component, or export.
- Stage 07: allocation, reversal, duplicate, hold, tie-out, RBAC, pagination, and export tests pass for active lanes.

## Stop conditions

- Orders are presented as invoices without an approved accounting contract.
- Receipts are double-counted or allocations are not reversible.
- Running balances cannot be reconciled to opening and closing balances.
- Bank-detail changes or write-offs bypass approval evidence.
- AR implementation proceeds while its accounting prerequisite gate is pending, blocked, or missing evidence.

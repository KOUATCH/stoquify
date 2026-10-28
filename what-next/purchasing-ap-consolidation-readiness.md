# Purchasing AP Consolidation Readiness Gate

Generated: 2026-08-22T09:02:49.758Z
Mode: fail
Status: ready

## Summary

- Checks ready: 11/11
- Blockers: 0

## Checks

- ready: purchase_order_maker_checker
- ready: goods_receipt_atomic_stock_posting
- ready: evidence_preserving_line_cleanup
- ready: supplier_invoice_maker_checker
- ready: supplier_invoice_receipt_and_variance_controls
- ready: supplier_invoice_three_way_match_evidence
- ready: ap_ledger_source_and_audit_proof
- ready: ap_posting_close_invalidation
- ready: supplier_payment_maker_checker
- ready: supplier_destination_and_reconciliation_controls
- ready: assurance_and_policy_wiring

## Blockers

- None

## Safety

- This gate is static and read-only.
- It does not post inventory, journals, invoices, or supplier payments.
- It verifies internal control seams, not supplier, bank, tax, or statutory certification.

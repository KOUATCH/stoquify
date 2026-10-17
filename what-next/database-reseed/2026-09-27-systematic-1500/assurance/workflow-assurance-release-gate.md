# Workflow Assurance Scheduler Release Gate Report

Generated: 2026-09-27T11:30:02.133Z
Mode: `fail`
Root: `E:\ohada saas\Focused projects\stoquify`

## Summary

- Enforce-mode status: `ready`
- Checks ready: 38/38
- Indexes ready: 11/11
- Engine-health gates ready: 2/2
- Blockers: 0

## Check Readiness

| Check | State | Mode | Owner | Action route | Blockers |
| --- | --- | --- | --- | --- | --- |
| ledger.posted_source_link.required | active | scheduled_scan | accountant | /dashboard/accounting/journals | None |
| business_event.applied_or_visible | active | scheduled_scan | operations_lead | /dashboard/manager-action-center | None |
| business_event.outbox.stuck_sla | active | scheduled_scan | operations_lead | /dashboard/manager-action-center | None |
| ledger.posted_batch_journal.required | active | scheduled_scan | accountant | /dashboard/accounting/journals | None |
| ledger.journal_entry.balanced | active | scheduled_scan | accountant | /dashboard/accounting/reports/trial-balance | None |
| compliance.final_document_hash.required | active | scheduled_scan | accountant | /dashboard/compliance | None |
| ledger.closed_period.posting_blocked | active | scheduled_scan | accountant | /dashboard/accounting/control-center | None |
| ledger.failed_posting_batch.visible | active | scheduled_scan | finance_manager | /dashboard/manager-action-center | None |
| pos.completed_sale_payment.required | active | scheduled_scan | branch_manager | /dashboard/pos | None |
| pos.completed_sale_receipt.required | active | scheduled_scan | branch_manager | /dashboard/pos | None |
| pos.completed_sale_stock_movement.required | active | scheduled_scan | inventory_manager | /dashboard/pos | None |
| pos.completed_sale_ledger_source_link.required | active | scheduled_scan | finance_manager | /dashboard/pos | None |
| pos.network_tender_idempotency_hash.required | active | scheduled_scan | finance_manager | /dashboard/pos | None |
| offline_pos.replay_sla.visible | active | scheduled_scan | operations_lead | /dashboard/pos | None |
| offline_pos.accepted_event_business_event.required | active | scheduled_scan | operations_lead | /dashboard/pos | None |
| offline_pos.sequence_hash_conflict.visible | active | scheduled_scan | operations_lead | /dashboard/pos | None |
| offline_pos.quarantined_event_conflict.required | active | scheduled_scan | operations_lead | /dashboard/pos | None |
| offline_pos.replayed_event_proof.required | active | scheduled_scan | operations_lead | /dashboard/pos | None |
| payment_reconciliation.exception_sla.visible | active | scheduled_scan | finance_manager | /dashboard/finance/reconciliation | None |
| payment_reconciliation.suspense_owner.required | active | scheduled_scan | finance_manager | /dashboard/finance/reconciliation | None |
| payment_reconciliation.unmatched_provider_event.visible | active | scheduled_scan | finance_manager | /dashboard/finance/reconciliation | None |
| payment_reconciliation.unsigned_run_sla.visible | active | scheduled_scan | finance_manager | /dashboard/finance/reconciliation | None |
| payment_reconciliation.certificate_source_hash.current | active | scheduled_scan | finance_manager | /dashboard/finance/reconciliation | None |
| purchasing_ap.po_approval_receipt_trace.required | active | scheduled_scan | operations_lead | /dashboard/purchase-orders | None |
| purchasing_ap.goods_receipt_stock_movement.required | active | scheduled_scan | inventory_manager | /dashboard/purchases | None |
| purchasing_ap.supplier_invoice_three_way_match.required | active | scheduled_scan | finance_manager | /dashboard/purchases/payables | None |
| purchasing_ap.supplier_invoice_posting_proof.required | active | scheduled_scan | finance_manager | /dashboard/finance/payables | None |
| purchasing_ap.released_payment_evidence.required | active | scheduled_scan | finance_manager | /dashboard/finance/payables | None |
| purchasing_ap.supplier_bank_pending_release.blocked | active | scheduled_scan | finance_manager | /dashboard/purchases/suppliers | None |
| inventory.completed_adjustment_evidence.required | active | scheduled_scan | inventory_manager | /dashboard/inventory/movements | None |
| payroll.released_payment_evidence.required | active | scheduled_scan | payroll_lead | /dashboard/payroll | None |
| payroll.payment_reconciliation_exception.visible | active | scheduled_scan | payroll_lead | /dashboard/payroll | None |
| payroll.provider_inbox_worker_sla.visible | active | scheduled_scan | payroll_lead | /dashboard/payroll/payments | None |
| payroll.declaration_lifecycle_exception.visible | active | scheduled_scan | accountant | /dashboard/payroll | None |
| payroll.close_evidence.stale.visible | active | pre_close_gate | accountant | /dashboard/accounting/close | None |
| compliance.submission_sla.visible | active | scheduled_scan | accountant | /dashboard/compliance | None |
| close.certified_pack_evidence.current | active | pre_close_gate | accountant | /dashboard/accounting/close | None |
| pos.closed_shift_cash_shortage.review | disabled | scheduled_scan | branch_manager | /dashboard/manager-action-center | None |

## Indexes

- ready: organization + check + definition version + source identity
- ready: organization + status + severity + detected date
- ready: organization + workflow + status
- ready: organization + owner + status + due date
- ready: organization + run status + started date
- ready: organization + source type + source id
- ready: organization + alert delivery status
- ready: organization + check + definition version + execution key
- ready: finding run + deterministic ordinal
- ready: finding run + stable fingerprint
- ready: finding organization + source type + source id

## Engine Health

- ready: Control Tower exposes stale run, failed run, pending alert, and failed alert health
- ready: Scheduler policy classifies execution modes and cursor fields

## Blockers

No Workflow Assurance release blockers detected by this static gate.

## Safety Notes

- This gate is static and read-only. It does not run checks, mutate tenants, or enable enforce-mode.
- A check should stay observe-mode until owner, route, proof/source evidence, source hash, and tests are present.
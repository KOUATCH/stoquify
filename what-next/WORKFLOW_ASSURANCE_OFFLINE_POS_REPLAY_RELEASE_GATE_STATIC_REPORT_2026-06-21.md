# Workflow Assurance Scheduler Release Gate Report

Generated: 2026-06-21T21:05:31.721Z
Mode: `report`
Root: `E:\ohada saas\newStockFlow\aqstoqflow`

## Summary

- Enforce-mode status: `ready`
- Checks ready: 29/29
- Indexes ready: 6/6
- Engine-health gates ready: 2/2
- Blockers: 0

## Check Readiness

| Check | Mode | Owner | Action route | Blockers |
| --- | --- | --- | --- | --- |
| ledger.posted_source_link.required | scheduled_scan | accountant | /dashboard/accounting/journals | None |
| business_event.applied_or_visible | scheduled_scan | operations_lead | /dashboard/manager-action-center | None |
| business_event.outbox.stuck_sla | scheduled_scan | operations_lead | /dashboard/manager-action-center | None |
| ledger.posted_batch_journal.required | scheduled_scan | accountant | /dashboard/accounting/journals | None |
| ledger.journal_entry.balanced | scheduled_scan | accountant | /dashboard/accounting/reports/trial-balance | None |
| compliance.final_document_hash.required | scheduled_scan | accountant | /dashboard/compliance | None |
| ledger.closed_period.posting_blocked | scheduled_scan | accountant | /dashboard/accounting/control-center | None |
| ledger.failed_posting_batch.visible | scheduled_scan | finance_manager | /dashboard/manager-action-center | None |
| pos.completed_sale_payment.required | scheduled_scan | branch_manager | /dashboard/pos | None |
| pos.completed_sale_receipt.required | scheduled_scan | branch_manager | /dashboard/pos | None |
| pos.completed_sale_stock_movement.required | scheduled_scan | inventory_manager | /dashboard/pos | None |
| pos.completed_sale_ledger_source_link.required | scheduled_scan | finance_manager | /dashboard/pos | None |
| pos.network_tender_idempotency_hash.required | scheduled_scan | finance_manager | /dashboard/pos | None |
| offline_pos.replay_sla.visible | scheduled_scan | operations_lead | /dashboard/pos | None |
| offline_pos.accepted_event_business_event.required | scheduled_scan | operations_lead | /dashboard/pos | None |
| offline_pos.sequence_hash_conflict.visible | scheduled_scan | operations_lead | /dashboard/pos | None |
| offline_pos.quarantined_event_conflict.required | scheduled_scan | operations_lead | /dashboard/pos | None |
| offline_pos.replayed_event_proof.required | scheduled_scan | operations_lead | /dashboard/pos | None |
| payment_reconciliation.exception_sla.visible | scheduled_scan | finance_manager | /dashboard/finance/reconciliation | None |
| payment_reconciliation.suspense_owner.required | scheduled_scan | finance_manager | /dashboard/finance/reconciliation | None |
| payment_reconciliation.unmatched_provider_event.visible | scheduled_scan | finance_manager | /dashboard/finance/reconciliation | None |
| payment_reconciliation.unsigned_run_sla.visible | scheduled_scan | finance_manager | /dashboard/finance/reconciliation | None |
| payment_reconciliation.certificate_source_hash.current | scheduled_scan | finance_manager | /dashboard/finance/reconciliation | None |
| purchasing_ap.released_payment_evidence.required | scheduled_scan | finance_manager | /dashboard/finance/payables | None |
| purchasing_ap.supplier_bank_pending_release.blocked | scheduled_scan | finance_manager | /dashboard/purchases/suppliers | None |
| inventory.completed_adjustment_evidence.required | scheduled_scan | inventory_manager | /dashboard/inventory/movements | None |
| payroll.released_payment_evidence.required | scheduled_scan | payroll_lead | /dashboard/payroll | None |
| compliance.submission_sla.visible | scheduled_scan | accountant | /dashboard/compliance | None |
| close.certified_pack_evidence.current | pre_close_gate | accountant | /dashboard/accounting/close | None |

## Indexes

- ready: organization + status + severity + detected date
- ready: organization + workflow + status
- ready: organization + owner + status + due date
- ready: organization + run status + started date
- ready: organization + source type + source id
- ready: organization + alert delivery status

## Engine Health

- ready: Control Tower exposes stale run, failed run, pending alert, and failed alert health
- ready: Scheduler policy classifies execution modes and cursor fields

## Blockers

No Workflow Assurance release blockers detected by this static gate.

## Safety Notes

- This gate is static and read-only. It does not run checks, mutate tenants, or enable enforce-mode.
- A check should stay observe-mode until owner, route, proof/source evidence, source hash, and tests are present.
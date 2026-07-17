# Kontava Domain Assurance Pack Run Report - 2026-06-21

## Scope

Executed the `kontava-domain-assurance-pack` skill against the current Workflow Assurance Registry. This run expands assurance coverage beyond ledger/event checks into manager-actionable controls for POS, offline replay, payments, suspense, purchasing/AP, supplier bank risk, inventory, payroll, fiscal compliance, and close assurance.

## Domains Covered

- POS completed-sale payment evidence.
- Offline POS replay SLA and serious conflict visibility.
- Payment reconciliation exception SLA.
- Suspense owner/action accountability.
- Purchasing/AP supplier payment release evidence.
- Supplier bank pending-change release control.
- Inventory completed adjustment/write-off evidence and projection movement.
- Payroll payment release evidence with payroll-person redaction preserved.
- Fiscal compliance submission SLA and visible failure control.
- Close pack certification freshness against unresolved high/critical findings.

## Check Keys Added

- `pos.completed_sale_payment.required`
- `offline_pos.replay_sla.visible`
- `payment_reconciliation.exception_sla.visible`
- `payment_reconciliation.suspense_owner.required`
- `purchasing_ap.released_payment_evidence.required`
- `purchasing_ap.supplier_bank_pending_release.blocked`
- `inventory.completed_adjustment_evidence.required`
- `payroll.released_payment_evidence.required`
- `compliance.submission_sla.visible`
- `close.certified_pack_evidence.current`

## Source Models Reused

- `SalesOrder`, `Payment`
- `POSOfflineEvent`, `POSOfflineSyncConflict`
- `PaymentException`, `SuspenseItem`, `ReconciliationRun`
- `SupplierPayment`, `SupplierPaymentAllocation`, `SupplierBankAccount`, `SupplierBankChangeRequest`
- `StockAdjustment`, `InventoryTransaction`
- `PayrollPaymentBatch`, `PayrollRun`, `PayrollPaymentAllocation`
- `ComplianceSubmission`, `FiscalDocument`, `ComplianceEvidence`
- `CloseRun`, `ClosePackExport`, `CloseAssuranceFinding`

## Workflow Links

- POS: `/dashboard/pos`
- Payment reconciliation: `/dashboard/finance/reconciliation`
- Payables: `/dashboard/finance/payables`
- Supplier bank controls: `/dashboard/purchases/suppliers`
- Inventory movements: `/dashboard/inventory/movements`
- Payroll control: `/dashboard/payroll`
- Compliance center: `/dashboard/compliance`
- Close center: `/dashboard/accounting/close`

## Verification

- `npm test -- services/assurance/__tests__/assurance-registry.service.test.ts --runInBand`
  - Passed: 1 suite, 21 tests.
- `npm test -- services/assurance/__tests__/assurance-registry-contracts.test.ts services/assurance/__tests__/assurance-registry.service.test.ts services/assurance/__tests__/assurance-incident.service.test.ts actions/assurance/__tests__/workflow-assurance.actions.test.ts actions/assurance/__tests__/workflow-assurance-incident.actions.test.ts --runInBand`
  - Passed: 5 suites, 34 tests.
- `npm run typecheck`
  - Passed.
- `git diff --check -- services/assurance/assurance-registry-contracts.ts services/assurance/assurance-registry.service.ts services/assurance/__tests__/assurance-registry.service.test.ts what-next`
  - Passed.

## Remaining Uncovered Workflows

- Deeper 3-way match tolerances by invoice line and goods receipt line.
- Stock class 3 ledger reconciliation and valuation movement proof.
- POS fiscal receipt certification per completed sale.
- Provider event rail reliability and signed reconciliation certificate drift.
- Payroll declaration due-date assurance and statutory payment reconciliation.
- Close pack source-hash drift after certification, beyond open finding detection.

## Notes

- All new definitions stay in observe mode (`enforceMode: false`) and use existing domain tables as the source of truth.
- Findings flow through the existing incident spine, source hash, evidence link, and action-route machinery.
- The Windows sandbox repeatedly returned `helper_unknown_error`; verification was rerun with approved escalation.

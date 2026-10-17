# Phase 4: unpaid AP balances and control exceptions

Implemented 2026-10-16. Extends the [close control contract](CLOSE_CONTROL_CONTRACT.md) and [source revision publication guard](CLOSE_PUBLICATION_RACE_SAFETY.md). Close scope version remains 1. This is an obligation classification, not a new bank settlement or AP/general-ledger balance certificate.

## Behavior

The old portal treated POSTED, PAYMENT_PENDING and DISPUTED supplier invoices as one medium-severity open-items blocker. The new collector classifies each applicable invoice. Close consumes the same portal findings and retains the classification as evidence.

| Classification | Required behavior |
|---|---|
| NORMAL_UNPAID | A positive remaining payable supported by supplier-ledger evidence, payment allocations/credits and its matching posted ledger batch. Retained as context; no close blocker solely because payment remains due. |
| SETTLED | A verified zero balance, including valid credits. Zero must be evidenced, not inferred from a PAID label. |
| EXCEPTION | Dispute, unresolved matching exception, missing/inconsistent financial evidence, invalid balance, PAID with a nonzero balance, or unavailable cutoff evidence. Creates a high-severity AP reconciliation blocker. Amount is unknown (`null`), not zero. |

Normal unpaid amounts and the overdue subset are summed separately per currency. Exception counts remain alongside those sums: the normal-unpaid sum is not the entire AP control-account balance. Due-date maturity is NOT_DUE, OVERDUE or DUE_DATE_UNKNOWN; age alone does not establish a reconciliation failure. Collection errors propagate rather than generating empty successful evidence.

## Evidence and scope

`readClosePayableBalances` reuses `resolveAPHistoryFinancials` for supplier-ledger movements, payment allocation conservation (including allocations outside the selected invoice list), stored paid-amount comparison, credits and reversals. It additionally requires an organization-owned POSTED batch for the exact SUPPLIER_INVOICE source, recorded/posted by the cutoff. An existing exception needs recorded resolution or current independent approval. PAID status cannot conceal a remaining balance; negative balances are not clamped.

Close queries include recognized/disputed invoices dated through period end and created through the evidence cutoff, including opening obligations and archived invoices. Child evidence is deliberately retained for validation rather than filtered away. Foreign-tenant invoices and future-economic/post-cutoff invoices are excluded. Current source fields cannot reconstruct every historical balance: later invoice updates or payment/credit activity beyond economic period end cause a cutoff-evidence exception instead of an invented historical amount. Late-arriving evidence for an in-period obligation may qualify if available by the recording cutoff.

Operational portal requests without an explicit close period retain their requested creation-window start and use their end/as-of boundary. They are not a historical balance certificate. No mutation to invoice/payment status, allocation, credit or source financial amounts is performed by this classifier.

## Propagation and invalidation

- Portal: `payableBalances` exposes classifications, reasons, currency amounts and counts. Normal unpaid invoices do not reduce AP module status or trust by themselves; actual exceptions do.
- Close: records a classification receipt under `data-trust-provenance`, with a hash bound to organization, cutoff and results. Saves the full classification in CloseRun metadata, retained in the existing hashed pack payload.
- Accountant trust pack: includes `payableBalances` in its hashed JSON payload.
- New migration `20261016200000_close_payable_sources` registers `supplier_ledger_entries` and `supplier_invoice_match_exceptions` with the Phase 3 revision guard. Invoice, payment, allocation, credit and posting-batch sources were already covered. Mutations and invalidation commit or roll back together.
- Migration advances revision for organizations with retained close runs, so prior assessments must be rerun under this classification contract. Retained certificate content hashes are unchanged.

Existing payment exceptions, suspense, missing statement coverage, unsigned reconciliations, missing supplier-payment ledger postings and payroll evidence controls remain active. A released/partially settled payroll batch represents initiated payment execution awaiting reconciliation; it is not treated as an ordinary unpaid invoice. No customer receivable balance was previously contributing to the removed AP open-items blocker; AR/broader balance-sheet tie-outs remain separate roadmap work.

## Acceptance and limits

Normal not-yet-due, overdue, archived and partially paid obligations can remain open without creating a reconciliation finding when their evidence is complete. Disputed/mismatched/missing-proof obligations cannot hide within that normal count. Currency separation, cutoff/tenant scope, query failures, retained classification, and new-source invalidation are covered by the [execution evidence](CLOSE_PAYABLE_BALANCE_CLASSIFICATION_EVIDENCE_2026-10-16.md).

No new UI form, live-authentication test, bank-document verification, historical AP/GL reconstruction or statutory certification was added. Existing portal consumers receive revised module facts and findings; browser rendering has not been checked. Queries read the complete applicable population without silently truncating invoices; production-volume performance remains a rollout consideration. Only disposable databases received the migration. Deploy through normal release controls and reassess before relying on old certificates. Roll back compatible code/migration through release review; do not remove stale markers to revive old evidence.

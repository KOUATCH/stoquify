# Supplier invoice coverage and credit reversal

An invoice's amount paid continues to mean recorded payments. Supplier credits remain separate records. The remaining payable is the invoice total minus recorded payments minus net supplier credits; a credit reversal reduces net credits and can reopen the payable.

## Changed behavior

| Recorded amounts | Result |
| --- | --- |
| Invoice 2,500; payments 100.25; credit 2,250 | 149.75 remains due; payment pending. |
| A further payment of 149.75 | No amount remains due; covered by payments/credits. Cash paid is 250, not 2,500. |
| Reverse the 2,250 credit | 2,250 becomes due again; payment pending. Cash paid remains 250. |
| Invoice 2,500; payments 100.25; credit 2,500 | Supplier credit position of 100.25 is retained. It is not additional cash paid or permission to pay again. |

The existing database enum `SupplierInvoiceStatus.PAID` represents the closed payable state. EN/FR supplier-invoice screens now describe it as **Covered by payments/credits** / **Couverte par paiements/avoirs**. This does not certify bank settlement. The history table and invoice detail use the same localized state description. Invoice approval history also has the previously missing payment-state translations.

The affected source transitions now update this status after payment, credit posting and credit reversal. Exact replay does not overwrite a later reopened invoice. Credits do not change `amountPaid`, payment allocations or original supplier payment entries.

## Where to review

Open `/en/dashboard/purchases/payables/history` or `/fr/dashboard/purchases/payables/history`. Find the supplier invoice and open its details. Compare its current state with the open-payable total and retained payment/credit records. Payment requests continue through the existing request/approval/execution routes; no new payment is needed solely to correct a credit-related status.

The credit and return domain operations were exercised directly with trusted synthetic actor scope. This checkpoint does not claim a complete, independently authorized credit/return user-interface workflow. Continue using the organization's existing authorized controls; do not call domain functions directly as an end user.

## Required information and ownership

| Information | Owner and source | Use |
| --- | --- | --- |
| Supplier invoice and existing payments | AP operator; retained invoice and payment history | Review total, actual payments and remaining payable. No replacement invoice or payment is created for a status change. |
| Returned goods | Receiving/purchasing operator; accepted receipt and actual returned receipt lines | The return must identify the original receipt/order lines and quantities. |
| Supplier credit | AP operator; the supplier-issued credit document | Existing controls require the credit number, date, reason, retained document hash and exact invoice/return-line mapping. |
| Credit reversal | Authorized accounting operator; documented correction reason and original credit | Reverse the original credit through existing controls. Keep the original and reversal records. |
| Bank settlement | Reconciliation operator; actual bank/provider evidence | Resolve separately. A covered invoice does not prove settlement. |
| Older inconsistent statuses | Data/finance owners; a reviewed reconciliation of invoice totals, payments, credits and reversals | An audited repair/backfill remains to be implemented. Do not manually change balances or delete records to make a status look correct. |

Receipt-based invoices may have no single purchase-order header. Credit posting now accepts that supported structure while still matching every credited item to the exact returned receipt line, order line and item. A conflicting explicit header order is rejected. Nested return/credit lines inherit the tenant from the parent composite relation; the parent tenant and source checks remain in place.

## Rollout and recovery

No schema migration is required for these changes. Release the service and EN/FR wording together through the existing process. No production deployment, live payment, outbound message or database reset occurred in this checkpoint.

The transition correction does not automatically rewrite historical rows. Before rollout to an existing tenant, identify and review stored invoice statuses that disagree with verified payment/credit balances. Preparing an audited repair for that historical drift is outstanding engineering work.

For a code rollback, preserve all committed payments, returns, credits, reversals, ledger entries and events. Do not replay payments to reconstruct a status and do not delete a credit/reversal. Review any historical status drift with finance/data owners; rollback of application code is not a financial reversal.

## Verification scope and remaining work

Read `INVOICE_COVERAGE_VERIFICATION_V84.md` and `evidence/invoice-coverage-v84.json`. Tests cover cash/credit arithmetic, closed/reopened status, exact retry, concurrency, nested tenant inheritance, receipt/order/item provenance, actual return/credit/reversal effects and EN/FR history observations. Test accounting rules and execution evidence are synthetic, not statutory approval or bank verification.

Remaining work includes the full credit/return public authority and lifecycle review, historical-status repair, broader reversal/closed-period cases and native assistive-technology checks. The history drawer now returns keyboard focus to the row opener and localizes its close-button accessible name. The inherited shell title remains a separate localization gap. Scoped browser checks are not completed accessibility/localization certification.

A specific source finding remains in `reversePurchaseCorrectionLedgerInTx`: when an original correction has no journal, it returns before the open-period lookup. That path needs an explicit period/retained-obligation review and correction, with negative tests. The exercised posted-credit reversal used an open period; it does not prove that missing-journal branch is safe.

## Review responsibilities

| Responsibility | Assessment |
| --- | --- |
| Architecture/backend | Existing payment and credit services own state transitions; no second balance store or ledger introduced. |
| Database/tenant integrity | Invoice lock added before supplier lock on credit reversal; nested lines use parent tenant relation. Concurrent execution/reversal tested. No schema change. |
| Security/IAM/privacy | Existing action/session boundaries preserved. Exact receipt/order/item provenance tested. Direct credit/return fixture calls do not prove public-action authority. |
| Finance/reconciliation/ledger/close | Cash and credits remain distinct; reversal reopens payable; retries preserve later state. Full reversal-period and close review remains open. |
| Statutory/country rules | No new tax/accounting policy or certification. Fixture posting rules are explicitly synthetic. |
| Frontend/design/accessibility/EN-FR | Existing layout/components retained; localized invoice coverage/detail labels. Actual browser scope is recorded separately. |
| Product/operations/support | Removes false payment-pending status for covered invoices and restores payment eligibility after reversal; sources and owners explained above. |
| QA/release/SRE | Focused tests, owned database checks, source bindings and development observations; no production performance pass. |
| Audit/records/analytics | Original credit/payment evidence retained; no extra payment effect or silent historical backfill. |
| Inventory/purchasing/AP | Return, credit and reversal lineage exercised; nested persistence defects corrected. Full receiving/returns workflow remains under review. |
| Payments/providers | Recorded payment services exercised with synthetic external evidence; no bank rail invoked. |
| SaaS packaging | Not applicable: no packaging, pricing or entitlement changes. |
| POS/offline | Not applicable: no POS or offline workflow changes. |
| HRIS/payroll | Not applicable: no payroll or workforce source changes. |
| AI/agents | Not applicable: no model, agent authority or autonomous approval changes. |

These are engineering review responsibilities, not independent professional approvals. Selected skill: `011-aqstoqflow-purchasing-ap-controls`. The next recommended numbered skill is `012-aqstoqflow-payroll-presence-engine` after remaining AP priorities.

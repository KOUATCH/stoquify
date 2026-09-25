# Cross-invoice AP allocation integrity — v78

## Finding and correction

The current payment request service calculates a payment's amount from its allocations, and release checks that the stored allocation total equals the approved amount. This batch does not claim those checks were absent. The history reader had a different defect: it compared each allocation with the payment amount but did not sum allocations across invoices outside the selected history filters.

The counterexample is a payment of 100 allocated as 75 to each of two invoices. A date filter selects only the first invoice, whose total is 200 and stored paid amount is 75. The previous read returned paid 75 and remainder 125 despite the payment's total allocations being 150. Eight before-tests failed, including this numerical counterexample and outside-filter scope inconsistencies.

The reader now queries every allocation of each relevant released/posted payment through a parent payment constrained by the trusted organization and payment IDs. It checks allocation tenant, payment and invoice linkage, invoice tenant/supplier/currency, positive amount, creation boundary and duplicate invoice IDs. It sums the allocation amounts using Decimal and rejects totals exceeding the payment amount. A missing parent result also cannot establish valid allocations. Database errors propagate as errors rather than empty successful evidence.

An invalid allocation set makes the affected settlement totals unavailable. When the payment itself is selected, its aggregate released-payment total is also unavailable. A separately verified source ledger movement remains recorded: the valid invoice posting is not erased merely because settlement attribution is inconsistent. The view's existing partial/unavailable semantics distinguish those facts. A valid 75 + 25 split returns the selected invoice's remainder 125. No financial record is repaired automatically.

An amount not yet allocated to an invoice remains a recorded supplier payment, rather than being silently assigned to a filtered invoice. This read-side rule checks that allocation does not exceed payment; it is not a replacement for the current creation/release rule requiring an exact approved total. It does not certify the global supplier account or reconstruct historical balances.

## User and operator instructions

Open `/en/dashboard/purchases/payables/history` or `/fr/dashboard/purchases/payables/history`. Choose the document period and activity for your task, using the supplier scope provided by its detail page where applicable. Obtain the intended period and supplier from your AP task owner and source records.

If a total reads **Unavailable / Indisponible**, do not enter zero or initiate another payment to make the discrepancy disappear. The AP owner should trace the invoice and its linked payment, and inspect all allocations of that payment, including invoices outside the displayed period. Obtain source identifiers from the history detail and authorized underlying AP records. Compare the allocated amounts, supplier, currency and original payment amount. The organization administrator supplies required read access through the existing role controls; no new approval ID is required merely to read history.

If persisted allocations are inconsistent, the responsible finance/control owner must determine the supported correction or reversal using source evidence. The application does not provide a new direct allocation-edit bypass in this batch. Engineering can inspect restricted records when authorized, but should not edit live amounts or fabricate postings based on this test fixture. Refresh history after the authorized correction has completed. It should then show current values, not the old unavailable or cached result.

## Verification and scope

Forty tests across allocation integrity, financial resolution, history service and controlled export pass. The eight new tests cover over-allocation outside the filter, a valid exact split, foreign allocation/invoice tenant, different supplier/currency, negative amount and a post-boundary allocation. The first regression run had 39 passing tests and one fixture failure: its mocked payment query supplied only the two former reads. The fixture was extended with the additional full allocation evidence query while retaining its original expected balances. The final receipt records 40 passing tests and exit 0.

Actual PostgreSQL and EN/FR browser verification uses new owned local fixtures with explicitly synthetic payment/ledger state. Those states test the read boundary, not successful real payment execution or statutory posting. The browser checks an unavailable filtered remainder with the 75 + 75 mismatch, then a visible 125 after correcting only the synthetic second allocation to 25 and its corresponding synthetic paid amount. Desktop and 390-pixel mobile screenshots, source bindings and non-fixture integrity checks are retained in the batch receipt. No real payment, external message, migration or production deployment occurs.

The additional query is limited to released/posted payments relevant to selected payments or selected invoices' allocations. It includes all their allocations irrespective of the current date/invoice filter. Parent records are tenant-constrained and only minimal invoice scope fields are loaded. Large-volume performance has not been certified. The existing tenant source revision covers normal tenant allocation changes during pagination; current first-page queries and exports use the same financial resolver.

## Rollout, recovery and remaining work

No schema change, migration or backfill is required. Release the service correction and its tests through normal controls. Monitor unavailable totals and evidence-query failures. Missing evidence must remain unavailable; a database outage remains an error. Do not restore the individual-allocation-only calculation as a cosmetic workaround. Preserve all invoices, payments, allocations, ledger and audit records during diagnosis.

PA-029 remains partially verified. This fixes a demonstrated cross-invoice allocation gap; it does not prove every payment path, credit/reversal rule, aggregate supplier balance, concurrent release path or historical balance. Remaining work includes global supplier-ledger reconciliation, bounded/scalable reads, detailed denial-audit coverage and existing UI/accessibility debt. The platform-wide workflow denominator remains provisional.

Architecture/backend/API/data: service-owned, transaction-compatible read with one additional targeted evidence query; no new transport or schema. Finance/controls/analytics/audit: exact Decimal allocation totals and explicit unavailable evidence, no auto-repair or certification. IAM/privacy/security: trusted parent organization, validation of related scope, minimal metadata and no new authority. Frontend/UX/localization/accessibility: existing EN/FR unavailable/recovery presentation checked in desktop/mobile, no new visual primitive. Product/support/SRE/release: clearer discrepancy handling and explicit performance/rollout limits. Changes to country statutory rules, POS/offline, HRIS/payroll, AI/agents, payment providers, billing/growth and external integrations: not applicable because their behavior is unchanged in this read-model correction. Reviews are engineering responsibilities, not professional approvals.

Selected skill: `011-aqstoqflow-purchasing-ap-controls`. Passed bounded gates are recorded in the receipt; whole-workflow/platform gates remain open. Next numbered skill remains `012-aqstoqflow-payroll-presence-engine` after active AP priorities, without automatic advancement.

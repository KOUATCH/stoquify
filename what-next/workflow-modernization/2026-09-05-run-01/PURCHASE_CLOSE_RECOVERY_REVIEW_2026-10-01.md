# Purchase correction → Close → Cash recovery review — 2026-10-01

Independent source and receipt review; no product edits, database calls or test executions were performed by this reviewer. Primary workflow remains FA-CASH-COMMAND, with FA-CLOSE-PACK supporting. The positive recovery assignment is incomplete. Existing acceptance criteria have not been relaxed.

## Observed attempts

| Receipt | Exact outcome |
| --- | --- |
| [Initial run d9b0c686](lanes/environment/purchase-close-recovery-runtime-d9b0c686-29f0-4392-8c4e-d2bdfbef5797.json), SHA-256 `2d7cc64ac8609f5d5e08f9592de7c19895bc493d7050442f5551528bfdc1b0e3` | All four cases stop at the `JOURNAL_AMBIGUOUS` setup prerequisite. None establishes the requested reversal/recovery journey. `passed: false`, `sourceStable: true`, `outsideUnchanged: true`; no finalization/disconnect error is recorded. |
| [Second run f2ca2ccf](lanes/environment/purchase-close-recovery-runtime-f2ca2ccf-4308-47ef-8610-594456b1606d.json), SHA-256 `016d0ad48a25eb3c3bfe4f0233921a45617f113611194b9d44802aa4b1656c92` | One of four cases passes. The two certification prerequisites remain `READY`/`T3`, with the medium `purchasing.ap.open-items` blocker. The reversal-first case reaches its actual ordering assertions but fails its required `T4` assertion. `passed: false`, `sourceStable: true`, `outsideUnchanged: true`; no finalization/disconnect error is recorded. |

The coordinator reports both processes ended with exit `1`. Each receipt binds 190 source files. The reviewed correction from helper `842f50dd…` to `cc6ca80dabf29927a199fd12fe2ecfd668fa391fc3d7a3cfef656f08e06b6df2` only normalizes the two synthetic inherited journal codes to canonical `AC` and `ST` before calling real `ensureDefaultJournals`. It first requires zero journal entries and exactly the expected two active default journals, then checks one active default for every required type. Inherited synthetic PO/master data already exist; receiving and invoice approval follow through actual services. It does not insert a successful assessment, change financial source records or bypass the ambiguity control. The [exact predecessor](evidence/purchase-close-recovery-before-journal-setup-ef68192e-2a53-4fe3-bbbc-e3833d36f5a1/purchase-close-recovery-fixtures.cjs) is retained. The four-case driver remains `7c23239836ee3428fe7da5f4c0ee1a7e516d6be5a861ae4e16fda837d13cd58e`.

The second attempt establishes these bounded observations:

- **Creator first — passed:** PostgreSQL records waiter PID `17068` blocked by holder `29580`; the creator inserts and commits the actual `RUNNING` assessment before the reversal acquires the period lock. Reversal changes that assessment to `BLOCKED` before collectors finish, and finalization retains `BLOCKED`. The actual reversal journal mirrors the original, original rows are conserved, payable remains `25000`, and exact replay leaves the complete observed state unchanged.
- **Reversal first — partial evidence, case failed:** waiter PID `3496` is blocked by holder `17068`. The source reversal mirrors its journal, conserves original rows and keeps payable `25000`. The subsequent assessment is actually inserted as `RUNNING`; its observed trust level is `T3`, so the required `T4` assertion fails. The ordering evidence does not turn this into a passed positive recovery case.
- **Sequential credit/return recovery — unverified:** initial assessment is `READY`/`T3`, with open AP obligations. A retained certified export and subsequent recovery are not established by this case.
- **Late invalidation rollback/retry — unverified:** the same initial certification prerequisite fails. The requested late fault after actual retained-export invalidation is not reached by this receipt.

`READY` alone is not a verified `T4`/certified result. Neither zero high/critical blockers nor the one passing concurrency case clears the medium AP obligation or establishes the full customer journey.

## Expected business effects

`services/purchasing/supplier-payment-balance.ts` computes outstanding as **invoice total − actual amount paid − net posted credits**, with linked credit reversals restoring the credited amount. Its `supplierInvoiceBalanceStatus` and `refreshSupplierInvoiceBalanceStatus` preserve the distinction between credits and cash paid.

For an invoice fully settled after a credit, cancelling that credit increases the supplier balance and outstanding payable by the original credit total while leaving `amountPaid` unchanged. `reverseSupplierCreditNote` in `services/purchasing/purchase-return-credit.service.ts` rereads the locked invoice/supplier, records a new reversal and supplier debit entry, then refreshes the invoice's balance status. A previously settled invoice therefore returns to a payable state when that amount is owed again. The physical return reversal is a separate stock/ledger correction; it does not itself pay that debt. This is a financial obligation to resolve, not an assessment status to overwrite.

Current Data Trust deliberately counts `POSTED`, `PAYMENT_PENDING` and `DISPUTED` invoices as open AP items (`services/accounting/data-trust.service.ts:1394` and `:1722`). This explains the observed `T3`. This review neither changes that policy nor claims all unpaid invoices are legally unclosable.

## Existing payment workflow and missing reconciliation handoff

Graph locators `purchasing_ap_control_actions_approvesupplierpaymentaction` and `purchasing_ap_control_actions_releasesupplierpaymentaction`, community `26` in `graphify-out/graph_actions.json`, identify the older AP control boundary. Current source was then checked directly; graph locations are not treated as current implementation proof.

The supported reviewed payment flow is:

1. `previewPaymentRequest` / `submitPaymentRequest` in `services/purchasing/payment-request.service.ts` bind current invoices, verified credits, active supplier and approved destination to the requested amount and evidence revision.
2. `reviewPaymentRequestApproval` / `confirmPaymentRequestApproval` require an independent approver and preserve the request/approval event lineage.
3. `previewPaymentRelease` / `confirmPaymentRelease` in `services/purchasing/payment-release.service.ts` require a third recorder, an actual valid server session, fresh authority, execution time after approval, the same approved accounting date, an execution reference, evidence URI and SHA-256. Recording execution adjusts the supplier/invoice balances and creates the retained posting and outbound reconciliation evidence. It does not send money or verify external settlement merely from an entered reference.

An approved destination is currently mandatory even for `CASH`. Local verification may use explicitly synthetic actors, destination and saved synthetic evidence, but must not represent them as customer authorization, bank confirmation or actual cash transfer. Directly setting `amountPaid`, invoice status, exception status or reconciliation relationships cannot substitute for the workflow.

**Source-grounded missing contract:** `queueOutboundSupplierPaymentReconciliation` in `services/purchasing/ap-control.service.ts:1264` creates a successful-posting transaction as `OUTBOUND`/`PENDING`, without a provider account or payment rail. It creates an open `MISSING_STATEMENT_LINE` exception without provider/run/suspense relationships. This also occurs for the cash method. Therefore paying an invoice through the real service removes the AP obligation but introduces a genuine reconciliation obligation.

The existing consumers cannot adopt those records as they stand:

- `runPaymentReconciliation` at `services/reconciliation/payment-reconciliation-run.service.ts:614` selects transactions for the exact provider account in `CONFIRMED` or `SETTLED` state; the AP transaction meets neither condition.
- Manual matching at `services/reconciliation/payment-reconciliation-manual-match.service.ts:80` requires the existing payment to belong to the selected provider account. Candidate discovery also excludes provider-less exceptions.
- `loadExceptionClosureSourceInTx` at `services/reconciliation/payment-exception-closure-evidence.service.ts:13` requires the original suspense/run lineage and completed financial treatment; the AP exception has no such lineage.
- `payment-posting-recovery.service.ts` intentionally recovers a blocked ledger posting to `PENDING`, resolving only that posting blocker and creating a new missing-statement exception. It does not supply settlement evidence or close reconciliation.

Targeted searches of the current purchasing, payments and reconciliation source found no implemented supplier-payment adoption/statement bridge. The second four-case receipt did not execute payment release or reproduce its downstream refusal. The **separate negative runtime now verifies that refusal**, as recorded below. Its passing result does not replace the four positive recovery criteria.

## Completed adverse-boundary verification

The final [payment-boundary receipt 4058ad69](lanes/environment/purchase-payment-close-boundary-4058ad69-00b3-49d4-8046-37df0437459d.json), SHA-256 `c001ceab5ad7e6f3d321ba7eb3220c928880a27e796f9e3f4e53607b6f2a8fad`, records **two passed checks** and explicitly states **`positiveRecoveryEstablished: false`**. The coordinator reports terminal exit `0`. All 213 before/after source bindings agree and match the files independently read at this review. The reviewed driver is `dc6292db20107372bf54bba2d03729a67e5d478d02e3bc5dd1c52397bbfd102c`. Outside-fixture hashes agree (`e450810b784c466ef91e3d1bc8c31ca5d581f3f5c2c2da1f912f1432e2ff6269`); no finalization/disconnect error is recorded.

The actual synthetic request, independent approval and third-actor execution record pay the exact **17,500 XAF** outstanding. Invoice `amountPaid` increases from `0` to `17500`, its status becomes `PAID`, outstanding falls to zero and supplier balance falls from `17500` to zero. One correctly linked posted journal debits AP and credits cash for that amount; the batch, source link, allocation and supplier ledger payment are retained. Prior financial/source and stock rows remain unchanged, and exact execution replay has no effects. This establishes a local recorded-payment effect, not a real cash transfer or authenticated external settlement.

The resulting payment remains `RELEASED`, its ledger batch is `POSTED`, and its reconciliation transaction remains provider-less `PENDING`. The original `MISSING_STATEMENT_LINE` exception is `OPEN` with null provider/run/suspense relationships. The AP-open blocker disappears, but the real portal reports `T2` with a high payment-reconciliation-exceptions blocker. The new Close run is `BLOCKED`/`T2`; snapshot, dashboard, proof trail and the current Cash close signal all report `blocked`. The original exception closure reader refuses with `CONFLICT` because its suspense link is missing. Real certified export is refused with `BUSINESS_RULE_VIOLATION`; no export is created and payment/source evidence remains unchanged. Provider-match exclusion remains supported by source predicates, rather than by a fabricated provider or statement test.

The preview's **`COUNTRY_TREATMENT_REVIEW` warning is preserved** in the evidence revision and final receipt. Actual country resolution reports `CM-2026.1` with `countryPackStatus: RESOLVED`, no input VAT amount, **`withholdingTreatmentStatus: NOT_CONFIGURED`**, and `operatorActionRequired: false`; the payment retains that unresolved withholding status. Current `payment-release.service.ts` includes the warning in its preview/revision but does not make it a recording prohibition. The driver asserts the exact warning and country fields, then calls the unchanged confirmation service and still requires its actual posted result. No country metadata, posting rule or application validator was changed to obtain it. This is not statutory or expert-reviewed treatment approval.

Two prior negative-verifier failures remain separate historical evidence:

- [16746d46](lanes/environment/purchase-payment-close-boundary-16746d46-96c8-49dd-9301-7b4e3cf347b7.json), SHA-256 `8846778c8a92df65f06006ca5144ed5f1a3c7815c34bf90b0d25ad1b83ac52c3`, stops before all payment checks because the generated synthetic credit-note number exceeds 80 characters. Only the new fixture label was shortened; the exact predecessor is retained under `evidence/purchase-payment-before-short-label-4fde3301-3c29-4dac-8d0c-5dbcb9245e3f/`.
- [db97b23c](lanes/environment/purchase-payment-close-boundary-db97b23c-bfda-4d70-a68d-139b1bdd6735.json), SHA-256 `eccb573386323e3c3ff1395e25a4412967bec6549fa8c38159e91a86286fd3db`, reaches request/approval and preview but fails the driver's incorrect empty-warning assertion before confirmation. It does not prove a recorded payment or downstream refusal. The exact predecessor is retained under `evidence/purchase-payment-before-country-observation-87c8f7d5-b9f0-4ffc-a45a-418cddcfa27c/`.

Both failed attempts report stable before/after source and unchanged outside-fixture state; their only mismatch with current source is the subsequently corrected verifier file. Both coordinator-reported exits are `1`. Their failure records and the original four-case positive criteria remain intact. No new product code was changed by these verifier corrections.

## Next required implementation and acceptance

Implement an explicit source-owned handoff from recorded supplier execution to verified reconciliation. It must preserve the existing payment, allocations, posting and exception history; establish appropriate bank/provider evidence or a defined cash-evidence contract; bind tenant, currency, amount, direction, execution reference and evidence revision; require current authorized independent review where applicable; and prevent duplicate allocation, duplicate payment and cross-tenant adoption. It must resolve only the source exception justified by that verified evidence and retain audit/event links. No arbitrary provider association or fake external confirmation is acceptable.

The recovery sequence must then prove: actual initial obligation settlement and reconciliation → genuine initial Close certification → credit cancellation reopens the exact liability and invalidates retained Close evidence → genuine subsequent settlement/reconciliation → actual reassessment/certification and current Cash proof. Preserve old export bytes, hashes and histories throughout. The return reversal remains a separate conserved stock/ledger step. Retry must never repeat the financial effect.

Retain and complete all four original positive cases, including both actual PostgreSQL blocking orders and the late post-invalidation rollback/retry with unchanged complete observed state. Add focused negative coverage for missing/changed external evidence, unpaid residuals, unsupported cash evidence, duplicate adoption, stale review and wrong tenant/amount/currency. The negative runtime may establish the present boundary and prevent false readiness; it cannot establish successful recovery.

## Source bindings and limits

| Source | SHA-256 at review |
| --- | --- |
| `services/purchasing/purchase-return-credit.service.ts` | `599e8110c2c506c82f8ec006d7d59da93983e66f251f674b48c6f80e629d629c` |
| `services/purchasing/ap-control.service.ts` | `6704f26093f6d57452393c797773ed6c271dccc3cc5ed46261dcca587160ba5c` |
| `services/purchasing/supplier-payment-balance.ts` | `534b989cf0698bc096435012f1d9cd6791f1fd9c632b72880ccc6714830619e5` |
| `services/purchasing/payment-request.service.ts` | `849a9cb77abae98d91e72fca95f7cca8f54f493fe9cd524a882b8be630d84bb6` |
| `services/purchasing/payment-release.service.ts` | `39a93414d56288cc7a6e2a347d4413fd90e17847a0610d2a272445cd82e5792b` |
| `services/reconciliation/payment-reconciliation-run.service.ts` | `8a34d4153ce2f031b2beda0a04dedd64148c8c82152e673a718842f3606b7682` |
| `services/reconciliation/payment-reconciliation-manual-match.service.ts` | `e5bb212aba42fcabbd5a29c55b94ecbef4c8f47bf828cee09de5127ccf6c8a71` |
| `services/reconciliation/payment-exception-closure-evidence.service.ts` | `5ba1303e7fb7825fc1596d8842e4820521bdd017f91be11cd8136ff4db2d6f0e` |
| `services/accounting/data-trust.service.ts` | `8a87425b1077b06a83340f124e7d4947bcb881ba7a53f0a0ff84fa8e3ce7a8fa` |

This review supplies no professional approval, release certification or parent-workflow closure. No production operation, migration, provider communication or real payment was performed. The rejected manual-posting all-period proposal is unrelated and remains untouched. PR-10's separately reviewed lease correction and frozen review are unaffected. The coordinator owns the register and next implementation decision.

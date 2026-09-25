# Supplier payment execution recording — v82

Selected skill: `011-aqstoqflow-purchasing-ap-controls`.

## What this changes

Open `/en/dashboard/purchases/payables/payments/record` or `/fr/dashboard/purchases/payables/payments/record`. The AP workbench links to this page for users with `purchasing.ap.payment.release`. It uses the existing authenticated dashboard, current organization, semantic tokens and EN/FR messages.

This workflow records an already executed external payment. It does not send a bank instruction. Before this change the public release action could update invoice paid amounts using only the approved payment ID; it collected no separate execution proof and the domain stored the accounting date as the release timestamp. The new public contract requires a reviewed execution record and retains its evidence separately from the original request and approval. The recording timestamp is now the actual server recording time.

The requester, approver and execution recorder must be three different authorized users. The service rechecks the current organization, role, module, session and recent password assurance. Client-supplied organization or actor IDs do not establish authority. The older public release action uses the same strict command and service; its former payload is rejected.

## Inputs and where to find them

| Input | Owner and source | What to do |
| --- | --- | --- |
| Approved payment | AP requester and independent approver; existing request/approval screens | Choose the retained approved request. Its supplier, destination, allocations, currency and accounting date are not editable here. |
| Execution reference | Treasury operator; issued bank/provider transaction confirmation or signed payment receipt | Copy the full unique reference including its issuer. Use the individual payment/receipt-line reference, not a common batch number. The exact method/reference pair is unique within the organization in this workflow. |
| Execution time | Treasury operator; the same issued execution evidence | Copy the timestamp with an explicit UTC offset. It must follow the recorded approval, not be future, and carry the approved accounting date. A late-discovered or different-date payment requires a reviewed correction path; do not alter timestamps to force acceptance. |
| Evidence link | Records owner; organization-controlled web repository | Supply the reviewer-accessible link to the final execution document. Access must follow organizational permissions. The app does not upload or inspect the linked file. |
| SHA-256 | Final executed-payment evidence file | Select the final file to calculate its hash locally, or paste an independently calculated 64-character lowercase SHA-256. A hash detects file changes; it does not authenticate the bank, signer or payment. |
| Password | Current recorder | Complete the existing password verification when requested. The password is not saved with the draft or evidence. |
| Posting rule, journal and period | Accounting configuration owner; current application setup | Resolve preview warnings using reviewed accounting configuration. A single open period must cover the approved date. Country/withholding warnings are not professional approval or certification. |

## Procedure and recovery

1. Choose the approved request and enter evidence for the payment actually executed.
2. Review the amount, destination, allocations, approved date/time and current accounting warnings. Selection is shown with the brand treatment; it does not mean execution or success.
3. Confirm with current password assurance. The command is bound to the preview revision. Stale source data requires a new review while retaining the entered draft.
4. Read the three separate outcomes: payment record, ledger posting and reconciliation. Recording adjusts invoice paid amounts and the supplier balance. A failed posting is still failed. A pending/suspense transaction has not been reconciled with the bank statement.
5. If the response is lost, keep the browser session storage and use **Retry the same recording**. Reload restores the original confirmation and requests password verification again. Never create a second record to resolve an unknown result.
6. If the exact execution reference is already recorded, inspect its payment history. The service prevents applying that reference to a second payment. This does not prevent a person from deliberately submitting different or false external references; the evidence remains operator-attested pending reconciliation.
7. Reopen the recorded payment from this screen for a current verified outcome. Legacy release records without the new retained evidence require review; they are not automatically backfilled with fabricated evidence.

## Persisted effects and boundaries

The serializable transaction retains the existing supplier ledger, invoice allocation, posting batch and outbound reconciliation transaction effects. It adds one applied `supplier.payment.execution_recorded` event and mandatory audit record, linked to the unchanged request, independent approval and actual release event. Recording time, approved accounting date and claimed execution time remain distinct. Evidence reads reject broken or rehashed source links. Current authority is required for retries and history.

The release event can report `BLOCKED_PENDING_RULES` while the persisted posting batch has status `FAILED`. The screen reports the persisted batch state and reconciliation state separately. A configured posting uses the existing posting engine. Nothing here creates a second ledger or establishes bank settlement.

## Remaining work and rollout

No schema migration, production deployment, real payment, external message or X1 approval is included. There is no supported automatic adoption of legacy approvals missing retained request/approval evidence. Request withdrawal/rejection, changed-date execution, stale approved requests, complete payment posting recovery, reversal and downstream statement reconciliation still require end-to-end work.

Release this interface to an internal controlled cohort only after the applicable local evidence and organizational procedures have been reviewed. Confirm the evidence repository, authorized recorder role, approved destination and accounting setup. Do not enable live usage by relying on synthetic test receipts. Monitor execution-record IDs, duplicate-reference conflicts, failed posting batches and unresolved reconciliation entries; do not log passwords or document contents.

If rollout is halted, remove cohort access to the new recording action/route while retaining records and authorized history. Do not restore the former permissive release payload, delete execution events or reverse accounting entries by editing database rows. Financial correction must use an authorized domain recovery/reversal workflow. Application rollback cannot undo an externally executed bank payment.

This is one bounded payment workflow improvement within the active platform-wide review. It does not mark the entire AP lifecycle or any whole platform workflow complete. Next numbered skill remains `012-aqstoqflow-payroll-presence-engine` after the current AP priorities; it does not replace the outstanding workflow register.

# Review customer statement responses

Evidence date: 2026-09-07. This guide covers the sender's review of saved disputes and payment promises. A review decision does not pay an invoice, cancel a debt, post a journal or adjust an account balance.

## Open and inspect

Open **Customers → the customer → Statement**, then **Customer responses → Latest responses**. The same existing authenticated route is used in both languages: `/en/dashboard/customers/<customer-id>/statement` or `/fr/dashboard/customers/<customer-id>/statement`.

Responses span that customer's saved statements. Each entry shows its amount, currency, original note, statement version, relevant document or promised date, received time and current review status. Expand **Response references** to see the response ID and original request reference. Use either exact reference to find a response; clear the search to return to the latest list. Older responses and review-history pages remain accessible through their next-page controls.

The system rechecks your current organization and permissions. Viewing requires customer read and statement export access plus Accounting read availability. Recording a review also requires customer update permission, Accounting write availability and recent password verification. A role with viewing access can inspect records without making decisions. Removing customer access may replace the entire page with the existing access-denied screen.

## Record a review

1. Read the original response and related business records. Select **Review response**.
2. Choose an outcome and enter a factual reason. These are review outcomes, not financial instructions:

| Displayed outcome | Meaning |
| --- | --- |
| Under review / En cours d’examen | A reviewer has acknowledged the response or reopened its examination. |
| Review completed / Examen terminé | Examination is complete. Any required financial correction still uses its separate controlled workflow. |
| Response declined / Réponse refusée | The reviewer does not accept the response, with the recorded reason. |
| Closed without action / Clôturé sans action | No further action will be taken within this review. Existing debt and financial obligations remain. |

3. Confirm your current password, read the consequences and tick the confirmation. Select **Record review decision**.
4. Wait for the matching **Review decision recorded** receipt. It provides the durable history record, version and recorded time. Open **Review history** to inspect prior decisions and reviewer references.
5. To correct a completed, declined or closed review, use **Reopen review**, explain why, and record that decision first. Then inspect the new current state before recording another outcome. Prior responses and decisions are retained.

## Information needed from you

| Input | Who supplies it | Where to obtain it |
| --- | --- | --- |
| Customer | Authorized sales or finance operator | Existing customer directory and the statement's named customer. |
| Response or request reference, when searching | System or recipient | Original recipient receipt, retained request reference, or **Response references** in this screen. It is not a payment reference. |
| Review outcome | Authorized reviewer | The actual result of examining the customer's explanation and the relevant documents. |
| Review reason, 3–1000 characters | Authorized reviewer | State the facts from the original invoice/receivable, delivery documents, correspondence or payment investigation. Avoid passwords, bank credentials and unnecessary personal information. |
| Current password | The signed-in reviewer | Your own account credential. It is submitted to the existing password-verification action and is never saved in review recovery storage. |
| Confirmation | The signed-in reviewer | Check the exact displayed decision and reason before submitting. Reloading does not tick it for you. |
| Reviewer permission | Organization access administrator | Existing role configuration. Grant only the required customer/statement permissions; do not use this form to bypass organization or Accounting restrictions. |
| Saved review record/version/time | System | The matching receipt and **Review history** after successful recording. No manual signature ID or simulated approval needs to be supplied. |

The review reason can describe a source document reference, but this feature does not upload or authenticate that document. A review here is not a statutory sign-off or X1 approval.

## Interrupted work and corrections

An unsent draft is kept in this browser session. After reload, choose **Refresh retained response** to verify the current record and access before continuing. **Cancel draft** discards only an unsent local draft.

Before submission, the browser saves one exact request. If the connection fails, keep that request and use **Check retained review** with your current password. The server returns the existing receipt if the decision was already recorded; it does not append another decision. The decision and reason stay locked while the outcome is uncertain.

A definite stale-state rejection means the response changed after your preview. Refresh, cancel the old draft, review the current state, then prepare a new decision. Do not change a pending request ID to get around a conflict or denial.

If access is removed, the pending identity remains in this browser session but does not grant permission. Ask the organization administrator to check your legitimate access. If recovery storage is unavailable/corrupt, new decisions are disabled; preserve the visible request reference and ask an authorized operator to reconcile the server history before attempting replacement work. Do not clear storage or switch browser sessions to bypass an uncertain result.

## Operational scope and rollout

No schema migration, provider, live message or financial posting is introduced. Existing immutable recipient responses remain unchanged. Reviews append state history, an applied business event and a mandatory audit entry in one transaction; an audit failure rolls back the decision.

Release the new service, action, validation, recovery helper and integrated component together. Keep the existing recipient records and history during rollback. If disabling the interface, retain server-side exact replay and history support while any pending request is being reconciled. Do not delete states, events or audit records to make retries succeed.

The receipt and verification record linked from the main implementation report distinguish actual isolated browser/database checks from unverified areas. Native screen readers, native browser zoom, comprehensive contrast, live operations, downstream financial correction and the remaining platform workflow register still require their own evidence. No professional or release certification is implied.


## Published checkpoint

[Source-bound verification](../../evidence/statement-response-review-receipt.json) records 99 tests, eleven PostgreSQL scenarios, two actual EN/FR journeys, twenty screenshots and ten viewport/text cases. Original financial/role records remained unchanged. The whole-platform review and the explicit limitations above remain open.

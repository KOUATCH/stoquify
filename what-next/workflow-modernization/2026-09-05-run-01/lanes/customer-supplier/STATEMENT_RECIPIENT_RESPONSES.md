# Customer statement recipient responses

Evidence date: 2026-09-07. This is an engineering implementation record for the public statement view, dispute and promise-to-pay workflows. It is not a payment receipt, professional approval or platform completion certificate.

## What recipients do

1. Open the private statement link received from the business. Existing links remain valid; newly prepared deliveries include the selected EN/FR language. The language selector changes the presentation without changing the statement or response.
2. Check the customer, currency, period and recorded-through date. This is an immutable saved statement, not a live account balance. Later payments or corrections can change the current position. Missing amounts show **Unavailable**, never zero.
3. Review the posted receivable documents. On a phone these appear as document cards. A viewing-only link cannot submit a response.
4. Select a payment promise or document dispute, enter the details below and confirm them. The server rechecks the signed link, live token registry, permitted action and statement/document scope.
5. Wait for a **Response recorded** receipt. This records an OPEN recipient response for the sender to review. It does not pay an invoice, adjust a balance, post a journal or resolve a dispute.

| Required information | Who supplies it | Where to get it |
| --- | --- | --- |
| Private statement link | Authorized statement sender | The existing customer statement delivery workflow. Ask the sender for the complete link or a replacement after expiry/revocation. Do not publish its token. |
| Response type | Recipient | Choose the intended business response. Availability comes from the link's issued permissions. |
| Amount | Recipient | Reconcile the saved statement with your own records. Use a positive amount with at most two decimal places; the server checks the statement or document limit. |
| Disputed document | Recipient | Select the relevant posted document in this statement. A document from another statement or organization is rejected. |
| Promised payment date | Recipient | Your actual intended future date, within 365 days. A promise is not evidence that payment occurred. |
| Note | Recipient | A factual explanation, 3–500 characters. Avoid passwords, bank credentials and unnecessary personal information. |
| Confirmation | Recipient | Review the currently displayed response before submitting. A restored draft is not pre-approved. |
| Response/request reference | System | A confirmed receipt gives the durable response ID. A pending submission displays its retained request reference for recovery. |

## If a connection fails

The browser retains the exact request before submitting it. After an uncertain result or reload, the fields stay locked and **Verify or retry this response** resubmits the same request. The server returns its existing result when it was already recorded. It does not create a second commitment.

Do not start another response to work around an uncertain result. A new response is available only after a matching server receipt, through **Prepare another response**. A definite validation rejection allows correcting the form; an unknown outcome, conflict or revoked link retains the reference for review.

If the link has expired or been revoked, the server denies access and submissions, including retries of a previously recorded response. Give the sender the displayed request reference through your normal business channel. A new link does not automatically transfer the old link's pending request. The sender must review the retained server record before asking you to submit again.

The draft and exact request remain in this browser session; the bearer token and a cached success receipt are not stored in that recovery record. Reloading rechecks the server. Do not clear browser storage or switch browser sessions while an outcome is uncertain. Browser policies can remove session data, so this is not an archival record. If storage is unavailable or corrupt, submission is blocked with an explanation; viewing remains available.

## Operator and rollout instructions

No database migration or new provider is required. Release the recipient page, recovery helper, input schema and private response handlers together. New delivery URLs include `lang`; existing signed records, sealed envelopes and links are not rewritten.

Retain `CustomerStatementRecipientAction`, its state history, BusinessEvent, access log and audit evidence. A promise/dispute is a recipient statement, not verified settlement. The current response service records OPEN evidence; the complete sender review, resolution and downstream accounting lifecycle still requires review and verification under the broader workflow assignment.

If rolling back the new UI, do not ask recipients with uncertain requests to re-enter them in the old form: the old form loses request identity on reload. Preserve the retained request and check server records first. Do not delete recipient records or reset keys to make a retry succeed.

## Verification boundaries

The owned test database uses synthetic sales sources followed by the actual posted-receivable, statement, token and recipient services. This proves the tested statement response paths, not an entire real order-to-cash or ledger lifecycle. No external messages, payments, production deployment, database reset, X1 clearance or professional certification were performed.

The evidence package records before-change duplicates, private-header gaps, EN-only behavior, subsequent corrections, and any failed attempts. Native browser zoom, actual screen-reader testing, comprehensive contrast review, wider sender resolution and the remaining workflow register must not be inferred from focused tests or screenshots.


## Published checkpoint

[Source-bound evidence](../../evidence/statement-recipient-receipt.json) records 80 tests, nine PostgreSQL scenarios, two actual EN/FR journeys, 22 screenshots, twelve width/text cases, final typecheck and lint. Earlier public-recipient revocation-race gaps are superseded by this evidence; the broader limitations above remain.

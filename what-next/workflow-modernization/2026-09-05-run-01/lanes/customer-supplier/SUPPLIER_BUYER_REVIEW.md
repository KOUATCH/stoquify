# Supplier invitations and buyer review

This guide describes the implemented buyer workbench. The checkpoint receipt, when attached below, identifies the exact verification completed. It is not a purchasing, financial or release certification.

Open **Purchases → Purchase Orders → the relevant order → Supplier acknowledgement**. The route is `/{locale}/dashboard/purchase-orders/{id}/supplier-acknowledgement`, with `en` or `fr` as the locale and the actual order ID. Existing purchase-order read access is required. Creating an invitation, reviewing a response or disabling a link also requires current purchase-order update access, purchasing write eligibility and recent password verification.

## Information to provide

| Action | Your input | Where to get it |
| --- | --- | --- |
| Prepare an invitation | Confirm the intended supplier email or internal recipient reference. | The supplier record and your verified business contact. Check it against the order; it is a reference, not proof of the recipient's identity. |
| Confirm an invitation | Your current account password and confirmation that you reviewed the order and recipient. | Your own Stoquify account credentials. Never put the password in a note, email, screenshot or approval register. |
| Share the link | Copy the generated private link and use your organization's approved communication channel. | The recorded invitation result. Creating the link does not send it. Protect it as a bearer link: anyone possessing it can exercise its permitted supplier actions while it is valid. |
| Review a response | Accept or reject the proposal and give a factual reason. | The supplier's recorded response, the frozen order and the current purchase order. Item quantities and requested dates appear with the response. |
| Disable an invitation | A factual reason for disabling further use of the link, plus your password and confirmation. | The completed communication, a mistaken recipient, a superseding order or another actual business reason. |
| Recover a pending request | Retain the displayed request reference; verify your password and retry the same request. | The workbench's retained request. Do not invent a new reference to work around an unknown outcome. |

No approval register, signing certificate or X1 approval is created by this workbench. Supplier responses and buyer review decisions remain separate from normal purchase-order approval, receiving, AP and accounting operations.

## Prepare and review

1. Open the correct order and refresh its current records.
2. Choose **Prepare invitation**, check the supplier reference, enter your current password and confirm the action.
3. Wait for the recorded result. Copy the private link while it is displayed; the workbench does not retain its bearer token in browser storage.
4. When the supplier responds, refresh the workbench. Review the proposed date, quantities and reason.
5. Choose **Accept proposal** or **Reject proposal**, explain your decision, verify your password and confirm.
6. Inspect the recorded status and history. An accepted proposal records a buyer decision; apply any operational change through the existing controlled purchase-order workflow.

An invitation is available only for an approved order with an active supplier and at least one line. Accepting a proposal also requires its frozen terms to match the current approved order. If those terms have changed, inspect the changed order and record a supported rejection or prepare the appropriate new invitation. The workbench never silently applies an old proposal to a changed order.

## Recovery and retained history

Drafts and pending requests are scoped to the current organization, buyer and order in this browser tab. A page refresh preserves them when browser storage is available. Passwords and invitation bearer links are not stored with the draft. Closing the tab, clearing storage or using another browser can remove this local recovery record.

After an incorrect password, the same request remains available. Enter the correct password, or wait for the existing account cooldown when applicable. After a network failure or an unrecognized result, use the same retained request. The service checks whether that exact operation already completed before creating any new effect.

If the server rejects an outdated preview, refresh current records, select **Review current records**, review the revised terms and confirm again. This explicitly creates a revised draft after a definite rejection. An unknown outcome must first be reconciled; it must not be treated as proof that nothing happened.

If a read fails or access is removed, the workbench hides the previous data and offers a refresh. It does not display an empty history as a successful query. A viewing-only user can inspect retained history but cannot submit changes. Older invitations and responses load through scoped history controls; refreshing returns to the current page.

Disabling a link stops further supplier use. It preserves the invitation, prior supplier proposal, buyer decision and audit history. It does not delete or reverse an order, a receipt, a payable, a payment or an accounting entry.

## Operator reconciliation

When local storage is lost, a request reference conflicts, the invitation has expired, or verification evidence is unavailable, an authorized operator must inspect the scoped invitation/proposal and its event/audit records. Compare the organization, order, buyer, operation, request reference, correlation reference, recorded state and time. Do not use a similar reason or status alone as proof that it was the same request.

Restore permissions or setup only through their normal authorized processes. A new invitation is a deliberate new operation after the previous outcome has been checked. Retain old records and revocations. No database reset, token-identity edit, audit deletion or approval fabrication is an appropriate recovery step.

## Rollout and limitations

No schema migration is required for this batch. Deploy the matching service contracts, action adapters, recovery helper, workbench and EN/FR messages together through the normal release process. Older in-flight invitation/review commands lack the new evidence binding and may require operator reconciliation; do not weaken the contract to make them replay.

Keep immutable evidence on application rollback. Pause new work if the old application cannot safely interpret retained request identities. Reopening or amending a final buyer review is not implemented in this two-state supplier response model; follow the ordinary controlled purchase-order workflow for further changes.

Actual normal approval, receiving, AP, payment and ledger handoffs remain separate review work. Native screen-reader operation, native browser zoom, a production build and production performance are not established by this guide. The complete platform workflow assignment remains open.


## Verified checkpoint

[Source-bound evidence](../../evidence/supplier-buyer-receipt.json) records 102 tests, nine PostgreSQL groups, EN/FR connected buyer journeys, 24 masked screenshots and ten layout checks. Approval, receiving, AP, payment and ledger operations remain separate; no full platform completion is claimed.

# Supplier purchase-order responses

The supplier can review the shared purchase order, accept it, reject it with a reason, or propose a different delivery date or quantity. A saved response remains a proposal for the buyer to review. It does not change the order, receive stock, create a payable or make a payment.

## What the supplier needs

| Input | Where to obtain it | What to do |
| --- | --- | --- |
| Private invitation link | The buyer responsible for this purchase order | Open the link and check the order number, buyer and supplier. Do not share it publicly. |
| Response choice | Your confirmed ability to fulfil the shared order | Choose acceptance, rejection or a change request. Selection is not submission. |
| Requested quantity | Your actual supply commitment, checked against the displayed line | Enter a positive value with at most three decimal places. French comma input is supported. Extra precision is rejected rather than rounded. |
| Requested delivery date | Your confirmed delivery schedule | Enter a different future date within the supported two-year window. |
| Reason | The factual reason for rejection or the requested change | Required for rejection/change; optional for acceptance. Keep unrelated personal or confidential information out of it. |
| Confirmation | Your review of the displayed response | Confirm, then submit. Editing the draft clears confirmation. |
| Response/request reference | The saved response's References section, or the pending request message | Give this reference to the buyer when asking about an uncertain result or a correction. |

The page displays the saved snapshot date and invitation expiry. It represents the shared version, not a continuously updated purchase order. The buyer must reconcile later changes through the ordinary purchasing process.

## Recovery

Drafts are retained in this browser tab's session storage, scoped to the invitation and order. Reloading preserves the choice, date, quantities and reason. A switch between English and French in the same tab retains the same draft. Closing the tab, clearing storage or changing devices may lose local recovery data.

Before submission, the page saves the exact request identity. If the connection fails, use **Verify or retry this response** or **Refresh recorded response**. The server either returns the already saved response or safely processes that same request. A refreshed record clears the pending identity only when it matches the original request. Do not create another request to work around an uncertain result.

A definite validation failure keeps the draft editable and requires confirmation again. An unavailable database is shown as a failed read, not an empty order. If browser storage is unavailable or the retained record cannot be trusted, new submission is disabled; an authorized buyer/operator must check the existing reference before another attempt.

An expired or revoked invitation hides the order and cannot submit or retrieve a response. Contact the buyer for the correct current invitation. A view-only invitation allows inspection and explains why no response form is available.

After a response is saved, its current status and retained history appear. The supplier cannot overwrite it with a new response through the same invitation. Ask the buyer to review a correction using the recorded reference. This release does not add a supplier correction/reopening process.

## Buyer and operator responsibilities

The existing buyer entry point is Purchase orders → order → Supplier acknowledgement:

`/[locale]/dashboard/purchase-orders/[id]/supplier-acknowledgement`

The public route is:

`/[locale]/supplier-purchase-order/[envelopeId]` with the privately issued invitation token.

Never manufacture a token, approval reference or signed record URI. Supplier invitations grant access to a bounded response workflow; they do not establish a signer's corporate authority or satisfy X1 approval requirements.

Buyer invitation issuance, buyer review and revocation remain under separate implementation review. Their existing action wrappers require purchasing authority and fresh authentication, but the transaction-level authority/revision/retry and workbench recovery gaps are still open. This supplier-page checkpoint is not approval to activate a live customer or a claim that the complete purchasing workflow is finished.

## Implementation and operating boundaries

- Reuses Stoquify product canvas, surface, border, text, brand and warning tokens. Native radios, explicit confirmation and receipt focus replace ambiguous selection behavior. Small screens use line cards.
- Strict public commands reject unexpected scope fields. Missing/invalid values are unavailable, never invented zeroes. Signed-route success and failure responses are private and prevent referrer propagation.
- The server intersects signed-token permissions with stored invitation permissions. Revocation and expiry remain mandatory on reads, submissions and retries.
- Proposal, state, event, audit and access record changes remain transactional. Audit failure rolls them back. Concurrent submissions converge through the same saved request; purchase orders and financial records remain unchanged.
- No migration, seed reset, live email, payment, deployment, subscription purchase or X1 clearance was performed.

Native assistive technology, native browser zoom, comprehensive contrast, full production build, complete buyer/AP/receiving lifecycle and production performance remain unverified. CSS text enlargement and local development timings are narrower evidence.

## Next implementation work

Strengthen the buyer service and workbench: recheck current permissions/module/session authority within transactions; bind decisions to the inspected source and proposal revision; distinguish exact replay from a different actor/request; retain safe drafts and pending identities; provide the existing password assurance step; bound history reads; then verify the full buyer → supplier → buyer handoff in the actual authenticated application.

The all-workflow review remains active. This checkpoint covers four already inventoried supplier workflows and does not reduce the coverage denominator.


## Verified checkpoint

[Source-bound evidence](../../evidence/supplier-acknowledgement-receipt.json) records 59 tests, eight PostgreSQL groups, actual EN/FR acceptance/rejection/change journeys, 24 screenshots and ten layout checks. Native accessibility and the complete buyer/purchasing lifecycle remain open.

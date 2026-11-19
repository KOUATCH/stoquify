# AF06 evidence case contract

Updated 20 October 2026. Reuses AF04/AF05 and the current Close evidence lifecycle. No new case table, lifecycle enum, balance writer, notification channel or migration is introduced.

## Supported cases

| Display case | Exact mapping | Meaning of completion |
|---|---|---|
| Missing close evidence | Existing unresolved OPEN/ASSIGNED/REOPENED finding with unavailable evidence, an UNAVAILABLE checklist, or a zero-evidence checklist; no retained missing-evidence request already attached | The existing typed replacement verifier and independent acceptance writer determine whether missing source evidence was recovered. |
| Settlement proof | The same missing-evidence lifecycle, with checklist key `payment-reconciliation`, domain `PAYMENT_RECONCILIATION`, and source `services/reconciliation/payment-close-evidence.service.ts` or its existing historical `services/reconciliation/payment-reconciliation-dashboard.service.ts` identity | Recovery of the typed payment collection. A FAILED reconciliation control remains FAILED and requires its normal financial remediation/signature. |

The second case is a display adapter over an existing typed collector, not a separate payment case state machine. A similarly named source outside that exact mapping is not labeled settlement proof. Invoice/receipt-specific cases are not added.

## Request, response and review

1. A currently eligible firm accountant selects an authorized client, accounting period and original finding. The composer lists eligible active client recipients, a due date and a question of 10–4,000 characters. The browser submits no actor, home tenant, role or engagement authority.
2. The protected request adapter calls `requestMissingCloseEvidence`. The writer checks the original scoped finding, current recipient authority, module availability and client mandate. It persists the existing request comment, audit/business event and notification outbox transactionally.
3. The assigned client recipient responds in the existing Close workspace using their own session. The response is submitted evidence, not approval.
4. The existing firm review desk shows the response and replacement observation. The current observation must pass the existing typed collection receipt and source-binding checks. The original missing evidence remains retained.
5. A different authorized person explicitly accepts with current session and fresh authentication. A reply alone, an uploaded file alone or the new display label cannot resolve a financial exception.

Canonical records remain `AccountantComment` request/response/acceptance entries, the original finding/checklist/run, current replacement checklist/collection receipt, recipient assignment history, domain audit/business events and outbox/publication records.

## Truthful state and ownership

The existing tracking projection distinguishes awaiting response, awaiting independent review, accepted, stored evidence requiring investigation and authorized supersession. It includes current recipient availability, recorded recipient changes and the original request reference. The new desk combines the actor's own tracking with other authors' tracking only when current supervision permission allows it.

The client recipient owns the response. The currently authorized accountant review team owns review, subject to independence. Engagement ID, scope and expiry provide context; they do not substitute for the named mandate or assignment. Legacy named mandates are labeled as not enrolled.

Changing firm assignments never reauthors or deletes evidence. Ended staff lose access; another authorized reviewer retains the work. Recipient reassignment is performed in the existing client Close workspace, with expected revision and reason. A departed requester is not a reason to create a duplicate request.

## Bounded reading and continuation

- Existing client work desk: up to 10 clients per page, with existing request/review continuations.
- Client period selector: 20 periods per page using an ID keyset. The selected client-scoped period remains selectable when moving between pages.
- Finding choices: 100 original findings per page, ordered by creation time and ID. Historical missing findings remain eligible after a newer assessment.
- Recipient candidates: scan 100 users per page, then filter by current usable-account and Close read/comment permission. An empty eligible batch can still have a continuation.
- Tracking/supervision: reuse existing scoped cursor validation and bounded retained-history readers.

Cursors bind the organization, actor, period and collection kind. They carry position, never authority. Continue every available queue; these screens do not supply a complete firm workload total. Returned pages are observations, not a globally frozen snapshot. A full refresh includes changes between pages.

## Retry, stale and denied states

The composer retains an exact payload and correlation key after an uncertain submission. Retrying resends that command; the domain writer rejects changed content under the same identity and prevents a second request for the original finding.

Unsent question text remains in component memory across an ordinary failed read or submission on the same screen. A failed read hides stale data until a successful retry. Client/period changes, leaving the component, visibility loss and authorization denial clear or discard private drafts. There is no durable browser storage, server-side draft feature or cross-device recovery claim.

Read-only module state keeps evidence readable and disables new submission. A revoked session/mandate/assignment is checked on the next server boundary; this is not a push-revocation subscription. Independent acceptance rechecks current authority and source binding inside its domain transaction.

Notification failure does not erase the request or convert it into acceptance. Existing queue and publication history distinguish queued, failed and processed states; publication is not a read receipt. New scheduled reminders are deferred.

## Synthetic proof boundary

The SQL fixture invokes the real read-only payment collector against the isolated PostgreSQL database, then stores its returned summary in an explicitly synthetic completed assessment/checklist with a valid existing collection receipt. It intentionally leaves the business control FAILED and unsigned. Browser verification consumes that fixture and exercises real protected request/response/acceptance actions.

This verifies typed source binding and the firm-to-client lifecycle. It does not claim a live bank settlement, external provider ingestion, a complete `runCloseAssurance` assessment execution, a successful reconciliation or close certification. AF07 and AF16 retain provider/release responsibilities.

Source: [case projection](<E:/ohada saas/Focused projects/stoquify/services/accounting/delegated-evidence-desk.service.ts:20>), [existing writer](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance.service.ts:3739>), [replacement verifier](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-evidence-replacement.service.ts:154>), [typed collector](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/payment-close-evidence.service.ts>).

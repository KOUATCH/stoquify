# P05 — Recovery state contract for P08

13 October 2026. This records current server/client behavior and required presentation semantics; it does not implement P08. [Failure matrix](CHECKOUT_FAILURE_MATRIX.md), [result](RESULT.md).

## Operation identity and authority

Use the original `clientCommitId`, sales order, location, terminal, session, expected cart revision, customer, tenders and receipt request. Tenant and actor authority come from the protected server action, not a trusted browser field. The current lease is a separate ownership credential. A lookup or exact retry must never silently manufacture a new operation ID.

The server [recovery query](../../../../services/pos/pos.service.ts#L2149) binds organization, actor, location, terminal, session, sale and commit ID. Request and result hashes are checked. Recovery has `pos.read` protection and reads retained own-result evidence; new commit admission has separate write/module/session/lease/financial controls. Preserve this distinction without using it to bypass new-work restrictions.

| Presentation state | Server evidence | Permitted next action | Never imply |
|---|---|---|---|
| Confirmed recorded | `RECORDED`, validated original ID/sale/order/total; original and current statuses returned separately | Show original outcome and current status. Acknowledge matching evidence explicitly. Handle receipt readiness separately. | That a later cancellation was undone, or receipt delivery is complete merely because the sale was recorded. |
| Pending / unknown | `PENDING`, timeout, transport failure, lookup error or corrupt/unavailable evidence | Retain intent and tender evidence; check status again. Escalate unresolved uncertainty without resetting the cart or taking a second payment. | Success, definite rejection, or permission to start a replacement sale. |
| Retry candidate under server controls | `NOT_FOUND` for the original scoped request | Offer an exact retry of the retained request only. Server revalidates authorization, lease, draft/revision, pricing, stock, period and idempotency. | That `NOT_FOUND` proves no concurrent commit exists, or that a retry is guaranteed to succeed. |
| Review required | `CART_CHANGED` or `CART_REVIEW_REQUIRED` | Explicitly resume the matching cart, load current data, review changed facts, then use the existing reviewed-intent preparation path. Keep original evidence until resolved. | That refreshing the screen authorizes altered financial intent. |
| Confirmed not committed for this retired/empty draft | `NOT_COMMITTED` with `EMPTY_CART_CLOSED_SHIFT` or `RETIRED_CART_CLOSED_SHIFT` | Explain the closed-shift reason and allow explicit acknowledgement. Use normal controls for any subsequent new sale. | That all missing records or empty responses satisfy this state. |
| Rejected attempted write | Explicit server validation, authority, lease, payload/identity or financial-control error | Display a bounded reason and preserve the original pending intent. Check original outcome where uncertainty remains. | That rejection of this request proves the earlier original request never committed. |

`retry-safe` therefore means **safe to offer the exact original request to an idempotent, authoritative server path**, not confirmed absence of financial effects. No client may turn a scope-miss `NOT_FOUND` into authority to transact in another tenant/site.

## Current client persistence and settlement

[pending-sale.ts](../../../../lib/pos/pending-sale.ts#L7) uses organization/cashier-scoped session storage, validates serialization and reads back before submission. [ProfessionalPOSSystem](../../../../components/pos/ProfessionalPOSSystem.tsx#L499) also obtains retained server workspace intent on reload. Storage failure blocks submission; malformed retained evidence is not silently discarded. Browser session storage alone does not establish cross-device recovery, durable backup or browser crash correctness.

The client presently exposes original-request retry for `NOT_FOUND` and acknowledgement for `RECORDED` / `NOT_COMMITTED` ([buttons](../../../../components/pos/ProfessionalPOSSystem.tsx#L1473)). Successful commit handling clears pending state. P08 must verify those transitions in the rendered environment, bind asynchronous results to the request/scope that initiated them, and retain a visible path to unresolved historical requests. A delayed response for register A must never clear or acknowledge register B's intent. This last case is a proposed regression, not a proved current failure.

No new translated copy or UI was delivered. Suggested plain-language intent for FR/EN review: distinguish “recorded”, “checking outcome”, “original request can be retried”, “review current cart” and “request rejected”. Use existing translation keys/components and approved page/design contracts when P08 is requested. Keyboard/focus and assistive-technology behavior remain untested.

## Acceptance evidence and handoff

The 109 passing tests include mocked commit/recovery/action/lifecycle checks and three jsdom storage tests. They support the identity contract and modeled transitions, not a production exactly-once or browser durability claim. Real PostgreSQL full-commit/lifecycle and interrupted-response browser evidence are required before treating this contract as a verified deployed cashier journey. Preserve P01 D04 and P04 trust blockers. P06/P08/P12/P14 may consume this source contract only within their separately authorized scopes; none ran here.

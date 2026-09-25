# Checkout states and contracts

The database owns sale, payment, stock, drawer, ledger, and retained-request truth. React state communicates what is currently known. A browser lease or green indicator never proves a sale was posted.

| State | User action | Transition / invariant |
| --- | --- | --- |
| Loading or scope unavailable | Wait or retry the failed read | No private data from another actor/tenant; no financial action until authenticated scope and reads are available. |
| Register owned elsewhere | Return to the owning checkout, or close it and retry access | Browser Web Lock plus server lease; no manual lock bypass. |
| Ownership expired / connection lost | Reconnect and verify access | Ignore requests started before loss of authority. Clear accepted-cart and reviewed state. New ownership requires a fresh review where applicable. |
| Empty cart | Select an item | Charge disabled with an empty-cart explanation. |
| Cart needs resume | Resume beside Charge | Server revalidates stock, current prices and revision. This does not submit a sale. |
| Saving quantity / invalid quantity | Wait, correct or retry that edit | Preserve the entered draft and block Charge while it disagrees with confirmed quantity. |
| Incomplete tender | Enter valid tender amounts | Cash change and outstanding balance are previews; server recalculates authoritative totals. |
| Ready | Review amount/customer and Charge | Current shift, lease, accepted/reviewed cart, valid tender, retained-request storage and no pending mutation are required. |
| Submitting | Wait | One in-flight submission; exact request retained before dispatch. Do not generate a new identifier on uncertain outcome. |
| NOT_FOUND | Check again, explicitly retry retained request, or review eligible current cart | Absence of a result is not proof that the previous attempt cannot finish. |
| PENDING | Check again | Keep original request and evidence. No discard or new sale through this recovery state. |
| CART_CHANGED / CART_REVIEW_REQUIRED | Review current cart | Revalidate and fence previous revision server-side; preserve original logical request identity. |
| Cart reviewed | Continue to checkout | Show reviewed guidance, remove obsolete original-request retry controls. This is not a recorded-sale state. |
| RECORDED | Read result; acknowledge recovery | Use durable registry evidence. Receipt/delivery/cache failure must not relabel the sale as uncommitted. |
| NOT_COMMITTED | Resume normal work after verified settlement | Only the server's conclusive contract permits clearing the obsolete retained attempt. |
| Denied | Refresh authority or contact the assigned administrator | Never turn denial into an empty successful report or broaden access to pass a test. |
| Offline conflict / close blocker | Authorized conflict review | Provisional events and unresolved attempts remain visible and block unsafe closing. |
| Closed shift | Open an authorized shift | Finalized shift is not reopened; corrections use supported compensating workflows. |

## Ownership and response ordering

`usePOSCheckoutLifecycle` now fences replies by scope generation and authority version, uses a synchronous command guard, and counts response latency against a conservative lease lifetime. A reply arriving after offline, expiry, unmount, or register change cannot restore the old authority. Timer expiry clears accepted-cart state. A server rejection remains authoritative even when UI controls appear enabled.

The UI discards its reviewed flag when ownership becomes unavailable. Read checks never call commit. Rechecking clears reviewed guidance until a new review completes. Browser storage is a recoverability aid; durable server checkout state supports restoration beyond one tab.

## Layer responsibilities

- Server actions establish authenticated scope, validate inputs, enforce the operation's actual permission/module policy, and call services.
- Services own monetary arithmetic, revision/idempotency checks, atomic writes and integration evidence. Financial mutation failure must roll back the transaction.
- Cache invalidation and receipt hydration are after-commit work. Their failures are reported separately and must not invite a duplicate mutation.
- Hooks scope reads by organization and actor, reject mismatched server scopes, and hide cached data on denial. Drawer reads preserve the existing alternative `finance.read` permission.
- Components use localized blocker explanations, nearby recovery actions, keyboard focus and normal page scrolling. They do not manufacture payment evidence or statutory certification.

Authoritative implementation references: `services/pos/{pos.service,checkout.service,checkout-state,cart-revision}.ts`, `lib/pos/pending-sale.ts`, `hooks/posHooks/{usePOSCheckoutLifecycle,usePOSReadQuery,useDrawerDashboard}.ts`, `components/pos/ProfessionalPOSSystem.tsx`. Final test outcomes are recorded in [verification matrix](verification-matrix.md).

## Environment readiness and observed state

The separately authorized [application migration](evidence/application-migration-result.json) now satisfies the posting-cycle schema prerequisite on `stoquify_replay_next_20260830`. It does not mean the retained sale request was submitted or recorded. Its request identity, recovery contract and permission requirements remain unchanged; no recovery state was cleared and no sale was used to verify the migration.

The French accountant drawer was observed rendering and responding to location filtering, keyboard period selection and session expansion through its existing read permission. An open session's null closing balance now renders the existing localized unavailable label; an actual numeric balance remains a formatted amount. The service's nullable data contract is preserved. [Browser and scoped-lint evidence](evidence/drawer-closing-balance-verification.json) covers this single display correction; the earlier whole-project typecheck predates it.

That finance read state is independent of cashier Charge readiness. The cashier view still requires the existing authorized-account handoff; responsive, hardware and unvisited workflow states remain bounded by the [verification matrix](verification-matrix.md).

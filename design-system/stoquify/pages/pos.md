# POS checkout and recovery contract

Owner: POS/frontend lead; POS domain owner reviews transaction/replay behavior. Reviewed: 2026-10-07. Read [MASTER](../MASTER.md) first; preserve the shared brand and security constraints.

## Scope and references

Catalog/cart, tender, checkout status and interrupted-sale recovery. Inspect [ProfessionalPOSSystem](../../../components/pos/ProfessionalPOSSystem.tsx), [checkout actions](../../../actions/pos/checkout.actions.ts), [checkout service](../../../services/pos/checkout.service.ts) and [lifecycle tests](../../../services/pos/__tests__/checkout-lifecycle.service.test.ts).

## Operational presentation

POS intentionally uses dense, tactile, high-contrast controls. Keep item/cart/tender context stable, totals legible and the next valid action obvious. Preserve location, currency, active sale/session, item quantities/units and cart revision context through review and recovery. Reuse existing touch and keyboard interactions; do not force an executive-dashboard layout onto checkout.

Render server-confirmed stock, discounts, taxes, totals and payment state. Pending and uncertain payment outcomes must remain distinct from confirmed completion. Do not show a successful receipt before the server supplies the corresponding completed sale/evidence.

## State and recovery contract

| State | Required behavior / illustrative copy |
|---|---|
| Checkout pending | Show progress and prevent duplicate submission while preserving the active sale |
| Interrupted/uncertain | “Checkout status needs confirmation”; use existing status/recovery path |
| Cart changed or stale revision | Require the existing review/revalidation flow before completing |
| Rejected tender/insufficient stock | Show safe, actionable domain feedback; preserve useful cart context |
| Completed | Show confirmed sale/receipt evidence and the authorized next-sale action |
| Session/permission lost | Recover access without exposing another organization's sale or replaying an unreviewed mutation |

Preserve existing sale identity, idempotency/replay keys, revision checks, leases and service-owned transaction boundaries. A retry must use the existing recovery contract; UI redesign must not create a fresh sale merely because the previous request timed out.

## Keyboard and review evidence

Keep cart and tender actions reachable without a pointer. Do not override browser/assistive-technology shortcuts. Dialog focus returns to the invoking control; status updates are contextual and do not steal focus. Verify touch reachability and readable totals at supported POS widths and in EN/FR. Test pending, interrupted, stale-cart and confirmed paths using isolated fixtures; record what was browser-tested versus mocked. Preserve queued/offline behavior only where the existing implementation supports it; do not promise completion without connectivity proof.

# Supplier proposal evidence and history

This checkpoint verifies saved supplier terms against their original submission event and the buyer decision against its applied event. It also preserves the historical page selected by a reader during a background route refresh. These are application integrity checks, not proof of supplier identity, commercial assent or professional certification.

## What the buyer does

Open **Purchases → Purchase Orders → the order → Supplier acknowledgement**, at `/<locale>/dashboard/purchase-orders/<order-id>/supplier-acknowledgement` (`en` or `fr`).

1. Read the current order and the supplier's requested date and quantities. Selecting an earlier shared order shows its frozen terms; accepting terms against a different current order remains unavailable.
2. Use **Earlier shared orders** to inspect older versions. **Refresh current records** returns to the latest records. History does not jump back merely because the route refreshes in the background.
3. Review a supplier proposal using the existing reason, confirmation and current-password process. A buyer decision does not amend the purchase order or receive goods.
4. If the records cannot be verified, refresh once. Keep the original request reference and report a persistent failure to your authorized support/document operator. Do not create replacement evidence or a second request to force a successful result.

## Information needed and where it comes from

| Person / case | Information needed | Where to obtain it |
| --- | --- | --- |
| Buyer reviewing terms | Purchase-order number, shared version, requested date/quantities, decision reason | Current order and the supplier response shown in this workbench; obtain the commercial reason from the people responsible for the purchase |
| Buyer recovering an uncertain submission | Original request reference and the same pending draft | The retained request shown in the same browser tab; the application keeps its original identity for retry |
| Support investigating inconsistent evidence | Organization, order number, proposal/request reference, approximate time and language | Buyer supplies these visible references; support locates the corresponding scoped envelope, proposal, states and BusinessEvent records using authorized internal access |
| Support verifying content | Frozen envelope hash, proposal payload, original submission event, applied review event if reviewed | Existing stored records; the system creates these automatically. The user must not invent their values or edit their hashes |
| Purchasing owner proceeding after acceptance | An authorized operational order change, valid quantities and any required independent approval | The normal purchasing process. The current approved-order editor does not support direct amendments; this handoff remains engineering work, not a missing signature supplied by this page |

Never include a bearer invitation link or password in a general support report. Preserve the original proposal, event and audit records. Missing or inconsistent records need controlled reconciliation; a recomputed hash alone does not authenticate an approval.

## Operator behavior and recovery

The service rechecks proposal quantity/date/note/request identity, line ownership, submission event and buyer review event before public reads, buyer history, exact retries and decisions. Events must belong to the correct organization/object, be applied, carry matching content/digests, and match the recorded actor/time/state. Historical line order is recovered from the retained submission event, so database row ordering does not require a data migration.

Evidence-query failure remains a failure. A failed decision transaction produces no new decision/event/audit. The UI keeps an uncertain request for an exact retry. A changed order or changed buyer authority invalidates a selected history page and asks for a fresh read.

No migration, backfill, deployment or real message is needed for these changes. Ship the service helper and workbench together with their existing contracts. If rolling back a release, retain all records and pending request references; do not fall back to treating missing events as verified history.

## Remaining purchasing handoff

Source review identifies three items for the next batch, not completed fixes: approved orders are non-editable; supplier quantities permit three decimal places while ordinary order/receipt input schemas currently require integers; order update/approval/transition checks read state before their writes. A shipping-only update also leaves the existing total unchanged in the current source. Reproduce these operational paths against owned fixtures before correcting them. Supplier proposal acceptance must not bypass order approval, receiving, AP, payment or ledger controls.

## Verification limits

The fixtures begin with synthetic approved orders. The checks do not establish ordinary purchase-order approval, receiving/AP/ledger completion, native screen-reader operation, native zoom, full production builds or production latency. The inherited shell still has some English labels in French and the development screenshots include the Next development issue indicator. No X1 or release gate is cleared by this checkpoint.

Selected skill: `011-aqstoqflow-purchasing-ap-controls`. The numbered suite recommends `012-aqstoqflow-payroll-presence-engine` next, but current dependency order remains the unresolved purchasing handoff. Domain approval, receiving/AP and wider release gates remain open.

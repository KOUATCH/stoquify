# Receiving and inspection continuation

Previous goal turn: progress. The full platform workflow goal remains active. Source v54 is the preceding immutable checkpoint; this work is not published as v55 yet.

## Observed baseline

The graph nodes `purchaseorderworkflow_purchaseordersystemaction_ts` (community 2), `purchaseorderworkflow_goodsreceiptandsummary_ts` (68) and `purchase_orders_modernpurchaseorderdetailpage_tsx` (135) locate the current action/detail boundary. Current source confirms it calls `receiveItems` and `resolveGoodsReceiptInspection` in the purchase-order service. The stock owner remains `postGoodsReceiptStock`; it creates stock/valuation evidence and an explicit `GOODS_RECEIPT_LEDGER_REVIEW` blocker, not a posted accounting journal.

`../environment/receiving-before-eae022a3-743.json` records actual owned PostgreSQL reproduction. Revoked roles and sessions still created held receipts; a foreign organization location was accepted; duplicate order lines reserved 12 units against an order for 10; a caller replaced approved cost 2500 with 1; receiving created no dedicated receipt audit; revoked receiving authority still rejected a held inspection. Missing inspection reason failed at the database layer with a generic internal error. Original payment/journal and unrelated-role records remained unchanged. No stock was posted in the baseline probes.

## Corrections in progress

- Validate the entire bounded receiving/resolution command at the domain boundary, including unique lines and valid dates.
- Require server-derived tenant, actor and current session; recheck purchasing access, current roles and usable account in the transaction, including recovery.
- Validate receiving destinations and items against the owning organization. Preserve approved unit costs.
- Use decimal remaining quantities and per-line completion checks; cap serial generation to whole units and bounded receipt size.
- Record the receiving audit atomically; preserve safe failure explanations and committed results after cache refresh errors.
- Require current password assurance for resolving an inspection. Accepting a failed/incomplete inspection needs a different authorized receiver; rejection can be recorded by the original receiver under current authority. This protects an evidence override without adding an extra approval to ordinary passed receiving.
- Preserve a cancelled order when already delivered, held goods are accepted; the resolution does not restart unreceived work.

The preliminary typecheck passed after the first service/action changes. Final evidence must bind the final source. The new database verifier covers actual receipt authority, held quantities, fractional stock, explicit accounting blockers and rollback; its results must be inspected before claiming a pass.

`../environment/receiving-after-92e8df0f-0eb.json` passed eleven groups and reached exact fractional stock, then failed a test expectation for batch status `BLOCKED`. Current source and schema use status `FAILED` with the explicit `GOODS_RECEIPT_LEDGER_REVIEW` metadata. The assertion was corrected to check both canonical values. `../environment/receiving-after-d6e8d339-28c.json` then passed all 14 service groups, including exact 0.100 + 0.200 stock, cancelled-parent hold acceptance, one-effect retry and audit rollback, with stable source and unchanged original payment/journal/unrelated-role records. This is service prerequisite evidence, not completion of the still-unfinished browser workflow or accounting posting.

## Remaining connected implementation

Finish authoritative receiving/inspection read models and revision binding, durable exact request/receipt recovery, safe receipt history and the missing resolution interface. Replace false generic success for held goods with the actual disposition. Complete EN/FR, mobile/keyboard, tracking/expiry inputs and failure states in the existing shell. Verify the upstream approved/amended order, received/held/rejected goods, stock and AP preparation together. Keep accounting configuration, posting, outbox/operator handling and broader full-platform coverage visible. Existing stock ledger blockers must not be relabeled as posted accounting.

No migration, production deployment, external message, payment, X1 clearance or professional certification is authorized by these local tests. The required purchasing skill remains `011-aqstoqflow-purchasing-ap-controls`; high invariant failures are repaired in this boundary before advancing to other domains. Required historical suite documents were absent at their listed paths; their applicable gate blueprint was read from the skill.


## Published receiving checkpoint v55

The reviewed service, actions, EN/FR panel, inspection resolution, current history, partial-draft persistence and exact recovery are now implemented. Final results: 277 tests / 24 suites, typecheck, lint, 26 owned PostgreSQL groups and two six-stage actual EN/FR browser journeys with 28 screenshots. The stock owner retains its explicit accounting-review blocker. See ../../evidence/receiving-receipt.json and RECEIVING_AND_INSPECTION.md. Full-platform, AP/ledger, outbox/returns, complete history and native accessibility/release work remain unfinished.

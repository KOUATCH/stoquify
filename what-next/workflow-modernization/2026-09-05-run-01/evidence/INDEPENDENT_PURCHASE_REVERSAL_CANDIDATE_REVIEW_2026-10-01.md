# Independent purchase reversal candidate review

Scope: read-only review of the prepared runtime driver and isolated candidate. No application code or driver was edited, no rejected candidate was applied, and no test, database or browser execution occurred. This review does not grant application approval or certify a customer workflow.

## Actionable verifier findings

1. **Compensation assertions are incomplete.** In `lanes/environment/purchase-reversal-order-runtime.cjs:88`, the positive case checks mirrored journals, row-count deltas, immutable original correction records and unchanged `amountPaid`. It does not check restored inventory quantity/value, exact source-linked compensating movement values, supplier balance restoration, or the actual remaining payable. The unposted case at line 110 labels stock restoration without asserting it. An incorrect stock projection or supplier balance could pass these cases. Add exact expected deltas for those affected records and compare pre-existing non-target financial rows unchanged. The zero-value case does assert a 0.300/0.00 movement and unchanged monetary tables, but does not assert the final stock projection or source-allocation binding.

2. **Rollback/replay fingerprints omit correction child evidence.** The `models` list at line 15 and `state()` at line 21 omit `purchaseReturnLine` and `supplierCreditNoteLine`; retained receipt/invoice source child rows are also absent. Include the correction lines and relevant retained source records before claiming complete source/evidence conservation. The injected failure follows genuine return insertion, after real ledger and stock effects, so it can prove rollback of those observed effects. It occurs before final Close invalidation; this driver has no Close run fixture and cannot establish rollback of actual Close invalidation effects.

3. **Disclose the inherited approval prerequisite accurately.** `supplier-ack-fixtures.cjs:13` directly inserts an `APPROVED` purchase order with the same creator and approver. It is synthetic prerequisite data, not execution of the purchase-order approval workflow. Subsequent receiving, invoice preparation and independent invoice approval do use actual preview/confirm services and distinct persisted maker/checker sessions. State that distinction in the receipt; do not present the fixture as end-to-end purchase approval evidence.

## Candidate source observations

The bounded candidate admission and handoff are coherent on inspection: reversal owners use explicit Read Committed, acquire the shared catalog before their domain/period row locks, validate retained journal/batch links, resolve the complete sorted period set before numbering or financial writes, and recheck the optional authority callback after waits. Unsupported inherited isolation fails closed through the current shared helper. Replay retains existing semantics.

The prepared object is bound to the same transaction, organization, source identity, original posting references and reversal date. The unposted branch cancels only a retained PENDING/FAILED batch without journal entries; the no-value branch preserves existing source-proof and no-monetary-effect checks. No invented journal is introduced. Return stock invalidation is deferred to the source owner after the stock event, reversal record, recognition evidence and audit are complete; the ordered journal and inventory invalidators receive the same prepared scope. A no-journal supplier credit uses a registered SupplierCreditNote source family.

No additional material candidate regression was demonstrated in this narrow inspection. This is not approval to apply the isolated files. The runtime guard checks the exact owned local database before fixture writes and refuses the unchanged application that lacks the preparation API. It neither injects candidate code nor fabricates READY/certified Close status. Its explicit exclusions of publication races, Cash recovery and retained certified-export freshness are appropriate. The observer proves acquired catalog/period locks precede writes, but does not record posting-period row-lock timing or a concurrent waiter; those remain source/focused-test evidence, not runtime concurrency proof.

## Source bindings

Candidate directory: `evidence/source-reversal-before-purchase-39d08eb3-36be-4d4e-aca3-1c08191482b2/candidate/`.

| Reviewed source | SHA-256 |
| --- | --- |
| `lanes/environment/purchase-reversal-order-runtime.cjs` | `94d73cbd24811adc31b8df08761326189b8c58e90bffec997a12422ced20aeae` |
| Candidate `services__purchasing__purchase-correction-ledger.service.ts` | `2f03c47cbfc198419c00eb3800a98a0d9fd66e4907fcb1da6bc0d1960eaff516` |
| Candidate `services__purchasing__purchase-return-credit.service.ts` | `599e8110c2c506c82f8ec006d7d59da93983e66f251f674b48c6f80e629d629c` |
| Candidate `services__inventory__inventory-stock-event.service.ts` | `98b1acd43cd596edd4be633d1edff6847dc7a4337ddaf03e93409d8da4b1f668` |
| Candidate `services__accounting__close-assurance-pack.service.ts` | `7f8dc465c49cf2a9a6fda7bae7a40fce4146084a324b7547d8e7c8e951f4bdd5` |
| Current `services/accounting/journal-reversal-order.service.ts` | `f6b6a6765094e726614c4b9c0be004c6265e50657ad3f319c0317e9ed4442e09` |
| Current `services/inventory/inventory-close-invalidation.service.ts` | `7c570820469718daf607d0213288f3b1bc37eecfec3dbd88c2fe188bf6b107bf` |

Historical graph context was checked in `graphify-out/ordered-code-graph.json` using nodes `inventory_inventory_stock_event_service_ts` and `purchasing_ap_control_service_ts`. It does not establish the new candidate edges; the observations above come from the current and isolated source directly.

## Addendum: strengthened verifier and receipt finalization

The driver owner froze a strengthened version at SHA-256 `6a76420b57bd5f3932deacd4b732ecfa1308efc2f12cd0058773e4130a9a753a`. Independent readback confirms the earlier findings are addressed for the bounded cases: positive, zero-value and unposted return reversals assert inventory quantity/value restoration; the credit case asserts supplier balance and debit changes; all three use the actual `readSupplierPaymentBalances` read model to check remaining payable. Original journals/batches permit only their precise reversal fields to change, and existing journal lines, source links and inventory movements are compared unchanged. Correction child lines and retained receipt/invoice/order children are included in rollback/replay fingerprints. The synthetic APPROVED purchase-order prerequisite is explicitly disclosed.

The query observer now uses `Array.isArray(args[0]?.values)` before iterating Prisma SQL values; a tagged template array's inherited `values` function falls through to its actual interpolation arguments. This resolves the concrete observer issue without changing executed query arguments or results.

Both drivers previously wrote a successful receipt before awaiting database disconnection. A subsequent disconnect rejection could leave a successful receipt despite unsuccessful process completion. The purchase owner corrected its driver. Under separately granted ownership, this reviewer corrected only inventory-driver finalization: final source/outside reads, then disconnect with a separate sanitized `disconnectError`, then the success predicate and receipt. Both predicates now reject disconnect failure as well as main/finalization failure, missing checks or unstable fingerprints.

Final inventory driver binding: `lanes/environment/inventory-adjustment-reversal-runtime.cjs`, SHA-256 `4af185b1a9699afbf301c6ede58e4c4b74e5606f5660e7d1b8382ba6a0c7842b`. Its exact predecessor `c74dd0d8d94573c2f9e2b32aa4e8c273aa4a6ee4398b0b687846d65f6d1500a7` and metadata are retained in `evidence/inventory-runtime-before-finalization-20261001/`. Only receipt finalization was reviewed/changed in that follow-up scope.

No additional material issue was identified in this focused readback. This addendum is authoring/review evidence, not execution evidence: this reviewer ran no tests or database/browser operations and did not apply application candidates. The purchase driver's stated exclusions of Close publication races, certification recovery, late invalidation rollback and authenticated transport remain in force.

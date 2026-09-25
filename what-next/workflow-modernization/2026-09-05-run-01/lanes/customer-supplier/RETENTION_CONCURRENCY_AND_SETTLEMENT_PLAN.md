# Customer retention concurrency and inactive-customer settlement

Status: **read-only design and reproduction plan; not implemented or executed**. Evidence date: 2026-09-05. Current CS-F05 source is frozen. This report does not apply the rejected POS/offline continuation candidate or change its replay controls.

## Required invariant and existing behavior

An archived customer must have no retained business history. A customer with retained history may be inactive, but its existing records remain readable and permitted settlement/correction must continue through normal financial controls. Creating a new sale for an inactive customer is a separate operation and must remain denied. Reactivation must be an explicit authorized master-data change, not a side effect of settlement.

The current removal owner reads five relationship counts, then updates Customer outside an explicit transaction. CS-F05 aligned the legacy/direct paths with that policy but did not resolve the interval between the count query and update. Physical records and foreign keys survive soft deletion; they do not guarantee visibility through application reads that require `deletedAt: null`.

## Current producer map

Current source searches covered direct Prisma create/update calls under services, actions and app, then verified the following owners. This is an application-source inventory, not proof that ad-hoc database writers do not exist.

| Retained relationship / producer | Current transaction and protection | Relevant race / continuation |
| --- | --- | --- |
| SalesOrder: `services/pos/pos.service.ts`, `getOrCreateDraftCart` around 907–935 | Caller-owned transaction; organization `FOR SHARE` through module admission before creating a cart. Walk-in customer is upserted, then referenced. | Can create the first customer history. Walk-in upsert does not reactivate an existing inactive customer. No explicit customer lifecycle lock. |
| SalesOrder: POS `commitSale` transaction around 2113, 2229, 2489 | Serializable transaction with existing retry/commit registry; module organization lock; `requirePOSCustomerAtLocation` checks active/nondeleted tenant/location scope. | Changes a draft's customer ID to the attached customer; can create the first history association for that customer. Existing idempotent results return before new-work checks. |
| SalesOrder: `services/order-to-cash/delivery-order.service.ts`, `createDeliveryOrder` around 251–342 | Ordinary interactive transaction; module organization lock before creation. | Customer lookup checks tenant/nondeleted status but currently omits `isActive`. A new delivery order can therefore use an inactive customer. This must be corrected alongside a strict new-sale admission rule. |
| CustomerStatementSnapshot: `services/accounting/customer-statement.service.ts`, `createCustomerStatementSnapshotInTx` around 388, 443, 652 | Public wrapper uses Serializable with bounded retry. Existing immutable replay returns first; customer lookup is tenant/nondeleted. | An empty customer's first statement is independently sufficient retained history; no sales order is required. No explicit customer lifecycle lock. |
| CustomerLedgerEntry: `services/accounting/customer-ledger.service.ts`, `createCustomerLedgerEntry` around 82–151 | Caller transaction; customer lookup and conditional balance update protect balance consistency. | Used by POS sale/void, delivery billing, settlement and settlement reversal. These normally have an existing sales source, but this reusable owner itself can write first history. Balance compare-and-swap does not serialize the preceding retention count. |
| CustomerReceivableDocument: `services/accounting/customer-receivable-document.service.ts`, `ensurePostedCustomerReceivableDocumentInTx` around 122–385 | Caller transaction; existing-document replay before creation, scoped SalesOrder source and immutable document/lifecycle evidence. | Used by POS, delivery billing, settlement and legacy backfill. Normally a SalesOrder already preserves the customer. It should still participate in a common lifecycle invariant rather than rely on that incidental ordering. |
| CustomerSettlement: `services/accounting/customer-settlement.service.ts`, `collectCustomerSettlementInTx` around 706–857 | Serializable wrapper with three attempts; current sensitive-action authority and actor/org validation; idempotent replay and source/ledger evidence checked before a new settlement. | Requires at least one existing SalesOrder allocation. Its customer lookup requires `isActive: true`, preventing new collection against an inactive retained customer. |
| Legacy receivable backfill / settlement reversal | `customer-receivable-backfill.service.ts` uses Serializable and calls the receivable owner; reversal uses Serializable and calls the ledger owner. | Preserve existing source/financial invariants. Neither requires a separate first-history insertion API if the central owners enforce the shared lock. |

Only two direct SalesOrder create sites were found, both above. The only customer-ID reassignment found in SalesOrder updates was POS commit. Other located SalesOrder updates change amounts or lifecycle state, not customer identity. Immutable receivable lifecycle updates and public recipient actions depend on already-existing retained roots.

## Why the organization fence alone is insufficient

The existing module admission convention locks Organization `FOR SHARE` for new business; configuration writers use `FOR UPDATE`. That establishes a useful lock order and implementation precedent. It is not, by itself, a complete customer retention fix.

A Serializable statement/settlement/POS transaction may establish its snapshot during replay lookup before waiting for an organization lock. Customer removal changes Customer, not Organization. Acquiring a lock on the unchanged organization row after waiting does not guarantee that later plain customer/count reads use a newer snapshot. Do not claim that a removal-only transaction or unchanged organization fence closes this gap.

PostgreSQL documents that row locks last until transaction end; `FOR UPDATE` conflicts with `FOR KEY SHARE`, while `FOR KEY SHARE` permits non-key updates. A locking read in Repeatable Read/Serializable raises an error if the target row changed since the transaction snapshot. Serializable failures require transaction retry. These properties support locking the **Customer row whose lifecycle actually changes**. [PostgreSQL row locks](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS), [transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

## Recommended smallest complete source correction

Add a narrow customer lifecycle lock helper, using parameterized `Prisma.sql`:

- `lockCustomerForRetentionChangeInTx(tx, organizationId, customerId)`: lock the tenant Customer row `FOR UPDATE` before reading history counts, then evaluate/update within that transaction.
- `lockCustomerForHistoryInTx(tx, organizationId, customerId)`: lock that same row `FOR KEY SHARE`, reject a missing or archived row, and allow inactive retained history subject to the calling domain's existing rules.
- A new-sale mode/check requires `isActive` on the locked row. It must not replace the POS location visibility check or the service's current permissions, module authority, source eligibility, amounts or evidence rules.

Removal should run as a short explicit transaction: lock → scoped history counts → one archive/deactivation update → return the committed receipt. Read Committed is sufficient once all competing writers hold the conflicting customer lock; fresh count statements run after lock acquisition. Existing Serializable owners retain their retry policies and must retry the entire transaction when a locking read detects a changed row. Avoid `FOR SHARE` on every history writer: two ledger writers could both hold share locks then deadlock upgrading for balance updates. `FOR KEY SHARE` permits the existing non-key balance update while conflicting with the removal owner's explicit `FOR UPDATE`.

Place history locks before the first new effect and before any customer-balance update. Exact idempotent results may return through their existing validation before acquiring a new-business admission lock. Preserve lock ordering: existing organization/module admission first, customer lifecycle next, then source/inventory/accounting changes. Multi-customer operations must use stable customer-ID order. Unexpected timeouts/serialization exhaustion remain actionable failures; no success or zero-row result is fabricated.

**Proposed production ownership, no edits yet:**

1. New `services/customer/customer-retention-lock.service.ts`.
2. `services/customer/customer.service.ts`: transactional removal and dependency-injectable transaction client for real interleaving verification; retain receipt/DTO compatibility.
3. `services/accounting/customer-statement.service.ts`: shared customer lock after validated existing replay, before new statement work.
4. `services/accounting/customer-ledger.service.ts`: shared customer lock before customer balance read/claim.
5. `services/accounting/customer-receivable-document.service.ts`: shared customer lock on the new-document branch before effects, preserving existing replay.
6. `services/accounting/customer-settlement.service.ts`: shared customer lock on the new settlement branch plus the retained-source rules below.
7. `services/order-to-cash/delivery-order.service.ts`: locked active-customer check for new orders. Existing billing continuation remains domain-controlled.
8. `services/pos/pos-customer.service.ts`: add the same locked active-customer check while preserving its location visibility lookup. Extend its transaction-client type accordingly; verify all callers.
9. `services/pos/pos.service.ts`: **only** `getOrCreateDraftCart` locks/checks the walk-in customer before a new cart. POS commit obtains its customer lock through the existing customer helper. This scope is unrelated to retained offline acceptance/cutoff/replay logic, but must be explicitly allocated by the parent before editing. The rejected offline candidate stays unapplied.

No schema or migration is required for this source design. All five producer classes must be covered before claiming the invariant. If the two POS customer scopes cannot be changed, a complete guarantee cannot be made from the non-POS subset. A database-trigger alternative would need its own additive migration, error mapping, mixed-isolation tests and approval of its exact scope; it is not a shortcut around the rejected offline work or this source freeze.

## Inactive settlement: precise admission, not a broad active-check removal

`collectCustomerSettlementWithControls` currently has no production caller found under actions/app/components/services. Existing finance settlement actions expose reversal. Collection and backfill appear in tests/isolated scripts. This is a real service capability gap; it is not yet an executed browser collection failure. Keep action/UI integration separately registered.

For a new settlement, load and lock the scoped nondeleted customer, retaining its actual active flag. Active-customer behavior remains subject to the current controls. An inactive customer is eligible only when **every allocation** resolves to:

1. An existing immutable receivable document for the same organization, customer and SalesOrder, with a current valid lifecycle and positive unpaid amount; or
2. A supported legacy SalesOrder with existing authoritative sale-ledger evidence and positive net receivable balance. Validate that recorded source first, then use the existing `ensurePostedCustomerReceivableDocumentInTx` materialization in the same transaction. Preserve the source IDs/hash in settlement metadata. Do not create a receivable from an arbitrary draft order or a client-supplied opening amount.

The second branch is required to preserve the repository's existing legacy settlement/backfill behavior; there is no production backfill UI to use as a convenient unspecified prerequisite. Existing source contracts must determine which legacy SALE/adjustment evidence is accepted; ambiguous or unsupported evidence gets a precise error and no new effects. Do not infer authorization from a user-supplied reference, `settlementDate`, `orderDate`, `issuedAt` or mutable Customer `updatedAt`. Those are not authenticated deactivation cutoffs.

Continue requiring exact allocation totals, same-customer sales orders, positive open balances, no over-allocation, no cancelled/voided transitions, current authority/fresh authentication, current actor/org, posting rules, open period, balanced journal, source links, immutable lifecycle transitions, conservation and existing replay identity. Settlement credits existing debt; it creates no new sale or invoice obligation and never sets `isActive` true. Missing/archived customers remain denied. Reversal remains governed by its original settlement and posted source evidence.

The current receivable helper's name does not prove posted eligibility: its new-document branch validates amounts/source identity and can derive an opening from legacy ledger entries. The inactive branch therefore needs explicit retained-source validation before calling it, rather than relying on its name.

## Executable reproduction and acceptance plan

Use only the parent's authorized isolated PostgreSQL target, newly owned synthetic customer/source IDs, independent database clients and controlled promise barriers. Do not use production sleep timing as evidence. A test-only injected Prisma client/extension can pause the actual owner's real query boundary; no production backdoor or client-selected timestamp is needed.

- **Before-state:** pause removal after the real zero-history result; commit a first snapshot or new SalesOrder in another connection; resume removal. Demonstrate the customer becomes archived while the new retained row exists. This is currently a planned reproduction, not an executed claim.
- **Producer wins:** producer holds the customer history lock and inserts its first history row; removal blocks. After producer commit, removal observes history and deactivates with `deletedAt` unchanged.
- **Removal wins:** removal holds the customer lifecycle lock and archives an unused customer; the producer waits, then rejects or retries and observes the archived customer. No new history commits.
- **Old Serializable snapshot:** establish producer replay/read snapshot before removal; let removal commit; then execute the customer locking read. Require whole-transaction retry/failure followed by current-state denial, never stale-history insertion.
- Cover SalesOrder insert, POS customer reassignment, first statement, direct ledger owner, receivable materialization and settlement, plus independent customers/organizations and bounded retry exhaustion. Verify row counts, source links and actual transaction outcomes.
- Inactive retained settlement succeeds against an existing open receivable and supported real legacy ledger source; positive credits reduce the current balance and append conserved lifecycle/posting evidence. Cross-tenant/customer IDs, draft-only/no-ledger sources, zero/overpaid/cancelled/voided scopes, stale authority, closed periods and missing setup produce no settlement/payment/ledger effects.
- New delivery orders and POS customer/cart admission reject inactive customers; existing source completion, statements, authorized corrections/reversal and idempotent results retain their current valid paths. Reactivation remains explicit.
- Run focused changed-owner tests, source-to-boundary checks, schema validation only if the design later adds a migration, then coordinated typecheck and real PostgreSQL interleavings. Add browser proof only once a real current route exists for the changed operation.

The initial lock sketch was corrected during review after checking PostgreSQL snapshot semantics. No unsafe organization-only implementation was applied. Remaining work is engineering and isolated verification, not a demand for a user signature or fabricated financial approval.

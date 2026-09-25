# Purchasing lifecycle and AP continuation — next implementation batch

Status: source review and reproduction plan only. Application source remains frozen for the editor/clone browser batch. No new tests or database writes were executed for this plan. Evidence date: 2026-09-05.

## Current state and ownership

The canonical owner is `services/purchase-order/purchase-order.service.ts`; the server action resolves the tenant and actor in `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts`. No other production service writer of the purchase-order aggregate was found in the scoped source search. Supplier acknowledgment/proposal changes remain owned by the customer/supplier lane and are excluded.

| Operation | Current guard and boundary | Consequence |
| --- | --- | --- |
| Update (service:574) | Reads tenant order outside transaction, does not filter deletedAt; NON_EDITABLE_STATUSES at:99 permits DRAFT and SUBMITTED. Computes totals and validates references before transaction; writes by id inside transaction at:613. | A submission/approval/cancellation/archive can win after the read, then stale header/line edits still write. Soft-deleted draft lookup is not excluded. |
| Line reconciliation (:180) | Receives caller's previously read status; permits DRAFT/SUBMITTED. Inside transaction rejects any received quantity or receipt/invoice line evidence. | Preserve this evidence guard and stable existing line IDs. Do not delete/recreate all lines or relax obligations. |
| Submit (:749) | Checks lines in an initial external read, then transition (:730) reads again and writes unconditionally by id. | A concurrent line deletion can invalidate the checked nonempty state; a stale transition can overwrite a later state. |
| Approve (:757) | Real approver identity, SUBMITTED transition and different requester checked before transaction. State + audit written together inside transaction. | Another actor can change current state before write; duplicate approvals can overwrite approval identity and emit duplicate audits. |
| Cancel (:808) | Current transition checked before unconditional update. | Can overwrite receiving/approval that completes after the check. |
| Archive (:655) | Tenant nondeleted status/identity checked before transaction; archive, audit and business event then written. | Can archive an order whose status changed after eligibility was read. |
| Complete (:827) | Held-receipt query before calling shared transition. | Held evidence can race; completion must check current obligations under the same aggregate lock. |
| Bulk (:1482) | Bulk approval forbidden. Transaction reads statuses, then unconditional updates. | Transaction alone does not revalidate a stale status; existing partial-failure contract must remain. |
| Receive (:879) | Tenant/nondeleted PO SELECT FOR UPDATE, current read and receipt effects in one transaction; payload-bound durable idempotency. | Existing same-aggregate serialization pattern to reuse. |
| Held resolution (:1210) | Locks receipt, then owning PO; immutable resolution/idempotency, conditional stock effects. | Preserve order of existing locks; do not introduce an order→receipt lock inversion in completion. |

Presentation contract is explicit: `purchase-order-capabilities.ts:86` allows editing only DRAFT; submit is DRAFT→SUBMITTED; approval is SUBMITTED→APPROVED and independent of requester. No implemented reopen-to-draft/amendment workflow was found. Proposed correction: align direct update with DRAFT-only semantics. An amendment to an already submitted/approved order needs its own future reviewed workflow, not an implicit editable SUBMITTED exception.

## Concrete reproductions to run after freeze release

Use mocked deterministic interleaving first, then real isolated PostgreSQL barriers through the shared verifier. A mock proving missing guards is not proof of database locking.

1. PA-F04-A: update reads DRAFT; pause before transaction; second operation submits/approves; resume update. Current code writes changed price/notes into the advanced order. Correct result: update either serializes before submission (which then reviews the current data) or rejects after seeing current non-DRAFT state, with no line/header/audit partial change.
2. PA-F04-B: approve reads SUBMITTED; second actor cancels/archives; resume approve. Current write can restore APPROVED. Correct result: fresh locked transition check rejects and produces no approval audit.
3. PA-F04-C: two approvers read SUBMITTED; first commits; second resumes. Correct result: one authoritative approval and one approval audit; the second request reports current state without replacing first approver.
4. PA-F04-D: submit verifies a line exists; concurrent draft save removes it; submit resumes. Correct result: an empty order cannot become SUBMITTED.
5. PA-F04-E: update request for a soft-deleted DRAFT must be not-found; tenant lookup and all writes must remain scoped.
6. PA-F04-F: two open editors submit different changes from the same displayed revision. Reject the stale second save; do not silently lose the first editor's changes.
7. PA-F08-A: base subtotal200, tax38.50, discount10, shipping15,total243.50. Partial shipping45 must produce273.50; shipping0 must produce228.50. Current code leaves243.50 in both cases.
8. PA-F08-B: omitted shipping preserves15. Empty supplied line array with omitted shipping must have zero merchandise/tax/discount and total15 (current branch computes0 while keeping shipping15). Keep the service's empty-draft policy distinct from its submit nonempty rule.
9. Preserve prior quote tax percentage/discount/currency-zero tests, independent approval, no bulk approval, tenant/missing record checks, archive history and receiving/inspection replay controls.
10. Real retained-obligation case: stop new purchasing, then permitted update/submit/approval/receiving of an existing eligible order remains available; do not add a creation-admission check to ordinary continuation operations.

## Proposed minimal correction

1. Add one local, service-owned `lockPurchaseOrderInTx` helper using the existing parameterized tenant/nondeleted `purchase_orders` row lock. Read authoritative current order/lines after the lock within the same transaction.
2. Move update date/reference/state checks and effective financial inputs into that transaction. Require DRAFT. Keep current line evidence guard, stable line IDs and audit writes in that transaction.
3. Move all same-aggregate status writers to the same transaction/lock/fresh-check discipline: shared transition, submit, approve, cancel, archive and bulk. This is necessary because a writer that checked before waiting can still overwrite the state after the lock is released. Lock bulk IDs in deterministic sorted order; retain per-order result reporting and forbidden bulk approval.
4. Check nonempty lines during locked submission and held obligations during locked completion. Use a normal committed read of held records under the PO lock; do not additionally lock receipt rows after PO, because held resolution already takes receipt→PO.
5. Preserve server-derived approver and requester comparison. Approval audit and state commit together; invalid/stale operations write neither.
6. Bind draft save to the displayed source revision. The service already exposes updatedAt, but a bare timestamp has collision/precision limits. Preferred no-migration contract: a server-generated opaque edit snapshot hash over the relevant order/header/ordered lines plus updatedAt; required expected token in update schema/DTO/form payload; compare under PO lock. The token is a conflict detector, not permission or signature evidence. A stale editor gets a localized retained-draft conflict and a current-record link. Do not quietly make the expected token optional on the public mutation.
7. Financial correction uses effective shipping = provided value (including0) or the locked stored value. Supplied lines recompute the current service-rule components and total, including empty array. Shipping-only changes retain stored components and recompute total = subtotal + tax + effective shipping − discount. Unrelated metadata edits must not silently repair historical financial discrepancies.
8. No schema migration, changed tax convention, invoice/ledger posting rule, requester override or automatic retry. No edit into approved data. No clearing stops, held receipts or statutory controls.

Tradeoff: restricting update to DRAFT removes the undocumented direct-service SUBMITTED edit path, matching current route/capability promises. A reviewed amendment workflow is preferable to leaving two conflicting definitions. Adding revision binding is a small coordinated public contract change, required for multi-editor loss prevention; locking alone only fixes state races.

## Proposed file ownership once authorized

This lane owns:
- `services/purchase-order/purchase-order.service.ts` (aggregate locks/fresh state/totals; no supplier acknowledgment service edits).
- `services/purchase-order/purchase-order.schemas.ts` and `types/purchase-orders-system-types.ts` (explicit reviewed-edit token only).
- `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts` (token transport and narrow conflict presentation; preserve actor/tenant).
- `components/purchase-orders/purchase-order-edit-model.ts`, `ModernEditPurchaseOrderForm.tsx` and existing hook only if needed for retained conflict feedback.
- New focused `services/purchase-order/__tests__/purchase-order-update-lifecycle.service.test.ts`; affected existing PO service/capability/action/editor tests.
- Additive `purchaseOrderEdit` EN/FR conflict text only after shared dictionary coordination.

Parent coordinates any common type/schema ownership; no Prisma migration proposed. Verification owner exclusively owns isolated DB interleaving helpers, fixture changes, browser/server and browser evidence. No tests run while the current frozen browser/typecheck batch is active.

## AP interactive inventory and prerequisites

`AP_BACKEND_WORKFLOWS.json` names the ten absent AP write workflows, exact actions, schemas, permissions, source inputs and outcomes. The code-only caller search excludes tests and noncode graph reports and found no production caller in app/components/hooks. APControlWorkbench provides read-only history/supplier navigation; its queues are not executable AP forms.

Supplier destination request/approval (PA-020/021) remain cross-lane customer/supplier ownership. Do not add duplicate bank forms here.

A prerequisite uncovered by this trace: payment approval receives requestedById from the caller and creates an APPROVED payment directly. The action binds approvedById to the current actor, and sensitive-action controls compare the claimed subject actor with the current actor, but no durable authenticated payment request was found. A user-picked requester is not independent request evidence. Before exposing approval UI, reproduce this boundary and introduce a real server-owned request/approval contract or otherwise bind request authority to existing authenticated evidence. This is a source-backed origin gap, not a claim that a live payment was exploited. Release continues to require stored approval and a separate releaser.

# Inventory transfer lifecycle implementation

Date: 2026-09-12

## Result

Transfers now follow DRAFT → SUBMITTED → APPROVED → IN_TRANSIT → PARTIALLY_RECEIVED → COMPLETED. A full receipt can move directly from IN_TRANSIT to COMPLETED. Cancellation and rejection are available before dispatch; rejection records its reason and uses the existing CANCELLED database status.

The old approval action called the combined stock-posting service, credited the destination, and completed the transfer immediately. The public approval action now delegates to a stage-only approval command. The old combined posting service is retained for existing internal compatibility tests; it is no longer called by the public approval action.

## Pages and operating flow

- History: /en/dashboard/inventory/transfers
- Creation: /en/dashboard/inventory/transfers/create
- Progress and reception: /en/dashboard/inventory/transfers/[id]
- Draft creation opens its progress page.
- The history page links to the progress route, includes pagination, and offers an Awaiting reception filter covering both in-transit and partially received transfers. The existing destination filter identifies the receiving location.
- The progress page shows quantities requested, dispatched, received and outstanding, stage actions, and recorded actor/time/location/notes for lifecycle events.
- English and French form text and dashboard color tokens are used.
- Single-transfer reads query the scoped transfer directly; they no longer search only the first 100 history records.

## Stock and control behavior

| Operation | Stock effect |
| --- | --- |
| Submit | None |
| Approve | None; another authorized user must approve |
| Dispatch | Decrease source on-hand/available stock, record TRANSFER_OUT, increase destination in-transit quantity |
| Partial reception | Record actual TRANSFER_IN quantity, increase destination on-hand/available stock, reduce in-transit quantity |
| Final reception | Same receipt effects; mark COMPLETED and set completion time only after all dispatched quantities are received |
| Cancel/reject before dispatch | None; reason required |

Commands use fresh server authentication, inventory.stock.transfer permission, organization scope, and enforced inventory module access. The existing authorization model is organization-wide: this change does not create a separate per-location assignment system. Dispatch and reception require explicit confirmation of the stored source or destination.

Each command holds a transfer row lock inside the stock transaction. Inventory writes use version checks. Requests bind their idempotency key to actor, operation, transfer revision, location and quantities. Replays cannot repeat movements. The form retains the originally reviewed revision and retry key when a response fails or a background refresh arrives.

Receipt quantities are positive, finite and limited to three decimal places. The service rejects over-receipt, repeated or foreign line IDs, wrong locations, stale revisions and skipped stages. Stock operations require an open accounting period and invalidate affected close evidence.

Receipts allocate the original dispatched carrying value cumulatively, preserving the rounding remainder across partial deliveries. In-transit stock is not made available for sale.

Existing transfers with missing dispatch/approval evidence or stock movement quantities inconsistent with a pre-dispatch status fail with a reconciliation message. No historical stock or transfer records were rewritten automatically.

## Verification

- 56 tests passed across eight focused suites: lifecycle service, authorization actions, receiving form, mutation retries, existing draft form, legacy posting service, source-stock selection, and inventory route audit.
- Lifecycle tests cover complete and partial reception, independent approval, cross-tenant rejection, stale revisions, duplicate request replay, changed-payload rejection, rollback, insufficient stock, closed periods, invalid quantities and legacy inconsistencies.
- Receiving UI tests cover English/French, full-page rendering, required destination confirmation, invalid amounts, preserving inputs after failure, and preserving the reviewed revision during a background refresh.
- Focused TypeScript check: 12 implementation files, zero diagnostics.
- Focused ESLint and changed-file whitespace checks passed.
- Service stock tests use an isolated transactional fake; they are not a live PostgreSQL concurrency certification.
- Browser verification confirmed the updated signed-in history page, receiving-inbox controls, full-page transfer links and receiving detail page. For the existing RDS001-TRF-002 record (6 units outstanding), entering 7 kept submission disabled and displayed validation; entering 2 with destination confirmation enabled the receipt action. The test entry was cleared without submission. The dark-theme full-page presentation was visually inspected, and the French progress route was verified with translated stages, guidance, quantities and dates. Initial local browser/development loading delays recovered; no claim of a posted live dispatch/reception is made.
- No live stock-changing operation was submitted. An earlier automatic approval review had rejected saving the unrelated prepared live test draft because that exact persistent inventory record was not specifically authorized; it was not retried.

## Remaining operational verification

Run a designated test transfer with two authorized accounts through submission, independent approval, dispatch, a partial receipt and the final receipt using designated test stock. Confirm the source reduction, destination in-transit balance, destination received stock, and receipt history. Reconcile legacy in-transit records individually using their actual movement evidence before receiving them through the new workflow.

Loss or damage after dispatch remains outstanding rather than being silently cancelled or credited as received. It requires a separately authorized inventory correction with actual evidence.

## Dispatch correction — 2026-09-13

The affected RDS001-TRF-005 (Bonaberi Store → Deido Store) is APPROVED but carries 9 dispatched units against a request for 10. The comprehensive seed assigned shipped quantities to all stages, including DRAFT and APPROVED. New seed runs now use zero shipped quantities for those stages; the seed was not rerun against existing data.

The service rejected the inconsistent quantities, but the legacy inventory action wrapper hid BusinessRuleError messages as a generic system error. Transfer actions now canonicalize expected application/validation errors before that wrapper, retaining actionable stock, period, conflict and reconciliation messages while keeping private errors hidden.

The live detail now shows Correction required. A guarded Return to draft action is offered only for inconsistent pre-dispatch records without any received quantities, completion date, stock transaction, physical stock event, or dispatch/receipt/posting audit evidence. Its final command repeats those checks under the transfer lock, requires the operator to confirm that goods never physically left and provide a reason, records previous quantities/costs/approval in the audit, clears incorrect shipped quantities and approval, and changes no stock balances. The corrected draft must pass submission and independent approval again. Records with movement evidence remain blocked for reconciliation. No existing record was corrected automatically.

Explicit Refresh transfer closes the old confirmation so reopening reviews the current revision. Background refreshes still preserve the revision originally reviewed.

Verification: 77 tests passed across the same eight transfer suites; focused TypeScript check of 12 implementation files returned zero diagnostics; targeted ESLint and whitespace checks passed. Added coverage includes the real inventory error wrapper, safe/private messages, guarded correction, retained evidence, rollback, fresh approval followed by dispatch and full reception, duplicate dispatch replay, and English/French correction and dispatch forms. Stock tests use an isolated transactional fake, not live stock writes.

Browser verification on the affected signed-in transfer confirmed that no stock-movement evidence was found, the broken dispatch action was replaced by Return to draft, and the final correction button stays disabled until confirmation and reason are supplied. The dark-themed correction form was visually checked. No live correction, dispatch or receipt was submitted.

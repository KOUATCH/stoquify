# Receiving, inspection and recovery

This implementation covers the receiving boundary of PA-010, PA-011, PA-012 and PA-014. The platform workflow review remains active. A stock receipt does not establish an accounting journal, AP match, payment, supplier return or X1 approval.

## Where to work

Open `/en/dashboard/purchase-orders` or `/fr/dashboard/purchase-orders`, open the relevant order and choose **Receive items / Réceptionner les articles**. Use **Receipt history / Historique des réceptions** to inspect existing receipts and resolve held goods. The existing dashboard shell, organization context and order route are retained.

The order must permit new receiving, its location and items must be active, and the signed-in user must have current order-read and receiving permissions within the organization. Current purchasing eligibility is checked again by the service. A read-only user may inspect permitted history; that does not permit receiving or inspection resolution.

## What the receiver supplies

| Input | Who supplies it | Where to obtain it | What Stoquify does |
| --- | --- | --- | --- |
| Order | Receiving operator | Approved purchasing order and supplier delivery paperwork | Loads its actual lines, destination and approved costs |
| Arrived quantity | Receiving operator | Physical count, weighing or other authorized receiving measurement | Accepts up to three decimals; subtracts already received and held quantities before permitting another receipt |
| Supplier batch, when tracked | Receiving operator | Supplier package, delivery note or batch certificate | Retains the entered reference; if omitted, assigns an internal receipt batch, not a verified supplier batch |
| Expiry date, when tracked | Receiving operator | Product label or verified supplier evidence | Requires a valid calendar date |
| Serial numbers, when tracked | Receiving operator | Physical serial labels or verified delivery schedule | Requires whole units and matching unique serials; if omitted, generates internal identifiers, not manufacturer verification |
| Inspection outcome | Actual inspector | Checks required by the organization's goods-receiving procedure | Records passed, failed or incomplete inspection distinctly |
| Failed/incomplete inspection reason | Actual inspector | Observed damage, failed checks or missing verification | Records a held receipt with unavailable stock and reserved arrival quantities |
| Inspection notes | Actual inspector, optional | Findings or references to retained verification evidence | Retains bounded notes without inventing approval or evidence |
| Resolution and reason | Authorized receiving reviewer | Reinspection findings and the original held receipt | Allows acceptance by a different receiver, or rejection, after current password assurance |
| Password, only for inspection resolution when requested | Signed-in reviewer | Their own current sign-in password | Uses the existing step-up process; the password is not saved in receiving drafts or receipts |

Tenant, actor, review revision, request reference, receipt number and decision time are generated or derived by the application. Do not invent these values or manually copy a different person's references. Receiving cannot change the approved unit cost; use the controlled order amendment workflow for commercial changes.

## Normal sequence and recovery

1. Enter the arrived quantities and applicable tracking information. The form shows ordered, received, held and remaining quantities.
2. Record the inspection and review the consequences. The preview describes the state **after confirmation**, including the location, value and stock consequence.
3. Confirm. The service rechecks authority, the reviewed revision and quantities inside the transaction. A changed order or competing arrival requires a new review.
4. Read the actual receipt result and history. A failed/incomplete inspection is **held**, not received into available stock. Rejection also does not post stock. Passed receiving and accepted held goods use the existing stock service.
5. If the response is lost, choose **Recover this request**. The exact submitted command is retained in this browser session under the organization, actor and order. Refreshing or changing tabs must not create another request for the same uncertain submission.

Partially entered forms also survive a same-session page refresh. The application does not promise cross-device or new-browser-session draft synchronization. If browser storage is unavailable, keep the page open and resolve that problem before submitting. Do not store passwords or private session tokens in the receiving form.

Current authorization is required even for recovery. A denial clears private on-screen state and local receiving drafts. After authorization is restored, inspect the durable receipt history before starting another arrival. If stored decision evidence cannot be verified, keep the request reference and have the purchasing administrator reconcile the original record. Do not interpret a failed history query as an empty history.

## Held goods and downstream obligations

The original inspector cannot accept their own failed or incomplete inspection. Another currently authorized receiver must inspect the evidence, enter a reason and confirm through the existing password-assurance process. The original inspector may reject the held goods. These controls do not add another approval to ordinary passed receiving.

Accepting goods that arrived before an order was cancelled preserves the order's cancelled status. It does not reopen unreceived work. Rejecting goods records their unavailable disposition; it does not perform a physical supplier return or create return accounting. Follow the applicable purchasing return process for that separate obligation.

Receipt history verifies individual item, location, quantity, approved cost, batch, serial and expiry evidence against persisted inventory movements and applied stock events. Its stock statement concerns those receipt movements, not current on-hand availability after later sales or returns. Old receipts without the new reviewed-decision record are explicitly labeled as historical records rather than fabricated as newly reviewed approvals.

The stock owner currently creates a failed posting batch carrying `GOODS_RECEIPT_LEDGER_REVIEW`. The interface therefore says **Accounting review required**. Give the receipt number to the purchasing/accounting owner, who must resolve AP/stock posting configuration and verify the downstream posting evidence. Do not clear that condition by editing the receipt, changing its display status or assuming that a stock movement is a posted journal. That connected engineering and operating path remains open.

## Implementation and review record

The receiving authority, strict input contracts, reviewed read model, actions and panel reuse the existing purchase-order, stock, inventory period, business-event and audit owners. No new schema, ledger, provider or application shell is introduced. Mandatory receiving audits and reviewed decision events commit with the stock/inspection effects. Exact replay returns the original decision instead of repeating completed effects.

The former action exports cannot submit an unreviewed receipt or inspection decision; older clients receive an instruction to reopen the reviewed panel. Ship the new panel, actions and services together. The legacy receipt-list getter remains a separately retained exported read surface; its complete modernization remains open.

The UI reuses the dashboard theme and Radix dialog, including portal theme inheritance, focus return, semantic brand actions, attention text for holds/accounting review and success treatment only for verified receipt movements. Text and icons accompany color. New receiving, history, error and recovery text uses the existing EN/FR message files.

| Review responsibility | Assessment at this boundary |
| --- | --- |
| Architecture/backend/API | Service-owned review and atomic command composition; existing shell and canonical stock owner reused |
| Database/migrations | Decimal quantities/costs, serialized order updates, receipt/event/audit rollback and exact idempotency; no migration required |
| Security/IAM/privacy | Server-derived scope, current session/roles/module eligibility, tenant and object checks, independent inspection acceptance, scoped private drafts |
| Finance/accounting/reconciliation | Approved costs preserved; stock and accounting outcomes separated; explicit ledger-review condition remains unresolved |
| Purchasing/operations | Held quantities reserved; rejection and acceptance distinguished; cancelled orders stay cancelled |
| Audit/records/events | Mandatory durable decision and receipt audit; history hashes and source linkage verified; outbox delivery and complete export remain open |
| Frontend/design/localization | Existing semantic tokens/components, EN/FR receiving and recovery, responsive layout and keyboard focus |
| Quality/release/SRE | Focused regression, isolated PostgreSQL faults/concurrency and actual browser evidence; development timings are observations, not production budgets |
| Packaging | Existing purchasing access enforced; no price, subscription or commercial grant changes |
| Statutory/country/privacy approvals | No new statutory or country rule is asserted; expert approval/certification is not supplied by this engineering review |
| POS/offline, HR/payroll, AI/agents | Not applicable to this receiving patch: no changes to their behavior or data; their workflow review remains in the platform assignment |
| Analytics/growth/provider operations | No new analytics product, growth flow or provider operation; downstream consumers and operational delivery remain to be verified |

## Rollout and remaining work

Use the normal authorized pilot/release process. No production deployment or live customer activation was performed. Preserve receipt lines, inspection/resolution records, business events, audits, stock/valuation records and posting batches. If a release needs to be paused, suspend the affected receiving entry points while preserving history; do not restore the old unreviewed writer. Reconcile uncertain requests before resubmitting.

This boundary is not a complete procurement or platform workflow certification. AP preparation/matching/posting, ledger-review resolution, outbox delivery/operator retry, returns, complete history pagination/export, the older receipt getter and wider order-detail localization remain unfinished. History currently displays the latest 100 receipts with an explicit notice when older records exist. Batch/serial/expiry database and browser scenarios need wider coverage. Native assistive-technology, native zoom and comprehensive contrast verification remain open; recorded text reflow and keyboard checks do not substitute for them. The prior full-build packaging limitation is not cleared by a typecheck or development route visit.

See the receiving evidence receipt for final source bindings, commands, exact passed/failed/skipped results and screenshots. Continue the entire platform workflow register after these connected purchasing handoffs.

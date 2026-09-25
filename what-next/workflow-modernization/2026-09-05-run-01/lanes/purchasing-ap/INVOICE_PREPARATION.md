# Reviewed supplier invoice preparation — 2026-09-08

PA-016 now has a working authenticated preparation form. This checkpoint completes its supported inventory-receipt preparation path through retained match evidence. The whole Purchasing/AP lifecycle and the full platform assignment remain open.

## Open the workflow

Open **Purchases → AP Workbench → Prepare a supplier invoice**. The entry is displayed for users with `purchasing.ap.invoice.post`; the workbench itself requires its existing view permission.

- English: `/en/dashboard/purchases/payables/prepare`
- French: `/fr/dashboard/purchases/payables/prepare`

Direct route, source reads, preview and confirmation enforce current authority. The old unreviewed `prepareSupplierInvoiceAction` now returns `REVIEW_REQUIRED` after checking access/input; it cannot create an invoice. Existing posting, matching-exception and payment actions are separate boundaries and are not certified by this change.

## What the user does and supplies

| Step / information | Who supplies it | Where to obtain it and what to do |
| --- | --- | --- |
| Preparation access | Organization administrator | Assign the known invoice preparation permission to the appropriate AP maker. Granting a role is not an invoice approval. The account, current session, organization and purchasing grant must remain usable. |
| Supplier | AP maker | Search the organization's supplier master and select the actual invoice supplier. Supplier search is paginated. |
| Number and invoice date | AP maker | Copy the supplier's original invoice. Use its actual number; do not invent another number after a timeout. |
| Due date | AP maker | Copy the agreed due date from the invoice/terms; optional, but cannot precede the invoice date. |
| Currency | Server | The current organization currency is displayed. Cross-currency invoices need a separately established conversion workflow and are rejected here. |
| Retained document link | AP maker/document controller | Store the original in the organization's document store and paste its reviewer-accessible HTTP(S) link. This form does not create a document store or verify remote access. |
| Original file | AP maker | Select the exact retained invoice file, up to 20 MiB. The browser computes SHA-256 locally. File bytes are not uploaded by this form. The checksum is retained across refresh. |
| Accepted receipt | Receiving team and AP maker | Choose the accepted receipt line belonging to this supplier. Held, rejected, deleted and foreign-tenant evidence cannot support preparation. Receipt pages contain up to 50 lines and can be extended with **More receipt lines**. |
| Description, quantity, unit cost and tax | AP maker | Enter the values from the invoice. The form suggests the receipt item and cost. The service checks remaining received quantity and calculates exact totals. Tax/country setup and expert review are not established by typing a tax rate. |
| Review and save | AP maker | Review supplier, document reference/checksum, every selected line, available quantities, prices, tax and totals. Save creates an unposted invoice and matching evidence. |
| Independent approval / matching exception | A different authorized reviewer | Use the existing controlled domain process after reviewing the actual documents. A matched preparation is not approval, posting, payment or statutory certification. The complete reviewer interface/handoff remains unfinished. |

The document link and checksum are **maker-supplied evidence references**. A checksum detects byte changes; it does not prove identity, supplier authenticity, legal validity, remote retention or approval. No signing system or simulated authority is introduced.

## Recorded outcomes and recovery

- Exact price match: **Matched — awaiting independent approval**.
- Price variance: **Disputed — matching review required**. The amount of variance appears in review.
- Preparation does not create a journal or a payment. Accepted goods can still have the existing `GOODS_RECEIPT_LEDGER_REVIEW` condition; this is not cleared by recording the invoice.
- Partial form and checksum survive refresh in browser session storage, scoped by organization and actor. Sensitive drafts are cleared from the UI/storage after current access denial.
- A stale preview preserves the form. Refresh receipt sources and review again before saving.
- Before transmission, the form saves the exact command and request reference. After a lost response, reload and choose **Recover this submission**. The server returns the same retained preparation decision; it does not create another invoice.
- An uncertain or corrupted decision preserves the pending command for operator reconciliation. Do not create a replacement invoice. Use its request reference to inspect the same-tenant invoice, preparation BusinessEvent and audit record.
- A cache refresh failure after commit cannot convert the durable result into a failed preparation.
- A storage failure prevents first submission so the recovery reference is not silently lost.

## Implementation and controls

The new client-safe contract accepts document/line intent, not tenant or actor authority. The actions derive identity from the verified session and check it against the permission context. Inside the transaction the service rechecks the current organization, account, role membership, session and enforced purchasing access.

The existing AP owner still calculates invoice lines and creates invoice, three-way match and audit records. Its reused line planner now exposes the remaining quantity and rejects inconsistent receipt/order/item evidence. There is no second invoice or accounting kernel.

Preparation takes a same-tenant supplier lock before replay/reservation reads, locks source orders in stable order, checks and locks the accounting period, and hashes the draft and reviewed quantities/totals into the preview revision. Confirmation recomputes that revision. A supplier-scoped lock serializes concurrent preparation for the same supplier; production throughput and lock-timeout UX are not certified.

The same transaction retains `purchase.supplier_invoice.prepared` with the command hash, immutable preparation result, file hash/reference and actor. Exact replay verifies the applied event's payload hash, schema/source, actor, revision and result bindings. The decision describes the preparation-time outcome; it is not a claim about later approval status.

The shell, inputs, labels, buttons and Radix dialog are reused. `--dash-text`, `--dash-text-soft`, `--dash-surface`, `--dash-border` and `--dash-brand` preserve the active dashboard language. Selected receipts use selection cues; a saved preparation uses explicit matched/disputed text and continues to state that no journal/payment was posted. The portal inherits the dashboard theme. Dialog dismissal returns keyboard focus to Review.

## Verification and historical attempts

- `../environment/invoice-preparation-dc05416f-e1c.json`: 11 real PostgreSQL groups passed: scoped source/preview/result, concurrency, exact retry, stale preview, revoked role, expired session, foreign objects/session, missing/expired/suspended/read-only module grants, atomic decision failure, tampered evidence and price variance.
- `../../evidence/invoice-preparation-tests-final.json`: 91 tests across 8 suites passed, including AP/receiving/module/action/route regressions.
- `../environment/invoice-preparation-browser-872b70e4-fe2.json`: EN and FR actual application journeys passed, 10 stages in total and 20 screenshots. Draft/checksum refresh, 320/390/768 layouts, keyboard focus, stale preview, committed-response loss, exact recovery, 200% text reflow and direct-route role denial were exercised. Reduced-motion preference was used; this is not screen-reader or formal accessibility certification.
- Source-bound final typecheck/lint results and copied original screenshots are linked by `../../evidence/invoice-preparation-v57.json`.
- Original payments, journals and unrelated roles remained unchanged. All browser records are synthetic isolated fixtures; no live customer was activated.
- Development navigation timings are in the browser report. They are an initial baseline, not a production performance pass.

Historical failures remain retained: the first database verifier had a syntax error before execution; the first typed/PG run used an incorrect BusinessEvent unique selector (`invoice-preparation-af15db5b-38b.json`), corrected against the schema. The first browser (`16d9ccaf-678`) exposed missing focus return, which was corrected. The next (`4d39e97e-eea`) injected its competing invoice before the preview request had finished and therefore correctly saved a current preview; the verifier was sequenced to wait for actual rendered review before injecting staleness. The final run then proved stale rejection. Failed runs were not relabeled as passes.

The report-only module inventory finds the action's permission guard but does not trace the delegated service enforcement or the route's `withPurchasesSurfaceAccess` catalogue lookup. Its generated `invoice-module-surfaces.json` therefore retains enforcement-candidate/page-guard flags. Runtime tests prove the listed denials; scanner reconciliation remains engineering work. No release gate was waived.

## Rollout, recovery and remaining work

No schema migration, default migration-bearing build, production deployment or external message occurred. The actual Next.js development route compiled and ran; no production build pass is claimed. The prior full-build Windows standalone symlink limitation remains separate.

Review this patch and the existing dirty worktree together before release. Restrict the first cohort to authorized AP makers with an accessible document store, accepted receipts and an open period. Monitor request recovery, preparation failures, matching exceptions and lock timeouts. Source rollback must preserve historical invoices and preparation events. Do not reinstate the unreviewed public writer as a recovery workaround.

Remaining engineering: complete document retention/access validation, service-only invoices without goods receipts, foreign-currency handling through a real conversion owner, broader supplier pagination/selection browser cases, retained decision discovery/export, all interrupted-session/access-change UI cases, tax/country setup presentation, independent matching review/approval and actual inventory/AP/ledger/close handoffs. The raw AP kernel and other existing caller boundaries still need their full authority/lifecycle audit. Preparation-time metadata must not substitute for current approval evidence.

## Review matrix

| Responsibility | Evidence / scope |
| --- | --- |
| Architecture/backend/database | Existing AP owner reused; bounded contracts, supplier/order/period locking, exact Decimal computation and atomic event/audit tested. No migration. |
| Security/IAM/privacy | Server-derived identity and current transactional authority; foreign-object/session and restricted-grant denials; local private drafts and safe error messages. No security certification. |
| Finance/controls/audit | Quantities and matching evidence verified; no invoice preparation journal/payment; no simulated approval or blocker clearance. Later approvals/posting remain open. |
| Product/design/localization/accessibility | Real preparation route and role-appropriate workbench link; EN/FR, responsive and keyboard/recovery evidence; formal accessibility remains unverified. |
| Quality/SRE/rollout | Focused regressions, 11 database groups, actual browser proof and development timing baseline. Contention, full build and production performance remain open. |
| Statutory/country rules | No statutory rule changed or certification claimed; current country/tax setup remains a separate control. |
| API/events | New actions call the authoritative preparation owner; retained event and exact command recovery verified. Static scanner delegation gap recorded. |
| Analytics | No metric definitions changed; persisted invoice outcomes flow to existing AP readers, whose complete reporting lifecycle remains open. |
| SaaS packaging/providers | Not applicable to this patch: no prices, subscription or provider integration changed. |
| POS/offline, HRIS/payroll, AI/agents | Not applicable to this preparation implementation; retained in the full platform review. |

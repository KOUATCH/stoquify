# Replacement requests and recorded expiry

Evidence date: 2026-09-08. Scope: PA-017 request, PA-018 independent decision and PA-019 invoice-approval handoff. The full platform assignment remains incomplete.

## What changed

A new request could already replace an expired request, but the old OPEN or APPROVED record was silently changed to EXPIRED. The before-state reproduction `exception-renewal-before-fae59503-0ea.json` confirmed there was no corresponding expiry event or audit entry. A new request also did not explicitly link the earlier requests or explain the replacement in its preview.

Expiry materialization now creates a business event, audit entry and notification outbox record in the same transaction as the status transition. The event distinguishes the recorded expiry time (`effectiveAt`) from when the system observed it (`observedAt`), and retains the previous OPEN/APPROVED status. Existing review/posting kernel paths use the same operation when they materialize expiry. Request replacement validates the maker and source first, then atomically records eligible expiries and the new OPEN request. Failure of either expiry evidence or new-request persistence rolls back the entire operation.

The new request event links the earlier same-tenant invoice requests through `priorRequestIds`. Old request and decision events remain unchanged; only the expired exception's lifecycle status changes. A replaced approval never grants the new request's variance. The new request needs a fresh independent decision before separate invoice approval can create a payable.

The maker preview shows previous requests, their observed statuses, reasons and expiry times. The EN/FR explanation states that earlier decisions stay in history and the new request requires independent review. Reviewer options explicitly show observed expiry. Selection, an OPEN request, an APPROVED exception and a posted supplier invoice remain distinct.

## Procedure and required inputs

1. Open Purchases → Payables → Request an invoice exception, or `/en/dashboard/purchases/payables/exceptions/request` (also `/fr/`). Sign in as the invoice's maker with current `purchasing.ap.invoice.post` permission and purchasing access.
2. Select the original disputed invoice. Check its supplier document and receipt against the current source. An active, unexpired request/approval still blocks a duplicate request.
3. Supply a current reason, supporting-evidence reference and appropriate future expiry. Obtain the justification and reference from the supplier/purchasing records; obtain the permitted expiry from your organization's purchasing policy or authorized owner. The application does not invent a new approval or signing history.
4. Review the previous-request list and new request details. Confirm with your own password when asked. Any observed expiry and the new request commit together. The result is OPEN and has no financial effect.
5. An independent reviewer uses `/en/dashboard/purchases/payables/exceptions/review` (or `/fr/`) to inspect and decide the new request. Approval of that exception is followed by separate invoice approval. A refused or expired prior decision cannot be reused.
6. If a response is lost, recover the exact pending request in the same browser session. If the preview is stale, review again. History separates recorded outcomes from currently observed EXPIRED/RESOLVED statuses.

Do not edit historical expiry dates or fabricate source hashes. An archived invoice remains unavailable for new work. Missing or stale invoice preparation proof is not repaired by replacing an exception: correction/re-preparation of the invoice source remains a separate open workflow. An expired record can be observed as EXPIRED before its stored status has been materialized by a permitted operation; this implementation does not add a background expiry scheduler.

## Verification and operational limits

The final source-bound receipt is `../../evidence/exception-renewal-v69.json` once published. `exception-renewal-after-7c45f388-7ae.json` passed three replacement lifecycles. Expanded `exception-renewal-after-3b8d4387-38e.json` passed six groups, adding expiry-evidence failure, replacement-write failure and concurrent exact renewal. Each full lifecycle required a new independent exception approval before a single payable could be created. Original business events and pre-existing organizations remained unchanged. A further stale/refusal regression and actual EN/FR browser journeys are indexed in the final receipt.

101 focused tests in seven suites, typecheck and five-file lint passed. The direct translation write encountered a filesystem UNKNOWN error after service/UI edits had succeeded; the remaining translation/test edits were applied separately. This was a file-write failure, not a rejected authorization or a waived test.

No schema migration is required. Roll out the service and interface together; old previews require refresh because the revision includes displayed prior-request consequences. Preserve emitted expiry, request and decision events on rollback. Earlier code ignores the additive request-event field but will again omit expiry evidence for subsequent transitions; prefer a forward fix. Existing completed requests and financial obligations must not be deleted or reopened to accommodate a rollback.

Notification outbox records are durable dispatch intent, not evidence of delivery. Delivery/operator visibility, source correction/re-preparation, full assistive-technology audit and the complete inventory/AP/ledger/close lifecycle remain open. No production deployment, payment release, external message delivery, X1 clearance or professional certification occurred.

Review responsibilities: backend/data cover atomic state and event effects; security covers unchanged current authority, fresh authentication and independence; finance/audit cover historical approval expiry and one-obligation handoff; UX/localization cover replacement explanation and observed status; quality covers failure, retry and browser evidence; SRE/support cover outbox intent and recovery. Statutory rules, pricing, HR/payroll, POS/offline, AI and new external providers are not applicable to this bounded change because their rules and paths are unchanged. Selected skill remains `011-aqstoqflow-purchasing-ap-controls`; the next numbered payroll skill is deferred while the AP boundary remains incomplete.

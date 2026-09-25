# Older requests and exact offline replay evidence — v135

Status: bounded v135 evidence published. Full platform review remains active.

## Findings and behavior

v134 deliberately rejected new commits without a reviewed cart revision, while preserving exact historical committed results. An older unrecorded browser request could nevertheless receive NOT_FOUND and repeatedly offer an original retry that could never satisfy the revision requirement. That recovery gap is now addressed with an explicit `CART_REVIEW_REQUIRED` read state when an own scoped draft exists and the old request has no revision.

The EN/FR panel explains that the older request lacks review evidence and offers **Review current cart**. This loads the actual current draft without committing or rewriting the original stored request. The cashier reviews current items, total and tender, then explicitly confirms with the same client identifier and a fresh revision. No worker supplies that review on the cashier's behalf. Missing/foreign drafts remain NOT_FOUND; a failed query remains failure. Existing recorded requests still undergo original identity/hash checks.

The connected offline trace exposed another defect: `findCompletedReplayOutcome` previously selected a completed sale using cart/location/session, without binding completion to the queued request's hash or cashier. A completed sale under revised terms could therefore be used as evidence for an older queued request. This was confirmed by current source and a focused regression fixture; no prior live exploitation is claimed.

Pending replay recovery now calls the existing exact original-request result service with server-supplied tenant/cashier context before loading receipt evidence. Only an exact recorded request whose current sale is COMPLETED can acknowledge that pending event. A request conflict cannot fall back to generic sale completion. Other query failures propagate; no success or zero-row result is invented. New commits still use current admission and transactional revision validation.

Durable blocked events distinguish `OFFLINE_REPLAY_REQUEST_CONFLICT` from `OFFLINE_REPLAY_CART_REVIEW_REQUIRED`. The accepted payload/hash is retained unchanged. These codes improve persisted operator evidence; this patch does not implement a complete operator conflict-resolution screen or authorize rewriting a signed/accepted payload. Already-REPLAYED metadata shortcuts remain a separate review item.

## Evidence

Actual PostgreSQL verification (`4aa57a`, `lanes/environment/legacy-review-v135-1358fc51-1948-4add-8fc7-a298bb195577.json`) proves: old unrecorded request requires current review and cannot commit unbound; foreign tenant/cashier gets no draft; explicit review commits once with the original identifier; an older queued request cannot claim that differently bound sale; unbound pending events have a durable review-required blocker; exact matching recorded requests still acknowledge their pending event without new financial effects. The first three-check run (`57ff82`, `legacy-review-v135-22311d58-33d0-42c9-9e25-43f707faf2f6.json`) also passed and remains historical evidence.

Offline PENDING_REPLAY records were direct, owned test fixtures. This verifies replay/retention behavior, not signature validation, device ingestion or real offline capture. Only the existing test-only replay authorization was enabled in that verifier process after checking NODE_ENV=test and the owned target. Production/development deployment restrictions remain unchanged.

EN/FR browser verification (`344fad`, `lanes/environment/legacy-review-browser-v135-98f9a267-e604-4ffd-8c17-3c8cfd6678c1.json`) uses an explicitly old-format browser-storage fixture, real authentication and actual read/review/commit actions. Reading and reviewing create no financial effects; storage stays unchanged until confirmation; explicit keyboard confirmation yields one payment/registry with the original identifier. Six screenshots cover 1440/768/320px; French 320px was visually inspected. The initial old request was injected as fixture data, not claimed to originate from a historical browser build. Ready times are local-development observations, not production certification.

95 focused tests in seven suites passed (`282425`): recovery service, offline service, POS service, both affected POS component suites, pending storage, recovery action. New tests cover old-request review, absent scoped drafts, pending-event request mismatch and unchanged accepted payload. Five changed TypeScript files passed lint in the same command receipt. Final typecheck and source bindings are in the aggregate. No failed v135 verification is hidden; the initial 31-test focused run (`162360`) preceded the two added offline regression cases.

## User and operator procedure

Routes: `/en/dashboard/pos`, `/fr/dashboard/pos`. Keep the tab's original request. Check the previous result. If it has no review reference, choose Review current cart, check items/total/tender and explicitly confirm. Review itself creates no sale. Do not clear browser data or create a second cart to escape the request.

For an offline review-required/conflicting event, retain its payload and hash. An authorized operator needs event ID, original client identifier, organization/cashier, device/terminal/session and current source/commit records. Obtain identifiers from the offline event register and original request; get current sale/payment/posting records from authorized retained-record services. Do not mark the event acknowledged merely because its cart now has a completed sale. An audited correction or superseding-event process is still required and remains engineering work, not an external approval to fabricate. This patch supplies accurate blocking evidence, not that full resolution workflow.

## Rollout, review and limits

No schema change, deployment, production activation, external payment, receipt transmission or X1 clearance occurred. All runtime work used `stoquify_local_registration_20260906_01` and localhost:3110. Synthetic posting setup establishes test behavior, not statutory approval. Coordinate client/service release; mixed-version rollout remains unverified. Preserve original IDs, immutable result hashes and accepted offline payloads during recovery. Prefer a forward fix over restoring generic completed-sale acknowledgement.

Selected skill remains `007-aqstoqflow-pos-ledger-controls`. Architecture/backend: separate read/review/confirm, reuse exact result contract. IAM/privacy: current tenant/cashier scope and read permission remain authoritative. Database/finance: no new effects during lookup/review/replay recovery, original identifier preserved. UX/localization/accessibility: EN/FR, explicit keyboard actions, responsive panel and retained input. QA/SRE: actual browser/PG effects, source bindings and honest fixture limits. API/events/audit/offline: exact pending-event evidence, durable typed blockers, unchanged payload. SaaS/support: no entitlement/provider/commercial-policy change. Country formulas, HRIS/payroll, AP, analytics and AI logic are not applicable to this patch because none changes; their workflows remain in the full review. These are engineering reviews, not certifications.

Remaining: audited offline conflict-resolution/supersession, validation of already-REPLAYED metadata, signature/ingestion/revocation/end-to-end offline behavior, closed-tab/cross-device result discovery, currency/configuration revision scope, complete receipts/corrections/accessibility and every unfinished platform workflow. High-impact open boundaries prevent release certification or advancement to the next numbered compliance skill. Ordinary implementation can continue without an external decision.

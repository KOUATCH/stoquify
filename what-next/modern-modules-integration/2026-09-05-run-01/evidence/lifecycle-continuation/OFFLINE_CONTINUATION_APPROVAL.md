# Offline continuation: source-change approval required

Evidence date: 2026-09-05. Status: NOT APPLIED, NOT VERIFIED, NOT APPROVED.

The adjacent proposed patch is a review artifact. It is not a release instruction, and does not authorize production offline replay or certify event immutability.

## Purpose and scope

The user's assignment requires stopping new work separately from completing existing obligations and preserving safe retries. replayPendingOfflineSaleEnvelope currently calls ordinary commitPOSSale. Its new-work admission check also affects accepted pending offline sales. The proposal introduces a server entry accepting only a tenant-scoped stored event reference, resolves payload internally, and rechecks acceptance against reviewed stop cutoffs in the business transaction. Ordinary client sale input cannot grant continuation.

Proposed production files: services/pos/pos.service.ts and services/pos/offline-sync.service.ts; focused tests would also be required. The proposed patch was not applied. This subtask performed no tenant stop activation, migration or deployment.

## Exact automatic approval review reasons

First offline patch rejection:

> This modifies the core POS sale path and offline replay handling, including persisted-evidence validation and admission behavior that could disrupt sales; the request does not explicitly authorize this high-impact operational change or provide sufficient rollout safeguards.

Second rejection after supplying current-source authorization evidence:

> This changes the production POS sale path and offline replay flow, potentially disrupting sales and obligations; the user request does not specifically authorize this high-impact operational mutation or establish adequate rollout safeguards.

Do not reroute this rejected mutation through another tool or agent. Approval must address this exact source scope, retained-obligation behavior and isolated verification before attempting the change again.

## Current boundaries

- Current replay requires NODE_ENV=test AND AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS=1. The proposed entry preserves both conditions.
- POSOfflineEvent.receivedAtServer defaults in PostgreSQL. Ingestion does not copy a caller timestamp into it. capturedAtDevice must never establish continuation eligibility.
- Accepted envelopes link to a tenant-scoped BusinessEvent of type pos.offline.event.captured. Recheck source ID, payload hash, entry hash, device, terminal, location, session and server receipt/acceptance times.
- Compare server times against every required dependency's applicable stop cutoff. Missing or invalid cutoffs deny continuation.
- The POS registry returns an existing committed result before new admission. Preserve this ordering and domain controls.
- Current migrations do not provide immutable-field protection for POSOfflineEvent. Hashes do not establish identity or prevent privileged database rewrites.

## Safe interim behavior

Keep operational stopping unsupported for POS and any stop indirectly blocking POS through required dependencies. A pending-event count is insufficient: ingestion does not currently take the admission lock, so upload can race the count and stop. Shortcut removal and retained grants can remain available.

Before enabling stopping, prepare ingestion serialization using the same tenant lock as configuration changes. Resolve an accepted idempotency result before new admission. Newly received uploads cannot qualify as pre-cutoff merely because their device time is old. The adjacent patch does NOT implement ingestion serialization and must not be promoted alone.

## Required isolated tests

1. New commit denied after stop before payment/stock/registry/ledger effects; unchanged no-stop and legacy behavior.
2. COMMITTED/COMPLETED identical retries retain their result; altered payload/idempotency reuse denied.
3. Accepted pending event with server receipt AND acceptance before every applicable cutoff can finish; late receipt denied despite backdated device time.
4. Missing/invalid cutoff, wrong tenant/device/terminal/location/session, inactive device, missing acceptance, mismatched hashes and changed payload between reads deny before effects.
5. Client continuation flags, supplied old timestamps and foreign event IDs cannot bypass admission.
6. Concurrent stop versus ingestion/new sale uses the same tenant lock; accepted work is retained.
7. Refunds, voids, shift closing, receipt recovery and mandatory ledger/stock completion preserve domain controls.
8. Production/development replay restriction remains unchanged. Use only the dedicated synthetic local verification database.

## Superseding review candidate

The complete text-only candidate is now in `offline-review-candidate/REVIEW.md` and its adjacent patch. It includes ingestion serialization, versioned server acceptance proof and scoped immutable-field guards missing from the original proposal. It remains NOT APPLIED, NOT EXECUTED and NOT APPROVED. The old patch is preserved as rejection history; do not apply it. The candidate does not enable POS/Sales stopping or production replay.

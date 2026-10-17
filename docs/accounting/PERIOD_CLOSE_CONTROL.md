# Phase 7: approval, period locking and controlled reopening

## Approval and close

Reuse the existing independently certified close-pack workflow as the close approval. A READY assessment is not approval. Closing requires the latest unambiguous assessment, a completed period, clean ledger preflight, no high/critical findings or failed controls, available evidence and an unchanged tenant source revision. The retained certified export must match the run's recorded export ID, content hash and approver. Its approver must differ from the assessment preparer.

The closer requires `accounting.period.close` and authentication within five minutes. The existing close form submits the displayed `controlVersion`; stale versions fail. The service rechecks authority after waiting. A separate third closer is not required: independent preparation/certification and explicit closing authority are the enforced roles. System certification does not claim statutory approval.

The close transaction records a `PeriodControlEvent`, sets status CLOSED and both locking/closing timestamps, increments the version and records a ledger audit event. CLOSED is the posting lock; this phase does not introduce an additional intermediate soft-lock workflow. Receipt creation, period mutation, source invalidation and audit publication commit or roll back together.

## Reopening

`reopenAccountingPeriodAction` accepts a period ID, expected version, meaningful correction reason and idempotency key. It requires the explicit critical `accounting.period.reopen` permission and verified fresh authentication. Only CLOSED or legacy LOCKED periods may reopen. Reopening clears active closing markers, increments the version and retains the old close receipt and former lock details in a new immutable receipt.

Same-key, same-actor, same-payload retries return the original receipt alongside the current period state. Changed retries fail. A retry after a later close returns history without reopening that later cycle. A missing reason, stale version or foreign tenant cannot mutate the period. Reopening does not itself post a correction or grant journal permissions.

The validated close transition preserves its accepted approval and source revision. Reopening and other period/source changes invalidate assessments and certified exports. After reopening, correct through existing journal/reversal workflows, refresh supporting reconciliations, rerun close, obtain a new independent certification and close against the new version. Old approval is never resurrected.

## Database boundary and ordering

The service uses Read Committed and acquires the fiscal catalog exclusively, then the period row with NO KEY UPDATE, the tenant's ordered assessment locks and source revision. NO KEY UPDATE conflicts with posting's SHARE lock while allowing evidence foreign-key checks. Existing manual posting uses the shared catalog. Direct journal writes take SHARE on the applicable period before source invalidation; close waits for earlier writers and rejects a later writer after sealing.

Database triggers reject journal header and line inserts, updates and deletes touching a closed/locked period. Header reassignment checks both old and new economic periods, tenant membership and date bounds. Closed period bounds cannot be changed to route around the lock. Status and control-field changes require a matching versioned receipt. Receipts cannot be updated or deleted, and their composite foreign key prevents cross-tenant period linkage.

These controls govern ledger writes and accounting-period transitions. They do not freeze all operational business activity or establish effective-dated account classification. As with existing application controls, privileged database administrators remain outside the application authorization boundary.

## Delivery and verification limits

The migration is additive and preserves existing rows and historical closed periods. It must be applied through the release workflow; no application database migration is part of implementation verification. New imports must create periods OPEN and use controlled transitions. Existing callers of close must send `expectedVersion`.

The existing close form carries the version; reopening is available through the protected action. A dedicated reopening screen is not included. No browser/rendered, live-session revocation or production-load certification is implied by service tests. Real database tests use synthetic certified artifacts to isolate period transitions; the separate close-pack regression suite tests certification itself.

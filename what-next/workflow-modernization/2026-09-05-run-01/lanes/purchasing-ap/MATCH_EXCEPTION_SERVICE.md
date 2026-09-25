# Reviewed match-exception service

Evidence date: 2026-09-08. PA-017 and PA-018 remain partial workflows. This implementation connects current authority, source review, exact commands, durable operation history and the existing exception kernel. Selected skill: `011-aqstoqflow-purchasing-ap-controls`.

## Delivered behavior

`actions/purchasing/invoice-match-exception.actions.ts` now provides load, review, submit and history. The corresponding service owns source reads and transactions. Tenant and actor are never accepted from the draft. Requesters need the existing `purchasing.ap.invoice.post` permission and must be the invoice maker. Reviewers need `purchasing.ap.match.review` and must be independent. The dedicated authority rechecks the account, active organization, role membership, matching current session, module grant and fresh password assurance inside the transaction. Both request and review submission require fresh assurance, including committed replay. Existing invoice approval/recovery authority is unchanged.

Previews bind the typed draft, invoice source fingerprint and status, exception records, relevant events, receipt/order evidence and blockers. Expired, active-conflicting, no-longer-open and invalid-source cases are explicit. The same validator is used by preview and the existing kernel. The exact reviewed revision is recomputed at submission. No browser state can establish an approval.

Serializable transactions and a tenant/request lock protect submission. A retained operation event binds the exact command, actor, source event and decision. Repeating the same request returns its original result; changing a command under the same key conflicts. The new operation event and existing request/review effects commit together. Cache invalidation failure does not turn a committed result into a failed command. History separates the recorded decision from observed current exception status, including expiry. It does not rewrite the original decision.

The legacy request/review actions retain parsing and authorization but now return `REVIEW_REQUIRED`, with no effects. They must not bypass the reviewed service. No new user-facing route is added in this batch; EN/FR forms and actual browser transport remain the next implementation work.

## Inputs and where to obtain them

For a request, the maker selects a prepared disputed invoice, supplies a specific reason, an accessible evidence reference, and a future expiry with timezone. Obtain the source from the supplier's invoice, the purchase order, receipt and documented justification for the variance. The service computes source amounts and scope. The expiry is an organizational decision, not a fabricated default approval period.

For review, the independent reviewer selects the corresponding exception, examines its source and consequences, and chooses APPROVE or REJECT. Rejection requires an explanation. The reviewer must not sign in as the maker. Both operations require the current user's password when fresh assurance is absent. Passwords and session tokens are excluded from command history.

Clients must retain `{draft, expectedRevision, idempotencyKey}` before submitting and recover that exact command after an unknown response. Refresh and review again on a stale-preview response. Do not generate a replacement request simply because a response was lost. Typed results include organization, actor, invoice, exception, request, revision and source-event references for UI binding.

## Corrections and verification

The first PostgreSQL run passed core paths but exposed a real concurrency defect: the older request kernel normalized database serialization aborts to an internal error, preventing whole-transaction retry. Those recognized aborts now reach the reviewed service's bounded retry loop. Other failures in that run were verifier setup errors using obsolete organization module fields; fixtures now use `TenantModuleConfiguration` and `TenantModuleGrant`. Preserve the failed receipt as evidence, not a pass.

Automatic approval review rejected the initial proposal to broaden the shared posting authority while exempting exception requests from fresh authentication. That rejected patch was not applied. The accepted alternative uses a dedicated authority and requires fresh password assurance for both submissions. No shared authorization bypass or exemption was introduced.

See `../../evidence/match-exception-service-v66.json` when published for final source hashes, tests and PostgreSQL results. Checks use fresh synthetic organizations in the verified owned local database, no external transmissions or real payments. Module denial, revoked/expired identity, wrong/future assurance, maker/checker independence, stale revisions, exact/different concurrent requests, altered command keys, tampered history and atomic failure/retry are covered. No browser or production performance result is claimed.

## Remaining work and rollout

Implement the EN/FR request/review screen with visible evidence, password verification, pending-command recovery, source-result binding, responsive/keyboard behavior and history. Provide controlled reconciliation/rejection/replacement of stale or older requests without proof; existing kernel review of such requests remains blocked. No fabricated source hash is an acceptable backfill. Complete outbox/operator visibility and the connected AP/ledger/close lifecycle.

No schema migration is needed. Use the ordinary code review and release process; preserve committed operation events and exception decisions. Restoring the old unreviewed action is not a recovery procedure. Backend correctness does not establish deployment readiness or professional approval.

## Review responsibilities

Architecture/backend/database: one domain kernel, shared validation, service-owned read model, atomic event decision and bounded serialization retry. Security/IAM/privacy: current server identity, separate permissions, module enforcement, fresh assurance and private tenant history. Product/workflow/UX/localization: real draft/review/recovery contracts delivered; interface and browser verification still open. Quality/SRE: focused source-bound tests, injected persistence failure and concurrent commands; no production latency certification. Finance/audit/events: exception alone creates no payable, approval remains separate, original decisions retained, outbox delivery not claimed. SaaS packaging: current purchasing grant only, no billing or catalogue changes. Country/statutory, payroll, POS/offline, payment providers, AI and analytics: not applicable to this patch because their behavior is unchanged. These are engineering reviews, not professional approvals.

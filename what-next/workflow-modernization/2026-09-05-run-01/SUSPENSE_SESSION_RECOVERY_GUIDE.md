# Suspense session recovery — v90

This extends v89 on `/en/dashboard/finance/reconciliation` and `/fr/dashboard/finance/reconciliation`. It does not complete the whole reconciliation or platform lifecycle. Consult the verification receipt for the current source-bound results.

## What changes for the operator

- Your proposal draft and its original request reference are stored in this tab's session storage, scoped to your organization and account. Reloading the page can restore them.
- Before sending an approval, the application retains its item ID and reviewed revision. A lost response, reload or expired sign-in can therefore be followed by an exact retry after you authenticate again in the same tab.
- Restored review facts come from the current server read model. The original request revision remains separate: changed proposals are rejected, and an already-posted request returns retained evidence after the usual checks.
- Closing the review retains a pending request. **Resume retained request** opens it again. **Discard local request reference** removes the browser reference only; it does not cancel, reverse or erase anything on the server.
- If storage cannot be written, submission stops with localized guidance. Keep the page open, enable session storage and retry. The application does not pretend a request was durably retained.

No password, session token, authentication claim, approval status or copied server snapshot is saved by this recovery mechanism. Proposal reasons may contain private business text, so the storage key and parsed record both bind organization and actor. The queue hides restored work when the current identity, organization or read permission does not match. All mutations continue to derive identity and authority on the server.

Session storage is local to a browser tab. Closing that tab or clearing its storage can remove these references. Another tab/device is not a cross-device draft store. If a record falls outside the current bounded queue, its pending reference can remain available while its facts cannot yet be reopened there; full history/pagination is still required.

## Required inputs and recovery choices

| Case | Information needed | Owner/source | Action |
| --- | --- | --- | --- |
| Draft restored after reload | Original business reason and current source facts | Maker; restored text plus refreshed server queue | Compare facts. Rebase explicitly if the source changed. |
| Approval outcome uncertain | Original item/review reference and current posting evidence | Checker/support; retained request and actual server journal/approval/inbox | Resume and retry the original request. Do not infer success from browser storage. |
| Session expired | Your own current credentials and intended organization | Checker; normal application sign-in | Sign in in the same tab, open reconciliation, review current facts and explicitly retry. Password verification never automatically posts. |
| Storage unavailable/corrupt | Browser storage availability and original source records | Operator/support; browser settings and actual retained records | Keep unsaved text safe, repair storage availability, inspect source outcome and retry. Invalid stored data is not accepted as authority. |
| Another account/organization | Actual current account and workspace | Operator/admin; current identity and permissions | Switch through existing authorized navigation. A different person's private recovery is not restored. |
| Discard local reference | Whether the server already processed the request | Operator; refreshed server outcome | Discard removes only local recovery information. Any business reversal needs its own authorized workflow. |

## Implementation and rollout

The dashboard action returns its protected organization/actor scope. The durable dashboard query keys and verifies data using that scope; it no longer shares one cache entry across all tenants/users. During a permission refetch the new scope field retains only the same actor's last verified organization to keep mounted read models stable; permissions remain empty until the refresh succeeds. A failed refresh or changed actor does not reuse that scope.

Deploy the action, query hook, permission snapshot field, recovery parser, queue/parent and EN/FR messages together. No schema migration or backfill is required. No commercial entitlement or approval is fabricated. Existing v89 stale-revision and exact-posting replay controls remain authoritative.

Monitor failed scope checks, unavailable storage, repeated stale requests and unmatched receipts. Do not roll back to unscoped cache keys or unchecked approval to clear a gate. Preserve server history and use existing authorized restrictions if new writes need to stop during investigation.

## Review scope and remaining work

Architecture/backend/API: protected scope is explicit and browser data remains untrusted. Database/finance/audit: original posting/replay invariants are reused; actual browser checks inspect journal/audit effects. IAM/privacy/fraud: current scope/read permission, cross-actor storage parsing and late-response isolation are covered. Frontend/UX/localization: shared controls, EN/FR recovery and existing shell are reused. QA/SRE/support: failed attempts and observed loading-loop correction are retained; development timings are not performance certification. Packaging: existing module admission remains unchanged. Statutory/country rules, POS/offline, HRIS/payroll, purchasing/AP, analytics, external providers and AI/agents have no behavior change in this batch; their platform reviews remain in scope.

Still open: complete history/exports, pagination and account labels; full screen-reader/contrast audit; proposal exception metadata and notification delivery/read lifecycle; posting-configuration review; standalone suspense close obligations; and the rest of the platform register. Broader unscoped query families outside this durable dashboard require their own review.

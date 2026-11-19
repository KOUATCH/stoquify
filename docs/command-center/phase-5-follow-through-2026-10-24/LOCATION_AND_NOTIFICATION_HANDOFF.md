# Source scope and notification handoff

24 October 2026. Source-inspection evidence and implementation decisions; no workers, webhooks, notifications or database commands were executed.

## Location eligibility: do not substitute dashboard scope for source authority

`services/operating-access/operating-access-scope.service.ts` resolves dashboard operating access from current RBAC and either tenant-wide operating authority or active `Location.managerId` responsibilities. It also writes a scope audit when executed. Its `dashboard.read` contract is appropriate for the existing Digest/Manager/Owner operating projections, but it does not establish payroll, accounting, POS-session or reconciliation authority by itself.

The general assurance registry has many aggregate findings (`overdue_serious_exceptions`, `aged_suspense_missing_owner`, `completed_pos_sales_missing_payment`, payroll aggregates, etc.). The current registry forwards a location input to source runners, but a generic incident does not retain a canonical independently verifiable location binding. A table-like `sourceType` can describe an aggregate rather than a single record ID. Do not look up arbitrary `sourceId` values in guessed tables or infer location from action routes.

| Source | Next implementation requirement |
|---|---|
| POS cash-shortage incident | Existing `pos-cash-shortage-resolution-source-loader.ts` binds a POSSession incident to an applied `pos.shift.closed` BusinessEvent, organization and current payload hash; the event carries location. Reuse this provenance and the actual POS actor/location rule in an assignment-specific read adapter. Do not execute financial resolution or load an unverified arbitrary event merely to derive location. |
| Other POS/inventory/purchasing record findings | Resolve the actual tenant-scoped order/receipt/adjustment/stock source, then its persisted location and the domain's current authority. Aggregates require a retained structured scope before location-specific assignment can be certified. |
| Payroll | Reuse payroll organization/manager/employee scope; dashboard branch management alone must not authorize employee detail or payroll operations. |
| Close proof requests | Keep `assertCloseEvidenceActor`, retained recipient replacement and close period/engagement controls. Historical recipient metadata is not current read authority. |
| Reconciliation | Preserve provider/account/run scope and source signing rules; assignment does not grant review/sign authority. |
| Branch close | Bind organization, location and business date to the retained run and source review/sign-off authority. |

The implemented assignment guard now enforces declared and narrower route module access in the same transaction, with dependencies, current grants and no wildcard bypass. Location/employee source adapters remain a separately identified gap. Existing source-permission checks are preserved, and no generalized location claim is made. Unknown or inconsistent module identity is denied.

## Notification reuse decisions for Phase 6

### Generic signals

`services/signals/signal-notification.service.ts` contains pure preference and digest helpers. Scoped caller search in `services`, `actions` and `app` found only helper/test callers, not a production delivery pipeline. The helper compares tenant/type/severity, digest-only preference and UTC quiet hours, with a critical-severity exception. It does not resolve current recipient authority, persist delivery state, deduplicate transitions, or execute transport.

Decision: retain it as advisory preference logic until connected to trusted recipient resolution and durable event delivery. Do not call a generated digest a delivered notification. Validate recipient organization/user against the trusted preference owner and require current source/module/location permissions before including payload or even an actionable private link. Quiet hours remain explicitly UTC until a separate timezone policy is implemented; the current critical override must be disclosed and tested before adoption.

### Existing assurance delivery

`services/assurance/assurance-alert-delivery.service.ts` owns a durable webhook queue, unique organization/incident/channel/dedupe key, worker lease/attempt controls, five-attempt limit, timeout and dead-letter behavior. Receiver idempotency binds the retained delivery; it is not just a source hash. Recovery is source-owned in `assurance-alert-recovery.service.ts`.

Decision: reuse this machinery only for its existing operational webhook purpose. Its role/incident payload and configured endpoint are not a current per-user authorization/preference service. Do not route personal cross-center notifications through it without the recipient/occurrence contract. Existing source-hash dedupe must not be assumed sufficient for later identical-hash recurrence.

### Existing close evidence delivery

`close-evidence-notification.worker.ts` uses the BusinessEvent outbox, verifies retained event/payload/source/audit provenance and its lease, then publishes idempotently to CloseEvidenceNotification using the tenant/outbox uniqueness key. A retained publication can survive an acknowledgment loss. `close-evidence-notifications.service.ts` reads against current close actor authority and recipient/reviewer rules, rechecking authority before return. `close-notification-operations.service.ts` provides revision-bound operator recovery without changing payloads, stealing a lease or resetting historical attempts.

Decision: retain this domain-specific path for close requests/responses/acceptance. Reuse the outbox lease/idempotency patterns for future generic follow-up, but do not reinterpret a published close notice as an accepted response or completed close. A shared read projection may reference authorized source notices once Phase 5 identity/persistence gates pass; it must not duplicate publication.

## Phase 6 entry gate and execution order

1. Finish source-specific location and all-origin occurrence/persistence gates from Phase 5, including real disposable database verification when authorized.
2. Project the same retained occurrence/source identity into personal Digest, team Manager and executive Owner views after each page's authorization. Preserve existing honest coverage and period semantics.
3. Add durable review receipts with evidence-version binding. Keep read review distinct from approval/completion.
4. Emit notification events only for actionable transitions (new assignment, explicit due threshold, escalation, confirmed source outcome), keyed by occurrence + transition revision + authorized recipient/channel. Rendering or unchanged refresh emits nothing.
5. Resolve eligible recipients at enqueue and again before sending/private read. Respect persisted preferences, quiet-hour policy and revocation. Retry the same retained delivery identity; do not create another event to retry delivery.
6. Verify lost acknowledgment, changed recipient, silent unchanged refresh, backoff/exhaustion/recovery and source revision changes with synthetic transports and real disposable delivery-state records.

This handoff does not enable delivery, send messages, register a scheduler or mark CC-06.7/06.8 complete.

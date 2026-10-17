# UX08/UX09 discovery

Status: first read-only implementation complete with focused automated checks; release acceptance remains open.

The delivery queue should project existing source truth without sending anything. Start with customer statements and user invitations. Receipt support remains conditional on examining its own recovery contract.

## Source authority

`services/users/user-invitation-history.service.ts` requires `users.read` plus role-grant authority, then evaluates the specific invitation's target role and reloads the reviewer's current grants inside a repeatable-read transaction. An organization-only outbox query is insufficient for invitation disclosure. Apply those source checks before exposing entries, counts or page cursors; do not assume an administrator label is the permission contract. Existing history validates event/outbox payload hashes and grant evidence before projecting an entry. Reuse or extract that validation rather than inventing another evidence interpretation.

`services/accounting/customer-statement-history.service.ts` pages immutable snapshots and deliveries by tenant/customer, joins the latest versioned delivery state and tenant-scoped outbox, and derives recovery from existing source contracts. Inspect its action/route permissions before composing a cross-customer queue. Select masked `redactedDestination`; do not expose token values, payloads, provider raw errors or financial snapshot totals in a delivery worklist.

The inspected history actions require `accounting.exports.create` plus `customers.read` and enforced accounting read entitlement. Retry additionally requires fresh authentication and accounting export entitlement. Customer-detail destinations also require `customers.analytics.read`; discovery must not silently widen that destination's authority. Notification settings currently requires `communication.notifications.read` through its settings guard. Decide the worklist entry route against those source permissions before adding a navigation link.

## Status and recovery

Invitation history currently explicitly returns `transport: disabled`. Its outbox state must not be presented as confirmed delivery. Invite acceptance is an account lifecycle fact, distinct from transport delivery.

`customer-statement-delivery-recovery.ts` allows unsent recovery only when both queue and source state are DEFERRED / PROVIDER_NOT_CONFIGURED, attempts remain, and validated dispatch metadata records NOT_SENT for the same attempt. RESERVED, ACCEPTED and UNKNOWN must not be treated as safely retryable. The worklist should hand off to the existing source workflow, preserving its current authority, token/consent checks and revision checks.

The statement delivery worker maps its SENT state to dispatch outcome ACCEPTED, and timeout/ambiguous responses to DEFERRED / PROVIDER_OUTCOME_UNKNOWN. Thus SENT must be labeled provider-accepted, not recipient-delivered. This mapping is grounded in the current worker implementation rather than inferred from the enum name.

## Next implementation

Inspect source actions, delivery worker outcomes and notification-settings navigation. Freeze source-specific certainty labels, minimal DTO and paginated authority contract; implement independent adapter failure states. Add EN/FR filters, source references, age and authorized recovery links. Do not introduce a sender, generic delivery truth table, automatic retry, bulk-send action or delivery assertions unsupported by provider evidence.

## Implemented 4 October 2026

`services/communication/delivery-issues.service.ts` composes two independently authorized adapters; `actions/communication/delivery-issues.actions.ts` obtains authority from the current session. The route `/dashboard/settings/delivery-issues` allows the common shell under either source entry permission, while each adapter requires its complete permission set before any data read. Statement reads require accounting export and customer read permissions with enforced accounting read entitlement. Invitations match the existing settings observe-mode contract and require user read plus both invitation grant permissions. The reviewer’s active stored grants are reloaded and both session/stored role ceilings filter role IDs before invitation event or cursor queries.

Statement links now target `/dashboard/customers/[id]/statement`, whose current read/export permissions and accounting read entitlement match the adapter. The extra customer analytics permission belongs to the profile route and is not needed for this direct source handoff. The queue adds no grants and no retry command. Existing source workflows retain fresh authentication, evidence, consent, revision and replay requirements.

Each source returns at most 20 matches from a 100-record scan plus one lookahead. Date/channel conditions are applied in the source query; state filters are applied to validated projections. Cursor ordering is timestamp/id descending. The cursor identifies the last consumed record, is re-resolved under current source authority, and preserves older matches even when the window is sparse. An explicit continuation message prevents an empty scan window from being mistaken for a complete absence of issues. No global counts are exposed. This bounded-scan tradeoff should be measured against large-volume fixtures; it is not a query-plan performance certification.

Invitation rows represent retained issuance/replacement attempts, not proof that a current invitation remains redeemable. Projection validates schema, tenant, invite, actor, event source/version/status, payload hash, role-grant evidence and the single matching outbox entry, matching existing history interpretation. The recipient is masked and associated with an attempt only when its retained recipient hash matches; otherwise the row shows a fully masked recipient. Tokens, grant arrays, payloads, hashes, raw destinations and raw provider errors never appear in the DTO. Statement rows use existing redacted destinations and the latest versioned state; no financial snapshot totals are selected.

`SENT` is labeled provider-accepted, never recipient-delivered. Ambiguous provider outcomes are unknown. Missing/invalid invitation evidence is explicitly unverified. Invitation transport remains disabled by default because its worker has no production adapter; injection exists for isolated tests. The worklist explains this independently of historical attempt status. Provider-disabled statement records direct operators to source recovery without asserting they can be safely resent.

Reads use repeatable-read transactions, a 2-second statement timeout, 5-second transaction timeout, 500ms acquisition limit and a 6-second response budget per source. A source failure returns a safe unavailable state while preserving the other source. UI filters, refresh, per-source paging, loading, restricted, partial-failure, sparse-window and empty states are EN/FR. Stale responses are ignored. The component remounts when the server route’s tenant/actor/permission key changes. Reading or refreshing invokes no sender or recovery mutation.

## Verification and remaining gates

Follow-up during UX10/UX11: a populated audit-browser check exposed a raw Date tuple-boundary issue. The invitation adapter's equivalent raw-SQL cursor now compares the persisted event timestamp/id directly; its calendar filters use explicit timestamp casts. All 84 communications tests passed again and the final repository typecheck passed in session 89072. See `audit-explorer-source-hashes.json` for the updated service/test and shared-navigation hashes. This supersedes the earlier implementation hashes for those files; the original manifest is retained as historical evidence. Populated invitation pagination is still not browser-certified.

- 84 tests across 7 suites passed: service/action/component, route catalog, and existing statement worker, invitation worker and invitation history regressions. Initial two UI assertions incorrectly assumed no whitespace before a screen-reader-only colon; corrected the locator without changing tested behavior. Report writing required a narrowly approved sandbox escalation.
- Repository TypeScript passed (session 2708, exit 0). Scoped ESLint passed after final implementation edits; message catalogs received only the localized navigation label.
- Browser: supplied Super Admin account, Wilkinson - Feeney 001, localhost:3000. English and French views and All status filter returned ready empty sources. Thus populated rows, actual recovery links, restricted roles and database race behavior are not browser-certified.
- Responsive inspection requested 390×844, observed 433×938 CSS pixels with document width 433. No horizontal overflow was observed. Mobile screenshot capture repeatedly timed out in browser automation; a mislabeled desktop capture was removed rather than retained as mobile evidence. Override was reset explicitly; observed restored width 1371. A successful earlier desktop French screenshot is retained; it predates the final header/navigation translation, subsequently verified through DOM text.
- Remaining: populated/restricted-role disposable fixtures; real query plans and large-volume paging; source-recovery handoff and screen-reader checks; mobile screenshot; receipt adapter discovery; operator ownership and pilot. UX08/UX09 are not release-complete.

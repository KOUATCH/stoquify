# UX10/UX11 audit explorer execution

Implemented 4 October 2026 against HEAD `62a56036a5ac9b37236a20c9b148052199069479` plus the existing dirty workspace. The full 20-package roadmap remains active; these packages have not passed release or human acceptance gates.

## Source evidence and coverage decision

Reviewed `AuditLog`, `lib/security/audit-log.ts`, RBAC decision writers, member access/lifecycle/history services, item action/service boundaries and stock adjustment/reversal writers. Existing graphs were consulted as discovery aids, including `roles_role_auth_assertcanassignpermissions` (actions community 0); current source determines the actual contracts.

The initial supported event families are:

| Family | Source events | Permitted detail fields |
| --- | --- | --- |
| Member access | User / MEMBER_ACCESS_CHANGED, DEACTIVATE_USER | Controlled operation, bounded added/removed role counts, boolean before/after active state |
| Item permission decisions | SecurityEvent / PERMISSION_GRANTED, PERMISSION_DENIED, with resource Item, matching resourceId/entityId, and a closed inventory.items permission vocabulary | The reviewed permission identifier only |
| Item stock adjustments | StockAdjustment / REQUEST_MANUAL_ITEM_STOCK_ADJUSTMENT, POST_STOCK_ADJUSTMENT, REVERSE_STOCK_ADJUSTMENT | Controlled request mode/approval flag; controlled posted adjustment category; action metadata for reversals |

Item actions record permission decisions before writes. A permission approval is **not** proof that an edit succeeded. No item master-data mutation history was found in the inspected item service, so the UI explicitly says it does not cover those changes. Login events, invitations, other security/financial families and exports are outside this first projection. The implementation does not invent historical events or retrofit writes. Missing rows are not evidence of no activity, and the explorer makes no completeness, retention or tamper-resistance certification.

These allowlists are an engineering implementation proposal for D05. Privacy/domain acceptance and retention policy review remain open; source implementation is not their sign-off.

## Authority and privacy

The shared route requires `controls.audit.read`. Every action reloads the authenticated context. Within the repeatable-read transaction the service reloads the active, verified, unlocked reviewer and current organization-scoped role grants. Audit and source permissions must be present in both current context and stored grants. Member events additionally require `users.read`, settings observe-mode module access and a target member in the same tenant. Item decisions require `inventory.items.read`, enforced inventory read entitlement and a same-tenant item.

Stock changes additionally require `inventory.levels.read` and `dashboard.read`. The current stored administrator/super-user authority grants tenant-wide operating scope; other readers are restricted to active, undeleted locations they manage. SQL constrains adjustment, location and line-item tenant relationships before selecting an upper bound, resolving any cursor or reading a page. Actor IDs are shown/filterable only with member-read authority and a same-tenant actor; actor names/contact information are not selected. No unfiltered counts or entity lookups are exposed.

The SQL projection selects reviewed detail candidates rather than the full changes object; a second event-specific runtime allowlist discards malformed or unrelated values. Arbitrary reason text, role IDs/grant arrays, IPs, user agents, tokens, hashes, quantities, costs, ledger payloads and financial details never enter the DTO. Current item SKU and adjustment number are source-authorized display references, distinct from the stored event's entity ID.

Links lead to the existing member-access page, item overview or inventory loss-control workflow. The explorer does not grant edit/write/export permissions or execute recovery commands. Loss-control links open the existing worklist, not a fabricated adjustment-detail route.

## Pagination and database semantics

Reads are ordered by stored `(createdAt, id)` descending, limited to 25 events plus one lookahead. Date, actor, action, entity and family predicates are shared by upper-bound lookup, cursor lookup and page selection. A later page retains the original upper-bound event ID and resolves both IDs through current authority. Missing/revoked/foreign bounds produce a recoverable snapshot error, rather than silently restarting. Filter changes start a new bound; Snapshot start preserves it; New snapshot removes it.

The upper bound excludes events ordered after it; this is not a materialized frozen membership snapshot across requests. Backfilled records below the bound, historical removals and changing entity/role/location authority can change visible history. Each individual read is repeatable-read. Genuine concurrent-insert/backfill/retention fixtures still need the disposable database environment already requested from the user.

Authenticated testing found the original raw Date-parameter tuple comparison repeated page one. Replacing that comparison with subqueries selecting the persisted bound/cursor timestamps directly fixed the issue: the same test session returned 25 and then 18 records with zero overlap and an unchanged upper bound. This avoids driver/session timestamp conversion and precision loss at the boundary; the exact conversion mechanism was not separately isolated. UTC calendar filters use explicit timestamp casts. The equivalent raw-SQL invitation cursor in the delivery worklist received the same correction; its regression suite was rerun. ORM statement delivery pagination was not changed.

Queries have a 2-second statement timeout, 6-second transaction timeout and 500ms acquisition limit. These are safety bounds, not measured query-plan or latency certification. No schema/index migration or historical-data rewrite occurred.

## Verification

- `audit-explorer-jest.json`: 50 passing tests in 5 suites: audit service, action, component, settings route inventory and sidebar. Initial failures were a Date identity assertion and the new links' alphabetical ordering; both were fixed. Tests now assert database-native bound/cursor comparisons and the shared authorization predicates. Mocked SQL-shape tests do not establish actual database concurrency.
- `delivery-issues-jest.json`: 84 tests in 7 suites passed again after the invitation boundary correction.
- Final repository TypeScript: session 89072, exit 0, no diagnostics. Scoped ESLint and whitespace checks passed after final changes.
- Browser: supplied Super Admin account in Wilkinson - Feeney 001 at localhost:3000. Loaded existing stock-adjustment records, applied actor/date/action/entity filters to ADJ-20260927-0043, opened safe details with Enter, and verified English and French presentation. Corrected first/second pages had 25/18 rows, zero overlap and the same recorded upper bound. No stock, access, financial or messaging command was executed.
- Several navigation/screenshot calls had transient browser automation timeouts. The existing tab was reused. A French filtered-view screenshot was eventually saved as `audit-explorer-fr.jpg`; no audit mobile screenshot or screen-reader claim is made.

## Remaining acceptance work

Representative restricted-role and revoked-role browser scenarios; concurrent/backfilled/deleted-event database scenarios; bounded query plans at agreed volume; member-access incident reconstruction; source handoff task acceptance; mobile/screen-reader checks; D05 privacy/retention acceptance; named owners and measured pilot. No G2–G5 sign-off or full-roadmap completion is claimed.

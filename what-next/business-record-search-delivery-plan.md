# Business-record search delivery plan

Date: 2026-09-09. Status: planning complete; implementation and user validation pending.

## 1. Recommendation and evidence

Proceed with a small, feature-gated pilot of header search for customers, inventory items, and purchase orders. Treat reduced retrieval effort as a hypothesis. Current navigation search helps users reach modules, but searches page metadata rather than business records: [header destination construction](<E:/ohada saas/Focused projects/stoquify/components/dashboard/Navbar.tsx:146>) and [local matching and seven-result limit](<E:/ohada saas/Focused projects/stoquify/components/dashboard/Navbar.tsx:152>). Customer and item walkthroughs demonstrated a second, local lookup after navigation.

The three-type pilot has a prerequisite the earlier [value assessment](<E:/ohada saas/Focused projects/stoquify/what-next/ui-missing-capabilities-value-assessment.md:1>) did not establish: **there is no usable general read-only item detail route in the inspected route tree**. The item table exposes Copy ID, Edit Item, and Delete Item; the name is plain text. See [item name cell](<E:/ohada saas/Focused projects/stoquify/components/ui/groups/inventory/ItemManagement.tsx:214>) and [row actions](<E:/ohada saas/Focused projects/stoquify/components/ui/groups/inventory/ItemManagement.tsx:281>). The existing [edit page](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/items/[id]/edit/page.tsx:20>) requires update permission. Supplier and placeholder subpages do not meet the requested destination.

Recommendation: include a minimal read-only item detail page as an explicit prerequisite, using the existing item service and route-access conventions. Reuse the existing customer and purchase-order details. If delivery is constrained to existing routes only, an interim customer/PO pilot is possible, but it must be reported as two-type scope and cannot satisfy this plan's three-type completion gate.

Two further material findings determine the sequence:

- Customer detail requires both customers.read and customers.analytics.read; customer list permission alone is insufficient. Do not grant analytics permission to make search work. [customer detail access contract](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/customers/customers-route-data-access.ts:54>)
- Purchase-order listing does not implement bounded search. It loads non-deleted organization orders with rich relations; the action accepts a filters argument without applying it. Create a bounded query instead of using that list endpoint in the header. [PO list query](<E:/ohada saas/Focused projects/stoquify/services/purchase-order/purchase-order.service.ts:483>); [list action](<E:/ohada saas/Focused projects/stoquify/actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts:122>)

Expected value is fewer navigation and selection steps, easier record disambiguation, and access to useful records without loading a full management dashboard. No productivity gain, ROI, response-time budget, or release readiness has been established.

## 2. Inspected scope and limits

Source baseline: HEAD a05a41ef66cd5d98fd69ae3df18225795f912232 plus the current, extensively dirty working tree. Existing modifications and untracked work are outside this run. Source references describe inspected working-tree contents, not a clean release. The running localhost application was not independently tied to this exact revision.

Inspected header/sidebar filtering, customer and item management screens, purchase-order list/detail flows, relevant hooks/actions/services, Prisma models, route-access catalogs, RBAC, module entitlement, POS customer visibility, operating-access scope, role seeds, and focused test/configuration files. Role definitions are seed intent, not proof of the permissions in every deployed session.

Graph-assisted discovery used [component graph](<E:/ohada saas/Focused projects/stoquify/graphify-out/graph_components.json:1>) node dashboard_navbar_tsx (community 77) and purchase_orders_modernpurchaseorderdetailpage_tsx (135); [app graph](<E:/ohada saas/Focused projects/stoquify/graphify-out/graph_app.json:1>) customers_page_customerspage (89) and id_page_customeranalyticspage (91); [hook graph](<E:/ohada saas/Focused projects/stoquify/graphify-out/graph_hooks.json:1>) usecustomermanagement_ts (18), hooks_userecentpurchaseorderqueries_usepurchaseorders and usepurchaseorderbyid (0), and hooks_useallitemqueries_useupdateitemdetails (4). The action graph was also searched. These older graph records guided discovery; current imports and route/action source establish the relationships used here.

Relevant historical reports inspected:

- [shell navigation report](<E:/ohada saas/Focused projects/stoquify/what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_02_SHELL_NAVIGATION_REPORT_2026-09-08.md:1>): preserve permission/module filtering and selected navigation behavior.
- [item table report](<E:/ohada saas/Focused projects/stoquify/what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_06_INVENTORY_ITEMS_TABLE_NORMALIZATION_REPORT_2026-08-28.md:1>) and [PO table report](<E:/ohada saas/Focused projects/stoquify/what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_06_PURCHASE_ORDERS_TABLE_NORMALIZATION_REPORT_2026-08-28.md:1>): existing table and URL-state conventions.
- [PO module ownership follow-up](<E:/ohada saas/Focused projects/stoquify/what-next/module-surface-inventory-purchase-order-read-model-ownership-follow-up-2026-07-20.md:1>): purchasing ownership does not itself prove runtime enforcement.
- [route-state rerun note](<E:/ohada saas/Focused projects/stoquify/innovation/DAILY_DIGEST_ROUTE_STATE_RERUN_NOTE_2026-06-26.md:1>): historical context only, not evidence that search states pass now.

Browser evidence is an agent-assisted, read-only walkthrough of one existing English desktop SUPER ADMIN session on localhost, organization RG_001. It is neither real-user research nor an automated performance benchmark. No data was edited, no participants contacted, and no role switching, mobile, French, screen-reader, or adverse-access browser matrix was completed. A customer exact-code retrieval reached the correct profile; an ambiguous customer query and exact item query were observed. Purchase-order inspection initially reached a loading screen. See the observation addendum below for the final outcome.

Permanent review lenses and their concrete contributions: architecture/backend—bounded domain reads and destination reuse; database—minimal projections and query plans; IAM/privacy—scope before queries and protected destinations; frontend—existing shell/design system; workflow/accessibility/localization—selection, focus and EN/FR states; product—paired retrieval measurements; quality/release—negative cases and rollback; SRE—timeouts and aggregate diagnostics; packaging/customer success—current module entitlements and a limited cohort. Finance/internal controls apply only to keeping existing record authority and financial details out of snippets. Statutory/country-pack changes, accounting posting, provider integration, offline synchronization, billing changes, and AI/agent execution are not applicable: this pilot performs authorized online reads and navigation. No certification is asserted.

## 3. Baseline tasks, observations, and measurement protocol

Relevant defined roles include Super Admin/admin, Sales Manager, Inventory Manager, Purchaser, Branch Manager, and Cashier/POS User. See [admin roles](<E:/ohada saas/Focused projects/stoquify/prisma/comprehensive-seed.ts:501>), [branch role](<E:/ohada saas/Focused projects/stoquify/prisma/comprehensive-seed.ts:522>), [inventory and sales roles](<E:/ohada saas/Focused projects/stoquify/prisma/comprehensive-seed.ts:551>), and [cashier and purchaser roles](<E:/ohada saas/Focused projects/stoquify/prisma/comprehensive-seed.ts:593>). Check expanded runtime permissions for each participant; a title is not authority.

| ID | Retrieval task and disambiguation | Current workflow and correct destination | Evidence now |
|---|---|---|---|
| C1 | Exact customer code RDS001-CUS-001; confirm Betsy Jakubowski 001 | From dashboard: header query Customers → choose page → local code search → row actions → View analytics → /en/dashboard/customers/rds_org_001_customer_001 | Completed agent walkthrough. One filtered row and correct usable profile observed. Five logical actions on this route; no valid user timing. |
| C2 | Name fragment Ku; select Gus Kunde 009 by customer code RDS001-CUS-009 among similar matches | Same list path; distinguish code before opening profile | Local search returned three rows including Betsy Jakubowski, Clay Kulas and Gus Kunde. Full second detail retrieval was not timed or completed. |
| I1 | Exact SKU RDS001-SKU-011; confirm A4 printer paper, 500 sheets | Header Items → item list → local search → inspect row; requested read-only detail endpoint currently absent | Correct one-row result observed and q URL updated. Row menu contained Copy ID, Edit Item, Delete Item. End-to-end requested task is blocked by missing destination, not counted as success. |
| I2 | Name fragment flour; distinguish Wheat flour from Yellow maize flour using SKU | Item list → clear filters → search → identify correct row; detail depends on BRS-03 | Both names appeared in available UI, but combined filtering was not exercised. Proposed scenario; verify both records are eligible before timing. |
| P1 | Exact reference RDS001-PO-001; confirm Mungo Beverage Distribution | Existing dashboard purchase-order shortcut or permitted navigation → PO list → local order-number search → existing detail | After loading, the list showed 12 orders. Exact search returned the one matching row and updated the q URL. The row exposed /en/dashboard/purchase-orders/rds_org_001_purchase_order_001. Detail completion and end-to-end timing were not established. |
| P2 | Supplier-name fragment Distribution; select Maison Propre Distribution order RDS001-PO-004 by reference/status | Same PO list; distinguish Mungo Beverage Distribution, Maison Propre Distribution and Douala General Distribution → choose the intended detail | Local search returned three rows with references RDS001-PO-001, RDS001-PO-004 and RDS001-PO-008. The target detail URL was reached after a direct-navigation follow-up, but usable detail content could not be verified after browser inspection became unavailable. Do not count this as completed retrieval. |

Customer local matching includes additional contact/address/tax fields; the pilot deliberately offers a smaller, safer query vocabulary. [customer local filter](<E:/ohada saas/Focused projects/stoquify/components/customers/CustomerManagementDashboard.tsx:700>). Inventory has both local and URL-driven filtering; do not assume every visible local match field maps identically to server search. [item filter](<E:/ohada saas/Focused projects/stoquify/components/ui/groups/inventory/ItemManagement.tsx:167>). PO local matching covers reference, supplier, location, status and total after loading orders. [PO local filter](<E:/ohada saas/Focused projects/stoquify/components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx:181>).

One diagnostic timer recorded 110 seconds from filling the customer list search to the final profile check. It excluded initial navigation and included tool, model and analysis delays. Exclude it from task-completion and service-latency datasets. No real-user completion times have been measured.

Reproducible baseline protocol for BRS-01:

1. Product and QA freeze six task cards with an existing expected record ID/reference, authorized test actor, organization, module state, data snapshot/revision, locale and device. Confirm duplicates or similar matches without exposing private contact or financial details. If suitable data is absent, mark the scenario unavailable; use isolated test fixtures later for correctness, separately from user evidence.
2. Observe willing users performing normal retrieval, without contacting anyone during this planning run. Capture role and effective permissions, not credentials. Include the actual roles intended for any later expansion. The initial admin cohort cannot establish frontline or branch-worker value.
3. Start timing when the task instruction is presented from the same dashboard starting state; stop when the correct detail is usable and the participant confirms its reference. Record attempts, wrong selections, assistance, completion/failure reason and elapsed seconds. Do not turn inability to reach an item detail into an artificial time.
4. Record warm/cold application and data-cache conditions, environment, network, device, task order and participant count. Use equivalent task variants and counterbalance order across before/after sessions to reduce learning effects. One participant or six trials yields an indicative case study, not a population-level claim.
5. Preserve the original item baseline as blocked. After the read-only item page exists, measure a separate list-to-detail control before introducing header search. This distinguishes the benefit of a new destination from the benefit of search.
6. Measure server search and request-to-results latency separately using request instrumentation. Establish latency and improvement targets only after representative baseline measurements and query-plan inspection. Pre-register those targets before the comparison phase.

Measurement row: participant pseudonym | role/verified scope | task/variant | before/after | revision/data/environment | locale/device | warm/cold | start/end/elapsed | correct record | wrong selections | assistance | failure reason. Store participant research in an approved location during the later run; this plan contains no invented results.

## 4. Pilot scope and decisions

The first functional release contains all three types, with read-only item detail as a prerequisite. Existing page results stay in their own Pages group. Record groups are Customers, Items and Purchase orders. No editing, exports, bulk operations, payroll/HR, payment detail, AI/fuzzy search, external search service or indexing pipeline is included.

**Initial cohort:** server-configured pilot organizations and named actors, restricted to verified tenant-wide administrators using the existing admin/super_admin role codes or authoritative super-user context, plus each domain's required permissions. An allowlist enables the feature; it never grants data authority. Do not infer tenant-wide scope merely from Sales Manager, Purchaser or Branch Manager titles. These operational roles remain research candidates and require a separate verified scope decision before rollout to them. This conservative cohort permits a concrete three-type pilot without pretending that branch isolation is already implemented.

| Domain | Query fields | Minimal result and retention decision | Destination |
|---|---|---|---|
| Customer | code, name | type, id, name, code, active/inactive badge. Include non-deleted active and inactive customers; inactive is retained history, not permission to transact. No contact, credit, balance or tax data. | Existing localized /dashboard/customers/[id], only when both read and analytics permissions apply |
| Item | sku, barcode, nameEn, nameFr | type, id, localized name with other-language fallback, SKU; active records only to match the main item list. No prices, valuation, stock or supplier data. Use short stable ID suffix only when SKU is absent or duplicated. | Proposed localized /dashboard/inventory/items/[id], after BRS-03 |
| Purchase order | orderNumber, supplier.name | type, id, orderNumber, permitted supplier display name and status. Include all non-deleted statuses, including cancelled/completed. Suppress supplier name if its related record is deleted or not permitted; exact PO lookup still works. No amount, line details or payment data. | Existing localized /dashboard/purchase-orders/[id] |

No location label is needed in the initial minimal snippets. Item SKU/customer code/PO reference provide disambiguation. If product research later demonstrates a location label is necessary, add it only with a verified relation-level read policy. For the initial PO projection, purchases.orders.read authorizes the contextual supplier display name already exposed on the PO workflow; it does not authorize a separate supplier-search domain or supplier private fields. A deleted related supplier contributes neither a display name nor a supplier-name match.

Query defaults are proposed functional choices, not measured performance targets: trim surrounding whitespace; accept 2–80 Unicode characters; reject oversized/invalid input without silent truncation; case-insensitive literal matching with database-compatible behavior. Preserve accents and punctuation; accent folding, transliteration, typo tolerance and tokenized full-text matching are outside this pilot. Test French names with accents and composed text explicitly; do not promise normalization that the stored data/query cannot support.

Rank within each domain: exact identifier, exact display name, prefix match, then contains match; tie-break by display reference/name and stable ID. Never rank by financial value or frequency of access. Return at most five records per domain and the existing maximum seven page destinations; do not return total counts, hidden-domain counts, suggestions from inaccessible records or a global relevance score.

## 5. Existing versus missing capability matrix

| Domain | Reusable source/query and current route | Permissions/module | Current scope and deletion evidence | Missing work |
|---|---|---|---|---|
| Customers | [listCustomers](<E:/ohada saas/Focused projects/stoquify/services/customer/customer.service.ts:201>) has pagination and name/email/phone/code predicates; [getCustomerById](<E:/ohada saas/Focused projects/stoquify/services/customer/customer.service.ts:232>) is org-scoped. [profile route](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/customers/[id]/page.tsx:21>) exists. Management aggregates at line 716 are too broad for header search. | Detail: customers.read AND customers.analytics.read; canonical sales. [management read guard](<E:/ohada saas/Focused projects/stoquify/actions/customers/customer-management-actions.ts:75>) and [analytics guard](<E:/ohada saas/Focused projects/stoquify/actions/customers/customer-management-actions.ts:123>) enforce sales. | General customer reads scope by organization and deletedAt, not CustomerLocation. [CustomerLocation](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:1186>) exists; [POS visibility](<E:/ohada saas/Focused projects/stoquify/services/pos/pos-customer.service.ts:16>) applies assignment-or-unassigned semantics within POS. Do not copy or bypass it for branch users. | Minimal projection and bounded ranking, shared detail-equivalent access decision, proof of inactive policy. Reuse predicate logic, not full customer DTO or dashboard aggregates. |
| Items | [listItems](<E:/ohada saas/Focused projects/stoquify/services/item/item.service.ts:518>) and [list predicate](<E:/ohada saas/Focused projects/stoquify/services/item/item.service.ts:430>) support bounded fields; [getItem](<E:/ohada saas/Focused projects/stoquify/services/item/item.service.ts:611>) provides org-scoped detail data. [list action](<E:/ohada saas/Focused projects/stoquify/actions/item/items.ts:118>) exists. Main [item list route](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/items/page.tsx:122>) exists; general detail does not. | inventory.items.read; canonical inventory. Editor separately requires update and enforced inventory/write. List/read actions inspected do not establish an enforced inventory/read guard. | org/deletedAt filters. [inventory-level list](<E:/ohada saas/Focused projects/stoquify/services/item/item.service.ts:905>) selects active items; its optional location filters nested stock data, not catalog authority. Never use nested stock filtering as a record-access guarantee. | New minimal read-only detail route, enforced read access shared with search, projected bounded query; no use of unbounded inventory-level list. |
| Purchase orders | [listPurchaseOrders](<E:/ohada saas/Focused projects/stoquify/services/purchase-order/purchase-order.service.ts:483>) is unbounded; [getPurchaseOrderById](<E:/ohada saas/Focused projects/stoquify/services/purchase-order/purchase-order.service.ts:507>) can resolve an org-owned detail. [detail route](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchase-orders/[id]/page.tsx:17>) exists. | purchases.orders.read; canonical purchasing. [detail catalog](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchase-orders/purchase-orders-route-data-access.ts:54>) declares module; [route wrapper](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/purchase-orders/purchase-orders-route-access.tsx:111>) defaults to observe. | org/deletedAt; no general read location predicate found. Action's by-location helper filters a fetched list; that is not authorization. Supplier relation and historical status require explicit minimal projection. | New bounded query; explicit purchasing/read enforcement at search and the destination read path, with guard regression tests. Do not mistake capability projection for read authorization. |

Shared foundations: [fresh server context](<E:/ohada saas/Focused projects/stoquify/lib/security/rbac.ts:88>) derives actor/organization and expanded authority; [requirePermission](<E:/ohada saas/Focused projects/stoquify/lib/security/rbac.ts:253>) checks permissions, but resource IDs used for audit are not automatically a database ownership or location predicate. [entitlement evaluation](<E:/ohada saas/Focused projects/stoquify/services/modules/module-entitlement.service.ts:93>) deliberately allows observe mode; [module access evaluation](<E:/ohada saas/Focused projects/stoquify/services/modules/module-entitlement.service.ts:147>) must be called with enforce for the pilot's read decisions.

The existing [operating scope contract](<E:/ohada saas/Focused projects/stoquify/services/operating-access/operating-access-scope-contracts.ts:24>) is specific to operating-dashboard responsibility and must not become a universal search policy by accident. For the proposed admin-only cohort, the explicit record scope is the active organization. A location-filtered dashboard view does not silently change global catalog scope. Label the search context as the organization. Scoped/POS-only actors are excluded server-side until identical scope predicates protect both search and detail.

Index decision: start with existing organization/reference indexes and bounded database queries; inspect representative EXPLAIN plans in an isolated test environment after BRS-04. A result cap bounds returned rows, not scan cost. Add an index only if plans and observed latency show a need, with a separately reviewed migration task. No schema change is justified by this planning run.

## 6. Proposed server contract and UI state model

All paths described as new below are implementation targets, not existing capabilities.

Server entry: new actions/search/business-record-search.actions.ts accepting { query, locale }, returning a typed result from new services/search/business-record-search.contracts.ts. Supported locale is en or fr. Clients cannot submit organization, actor, permissions, allowed domains, location scope or result limits.

Resolve fresh server identity, pilot eligibility and per-domain detail authority before domain queries. Missing permission or disabled module means that domain is not queried and is omitted from the payload. A failure to establish identity, scope or module authority fails closed. Do not convert authorization uncertainty into a successful empty query.

Proposed response:

```ts
type SearchDomain = "customer" | "item" | "purchaseOrder";
type SearchRow = {
  type: SearchDomain;
  id: string;
  label: string;
  reference: string | null;
  status?: string;
  href: string; // generated from a fixed, locale-aware route map
};
type SearchResponse =
  | { state: "ready"; requestId: string;
      groups: Array<
        { domain: SearchDomain; state: "ready"; rows: SearchRow[] } |
        { domain: SearchDomain; state: "unavailable" }
      > }
  | { state: "invalidQuery" | "unavailable"; requestId: string };
```

A ready group with no rows is an authorized empty result. Omitted groups have no count or explanation about inaccessible records. A wholly unauthorized actor gets the existing navigation experience with no record data. Do not return raw exception messages, organization IDs, grant details, SQL or query text. Status values use typed domain enums mapped to localized labels during implementation.

New services/customer/customer-search.service.ts, services/item/item-search.service.ts and services/purchase-order/purchase-order-search.service.ts own their query/projection. New services/search/business-record-search.service.ts orchestrates them using new business-record-search-access.ts and business-record-search-pilot.ts. Existing protected-action and error conventions remain authoritative; do not establish a parallel authentication system.

Use the existing Prisma/database layer. Implement ranked selection with bounded, disjoint exact/prefix/contains tiers, each scoped before matching, filling at most five slots and excluding previously selected IDs. No full-list fetch followed by client filtering. Match related supplier names only through permitted non-deleted relations. Parameterize query values and ensure wildcard characters remain literal, with percent/underscore tests.

Authorized domain reads may run concurrently. Catch a domain's query failure and return unavailable for that already-authorized group while retaining other successful groups. Global authentication/scope failure discards every group. Apply the existing database/request timeout facility; if it cannot bound these reads, make selecting and testing a supported database timeout mechanism a BRS-04 prerequisite. Choose the operational timeout from measured latency and hosting limits before pilot enablement; no arbitrary budget is asserted here. A Promise race alone does not cancel a database query.

New hooks/useBusinessRecordSearch.ts debounces typing (proposed initial 200 ms), tracks a monotonically increasing request generation, and accepts only results for the current query, locale and access context. Server-action requests cannot be assumed cancellable; ignore superseded responses and prevent them from populating caches. Do not retry on every render. Offer one explicit retry for the current query; every retry reevaluates authority.

Use component-lifetime memory only, with no persisted or shared result cache and no search-term URL parameter for the header. Query identity includes current organization, user, locale and known access revision; never reuse a result after those change. [shell permissions](<E:/ohada saas/Focused projects/stoquify/components/dashboard/useShellPermissions.ts:1>) come from session data, so they cannot prove immediate remote revocation. Clear on known organization/user/permission/module changes, sign-out, close, and navigation; revalidate on opening/focus. Server search and detail checks reject subsequent reads after revocation. Instant removal of already-rendered bytes after an unannounced remote change is not a guarantee; document and test the bounded refresh behavior.

Keep telemetry to request correlation, domain outcome, coarse result-size bucket if needed, duration and failure category. No raw search terms, names, record IDs, result URLs or financial values in routine telemetry. Use existing server logging/error redaction conventions.

| UI state/action | Required behavior |
|---|---|
| Entry | Preserve the desktop header design. The current input is lg-only ([desktop search container](<E:/ohada saas/Focused projects/stoquify/components/dashboard/Navbar.tsx:305>)); add a compact mobile search button opening an existing Sheet-based interaction, with accessible title, description and close button. Sidebar navigation remains available. |
| Idle/short query | Page search continues with its existing rules. No business-record query for fewer than two characters. Localized helper explains the minimum; no fake zero-results count. |
| Typing/loading | Pages appear immediately. Record groups show loading until current authorized response resolves. Clear earlier record rows immediately when the query changes. Do not let Enter open a stale row. |
| Results | Separate Pages and record-type groups; name/reference/status are readable without relying on color. Cap and scroll the result panel within the viewport. No automatic selection jump when asynchronous records arrive. |
| Keyboard | One combobox/listbox pattern with stable option IDs; Up/Down traverse selectable entries, Enter opens the active current entry, Escape closes and returns focus, Tab follows predictable focus order. Group labels and retry buttons are not selectable record options. Preserve the current first-page Enter shortcut when no option is explicitly selected. |
| Announcements | Polite live-region updates announce current authorized displayed results/loading or failure, without inaccessible-domain counts. Result arrival does not steal input focus. Manually test with a screen reader. |
| Empty/invalid | Distinguish an authorized no-match state from invalid length and from unavailable data. Keep permitted page results usable. |
| Partial/network/timeout | Display a localized unavailable message and retry for authorized failed groups; retain current successful groups. Authentication failure clears all record data. Do not relabel failures as no matches. |
| Select/navigation | Use fixed localized targets and existing detail workflows. Close and clear header state; transfer focus through the normal route convention to the detail heading. New item view is read-only. |
| Access changed/deleted record | Destination rechecks identity, module, permissions and record ownership/deletion. Use existing safe denied/not-found recovery with a way back. Do not reveal whether a forbidden ID exists or open an editor as fallback. |
| EN/FR/mobile | Search both item-name fields, display locale-appropriate labels; preserve locale in URLs. Use [dashboard shared copy](<E:/ohada saas/Focused projects/stoquify/lib/dashboard/presentation.ts:5>) and its EN/FR resources. Verify narrow viewport, zoom, touch, long French labels, scrolling and both themes. |

## 7. Dependency-ordered implementation tasks

Effort is relative: S = a focused change, M = several connected files and checks, L = cross-layer verification or research. These are not estimates in days. Existing files are linked above; paths marked new do not exist yet. Task records and evidence can be appended to this plan during the subsequent authorized run.

| Task | Outcome | Affected files/services | Discipline | Dependencies | Effort | Acceptance evidence | Completion condition |
|---|---|---|---|---|---|---|---|
| BRS-01 | Freeze task cards, cohort and baseline; identify unavailable fixtures | This plan; existing six workflows and effective role/module checks | Product, UX research, QA | None; can run alongside BRS-02 | M | A01, A02, A16; observation sheets with sample/environment/limits | Six scenarios assigned real eligible references or explicit unavailable reasons; original and item-control baselines distinguished; comparison targets fixed after measurement |
| BRS-02 | Implement and test server-owned access/contract definitions and default-off pilot gate | New services/search/business-record-search.contracts.ts, business-record-search-access.ts, business-record-search-pilot.ts; existing RBAC/module APIs | Backend, IAM, architecture | None; first code task | M | A03–A08, A15; negative unit tests for authority before query | Cohort, required detail permissions, enforced module decisions, projections and fixed route mapping are executable contracts; unknown authority denies |
| BRS-03 | Make all result destinations usable and guarded | New app/[locale]/(dashboard)/dashboard/inventory/items/[id]/page.tsx; inventory-route-data-access.ts; minimal new components/dashboard/ItemRecordDetail.tsx; existing customer and PO detail route/read action guards | Frontend, domain backend, IAM | BRS-02 | M | A02–A07; route tests and read-only item navigation | Item identity view exists with no editor dependency; customer/PO read paths enforce detail-equivalent module/permission checks; scoped IDs denied |
| BRS-04 | Add bounded minimal domain queries and assess cost/timeout | Three new domain search services listed in section 6; reuse current customer/item/PO services and Prisma models | Backend, database, SRE | BRS-02; independent of BRS-03 UI | M | A01, A04, A06, A07, A10, A15; predicate/projection/ranking tests and representative query plans | At most five rows/domain; all predicates server-side; no full lists/aggregate DTOs; documented supported timeout and scan-cost result |
| BRS-05 | Add protected aggregate action and stale-safe client hook | New services/search/business-record-search.service.ts; actions/search/business-record-search.actions.ts; hooks/useBusinessRecordSearch.ts | Backend, frontend, privacy | BRS-02, BRS-04 | M | A03–A10, A15; partial failure, identity failure, out-of-order and invalidation tests | Every request/retry checks current authority; unauthorized services are never invoked; old responses cannot render |
| BRS-06 | Integrate desktop/mobile interactions and EN/FR copy | New components/dashboard/BusinessRecordSearch.tsx; components/dashboard/Navbar.tsx; messages/dashboard-shared/en.json and fr.json | Frontend/design system, accessibility/localization | BRS-03, BRS-05 | M | A02, A08–A14; component tests plus browser evidence | All defined states operate by mouse, touch and keyboard; existing page and sidebar search remain intact |
| BRS-07 | Assemble focused regression and browser harness | New tests and dedicated Playwright config named below; existing focused suites | QA, IAM, release engineering | Test design starts after BRS-02; final run waits for BRS-03–BRS-06 | L | A01–A15; test output, role/tenant/module matrix, screen-reader notes | Every acceptance row has evidence or an explicit release-blocking failure; no skipped negative test counted as passed |
| BRS-08 | Run admin-cohort pilot and paired comparison | Existing test deployment; this plan's measurement register; server pilot configuration | Product, customer success, QA, SRE | BRS-01, BRS-07; applicable release process | M | A16 and A15; before/after dataset, latency and failure distribution | Report actual sample, correctness, assistance and time change; retain limitations and separate item destination benefit |
| BRS-09 | Decide continuation and verify rollback | Server pilot configuration; release runbook section in this plan | Product, release owner, security/SRE | BRS-08; rollback drill can run with BRS-07 | S | A14–A16; off-switch evidence and disposition | Default navigation restored on disable; decision recorded: improve search, expand verified cohort/types, or assess exception inbox |

Critical path for code: BRS-02 → BRS-04 → BRS-05 → BRS-06 → BRS-07. BRS-03 runs after BRS-02 and must join before BRS-06. BRS-01 can proceed independently and must finish before BRS-08. Do not widen BRS-03 into platform-wide module enforcement: close only the search destinations and data reads that this pilot relies on, documenting any incompatible existing policy as a specific blocker.

## 8. Acceptance matrix and verification commands

| Criterion | Pass evidence | Owning tasks |
|---|---|---|
| A01 Exact and ambiguous matching | Exact identifiers rank before name/prefix/contains; repeated queries have stable order; same-name records distinguished by safe reference; EN/FR item names covered; five-row cap enforced; literal wildcard tests | BRS-01, BRS-04, BRS-07 |
| A02 Correct destinations | All three types open correct readable records and preserve locale; read-only item actor needs no update permission; item-control baseline measured separately | BRS-01, BRS-03, BRS-06, BRS-07 |
| A03 Permission parity | Customer read-only actor without analytics gets no customer record query/results; missing each domain permission denies; direct action/detail calls enforce the same decision | BRS-02, BRS-03, BRS-05, BRS-07 |
| A04 Tenant and location scope | Fixtures in two organizations with matching references never cross; foreign-ID detail denied; branch/POS-only and non-allowlisted actors receive no record search. No claim of branch-scoped rollout until shared predicates exist | BRS-02–BRS-05, BRS-07 |
| A05 Modules | Enabled read entitlement works; disabled/not-entitled/unknown authority produces no record data; search and direct destination read enforce it. Observe-mode audit alone does not pass | BRS-02, BRS-03, BRS-05, BRS-07 |
| A06 Retention | Deleted records excluded in queries and detail; inactive customers retained with badge; inactive items excluded; non-deleted final-status POs retained; deleted supplier name suppressed and unsearchable | BRS-03, BRS-04, BRS-07 |
| A07 Minimal disclosure | Payload/snapshots contain only allowed fields; no unauthorized domain calls/counts/snippets/suggestions/error detail; no item financial data or customer contact/credit data | BRS-02–BRS-05, BRS-07 |
| A08 Authority and cache change | Switch organization/user, sign out, change known grants/modules, close/reopen; previous rows disappear; fresh request uses new scope. Remote revocation blocks next server read/detail; already-displayed data limitation documented | BRS-02, BRS-05–BRS-07 |
| A09 Race/invalid input | Rapid typing and out-of-order responses cannot replace newer rows; old Enter target unavailable; empty/short/oversized inputs do not perform domain queries | BRS-05–BRS-07 |
| A10 Failure/retry | Authorized-domain failure leaves other current groups usable; timeout really bounds DB work via supported mechanism; retry is explicit/current; authentication failure clears everything | BRS-04–BRS-07 |
| A11 Keyboard and focus | Open, type, arrows, Enter, Escape, Tab and return focus verified; no trap or surprise activation; navigation lands on correct heading | BRS-06, BRS-07 |
| A12 Announcements and readability | Screen-reader manual walkthrough records accessible labels, grouped results, polite announcements and error recovery; automated component checks supplement it | BRS-06, BRS-07 |
| A13 Localization/responsiveness | EN/FR text and routes, long labels, touch, mobile sheet, viewport overflow and zoom verified; no layout reliance on color | BRS-06, BRS-07 |
| A14 Navigation regression | Existing module/action page matches and first-page Enter continue; permission/module filtering, selected sidebar state, collapsed groups and navigation-only behavior with pilot off remain correct | BRS-06, BRS-07, BRS-09 |
| A15 Operational release checks | Query plans, configured DB/request timeout, request-size/result limits and no-raw-term logging verified; off switch denies server search and clears UI on refresh; no new migration without evidence | BRS-02, BRS-04, BRS-05, BRS-07–BRS-09 |
| A16 Measured value and decision | Same/equivalent tasks, scope/data/environment; actual participant/trial count and warm/cold/learning limits; time, correctness, wrong choices and assistance reported; decision tied to results | BRS-01, BRS-08, BRS-09 |

Commands actually used in this planning run: git status --short, git rev-parse HEAD, rg --files, focused rg -n searches, Get-Content reads, Test-Path, and JSON graph inspection. Findings are recorded above. One discovery query addressed a nonexistent lib/permissions directory; discovery was corrected to the actual lib/permissions.ts file. Browser navigation timeouts and detached UI nodes were handled as tool/route-state limitations, not benchmark measurements. No build, test suite, database migration, seed or deployment was run. Final report validation checks file existence, source-link paths/line bounds and task-to-acceptance coverage.

The repository defines Jest, typecheck and Playwright scripts in [package scripts](<E:/ohada saas/Focused projects/stoquify/package.json:24>), with Jest configuration in [Jest config](<E:/ohada saas/Focused projects/stoquify/jest.config.ts:1>). Existing [default Playwright projects](<E:/ohada saas/Focused projects/stoquify/playwright.config.ts:1>) use explicit matching and authentication setup; they do not automatically pick up a new search spec. [customer config](<E:/ohada saas/Focused projects/stoquify/playwright.customer.config.ts:1>) and [inventory config](<E:/ohada saas/Focused projects/stoquify/playwright.inventory-items.config.ts:1>) have fixture setup/cleanup, so do not run them wholesale against the current user session.

**Future commands, after their named tests exist.** BRS-02/04/05/06/07 create:

- services/search/__tests__/business-record-search-access.test.ts
- services/search/__tests__/business-record-search.service.test.ts
- services/customer/__tests__/customer-search.service.test.ts
- services/item/__tests__/item-search.service.test.ts
- services/purchase-order/__tests__/purchase-order-search.service.test.ts
- hooks/__tests__/useBusinessRecordSearch.test.tsx
- components/dashboard/__tests__/BusinessRecordSearch.test.tsx
- app/[locale]/(dashboard)/dashboard/inventory/__tests__/item-record-detail.test.tsx
- app/[locale]/(dashboard)/dashboard/purchase-orders/__tests__/search-detail-access.test.tsx

Execute focused tests in PowerShell from the workspace:

```powershell
npm test -- --runInBand --runTestsByPath 'services/search/__tests__/business-record-search-access.test.ts' 'services/search/__tests__/business-record-search.service.test.ts' 'services/customer/__tests__/customer-search.service.test.ts' 'services/item/__tests__/item-search.service.test.ts' 'services/purchase-order/__tests__/purchase-order-search.service.test.ts'
npm test -- --runInBand --runTestsByPath 'hooks/__tests__/useBusinessRecordSearch.test.tsx' 'components/dashboard/__tests__/BusinessRecordSearch.test.tsx' 'app/[locale]/(dashboard)/dashboard/inventory/__tests__/item-record-detail.test.tsx' 'app/[locale]/(dashboard)/dashboard/purchase-orders/__tests__/search-detail-access.test.tsx'
npm test -- --runInBand --runTestsByPath 'components/dashboard/__tests__/Sidebar-current.test.tsx' 'components/dashboard/__tests__/dashboard-localization.test.tsx' 'config/__tests__/sidebar.test.ts' 'app/[locale]/(dashboard)/dashboard/customers/__tests__/pages.test.tsx' 'app/[locale]/(dashboard)/dashboard/customers/__tests__/route-audit.test.ts' 'hooks/__tests__/useRecentPurchaseOrderQueries.boundary.test.tsx' 'actions/purchaseOrderWorkflow/__tests__/purchaseOrderSystemAction.test.ts'
npm run typecheck
```

BRS-07 creates tests/e2e/business-record-search.spec.ts and playwright.business-record-search.config.ts, with an explicit business-record-search project and testMatch for that spec. Use a controlled local test environment and existing approved fixtures for two tenants, eligible admin readers, denied actors, disabled modules, duplicates and retained/deleted records. Never reuse a broad payroll setup or mutate live user records to force a passing matrix. Fixture setup needed later must be isolated and documented. Verify which data and auth states exist before running:

```powershell
npm run test:e2e -- --config playwright.business-record-search.config.ts --project business-record-search
```

Browser evidence must include actual DB/action integration for isolation and routing; mocks alone cannot establish tenant safety. If the existing dirty baseline breaks typecheck or tests, report exact failures and distinguish pre-existing failures from changes; do not fix unrelated code. Accessibility manual evidence and user measurements remain separate from command success.

## 9. Post-implementation comparison and rollback

Enable only the configured pilot cohort after A01–A15 have evidence and BRS-01 has established the usable baseline. Customer/PO before/after tasks use equivalent records and the same authorized destination. For items, compare header search against the new list-to-read-only-detail control, while retaining the original missing-destination finding.

Report paired completion-time changes by task and participant, correct-record completion, wrong selections and assistance, with raw trial counts and ranges. Use medians only where the sample supports them and report failures separately; do not hide failures by timing successful trials alone. Search latency is a separate distribution and includes warm/cold conditions. No percentage or ROI target is specified before measurements exist. Limited admin results cannot justify broad rollout to branch workers.

Release success requires correct authorized retrieval and a demonstrated reduction in meaningful task effort against the pre-registered target without worse correctness or assistance. An inconclusive sample means collect more evidence, not automatic expansion.

Rollback is the server-owned pilot off switch plus removal of header record groups on refreshed access state. It restores existing navigation search without deleting records or reverting unrelated work. The new read-only item route can remain independently guarded; there is no data migration to reverse. Any rollback of newly enforced destination guards must preserve access safety and follow the normal release policy; never restore a permissive guard merely to keep an inaccessible link working. During the rollback drill, stale in-flight search responses cannot repopulate the cleared header.

Stop cohort expansion for any cross-scope disclosure, authorization inconsistency or unresolved query-cost regression. Treat ordinary measured latency/UX issues according to observed severity. Routine metrics contain no raw search text.

Decision after BRS-08: if retrieval improves and correctness/access criteria hold, consider extending the verified cohort before adding more record types. If navigation remains slow, improve this slice first. If lookup value is weak or retrieval is solved but missed actions dominate observed work, validate the delivery-exception inbox using concrete cases and its own baseline. Search results do not by themselves prove inbox demand.

## 10. Assumptions, open dependencies, and first executable task

| Issue | Current decision / how it closes |
|---|---|
| Existing item detail assumption is false | BRS-03 adds a minimal read-only identity view. An existing-routes-only constraint requires explicitly reducing scope; do not claim three-type delivery. |
| Customer reader lacks analytics authority | Omit customer records for that actor; never add permissions implicitly. A simpler customer profile for broader readers would be a separate product decision. |
| Frontline and branch access | Initial cohort is tenant-wide admins only. BRS-01 records frontline need; expansion requires verified shared search/detail location predicates. POS visibility is not a global catalog permission rule. |
| PO destination module enforcement differs from declaration | BRS-03 closes the narrow destination/read-action gap and tests enabled/disabled states before rollout. Do not rely on observe-mode evidence. |
| Demand, records, participants and targets | No valid real-user timing exists. BRS-01 resolves fixture availability and sample size and sets measured targets; unavailable participants do not block contract/query implementation but block value claims. |
| Query scan cost and timeout value | BRS-04 inspects representative plans and supported hosting/DB timeout mechanisms; BRS-08 cannot enable the pilot with these unresolved. |
| Concurrent workspace work | Recheck working tree and route/source definitions at implementation start; preserve other changes and adjust task ownership accordingly. |

**First executable implementation task: BRS-02.** Define and test the shared typed result, pilot eligibility and per-domain access decision using fresh server identity and enforced module reads. Include a test proving a customer list reader without analytics permission never invokes the customer query, and a test proving a non-eligible branch actor invokes no record query. Commit no grants or schema change. This freezes the contract needed by the item destination and bounded queries. BRS-01 can collect research evidence independently.

Planning completion means this artifact supplies the scope, prerequisites, source references, ordered tasks and verification criteria. It does not mean the pilot is built, users are faster, or a release is certified.

## Observation and validation addendum

The final PO list observation supersedes the initial loading-state limitation: exact reference and ambiguous supplier-name filtering were observed successfully, as recorded in P1/P2. The detail navigation attempt did not establish usable content. On resumption, browser inventory showed the target PO detail URL, but attachment for page inspection failed. URL presence alone is not counted as successful record retrieval. No PO timing was recorded.

The original user dashboard tab was restored to /en/dashboard and its URL was confirmed in the final browser inventory. The separate research tab supplied PO observations; no tab was marked as a deliverable or handoff.

Artifact validation: the plan exists; all 55 source-link paths and cited line bounds resolve; the seven existing test paths in the regression command exist. The nine implementation-task rows each reference acceptance evidence, and all 16 acceptance rows name owning tasks. Six baseline task rows are present. New service, component and test paths are explicitly proposed and have not been created. Only this plan was written by this run. Git continued to warn that the user's global ignore file was unreadable; that did not prevent scoped status inspection. No application tests were executed, and none of the pilot acceptance criteria are represented as already passing.

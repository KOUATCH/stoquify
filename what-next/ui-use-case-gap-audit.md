# Stoquify UI and workflow gap audit

Date: 4 October 2026. Workspace: `E:/ohada saas/Focused projects/stoquify`. Scope: audit and implementation proposals; no application changes.

## Executive assessment

Six useful improvements are supported by the inspected source. The strongest first delivery is a **read-only item workspace**, followed by **business-record search** that opens it and other authorized record destinations. The item workspace fixes a concrete missing destination; search then reduces navigation across several daily workflows. Guided payroll evidence selection is the next priority because the current form requires people to supply technical proof identifiers to complete an important controlled task.

These are prioritization judgments, not measured customer demand or proven ROI. No usage-frequency baseline was available. A payroll team experiencing regular settlement delays could reasonably put recommendation 3 first.

**Coverage limitation:** all 163 discovered `page.tsx` entries were scanned for routes and imports, including 144 dashboard entries. Selected workflow components and their service contracts were examined more deeply. Public home, sign-in and EN/FR workflow-guide screens were inspected in the browser. Opening `/en/dashboard` redirected to sign-in with a return URL. No authenticated test session became available during this run. This is therefore a broad source audit with limited public browser verification, **not a completed visual walkthrough of every protected page**.

The inspected HEAD was `62a56036a5ac9b37236a20c9b148052199069479`, plus an already modified working tree (initial status: 296 modified and 3,994 untracked entries). Findings describe current working files, not a clean commit or deployed release. The localhost runtime was not independently bound to this revision. Older reports and graphs were used as discovery leads and checked against current source.

| Delivery order | Use case / users | Current gap | Expected value | Effort | Confidence / dependencies |
|---|---|---|---|---|---|
| 1 | Inspect an item without editing — stock staff, purchasers, managers | No general item detail page; list actions emphasize edit/delete | Answer stock and item questions with read permission and fewer screen changes | Medium | High source confidence; inventory read projection and field permissions |
| 2 | Find a business record anywhere — sales, purchasing, inventory, accounting | Header search searches destinations, not records | Faster correct-record retrieval and easier learning | Medium | High for shell limitation; depends on valid read destinations and bounded queries |
| 3 | Select payroll settlement proof — payroll controller/accountant | Required hashes remain manual text entry despite existing linked evidence | Fewer failed submissions and less technical assistance | Medium–large | High source confidence; controlled proof selector and existing settlement service |
| 4 | Find communications needing attention — sales/admin/finance | Delivery history exists per source, but no shared exception worklist was found | Earlier discovery and resolution of failed or deferred communications | Medium | Medium–high; authorized per-domain delivery adapters |
| 5 | Investigate changes across records — authorized owner/auditor | Entity histories exist; no general filtered audit explorer was found | Faster investigations with accessible source context | Medium | Medium–high; redacted, paginated audit read model |
| 6 | Request and track access — blocked staff and administrators | Denial pages advise contacting an administrator without a tracked handoff | Less repeated explanation and clearer ownership of blocked tasks | Medium–large | Medium–high; durable request lifecycle and existing grant controls |

Effort is relative scope, not a delivery estimate. No data demonstrates financial loss caused by these gaps, and no authorization bypass is alleged.

## Coverage and current strengths

The [complete route coverage matrix](<E:/ohada saas/Focused projects/stoquify/what-next/ui-use-case-gap-audit/route-coverage.md>) gives every discovered entry an explicit status. Its [machine-readable inventory](<E:/ohada saas/Focused projects/stoquify/what-next/ui-use-case-gap-audit/route-inventory.json>) records imports, line counts and source hashes. “Entry scanned” means route/import inspection, not that all imported components were exhaustively reviewed.

| UI area | Depth and evidence | Runtime status |
|---|---|---|
| Public home, workflow guide and sign-in | Browser content, role filter/reset, French guide, source guide and auth route discovery | Public browser inspected; guide mobile viewport attempted, see limits below |
| Register, recovery, verify, invitations, public statement/receipt/PO links, previews | Route entry/import scan; invitation-history contract reviewed | Runtime unverified; no registration, reset, tokenized link or external send performed |
| Shared shell, navigation, profile, settings | Navbar/sidebar filtering, authenticated layout, denial/notification states; role/member services | Protected browser access unavailable |
| Dashboard, daily digest, manager actions, owner war room | Entry scan and representative component/source-state inspection | Protected runtime unverified |
| POS and cash drawers/terminals | Route scan; current POS lifecycle/recovery controls inspected; historical recovery report cross-checked | No cart, shift or payment mutations |
| Inventory, items, categories, brands, units, transfers, movements, loss control | All entries scanned; item list/edit/destination gap deeply inspected; transfer error/review controls inspected | Protected runtime unverified |
| Customers and customer statements | Entries and access catalog; statement recovery/history and customer list service reviewed | Protected runtime unverified |
| Sales, purchasing, purchase orders, suppliers and AP | Entries; purchase-order list/service and AP control workbench inspected | Protected runtime unverified |
| Finance, reconciliation, cash command, stock-to-cash | Entries; representative command/workbench, notification and proof controls inspected | Protected runtime unverified |
| Accounting, accountant access/portal/portfolio, reports and close | Entries; accounting audit query and close controls inspected | Protected runtime unverified |
| HRIS, payroll and employee self-service | Entries; approval-inbox controls; payment form → action → service and tests deeply reviewed | Protected runtime unverified |
| Analytics, referral reporting, compliance and assurance | Entries/imports; compliance unavailable/degraded states and report route guard inspected | Protected runtime unverified |
| Module configuration and data onboarding | Entries and representative draft/preview/apply and import/review/commit states inspected | Protected runtime unverified |

Several tempting recommendations are already substantially implemented and are **not** described as missing:

- POS resumes and parks carts and has uncertain-result recovery: [ProfessionalPOSSystem](<E:/ohada saas/Focused projects/stoquify/components/pos/ProfessionalPOSSystem.tsx:1432>). The September POS report is historical supporting context, not a test result from this run.
- Governed data onboarding has import, approval and commit states: [MasterDataOnboardingWorkbench](<E:/ohada saas/Focused projects/stoquify/components/onboarding/MasterDataOnboardingWorkbench.tsx:153>).
- HRIS already has an approval inbox, and AP has domain workbenches. A new generic approval dashboard would need evidence of a remaining user problem before being prioritized.
- Close assurance has readiness/evidence panels and controlled exports: [CloseAssuranceCenter](<E:/ohada saas/Focused projects/stoquify/components/accounting/CloseAssuranceCenter.tsx:5>).
- Module configuration already supports review, history and fresh-authenticated application. The access-request proposal below addresses the employee-to-administrator handoff, not replacement of those controls.
- Shared route states cover loading, empty, partial, error, permission denial, locked modules and stale sessions: [DashboardRouteState](<E:/ohada saas/Focused projects/stoquify/components/dashboard/DashboardRouteState.tsx:10>). Their existence does not prove correct behavior on every route.

## 1. Read-only item workspace

**Use case:** As an inventory reader or purchaser, I need to inspect an item's identity, stock by permitted location and related activity so that I can answer an operational question without entering an edit form.

**Current evidence.** The item name is plain text, and the row menu exposes Copy ID, Edit Item and Delete Item: [ItemManagement](<E:/ohada saas/Focused projects/stoquify/components/ui/groups/inventory/ItemManagement.tsx:211>) and [row actions](<E:/ohada saas/Focused projects/stoquify/components/ui/groups/inventory/ItemManagement.tsx:301>). The discovered item subtree has `/edit`, `/suppliers` and `/others`, but no `/inventory/items/[id]/page.tsx`. The [edit route](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/items/[id]/edit/page.tsx:20>) requires update permission. The [others route](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/inventory/items/[id]/others/page.tsx:12>) only renders a sentence with the ID. Supplier and movement screens already exist; this is a missing read destination, not absence of inventory information everywhere.

**Value and reason.** Looking up facts should be possible within legitimate read authority. A stable item page also supplies a useful destination for search, stock alerts and cross-module links. Measure correct-answer time, screens visited and failed attempts caused by edit-only destinations. Establish the baseline before promising a reduction.

**Experience.** Make the name and a “View item” row action open a localized item overview. Show SKU, unit, active/archive state, permitted location quantities and freshness; link to scoped movement and supplier views. Keep edit actions conditional. Distinguish unknown quantity, zero stock, no visible location, deleted item and unavailable data.

**Implementation and sequence.** Add the detail route and register it in the existing inventory route catalog. Build a minimal server-owned read DTO in `services/item/item.service.ts`; reuse current item/inventory queries after auditing field permissions. Do not send the edit DTO wholesale to readers. Start with identity and authorized stock; add linked history/supplier sections next. Costs, margins and supplier terms require their own disclosure rules. Existing tables should suffice initially; no new business-truth model is justified.

**Acceptance checks.** A read-only inventory user opens an item without update permission; a different tenant cannot resolve it; disallowed location totals and sensitive fields are absent; an empty/failed read is not shown as zero stock; keyboard focus and EN/FR labels work at desktop and narrow widths. Opening the page performs no business mutation.

## 2. Cross-module business-record search

**Use case:** As a sales or purchasing operator, I need to enter a name, SKU or order reference from any screen so that I can open the correct authorized record directly.

**Current evidence.** [Navbar](<E:/ohada saas/Focused projects/stoquify/components/dashboard/Navbar.tsx:146>) flattens authorized sidebar destinations; [its matching logic](<E:/ohada saas/Focused projects/stoquify/components/dashboard/Navbar.tsx:152>) matches title, parent, section and module and returns seven results. It has no business-record query. Source/name searches and the route inventory found no shared record-search surface. Domain-local list searches do exist.

**Value and reason.** Users often know a reference but not which screen owns it. Measure median time and selection accuracy for representative exact-reference and ambiguous-name tasks. This is a retrieval improvement, not evidence that local search is broken.

**Experience.** Extend the header with “Pages” and “Records” groups. Begin with items, customers and purchase orders. Show a recognizable reference, type and authorized context; support keyboard selection, cancel, loading, partial failure and no-results states. Preserve the entered query on a transient failure.

**Implementation and sequence.** Add a bounded server aggregator with domain adapters. Resolve identity, organization, location, permissions and entitlements before querying each type; return minimal snippets. [Customer listing](<E:/ohada saas/Focused projects/stoquify/services/customer/customer.service.ts:201>) is a starting point, subject to its service contract. Do not reuse the existing unbounded [PO listing](<E:/ohada saas/Focused projects/stoquify/services/purchase-order/purchase-order.service.ts:489>) as a header query: [the action's filters are unused](<E:/ohada saas/Focused projects/stoquify/actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts:126>). Add a limited PO query and inspect query plans before proposing indexes.

Deliver the item read page first. Customer detail currently requires both `customers.read` and `customers.analytics.read` in the [access catalog](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/customers/customers-route-data-access.ts:54>). Search must respect that destination contract or use a separately authorized basic profile; do not silently grant analytics access. Exclude sensitive payroll and payment snippets from the initial pilot.

**Acceptance checks.** Exact SKU/order/customer code leads to an accessible correct destination; ambiguous names can be distinguished; unauthorized records, counts and snippets never appear; one slow domain produces an explicit partial result; stale requests cannot replace newer results; EN/FR and keyboard behavior pass. Test with realistic data volume rather than a full-list client download.

## 3. Guided selection of payroll settlement evidence

**Use case:** As a payroll controller, I need to select the released payroll register and eligible settlement evidence so that I can record proof without manually obtaining technical hashes.

**Current evidence.** [PayrollPaymentSettlementForm](<E:/ohada saas/Focused projects/stoquify/components/payroll/PayrollPaymentSettlementForm.tsx:67>) initializes source-register and evidence hashes as blank strings and renders text inputs at [line 203](<E:/ohada saas/Focused projects/stoquify/components/payroll/PayrollPaymentSettlementForm.tsx:203>). Its [parent](<E:/ohada saas/Focused projects/stoquify/components/payroll/PayrollPaymentReconciliationWorkbench.tsx:441>) prefills several match/provider identifiers, but not these two hashes. The [service](<E:/ohada saas/Focused projects/stoquify/services/payroll/payment-reconciliation.service.ts:1290>) requires source-register proof and provider or statement evidence. This is a usability gap in an existing controlled workflow, not a recommendation to remove the checks.

**Value and reason.** Copying technical identifiers is error-prone and puts implementation knowledge into a normal payroll task. Measure successful first submission, evidence-related validation failures, completion time and requests for technical help. There is no measured current failure rate.

**Experience.** From a payment batch, offer eligible register versions and approved match/provider/statement records with human-readable reference, date, amount, currency and review status. Show the remaining obligation and selected evidence before confirmation. If no eligible evidence exists, explain why and link to its source workflow. Keep hashes in optional technical details.

**Implementation and sequence.** Extend the existing reconciliation read model with authorized selection options. Submit stable record IDs; resolve current hashes server-side from controlled records in the settlement transaction. Start with already stored evidence rather than adding a new upload system. Preserve existing [action permission, module and fresh-auth controls](<E:/ohada saas/Focused projects/stoquify/actions/payroll/payroll-payment-reconciliation.actions.ts:76>), separation of duties, balance revision, idempotency and close invalidation. Reuse existing record/event models; add storage only if a later attachment workflow needs it.

**Acceptance checks.** An eligible source can be selected without typing a hash; foreign-tenant, stale, revoked, mismatched and ambiguous sources are rejected; partial/final amounts remain server-validated; repeated uncertain requests cannot duplicate settlement; selecting evidence alone never marks a batch paid. Verify accessible labels, errors, EN/FR copy and redacted views.

## 4. Communication delivery exception worklist

**Use case:** As an authorized sales manager or administrator, I need to find failed or deferred customer communications and invitations so that I can act before a recipient reports a missing message.

**Current evidence.** [Notification settings](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/notifications/NotificationsSettingsClient.tsx:64>) describes a temporary five-message, tab-local view; it is not durable delivery tracking. However, [CustomerStatementWorkflow](<E:/ohada saas/Focused projects/stoquify/components/customers/CustomerStatementWorkflow.tsx:7>) has a retry action and retained-request recovery, and [InvitationHistory](<E:/ohada saas/Focused projects/stoquify/components/Forms/users/InvitationHistory.tsx:51>) exposes delivery states and attempts. The [receipt worker](<E:/ohada saas/Focused projects/stoquify/services/communication/whatsapp-receipt-worker.service.ts:111>) distinguishes retries and exhausted work. No shared, cross-record delivery exception UI was found in the inspected source/routes.

**Value and reason.** Per-record histories work once the user knows which record to inspect. A queue helps discover the affected records. Measure oldest unresolved exception, time to appropriate action and duplicate-send incidents, separating unknown outcomes from confirmed failures.

**Experience.** Add “Delivery issues” under a suitable authorized communications/notifications destination. Filter by source type, channel, state and date. Show masked recipient, source reference, last attempt, reason and a link to the authorized recovery workflow. Explicitly distinguish queued, provider accepted, delivered where supported, failed and unknown.

**Implementation and sequence.** Build a paginated read model over existing delivery/outbox/history services with per-source authorization. Start with customer statements and invitations; include receipts only after verifying an operator recovery contract. Reuse [invitation history's scoped, validated projection](<E:/ohada saas/Focused projects/stoquify/services/users/user-invitation-history.service.ts:71>). Begin with source-linked recovery, not a bulk retry button. Preserve consent, destination checks, attempt history, version/idempotency and transport-disabled states. Reading notifications must not confer access to every recipient.

**Acceptance checks.** An exception remains discoverable after reload; retries preserve the source workflow's authority and duplicate protection; recipient details and tokens stay redacted; disabled providers are accurately labelled; acknowledgment does not imply delivery; recovery updates the queue from authoritative state. No external message was sent during this audit.

## 5. Cross-record audit investigation

**Use case:** As an authorized auditor or owner, I need to filter changes by actor, time and entity and follow related records so that I can investigate an incident without asking a developer to query logs.

**Current evidence.** [AuditLog](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:9331>) contains actor, entity, action, changes and timestamp with organization/time and entity/time indexes. [Accounting Control Center](<E:/ohada saas/Focused projects/stoquify/services/accounting/control-center.service.ts:381>) reads eight recent events limited to accounting/control types. Member and role histories exist. No general filtered cross-record audit screen was found in the route/component search. Audit storage does not establish completeness or tamper resistance.

**Value and reason.** Investigations often span a user change, operational record and approval. Measure time to reconstruct a defined scenario and the percentage of relevant events that can be reached from the UI, without claiming this provides forensic or compliance certification.

**Experience.** Add an audit explorer with date, actor, action and entity filters; cursor pagination; safe event details and authorized links back to sources. Distinguish unavailable source, redacted details and missing event coverage. Start with access and item changes; enable financial event families only after their projections are reviewed.

**Implementation and sequence.** Add a dedicated read service/action, applying organization, audit permission, entity permissions and applicable location scope before paging. Allowlist displayable change fields; never render raw `changes` JSON or IP/user-agent data by default. Reuse existing indexes after checking query plans. Use existing domain proof trails for provenance beyond an audit entry. Exports, if later added, need separate permission, bounded scope and export evidence. No new audit table is necessary merely to add the first view.

**Acceptance checks.** Filters and pagination preserve order without duplicate/missing rows across a fixed snapshot; tenant/role negatives pass; sensitive payload fields are absent; revoked authority immediately prevents reads; deep links retain source authorization; exported scope matches the approved query if exports are introduced.

## 6. Trackable access requests

**Use case:** As a staff member blocked from a legitimate task, I need to request an access review and see its outcome so that an administrator can resolve it without repeated off-platform explanations.

**Current evidence.** [NotAuthorized](<E:/ohada saas/Focused projects/stoquify/components/NotAuthorized.tsx:9>) says to ask an administrator and offers dashboard/home/sign-out navigation. Shared [DashboardRouteState](<E:/ohada saas/Focused projects/stoquify/components/dashboard/DashboardRouteState.tsx:74>) supports recovery links/custom actions but has no request lifecycle. Scoped searches for access-request routes, components and models found no such workflow. Existing member/role/module administration remains the authority for actual access changes.

**Value and reason.** This supplies task context, an owner and a visible decision. Measure time to resolution, duplicate requests and repeat blocked attempts. Its value depends on the organization's volume of legitimate access changes, which was not available.

**Experience.** For eligible signed-in denial cases, offer “Request access review,” showing the requested task and a reason field. Provide pending, approved, declined, withdrawn and expired states. Approval explains the scope granted and permits returning to the original safe route. Authentication expiry and unavailable modules must have distinct recovery paths.

**Implementation and sequence.** Add a minimal durable request model with tenant/requester, normalized target, reason, status, reviewer, decision timestamps and revision. Route only to authorized administrators. Use current [member-access controls](<E:/ohada saas/Focused projects/stoquify/services/users/member-access.service.ts:27>) and [role permission ceilings](<E:/ohada saas/Focused projects/stoquify/services/roles/role-editor.service.ts:8>) for changes. Keep request approval distinct from verified grant completion. Block self-approval, stale decisions and duplicate pending requests; audit transitions. Module subscription/configuration requests must not automatically purchase, activate or bypass entitlements.

**Acceptance checks.** A requester cannot supply another tenant or arbitrarily grant permissions; reviewers stay within their authority; concurrent decisions are fenced; revoked reviewers cannot approve; declining changes no access; approved requests return only to allowlisted local paths after rechecking effective authority. Notifications contain no protected record details.

## Shared delivery plan and verification

1. Validate the ranking with representative stock, purchasing, payroll and administration users; measure the current task baselines.
2. Deliver the read-only item destination and its authorization tests. This is the recommended first implementation because its missing route is concrete, its workflow is broadly useful, and it enables later search without increasing write authority.
3. Deliver a limited record-search pilot. Review destination permission mismatches and bounded queries before expanding domains.
4. Improve payroll evidence selection using existing controlled records and regression tests.
5. Introduce delivery and audit read models separately, reusing their domain histories. Do not combine a delivery failure, business approval and audit event into one ambiguous status model.
6. Add access requests after administrative ownership and the approval/grant boundary are agreed.

Each slice should use current design-system primitives, server-owned truth, localized state copy, safe errors and role/module guards. Start read-only where possible; release to a small authorized cohort with rollback of the UI/read endpoint. Only the access-request lifecycle clearly needs a new persistence model in this proposal. Do not perform unrelated refactors or lint cleanup.

### Checks actually executed

- Read `AGENTS.md` and the user-supplied prompt; read the prompt-architect skill in this conversation.
- `git status --porcelain` (summarized; Git emitted a user-config ignore-file permission warning) and `git rev-parse HEAD`.
- Scoped `rg --files` / `rg -n` searches and direct source reads across `app`, `components`, `hooks`, `actions`, `services`, `lib`, `config`, `prisma`, tests, reports and graphs. A few guessed filenames did not exist; corrected using file discovery. They are not evidence of missing capabilities.
- `node what-next/ui-use-case-gap-audit/collect-evidence.cjs` — produced inventory/coverage for 163 entries. The first output write was denied by Windows; a narrowly escalated retry succeeded.
- `node node_modules/jest/bin/jest.js --runInBand --runTestsByPath config/__tests__/sidebar.test.ts components/dashboard/__tests__/DashboardRouteState.test.tsx services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/users/__tests__/user-invitation-history.service.test.ts --json --outputFile=what-next/ui-use-case-gap-audit/jest-results.json` — **4 suites, 79 tests passed**. Initial tests passed but the evidence write was denied; the repeated run saved [Jest results](<E:/ohada saas/Focused projects/stoquify/what-next/ui-use-case-gap-audit/jest-results.json>) and exited 0. Tests use mocks and do not establish live database, provider or end-to-end correctness.
- Browser: read public home and sign-in; workflow guide showed 12 journeys; choosing Cashier reduced the DOM results to 2; reset restored 12; French guide rendered localized content; `/en/dashboard` redirected to login with its callback URL. A first guide navigation timed out but the resulting tab was recovered. AX represented filter controls differently from the DOM; using the actual DOM button role succeeded.

Public browser evidence: [EN guide screenshot](<E:/ohada saas/Focused projects/stoquify/what-next/ui-use-case-gap-audit/workflow-guide-desktop.png>), [Cashier DOM](<E:/ohada saas/Focused projects/stoquify/what-next/ui-use-case-gap-audit/workflow-cashier-dom.txt>), [FR guide screenshot](<E:/ohada saas/Focused projects/stoquify/what-next/ui-use-case-gap-audit/workflow-guide-fr.png>) and [FR DOM](<E:/ohada saas/Focused projects/stoquify/what-next/ui-use-case-gap-audit/workflow-guide-fr-dom.txt>). A [390×844 viewport capture](<E:/ohada saas/Focused projects/stoquify/what-next/ui-use-case-gap-audit/workflow-guide-mobile.png>) was retained, but the screenshot appeared scaled and captures sometimes lagged the DOM. It is not sufficient evidence of mobile layout correctness. The temporary viewport override was reset. No protected-record screenshots were taken.

### Outstanding verification

Authenticated desktop/mobile journeys, denied/limited roles, narrow-screen tables, keyboard dialogs and focus return, screen-reader behavior, full EN/FR parity, live failure/recovery scenarios, provider outcomes and production deployment equivalence remain unverified. The recommendation acceptance checks above are future work, not tests passed in this audit. No full build, migration, seed, provider worker, deployment or application-wide lint/typecheck was run; none is needed to claim this report was saved, and a generic build script includes migration-related operations.

### Graph and historical context

The older graph assists navigation, not current-line verification: component node `dashboard_navbar_tsx` (community 77); component `finance_paymentreconciliationworkbench_tsx` (13); app `locale_dashboard_dashboard_settings_notifications_notificationssettingsclient_tsx` (13); hook `payments_usepaymentreconciliationdashboard_ts` (2); action `payments_reconciliation_actions_ts` (14). Current imports and implementation were checked directly. Relevant historical reports inspected were `what-next/ui-missing-capabilities-value-assessment.md`, `what-next/business-record-search-delivery-plan.md`, `what-next/pos-cart-lifecycle-and-interruption-recovery.md`, the September shell-navigation report, and `innovation/DAILY_DIGEST_ROUTE_STATE_RERUN_NOTE_2026-06-26.md`. Their reported passes are not counted as this run's results.

## Review perspectives and limits

| Perspective | Contribution / disposition |
|---|---|
| Enterprise architecture | Reuse domain ownership; item read destination precedes shared search |
| Backend and integrations | Bounded reads and source-owned recovery; no client-created proof truth |
| Database/migrations | Reuse existing evidence/audit data; add request persistence only where needed |
| Security/IAM/privacy/abuse | Destination permissions, tenant/location scope, redaction, review ceilings and no automatic grants |
| Frontend/design systems | Shared components and complete selection/loading/error/recovery states |
| Workflow/accessibility/localization | Read-only task completion, understandable evidence, keyboard and EN/FR acceptance checks; full accessibility remains unverified |
| Product/business process | Six user outcomes and baseline metrics; ranking remains a hypothesis |
| Quality/release assurance | 79 focused tests passed; explicit future negative and browser checks |
| SRE/DevSecOps/performance/cost | Bound search and audit queries; expose partial failures and delayed delivery; no benchmark claims |
| SaaS packaging/adoption/support | Respect module availability; no package changes or implicit purchases |
| Finance/internal controls | Preserve settlement authority, separation of duties and balance/proof checks |
| Statutory/OHADA/country packs | No rule changes proposed; legal or accounting certification is not part of this UI audit |
| Audit/records/data quality | Separate event visibility from event completeness; use redacted projections |
| POS/inventory/offline | Item-read gap applies; current cart recovery exists; offline synchronization changes not applicable |
| Purchasing/AP | Search uses bounded PO reads; existing AP workflow remains the authority |
| HR/payroll | Guided proof selection over current reconciliation controls |
| Payments/providers | Delivery and settlement states remain source-owned; no money transfer or provider activation |
| Accounting close/portal | Audit explorer complements current close and proof trails; no ledger/close rewrite |
| Analytics/metric governance | Define task metrics and missing baselines; no invented productivity gains |
| AI/model risk | Not applicable to proposed first releases: no AI decisions or agent execution introduced |
| API/events/import/export | Reuse outbox and governed imports; review exports separately |
| Change management/operations | Cohort rollout, task-based training, ownership and support measurement |

This report does not certify security, financial correctness, statutory compliance, accessibility or production readiness. Existing user work was preserved; only the report and its evidence artifacts were added.

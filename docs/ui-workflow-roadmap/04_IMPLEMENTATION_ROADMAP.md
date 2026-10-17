# Stoquify UI workflow implementation roadmap

4 October 2026 | Planning baseline: working files at HEAD 62a56036a5ac9b37236a20c9b148052199069479 plus existing local changes

**Decision:** execute all six proposals in the [source UI audit](<E:/ohada saas/Focused projects/stoquify/what-next/ui-use-case-gap-audit.md>) and add two comparable, source-supported proposals: resumable new-PO authoring and reconciliation-alert processing recovery. This plan contains eight use cases and 20 delivery contracts. All packages are **PROPOSED**; publication does not mean implementation or release.

## Outcomes and priority

| ID | Proposal / primary user | Value and reason | Packages |
| --- | --- | --- | --- |
| UC01 | Read-only item workspace — Inventory readers, purchasers | No general item overview route; reading facts currently leads toward edit or fragmented views. Answer item and permitted-stock questions without update authority. | UX02, UX03 |
| UC02 | Business-record search — Sales, purchasing, inventory | Header matches page destinations, not business records. Open the correct authorized item, customer or PO directly. | UX04, UX05 |
| UC03 | Guided payroll evidence selection — Payroll controller, accountant | Required source-register/evidence hashes remain manual inputs. Complete proof submission using understandable eligible records. | UX06, UX07 |
| UC04 | Communication delivery exceptions — Sales, administration, finance | Source histories exist without a shared discovery worklist. Find failed/deferred communications before recipients report them. | UX08, UX09 |
| UC05 | Cross-record audit explorer — Authorized owner, auditor | Audit storage and entity histories lack a general filtered investigation UI. Reconstruct incidents across records without developer log queries. | UX10, UX11 |
| UC06 | Trackable access requests — Blocked staff, authorized reviewers | Denial advice lacks a durable request and decision handoff. Give blocked work an owner, tracked outcome and safe return path. | UX12, UX13 |
| UC07 | Resumable new purchase orders — Purchasing operators | Create form is held in component/form state; existing edit recovery does not cover new-order authoring. Avoid re-entry after interruption and duplicate creation after uncertain responses. | UX14, UX15 |
| UC08 | Reconciliation alert processing recovery — Reconciliation operator, support | Durable inbox exists but dashboard omits worker processing diagnostics and guarded recovery. Locate stalled alerts and recover eligible work with clear ownership. | UX16, UX17 |

P0 denotes an enabling or release gate, P1 the first value/operational-risk tier, and P2 the next tier. P2 still belongs in the committed scope. The ordering is a product hypothesis until UX00 measures actual task frequency and friction; a payroll cohort can legitimately prioritize UC03 ahead of search. UC07 and UC08 are completion work over existing foundations, not replacements for current PO editing or the durable inbox.

## Delivery sequence and dependencies

| Wave | Work | Exit |
| --- | --- | --- |
| 0 — establish truth | UX00 → UX01 | G0 baseline and G1 contracts, owners and decisions |
| 1 — useful read destination | UX02 → UX03; start UX04 once UX02 is ready | Item overview is independently pilotable; UX05 follows UX03 + UX04 |
| 2 — high-value controlled workflows | UX06 → UX07; UX14 → UX15; UX16 → UX17 | Payroll proof, new-PO recovery and alert diagnostics/recovery each pass their own gates |
| 3 — investigation and handoffs | UX08 → UX09; UX10 → UX11; UX12 → UX13 | Communications, audit and access requests complete their role-specific tasks |
| 4 — integrated assurance and expansion | UX18 → UX19 | All eight feature gates complete and accepted; operational ownership in place |

Waves describe recommended sequencing, not mandatory serial execution. Independent feature lanes may overlap after UX01 when actual staff are available. Do not start UX05 until item/search destinations work. UX18 collects evidence continuously: its aggregate dependency list means all features must pass to close the program, not that an individual G4-complete feature must wait for all others to pilot. Apply the same per-feature interpretation to UX19; close the program only after every proposal passes.

## Work package register

| Package | Delivery | Depends on | Owner role | Person-days |
| --- | --- | --- | --- | --- |
| UX00 | Confirm baseline, cohort and ownership | — | Product lead + QA lead | 2–3 |
| UX01 | Freeze shared read, command and UI-state contracts | UX00 | Platform lead + security reviewer | 3–5 |
| UX02 | Build item read projection | UX01 | Inventory backend engineer | 3–5 |
| UX03 | Deliver item overview and entry points | UX02 | Inventory frontend engineer + QA | 3–5 |
| UX04 | Implement bounded record-search adapters | UX02 | Backend search owner + domain owners | 4–6 |
| UX05 | Integrate business search into the shell | UX03, UX04 | Shell frontend engineer | 3–5 |
| UX06 | Resolve payroll proof from controlled records | UX01 | Payroll backend owner + controls reviewer | 4–6 |
| UX07 | Replace manual payroll hashes with guided selection | UX06 | Payroll frontend engineer + QA | 3–5 |
| UX08 | Project communication delivery exceptions | UX01 | Communication backend owner | 3–5 |
| UX09 | Deliver the communications worklist | UX08 | Communication frontend engineer + support owner | 3–5 |
| UX10 | Build redacted cross-record audit reads | UX01 | Audit backend owner + privacy reviewer | 3–5 |
| UX11 | Deliver audit investigation workflows | UX10 | Audit frontend engineer + QA | 3–5 |
| UX12 | Implement durable access-request lifecycle | UX01 | IAM backend owner + security reviewer | 5–8 |
| UX13 | Connect denials to requester and reviewer queues | UX12 | IAM frontend engineer + operations owner | 3–5 |
| UX14 | Persist new-PO drafts and fence order creation | UX01 | Purchasing backend owner + data reviewer | 5–8 |
| UX15 | Deliver new-PO save, resume and recovery UX | UX14 | Purchasing frontend engineer + QA | 4–6 |
| UX16 | Expose safe alert processing diagnostics | UX01 | Reconciliation backend owner + SRE | 3–5 |
| UX17 | Add guarded alert recovery and escalation | UX16 | Reconciliation engineer + SRE owner | 4–6 |
| UX18 | Complete integration and release evidence | UX03, UX05, UX07, UX09, UX11, UX13, UX15, UX17 | QA lead + security + domain reviewers | 5–8 |
| UX19 | Pilot, measure and hand over operations | UX18 | Product owner + SRE + support | 3–5 |

**Estimate:** 69–111 combined engineering/QA person-days, excluding specialist approval waiting, environment provisioning and elapsed pilot observation. These are initial planning ranges, not measured velocity or commitments. At 12–15 effective person-days/week, capacity arithmetic alone is approximately 5–10 weeks; dependencies, staffing and review queues can lengthen this. Re-estimate after UX00/UX01 and after each first vertical slice. Owner labels are roles awaiting named assignment, not evidence that a team has accepted the work.

## Decisions to record before dependent work

| Decision | Owner | Needed for | Default proposal / unresolved point |
| --- | --- | --- | --- |
| D01 cohort and task baselines | Product + QA | UX00 | Choose representative stock, sales, purchasing, payroll and administrator users; baseline before claiming ROI. |
| D02 customer search destination | Customer + IAM owners | UX04 | Either respect existing read+analytics route authority or add a reviewed basic read profile; never widen grants silently. |
| D03 eligible payroll evidence | Payroll + controls | UX06 | Use already stored released register and approved provider/statement records; approve exact version/eligibility rules. |
| D04 transport status mapping | Communication owner | UX08 | Statements/invitations first; receipts conditional; accepted and unknown are not delivered. |
| D05 audit projection and retention | Privacy + domain owners | UX10 | Access/item fields first; no raw changes payload or exports; document event coverage. |
| D06 access request operating policy | IAM + operations | UX12 | Assign reviewers, expiry/SLA and application recovery; preserve decision versus effective grant distinction. |
| D07 PO draft durability/retention | Purchasing + data owner | UX14 | Durable scoped authoring drafts with explicit save/resume; define unsaved local-delta handling and retention. |
| D08 alert recovery policy | Reconciliation + SRE | UX16/17 | Diagnostic view first; explicit authorized retry only for eligible states; poison/lease failures escalate. |
| D09 budgets and release exposure | Platform + QA + product | UX04 and releases | Propose ≤10 results/domain and p95 server search ≤750ms on agreed volume; validate before accepting as SLO. |

A missing decision blocks the affected command/schema change, not unrelated source analysis or approved read-only slices. Record who decided, date, evidence and consequences. No decision has been silently accepted by the user merely because it appears here.

## Coordinate with the existing platform roadmap

The separate [platform roadmap](<E:/ohada saas/Focused projects/stoquify/docs/prompt-execution/04_IMPLEMENTATION_ROADMAP.md>) contains R00–R37 and is preserved. These UX packages should be linked as children or acceptance slices of relevant parent work, not counted as duplicate delivery programs. Parent status must be checked before implementation; this table claims relevance, not parent completion.

| UI work | Existing parent packages | Integration rule |
| --- | --- | --- |
| UX00/01/18/19 | R00 baseline; R01 verification; R10 access; R24 EN/FR/accessibility; R31–R33 release/rollout | Share baseline, negative fixtures and release evidence; avoid separate certification claims. |
| UC01/02 | R11 master data; R12 inventory; R13 customer/order-to-cash; R14 purchasing | Reuse current entity truth and permissions; coordinate new read destinations. |
| UC03 | R17 payroll; R15 reconciliation; R07 close | Keep settlement controls and close invalidation authoritative. |
| UC04 | R22 customer/accountant delivery; R19 provider boundaries; R23 recovery | Expose source histories and existing recovery rather than introducing another sender. |
| UC05/06 | R10 access/privacy; R08 retention; R30 runbooks | Separate audit visibility, request decisions and actual permission grants. |
| UC07 | R14 purchasing/AP; R08 data/retention; R09 correction | Add authoring recovery without bypassing purchasing document controls. |
| UC08 | R15 reconciliation; R23 worker recovery; R30 operations | Add operator visibility and controlled commands over the existing inbox worker. |


## Detailed delivery contracts

### UX00 — Confirm baseline, cohort and ownership

**Status:** PROPOSED. **Priority:** P0. **Owner:** Product lead + QA lead. **Effort:** 2–3 person-days. **Depends on:** none. **Use cases:** shared foundation.

**Current state:** Source audit is broad; authenticated workflow coverage and user demand baselines are missing.

**Objective:** Establish a reproducible starting point and named decision owners.

**Implementation locations:** `what-next/ui-use-case-gap-audit.md`; `what-next/ui-use-case-gap-audit/route-inventory.json`; `docs/prompt-execution/04_IMPLEMENTATION_ROADMAP.md`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Record current HEAD, local changes and running revision without resetting work. Revalidate each finding before implementation.
2. Select synthetic tenant fixtures and authorized role cohort; measure the eight task baselines. Assign a named person to each owner role.
3. Reconcile work with parent roadmap R00/R01; record already completed work and acceptance evidence rather than rebuilding it.

**Data and migration impact:** No migration. Use isolated representative test data; record fixture provenance.

**Controls:** Do not use production financial mutations to establish a baseline. Record unavailable environments explicitly.

**Verification:** Reproduce source entry points and baseline tasks; inventory denied, limited and full roles and EN/FR fixtures.

**Rollout and gate:** G0: scope, baseline evidence and accountable owners recorded.

**Blockers and assumptions:** Authenticated test session, representative users and runtime-to-revision mapping remain unavailable until arranged.

**Definition of done:** All eight cases have a baseline or explicit missing-evidence entry; owners and first cohort are assigned.

### UX01 — Freeze shared read, command and UI-state contracts

**Status:** PROPOSED. **Priority:** P0. **Owner:** Platform lead + security reviewer. **Effort:** 3–5 person-days. **Depends on:** UX00. **Use cases:** shared foundation.

**Current state:** Domain controls and shared route states exist, but new feature contracts are not yet defined.

**Objective:** Specify the smallest safe contracts before building new surfaces.

**Implementation locations:** `components/dashboard/DashboardRouteState.tsx`; `app/[locale]/(dashboard)/dashboard/customers/customers-route-data-access.ts`; `services/users/member-access.service.ts`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Define minimal DTOs, pagination, query budgets, source freshness and safe local return URLs for the eight cases.
2. Resolve organization, entity, location, permissions and entitlements before querying records, counts or snippets.
3. Write state tables for loading, empty, partial, denied, stale, failed and uncertain outcomes; reuse primitives and EN/FR conventions.

**Data and migration impact:** No shared business-status table. Each domain retains its own authoritative states.

**Controls:** Resolve the customer read versus analytics destination mismatch without granting additional authority. Do not infer write rights from visibility.

**Verification:** Contract examples include foreign tenant, limited location, revoked role, disabled module and stale session. Review output fields for privacy.

**Rollout and gate:** G1: domain owners approve DTOs, transition tables, permission matrix and test contracts.

**Blockers and assumptions:** D02 destination choice, D03 proof eligibility and D08 recovery authority must be decided before dependent command work.

**Definition of done:** No unresolved critical authority or source-of-truth ambiguity remains for each slice entering implementation.

### UX02 — Build item read projection

**Status:** PROPOSED. **Priority:** P1. **Owner:** Inventory backend engineer. **Effort:** 3–5 person-days. **Depends on:** UX01. **Use cases:** UC01.

**Current state:** Item edit and related activity exist; no minimal general reader projection is established by the audit.

**Objective:** Return item identity and authoritative stock limited to the reader’s permitted locations.

**Implementation locations:** `services/item/item.service.ts`; `app/[locale]/(dashboard)/dashboard/inventory/items`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Add a scoped read service and action using current inventory truth.
2. Project identity, unit, archive state, permitted quantities and freshness; provide authorized movement/supplier links.
3. Distinguish not found, no visible location, zero, unknown and unavailable.

**Data and migration impact:** Reuse existing tables; add an index only after a measured query-plan need.

**Controls:** Do not return edit DTOs wholesale. Costs, margins and supplier terms require explicit field authority.

**Verification:** Test read-without-update, foreign tenant, hidden locations, archived/deleted records, sensitive fields and unavailable stock.

**Rollout and gate:** G2: projection and privacy tests pass on representative fixtures.

**Blockers and assumptions:** Inventory quantity semantics and location-scoping contracts require domain-owner confirmation.

**Definition of done:** Read-only users receive correct authorized facts with no business mutation and no hidden-location totals.

### UX03 — Deliver item overview and entry points

**Status:** PROPOSED. **Priority:** P1. **Owner:** Inventory frontend engineer + QA. **Effort:** 3–5 person-days. **Depends on:** UX02. **Use cases:** UC01.

**Current state:** Item names are plain text and row actions emphasize edit/delete; related routes are fragmented.

**Objective:** Make an item inspectable from a stable read destination.

**Implementation locations:** `components/ui/groups/inventory/ItemManagement.tsx`; `app/[locale]/(dashboard)/dashboard/inventory/items/[id]/page.tsx (new)`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Add the localized overview route and register it in the current inventory access catalog.
2. Link item names and View item actions; render identity, stock, source links and conditional edit controls.
3. Use shared state components and explain zero, unknown, restricted and failed reads accurately.

**Data and migration impact:** No migration or derived stock storage.

**Controls:** Route and source links recheck permissions; hiding a button is not authorization.

**Verification:** Authenticated read-only and denied-role browser tasks; EN/FR, keyboard/focus and 390px plus desktop layouts.

**Rollout and gate:** G3/G4: task completion and role-negative evidence accepted; expose first to the selected cohort.

**Blockers and assumptions:** Authenticated browser fixtures remain required; screenshots alone do not prove authorization.

**Definition of done:** Users answer the baseline item questions without entering edit; overview can be disabled without changing inventory.

### UX04 — Implement bounded record-search adapters

**Status:** PROPOSED. **Priority:** P1. **Owner:** Backend search owner + domain owners. **Effort:** 4–6 person-days. **Depends on:** UX02. **Use cases:** UC02.

**Current state:** Domain list queries exist; current PO listing is unsuitable as an unbounded header-search source.

**Objective:** Search items, customers and POs with scoped, bounded server queries.

**Implementation locations:** `services/customer/customer.service.ts`; `services/purchase-order/purchase-order.service.ts`; `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts`; `services/search (new)`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Create domain adapters and a small aggregator with exact-reference and text matching.
2. Apply scope before counts and limits; cap results per domain, enforce time budgets and explicit partial results.
3. Resolve accessible record destinations, deterministic ordering and minimal distinguishable snippets. Inspect query plans at representative volume.

**Data and migration impact:** No search index service initially. Add database indexes only from plan evidence and migration review.

**Controls:** Exclude payroll, payment and other sensitive record types from the first release. Do not return inaccessible customer analytics destinations.

**Verification:** Test exact SKU/code/reference, ambiguous names, tenant/location negatives, inaccessible destinations, timeouts and bounded query plans.

**Rollout and gate:** G2: scoped retrieval and measured performance meet D09 budgets.

**Blockers and assumptions:** D02 basic customer profile versus existing destination; representative dataset size is not yet established.

**Definition of done:** Each enabled domain has bounded queries, correct links and zero unauthorized snippets/counts in negative fixtures.

### UX05 — Integrate business search into the shell

**Status:** PROPOSED. **Priority:** P1. **Owner:** Shell frontend engineer. **Effort:** 3–5 person-days. **Depends on:** UX03, UX04. **Use cases:** UC02.

**Current state:** Navbar currently searches authorized navigation destinations only.

**Objective:** Let users find pages and records from one understandable keyboard-accessible interaction.

**Implementation locations:** `components/dashboard/Navbar.tsx`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Preserve page search and add separate Records groups with recognizable type/reference/context.
2. Debounce requests, cancel obsolete work, suppress stale responses and clear results when session or organization changes.
3. Support loading, no results, partial domains, retry and preserved query text.

**Data and migration impact:** No persistent sensitive search history in the first release.

**Controls:** Use server permission decisions and allowlisted local destinations; never infer grants from search results.

**Verification:** Browser exact/ambiguous tasks, rapid query changes, tenant switch, transient failure, keyboard selection and EN/FR.

**Rollout and gate:** G3/G4: correct-record tasks pass; release item/customer/PO domains independently if one is blocked.

**Blockers and assumptions:** Requires UX03 destination and UX04 query contract; destination mismatch cannot be hidden by UI.

**Definition of done:** Users reach the intended authorized records with complete partial/error behavior and no stale-result replacement.

### UX06 — Resolve payroll proof from controlled records

**Status:** PROPOSED. **Priority:** P1. **Owner:** Payroll backend owner + controls reviewer. **Effort:** 4–6 person-days. **Depends on:** UX01. **Use cases:** UC03.

**Current state:** Settlement already enforces proof and balance controls, but forms require technical hashes.

**Objective:** Expose eligible evidence and resolve submitted record IDs to current proof inside the controlled settlement operation.

**Implementation locations:** `services/payroll/payment-reconciliation.service.ts`; `actions/payroll/payroll-payment-reconciliation.actions.ts`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Project eligible register versions and existing provider/match/statement evidence with readable context.
2. Accept stable record IDs and resolve authoritative hashes and eligibility in the transactional command.
3. Preserve balance revision, amount/currency checks, current authority, separation of duties, idempotency and close invalidation; review compatibility of existing callers.

**Data and migration impact:** Reuse existing records/events; no evidence upload or new proof-truth table in this slice.

**Controls:** Reject stale, revoked, ambiguous, mismatched and foreign-tenant sources. Selection alone cannot settle a batch.

**Verification:** Extend focused settlement tests for eligible IDs, races, replay/unknown outcomes and every rejection condition; use transactional integration fixtures.

**Rollout and gate:** G2: payroll and controls owners approve evidence semantics and regression evidence.

**Blockers and assumptions:** D03 eligibility/version policy and test fixtures; no statutory formula changes are included.

**Definition of done:** No client-supplied hash determines business truth, and existing controlled settlement invariants remain demonstrated.

### UX07 — Replace manual payroll hashes with guided selection

**Status:** PROPOSED. **Priority:** P1. **Owner:** Payroll frontend engineer + QA. **Effort:** 3–5 person-days. **Depends on:** UX06. **Use cases:** UC03.

**Current state:** Source-register and evidence hash text fields are blank despite linked source context.

**Objective:** Complete settlement-proof submission without technical identifier copying.

**Implementation locations:** `components/payroll/PayrollPaymentSettlementForm.tsx`; `components/payroll/PayrollPaymentReconciliationWorkbench.tsx`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Add eligible register/evidence selectors with reference, version, date, amount, currency and review status.
2. Show remaining obligation and confirmation summary; explain unavailable evidence and link to its source workflow.
3. Keep hashes in optional technical details; retain appropriate inputs through validation, stale-session and uncertain-result recovery.

**Data and migration impact:** No new evidence storage.

**Controls:** Never display selected evidence as confirmed payment; server checks remain authoritative.

**Verification:** First-submit task without a hash; stale/revoked/no-evidence and partial/final amount flows; fresh-auth return, EN/FR and keyboard errors.

**Rollout and gate:** G3/G4: payroll task and controls regression evidence accepted before pilot.

**Blockers and assumptions:** Authorized payroll fixtures and reviewer access are required.

**Definition of done:** Eligible proof can be selected and submitted, ineligible choices explain recovery, and unknown outcomes cannot duplicate settlement.

### UX08 — Project communication delivery exceptions

**Status:** PROPOSED. **Priority:** P2. **Owner:** Communication backend owner. **Effort:** 3–5 person-days. **Depends on:** UX01. **Use cases:** UC04.

**Current state:** Statement and invitation histories have source-owned recovery; no cross-record discovery projection was found.

**Objective:** Provide a durable, paginated exception read model over existing delivery sources.

**Implementation locations:** `services/users/user-invitation-history.service.ts`; `components/customers/CustomerStatementWorkflow.tsx`; `services/communication/whatsapp-receipt-worker.service.ts`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Start with statement and invitation adapters, source links and masked recipients.
2. Keep queued, accepted, confirmed delivered, failed, deferred and unknown meanings explicit by transport capability.
3. Filter by authorized source/channel/state/date; add receipt support only after its recovery contract is verified.

**Data and migration impact:** Reuse outbox/history storage. No new delivery engine or generic notification status model.

**Controls:** Apply source permissions before paging/counting; redact tokens and destinations; preserve consent and disabled-transport semantics.

**Verification:** Test durable reload, scope, redaction, partial adapter failure, unknown outcome and disabled-provider labels.

**Rollout and gate:** G2: source owners approve status mapping and privacy contract.

**Blockers and assumptions:** D04 channel certainty mapping and operator ownership; delivered status requires source evidence.

**Definition of done:** Exceptions remain discoverable across reloads with accurate source status and authorized recovery links.

### UX09 — Deliver the communications worklist

**Status:** PROPOSED. **Priority:** P2. **Owner:** Communication frontend engineer + support owner. **Effort:** 3–5 person-days. **Depends on:** UX08. **Use cases:** UC04.

**Current state:** Users must know which source record to open to discover delivery failure.

**Objective:** Give operators a clear queue and next action for delivery issues.

**Implementation locations:** `app/[locale]/(dashboard)/dashboard/settings/notifications/NotificationsSettingsClient.tsx`; `components/Forms/users/InvitationHistory.tsx`; `components/customers/CustomerStatementWorkflow.tsx`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Add Delivery issues at an authorized destination with filters, age, masked recipient, source reference and last safe reason.
2. Link to existing recovery workflows and refresh from source truth after a retry.
3. Document ownership, unknown-result handling and escalation; release the read-only queue first.

**Data and migration impact:** No new send log, bulk-send mechanism or delivery assertion.

**Controls:** Do not send messages on page load or acknowledgment. Existing retries retain authority and duplicate protection.

**Verification:** Test failed/deferred/unknown discovery, safe source retry handoff, reload, provider-disabled and EN/FR accessible layouts.

**Rollout and gate:** G3/G4: support can complete the exception task; no live external sends required for test evidence.

**Blockers and assumptions:** Communications owner must accept queue responsibility and escalation policy.

**Definition of done:** Each displayed issue has an accurate state and useful authorized next step; acknowledgment never implies delivery.

### UX10 — Build redacted cross-record audit reads

**Status:** PROPOSED. **Priority:** P2. **Owner:** Audit backend owner + privacy reviewer. **Effort:** 3–5 person-days. **Depends on:** UX01. **Use cases:** UC05.

**Current state:** AuditLog and domain histories exist; an eight-event accounting projection is not a general explorer.

**Objective:** Support filtered investigations without exposing raw audit payloads.

**Implementation locations:** `prisma/schema.prisma`; `services/accounting/control-center.service.ts`; `services/audit (new)`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Start with access and item event families; allowlist readable fields per event type.
2. Apply organization/audit/entity/location authority before cursor pagination and counts.
3. Specify stable snapshot/order semantics, event coverage limitations and authorized source links.

**Data and migration impact:** Reuse existing audit indexes subject to query-plan validation; do not rewrite historical events or add an audit table solely for this view.

**Controls:** Never emit raw changes JSON, IP or user-agent by default. Do not equate visibility with completeness or tamper resistance.

**Verification:** Test field redaction, revoked authority, foreign tenant, pagination under concurrent events and bounded query plans.

**Rollout and gate:** G2: event allowlist and coverage statements accepted by privacy and domain owners.

**Blockers and assumptions:** D05 visible fields/retention and actual event-family coverage must be reviewed.

**Definition of done:** Allowed events can be filtered safely with stable pagination and explicit coverage boundaries.

### UX11 — Deliver audit investigation workflows

**Status:** PROPOSED. **Priority:** P2. **Owner:** Audit frontend engineer + QA. **Effort:** 3–5 person-days. **Depends on:** UX10. **Use cases:** UC05.

**Current state:** Users cannot investigate changes through a general cross-record view.

**Objective:** Reconstruct defined access/item incidents without developer log access.

**Implementation locations:** `app/[locale]/(dashboard)/dashboard/settings/audit (new)`; `components/audit (new)`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Add date/actor/action/entity filters, cursor navigation and safe event details.
2. Distinguish source unavailable, detail redacted and event coverage missing.
3. Provide authorized source links and task guidance; defer financial families and exports until separately reviewed.

**Data and migration impact:** No export storage or new historical truth.

**Controls:** Read-only explorer does not add audit-write or source-edit authority; filters cannot bypass entity permissions.

**Verification:** Browser reconstructs baseline incidents; test restricted details, lost authority, fixed-snapshot paging, EN/FR and keyboard.

**Rollout and gate:** G3/G4: investigation task accepted with explicit source coverage limits.

**Blockers and assumptions:** Representative synthetic incident timeline and D05 field decisions are needed.

**Definition of done:** Operators reconstruct the agreed scenarios from safe evidence and see when evidence is incomplete.

### UX12 — Implement durable access-request lifecycle

**Status:** PROPOSED. **Priority:** P2. **Owner:** IAM backend owner + security reviewer. **Effort:** 5–8 person-days. **Depends on:** UX01. **Use cases:** UC06.

**Current state:** Denial pages advise contacting an administrator; actual grant services already exist.

**Objective:** Track requests and decisions while preserving current grant authority.

**Implementation locations:** `prisma/schema.prisma`; `services/users/member-access.service.ts`; `services/roles/role-editor.service.ts`; `services/access-requests (new)`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Add tenant/requester/normalized-target/reason/reviewer/revision/timestamps and durable transitions; deduplicate pending requests and support withdrawal/expiry.
2. Separate pending/approved/declined/withdrawn/expired decisions from grant application pending/applied/failed states.
3. Use current grant services with current reviewer ceilings, no self-approval, revision fencing and audit events; verify effective access before claiming completion.

**Data and migration impact:** Additive migration with tenant indexes and pending uniqueness strategy; avoid backfill unless a real historical source exists. Set retention before rollout.

**Controls:** No automatic subscriptions, purchases, module activation or entitlement bypass. Requesters cannot set tenant/reviewer/grants arbitrarily.

**Verification:** Database concurrency, duplicate creation, competing decisions, revoked reviewers, self-approval, partial grant failure and safe retry; migration rehearsal.

**Rollout and gate:** G2: security approves transitions and grant boundary; schema and concurrency checks pass.

**Blockers and assumptions:** D06 reviewer ownership, expiry, notification policy and service recovery behavior.

**Definition of done:** Every decision and application attempt is attributable; approved is never falsely presented as effective access.

### UX13 — Connect denials to requester and reviewer queues

**Status:** PROPOSED. **Priority:** P2. **Owner:** IAM frontend engineer + operations owner. **Effort:** 3–5 person-days. **Depends on:** UX12. **Use cases:** UC06.

**Current state:** NotAuthorized offers navigation but no tracked handoff.

**Objective:** Let staff request review, track the decision and safely return after access is verified.

**Implementation locations:** `components/NotAuthorized.tsx`; `components/dashboard/DashboardRouteState.tsx`; `app/[locale]/(dashboard)/dashboard/settings/access-requests (new)`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Offer request review for eligible authenticated permission denials with task and reason.
2. Provide requester timeline and authorized reviewer queue with explicit decision and application outcomes.
3. Keep expired authentication, unavailable modules and permission denials distinct; use allowlisted local callback paths.

**Data and migration impact:** Use UX12 storage; no parallel request cache or email-only workflow.

**Controls:** Notifications and denial labels reveal no protected records; no requester self-approval or client-computed access success.

**Verification:** Role/tenant negatives, reviewer revocation, withdrawal/expiry, failed grant, safe return and EN/FR keyboard tasks.

**Rollout and gate:** G3/G4: staff and reviewers complete the handoff; rollback disables new submissions while preserving history.

**Blockers and assumptions:** A real reviewer must own the queue; elapsed SLA is not authorization to grant access.

**Definition of done:** Requests have visible ownership and accurate status, and return navigation succeeds only after current authority is checked.

### UX14 — Persist new-PO drafts and fence order creation

**Status:** PROPOSED. **Priority:** P1. **Owner:** Purchasing backend owner + data reviewer. **Effort:** 5–8 person-days. **Depends on:** UX01. **Use cases:** UC07.

**Current state:** Create service allocates and creates in a transaction; no replay fence was found in that inspected create path. Edit drafts already exist separately.

**Objective:** Preserve incomplete authoring and resolve uncertain create results without duplicate orders.

**Implementation locations:** `services/purchase-order/purchase-order.service.ts`; `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts`; `prisma/schema.prisma`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Add scoped durable authoring drafts with revision, incomplete-field support and explicit save/discard; keep them separate from business PO lifecycle.
2. Persist a stable create request key, canonical payload hash and atomic result linkage; inspect existing event/idempotency infrastructure before choosing additive storage.
3. On retry return the same result for same payload, reject key reuse with changed payload and expose scoped request-status lookup. Recheck current validation and authority when creating.

**Data and migration impact:** Likely additive draft model plus unique organization/request fence or compatible existing infrastructure. Review retention, index and migration plans; no business-data backfill by default.

**Controls:** Saving an authoring draft allocates no PO number, stock, payable or outbound message. Server document numbering and transactional validation remain authoritative.

**Verification:** Concurrent creates, lost response after commit, replay after tab closure, changed payload, revoked permission, multi-tab revision conflict and migration rehearsal.

**Rollout and gate:** G2: database tests prove one order per accepted request and correct conflict recovery.

**Blockers and assumptions:** D07 draft retention and durability policy; compatibility with existing business-event infrastructure requires inspection.

**Definition of done:** An uncertain submission can be resolved without issuing a new key, and incomplete drafts survive the agreed interruption boundaries.

### UX15 — Deliver new-PO save, resume and recovery UX

**Status:** PROPOSED. **Priority:** P1. **Owner:** Purchasing frontend engineer + QA. **Effort:** 4–6 person-days. **Depends on:** UX14. **Use cases:** UC07.

**Current state:** ModernCreatePurchaseOrderForm keeps authoring in state; edit form has scoped session draft and uncertain-result protection.

**Objective:** Restore new-order work and make saved, unsaved and uncertain states understandable.

**Implementation locations:** `components/purchase-orders/ModernCreatePurchaseOrderForm.tsx`; `components/purchase-orders/ModernEditPurchaseOrderForm.tsx`; `components/purchase-orders/purchase-order-edit-draft.ts`; `app/[locale]/(dashboard)/dashboard/purchase-orders/new/page.tsx`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Integrate durable save/resume/discard with honest saved-state feedback and revision conflicts.
2. Retain the stable request identity across submission; resolve status before offering same-key retry after uncertainty.
3. Clear actor/organization-local data on session changes and preserve the existing edit recovery behavior; reconcile changed suppliers/items before submission.

**Data and migration impact:** Use UX14 draft/request persistence; do not store sensitive drafts under unscoped browser keys.

**Controls:** Never label an uncertain create as definitely failed or encourage a new submission key before resolution.

**Verification:** Close/reopen, navigation interruption, network/storage failure, sign-out/in, tenant switch, multi-tab and commit-with-lost-response scenarios; existing edit tests remain passing.

**Rollout and gate:** G3/G4: restore and uncertain-result tasks pass before enabling writes for the cohort.

**Blockers and assumptions:** UX14 durable contract and explicit policy for unsaved local edits on logout.

**Definition of done:** Users recover the last confirmed saved draft, understand any unsaved delta and cannot duplicate a committed PO by retrying the same request.

### UX16 — Expose safe alert processing diagnostics

**Status:** PROPOSED. **Priority:** P1. **Owner:** Reconciliation backend owner + SRE. **Effort:** 3–5 person-days. **Depends on:** UX01. **Use cases:** UC08.

**Current state:** Inbox worker tracks attempts, retry time and safe error codes; dashboard maps business payload status and omits processing fields.

**Objective:** Explain whether a reconciliation alert is queued, delayed, leased, retried or dead-lettered.

**Implementation locations:** `services/reconciliation/payment-reconciliation-dashboard.service.ts`; `services/payments/payment-reconciliation-inbox-worker.service.ts`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Add a dedicated operator projection of processing state, attempts, last safe error, age, next attempt and eligibility.
2. Keep scan state, business notification meaning and worker lifecycle separate in names and presentation.
3. Reuse existing inbox records and query scope; check current indexes before adding any.

**Data and migration impact:** No new queue. Read existing fields; no attempt resets or destructive status normalization.

**Controls:** Do not reuse the worker DTO in the browser: it includes leaseToken. Omit lease secrets, payload secrets and sensitive proof details.

**Verification:** Test all worker states, redaction, foreign tenants, live leases, missing metadata and bounded projections.

**Rollout and gate:** G2: SRE/domain owner approve status meanings and safe disclosure.

**Blockers and assumptions:** D08 operator authority and recoverability classification; processing state must not be mistaken for settlement.

**Definition of done:** Operators can distinguish stalled versus scheduled work with safe data and accurate next-action eligibility.

### UX17 — Add guarded alert recovery and escalation

**Status:** PROPOSED. **Priority:** P1. **Owner:** Reconciliation engineer + SRE owner. **Effort:** 4–6 person-days. **Depends on:** UX16. **Use cases:** UC08.

**Current state:** DurableNotificationInbox shows recorded alerts; no inspected operator diagnostic/recovery handoff exists.

**Objective:** Recover eligible processing failures while protecting leases, poison-message handling and auditability.

**Implementation locations:** `components/finance/PaymentReconciliationWorkbench.tsx`; `services/payments/payment-reconciliation-inbox-worker.service.ts`; `actions/payments`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Render diagnostic details and source links in the existing inbox; release read-only diagnostics first.
2. Implement an explicit scoped recovery command using current authority, revision/request-key fencing and an audit event. Reuse safe worker transition primitives.
3. Reject active-lease theft; escalate poison/redaction failures with a runbook rather than blindly retrying. Refresh authoritative outcome after commands.

**Data and migration impact:** Reuse queue and event data; add a recovery command record only if current idempotency/audit infrastructure cannot meet the contract.

**Controls:** Recovery affects alert processing only, never reconciliation settlement, accounting balances or proof truth. Do not expose worker lease tokens.

**Verification:** Concurrent operator/worker race, live lease, revoked authority, replay, poison payload, dead-letter recovery and safe errors; browser status interpretation task.

**Rollout and gate:** G3/G4: diagnostics can ship first; recovery commands require the stricter concurrency and runbook gate.

**Blockers and assumptions:** D08 retry authority, escalation owner and worker-transition compatibility.

**Definition of done:** Eligible work recovers once, ineligible work explains escalation, and no financial or lease invariant is bypassed.

### UX18 — Complete integration and release evidence

**Status:** PROPOSED. **Priority:** P0. **Owner:** QA lead + security + domain reviewers. **Effort:** 5–8 person-days. **Depends on:** UX03, UX05, UX07, UX09, UX11, UX13, UX15, UX17. **Use cases:** UC01, UC02, UC03, UC04, UC05, UC06, UC07, UC08.

**Current state:** Current tests cover foundations, not the eight proposed end-to-end workflows.

**Objective:** Prove each delivered slice and its interactions on a reproducible release candidate.

**Implementation locations:** `components`; `services`; `actions`; `prisma`; `what-next/ui-workflow-roadmap`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Run focused unit/contract and real-database integration tests for changed boundaries; rehearse additive migrations on disposable data.
2. Execute authorized, denied and limited-role browser tasks in EN/FR at 390px and desktop; include keyboard, focus and screen-reader checks.
3. Record query-budget measurements, rollback rehearsal, source/runtime revision and unresolved defects; map every UC acceptance check to evidence.

**Data and migration impact:** No production migration through a generic build command. Use reviewed migration workflow and disposable rehearsal fixtures.

**Controls:** Zero accepted unauthorized disclosure, duplicate create/grant, stale proof acceptance or lease theft in negative fixtures.

**Verification:** G2/G3 evidence plus feature-specific acceptance matrix; command-bearing features need race/uncertain-result checks beyond screenshots.

**Rollout and gate:** G4 is evaluated per feature so completed slices can pilot; aggregate UX18 closes only after all eight pass.

**Blockers and assumptions:** Authenticated test environment, database fixtures and reviewer availability remain release blockers until supplied.

**Definition of done:** Each enabled feature has complete evidence and no unresolved critical/high defect; deferred features remain disabled and explicitly tracked.

### UX19 — Pilot, measure and hand over operations

**Status:** PROPOSED. **Priority:** P0. **Owner:** Product owner + SRE + support. **Effort:** 3–5 person-days. **Depends on:** UX18. **Use cases:** UC01, UC02, UC03, UC04, UC05, UC06, UC07, UC08.

**Current state:** Value expectations have not been measured and feature ownership is not yet assigned by name.

**Objective:** Confirm task value and operational supportability before broader rollout.

**Implementation locations:** `docs/ui-workflow-roadmap`; `what-next/ui-workflow-roadmap`; `docs/prompt-execution/04_IMPLEMENTATION_ROADMAP.md`. Paths marked new are proposals; existing directories identify a discovery scope, not permission for a broad rewrite.

**Implementation steps:**

1. Start the agreed cohort per G4-approved feature; train users on tasks, uncertainty and escalation.
2. Compare task outcomes with UX00 baseline, review privacy-safe telemetry and gather failure reports.
3. Exercise feature rollback, preserve drafts/requests/audit history, assign support and monitoring ownership, then decide expansion.

**Data and migration impact:** Roll back exposure and command entry points; do not drop additive tables or delete historical requests/drafts during feature rollback.

**Controls:** No automatic command activation or broad rollout when baseline/reviewer evidence is missing.

**Verification:** G5 cohort task evidence, metric comparison, incident drill, operator runbook and rollback record.

**Rollout and gate:** G5: named product/domain/SRE owners accept outcomes and support; expand incrementally with stop conditions.

**Blockers and assumptions:** Pilot duration and cohort capacity are decisions, not promised dates. Parent rollout work R31–R33 must be coordinated.

**Definition of done:** All eight features are accepted or explicitly held with an owner and remediation plan; the roadmap is complete only when every accepted proposal has passed its release gate.

## Feature acceptance and value measurement

| Case | Minimum user acceptance | Metric to baseline |
| --- | --- | --- |
| UC01 | Reader answers item/stock questions without update authority; unknown never becomes zero. | Correct-answer time; screens visited; denied edit detours. |
| UC02 | Exact and ambiguous references open the correct accessible destination; partial results are explicit. | Correct-record retrieval time and accuracy; query latency. |
| UC03 | Controller selects eligible proof without a manual hash; invalid/replayed proof cannot settle twice. | First-submit success; evidence errors; technical-help requests. |
| UC04 | Operator finds a durable issue and reaches safe source recovery; accepted is not delivered. | Oldest unresolved issue; discovery-to-action time; duplicate sends. |
| UC05 | Auditor reconstructs the agreed scenario with safe fields and visible coverage limits. | Scenario reconstruction time; reachable relevant events. |
| UC06 | Request is tracked through decision and verified application; stale/self decisions cannot grant access. | Decision time; duplicate requests; repeat blocked attempts. |
| UC07 | Saved new-order work resumes; commit-with-lost-response resolves to exactly one order. | Restoration success; re-entry minutes; uncertain creates resolved without duplicates. |
| UC08 | Operator diagnoses a stalled alert and retries only eligible work without stealing a lease. | Oldest stalled alert; diagnosis/recovery time; repeat dead letters. |

UX00 owns baseline collection; domain owners review correctness; product compares pilot outcomes. A suggested task-time improvement target is 20% only if UX00 finds enough friction and sample size to justify it. It is not a forecast or release substitute. Report task success and error counts alongside time; faster incorrect completion is failure. Record denominators, role, dataset, language and environment. Use privacy-safe aggregate telemetry, never raw search text, employee proof or recipient tokens.

## Verification commands and evidence policy

Existing tests that are appropriate starting points (new behavior still needs dedicated tests):

```powershell
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath components/purchase-orders/__tests__/purchase-order-edit-draft.test.ts services/payments/__tests__/payment-reconciliation-inbox-worker.service.test.ts
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath config/__tests__/sidebar.test.ts components/dashboard/__tests__/DashboardRouteState.test.tsx services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/users/__tests__/user-invitation-history.service.test.ts
```
Run focused changed-boundary tests first, then typecheck and scoped lint as appropriate for implementation. Save command, exit code, revision, environment and failures without attributing existing failures to this work. New database concurrency and browser tests must be authored against real contracts; the commands above alone do not certify them. **Do not run generic npm build as a harmless check:** the inspected build script includes migration-related operations. Use the reviewed build/migration process for the release environment.

Evidence for each package goes into a package-specific execution record with source diff, test results, role matrix, runtime identity, decision links and gate sign-off. The machine-readable [work package registry](<E:/ohada saas/Focused projects/stoquify/what-next/ui-workflow-roadmap/work-package-registry.json>) records this initial plan; update status only after evidence satisfies the package contract.

## Rollback and stop conditions

Disable the affected feature entry point/read endpoint or command exposure using the existing release mechanism. Recheck direct-route/action access, not only navigation. Preserve durable requests, drafts, audit events and idempotency results. Drain or pause affected recovery commands safely; do not reset live leases or drop tables as a feature rollback. Schema rollback requires its own reviewed data-preserving migration. Stop expansion on any tenant leak, unauthorized grant, duplicate order/settlement, stale-proof acceptance, lease theft, or misleading outcome state. Define numeric performance/error stop thresholds in D09 from baseline evidence.

## First execution brief

Start with UX00 and UX01, then implement UX02/UX03 as the first vertical slice. Revalidate current files and the parent roadmap, assign owners and fixture access, freeze the item read DTO and location/field permissions, add the reader destination and focused tests, then perform authorized/denied EN/FR browser tasks. Save the implementation diff and evidence. Do not start all eight user interfaces against speculative contracts. Continue the remaining lanes in the dependency order above once each entry gate is met.

## Scope exclusions

No application feature was implemented by this roadmap run. No AI decision system, statutory formula change, provider activation, external send, bulk retry, generic approval platform, new search infrastructure or audit export is included. Existing POS recovery and PO edit recovery are foundations to retain. Expansion beyond the eight proposals requires a new evidenced user outcome and dependency assessment.

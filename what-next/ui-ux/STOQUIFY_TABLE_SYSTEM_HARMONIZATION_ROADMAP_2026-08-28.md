# Stoquify Table System Harmonization Roadmap

Date: 2026-08-28  
Planning horizon: NOW / NEXT / LATER  
Implementation in this task: None

## Outcome

Create one governed Stoquify table system that remains domain-specific at the workflow layer. The shared system must make query scope, selected scope, authorization scope, and evidence scope explicit while allowing different table archetypes to adapt density and mobile behavior.

Target movement: raise the audited table-system score from **61.9/100** to **75+ after NOW**, **84+ after NEXT**, and **88+ after LATER**, without weakening tenant isolation, RBAC, commercial-module enforcement, redaction, or service-owned accounting/inventory/payroll/reconciliation truth.

## Governing decisions

- Keep TanStack Table as the default headless engine.
- Treat `DataTable`, pagination, view options, toolbar, date range, and robust state primitives as one versioned product contract.
- Provide archetype presets, not one configuration that exposes every feature everywhere.
- Make server query state authoritative for any unbounded, permission-sensitive, exportable, or high-volume result set.
- Persist preferences and saved views by stable column/filter identifiers plus schema version.
- Keep authorization independent from presentation. Hidden columns and filtered-out rows do not grant or revoke access.
- Make bulk mutation call protected server actions and produce domain-appropriate audit/evidence events.
- Require adaptive mobile behavior by archetype.
- Gate virtualization and premium grid adoption on measured need.

## Target contract

Every canonical table surface should declare:

| Contract area | Required declaration |
| --- | --- |
| Identity | Stable table ID, archetype, schema version, route/module owner |
| Data ownership | Client-bounded, server-offset, server-cursor, streaming, or immutable evidence |
| Query | Search fields, typed filters, sort keys, deterministic tie-breaker, page/cursor semantics |
| View | Allowed columns, role default, personal preferences, density, mobile priority |
| Selection | None, visible page, loaded result, explicit IDs, or all matching via server token |
| Actions | Per-row/bulk actions, required permission, module, fresh-auth, reason, confirmation, recovery |
| States | Loading, refreshing, empty-unfiltered, empty-filtered, error, permission denied, module locked, stale |
| Evidence | Export permission, query snapshot, actor, generated time, locale, timezone, entity, currency, checksum/job ID |
| Accessibility | Sort/name/state semantics, keyboard map, focus restoration, announcements, minimum target behavior |
| Performance | Expected rows, page size, latency budget, rendering budget, virtualization eligibility |
| Localization | EN/FR copy keys, locale-aware date/number/currency, no concatenated grammar-sensitive strings |

## Reference architecture

```text
Route permission/module gate
  -> trusted read model / server query
  -> table query adapter (URL + typed filters + stable sort)
  -> canonical table shell (archetype preset)
  -> user/role view adapter (permission-safe + versioned)
  -> selection scope token
  -> protected row or bulk action
  -> domain service transaction
  -> audit/evidence event + refreshed read model
```

The table shell must never become an alternate business-logic layer. It can orchestrate presentation state and request commands; domain services own invariants and durable facts.

## NOW: foundation and three pilots

Target: 2-3 delivery slices. Objective: correctness, consistency, and a reusable adoption path.

### N0. Freeze the table contract and baseline

Deliverables:

- Publish a typed table definition covering the target contract above.
- Register every table-bearing route by archetype, data owner, permission/module gate, and migration state.
- Ratchet the inventory so new bespoke table markup requires an exception.
- Define score and performance baselines using the evidence scorecard and representative datasets.

Acceptance criteria:

- Weights and score totals reconcile to 100.
- Every priority route has one query owner and one named archetype.
- Existing tables remain behaviorally unchanged until migrated.
- No product certification claim is introduced.

Likely touchpoints when approved: shared table types/contracts, table contract tests, route inventory tooling, UI/UX governance docs.

### N1. Harmonize the shared shell

Deliverables:

- One toolbar composition model for title/count, search, typed filters, active-filter summary, saved view, columns, density, export, and actions.
- Correct pagination range and result-count copy for known, estimated, and unknown totals.
- Stable sortable-header semantics and keyboard activation.
- Explicit robust states, including filtered-empty versus no-data-empty.
- Versioned local preference adapter for density and column visibility/order; server synchronization remains feature-gated.
- Standard EN/FR translation keys for table controls and announcements.

Acceptance criteria:

- Toolbar controls have one predictable order and responsive overflow behavior.
- Sort state, active filters, result count, and selected count are programmatically exposed.
- Focus survives filtering, paging, and row-action completion.
- Preference migration handles removed/renamed columns safely.
- Unknown totals never display a false `x of y` claim.

Likely touchpoints when approved: `components/DataTableComponents/DataTable.tsx`, pagination, view options, picker, date range, shared route states, messages, focused contract tests.

### N2. Establish query and saved-view ownership

Deliverables:

- Typed URL schema for search, filters, sort, page/cursor, density, and active view ID.
- Debounced search with cancellation and stale-response protection.
- Server-owned saved-view model with `tableId`, `schemaVersion`, owner scope, organization, role visibility, query definition, column definition, density, and mobile priority.
- Administrator-published role defaults plus personal views.
- Permission-safe hydration that drops filters/columns a user is no longer allowed to access.

Acceptance criteria:

- Refresh and shareable URLs reproduce the same authorized result set.
- Browser back/forward restores table state.
- A saved view cannot expose a forbidden field through its definition, label, count, or export.
- Schema-version migration fails closed to a safe default view.
- Deleting a personal view is recoverable during the current session or requires explicit confirmation.

Dependency: approval of cross-device preference synchronization and first role-default owners.

### N3. Define selection, bulk action, and recovery semantics

Deliverables:

- Selection state based on durable row IDs.
- Separate modes for page selection, explicit-ID selection, and server-issued all-matching selection tokens.
- Bulk-action bar that states exact scope and excludes ineligible rows with reasons.
- Action policy metadata for permission, module, fresh authentication, reason code, confirmation, asynchronous job, idempotency, and recovery path.
- Post-action result summary with succeeded, failed, skipped, and retryable counts.

Acceptance criteria:

- No UI copy implies all matching records when only the page is selected.
- Query changes invalidate all-matching tokens and re-evaluate explicit IDs.
- Partial failure cannot be mistaken for total success.
- Controlled facts use compensating/correction workflows instead of destructive undo.
- Every financial, payroll, inventory, and permission-changing bulk action produces the required audit event.

### N4. Pilot A: inventory items

Archetype: Master/reference list.

Scope:

- Preserve `inventory.items.read` and create/update action gates.
- Make server pagination/filter ownership explicit.
- Add saved task views such as low stock, inactive, missing supplier, and recently changed only when data fields already exist.
- Add priority-column mobile layout and row detail.

Exit criteria:

- Counts, URL state, selection scope, and export query agree.
- Desktop, tablet, and phone behavior is documented with approved seeded evidence.
- Keyboard and screen-reader smoke covers sort, filter, selection, columns, pagination, and row actions.

### N5. Pilot B: purchase orders

Archetype: Transaction work queue.

Scope:

- Preserve `purchases.orders.read/create/update` and purchasing-module boundaries.
- Add queue views such as awaiting approval, awaiting supplier, overdue, partial receipt, and exceptions only where current domain statuses support them.
- Keep analytics table semantics separate from order-work-queue semantics.
- Require reason and evidence behavior for controlled bulk transitions.

Exit criteria:

- Status/action eligibility is service-owned and explained per row.
- Bulk scope remains correct across paging and filtering.
- Analytics sorting and accessibility tests remain green.

### N6. Pilot C: payment reconciliation

Archetype: Evidence/audit ledger plus transaction work queue.

Scope:

- Preserve `payments.reconciliation.read` and payment-reconciliation module enforcement.
- Standardize account/provider/tender/currency/date/status/exception filters.
- Make match, exception, evidence, and export states explicit.
- Export from a server-side query snapshot with organization/account/currency/time-zone context.

Exit criteria:

- Every displayed and exported reconciliation result can be tied to a query snapshot and source identifiers.
- Redacted/forbidden data is absent from counts, views, rows, and exports.
- Reconciliation corrections use domain workflows rather than inline mutation of durable facts.

## NEXT: module normalization and scale contracts

Target: after the three pilots prove the contract.

### X1. Finance and accounting archetypes

- Normalize receivables, payables, cash history, journals, trial balance, P&L, cash flow, and close evidence.
- Introduce finance-statement behavior: frozen identity columns, numeric alignment, multi-currency totals, period/entity context, and drill-to-evidence.
- Keep editable journal drafts separate from posted journal/evidence tables.
- Add export manifests and asynchronous jobs for large statements.

### X2. Payroll and HRIS privacy-aware views

- Normalize employees, contracts, compensation, attendance, register, payments, declarations, approvals, and people history.
- Preserve the boundary that payroll access does not unlock HRIS people truth.
- Add own-record, manager-scope, payroll-admin, and auditor view policies.
- Make effective date, country pack, redaction, and payment evidence part of the table/export context.

### X3. POS, cash drawer, inventory movements, and loss control

- Optimize for fast scan/action and intermittent connectivity.
- Keep POS operational surfaces tactile and minimal; use tables for history and exceptions, not the core sale interaction.
- Preserve offline/replay state and idempotency where actions can queue.
- Normalize movement and drawer evidence identifiers, source, actor, terminal/location, and status.

### X4. Sales, suppliers, customers, compliance, and administration

- Migrate remaining master/reference and queue tables by value and reuse potential.
- Use simple bounded-table presets for detail subtables and setup lists.
- Use evidence/audit presets for compliance and assurance.
- Remove bespoke markup only after behavior parity is documented.

### X5. Performance envelope and virtualization trial

- Define representative datasets for 100, 1,000, 10,000, and 100,000 matching rows without sending all rows to the browser.
- Measure query latency, interaction latency, rendered-row count, memory, hydration, and export job duration.
- Trial row virtualization on one analytical desktop surface only.
- Verify focus, screen-reader discoverability, sticky/frozen columns, variable heights, print/export, and browser zoom before broader adoption.

Suggested budgets requiring product approval:

| Signal | Proposed target |
| --- | --- |
| Local sort/filter on bounded client set | Interaction response under 100 ms at p75 test hardware |
| Server filter/sort feedback | Loading indication under 150 ms; useful result under 1,000 ms at p75 |
| Page navigation | Useful rows under 750 ms at p75 after cached shell |
| Bulk action acknowledgement | Immediate job receipt; progress and partial result available |
| Preference/view hydration | No visible column-layout flash after initial shell |
| Browser row DOM | Bounded by pagination or proven virtualization strategy |

These are proposed engineering budgets, not current measurements or SLAs.

## LATER: governance, advanced capability, and exception gates

### L1. Table governance program

- Require a table ID, archetype, query owner, and migration status for every table-bearing route.
- Add visual and behavioral reference routes for each archetype.
- Ratchet shared adoption and prohibit new native table shells without a recorded exception.
- Review saved-view schema changes as data-contract changes.
- Add telemetry for filters used, zero-result searches, view adoption, bulk failure, export duration, and mobile abandonment without collecting sensitive values.

### L2. Advanced finance and analytical capability

- Add grouping, aggregation, pinning, and multi-level sort only to archetypes that require them.
- Add scheduled exports/reports only with recipient authorization, retention, and audit controls.
- Add cross-module command views only through trusted read models; do not join business truth in browser state.

### L3. Premium grid exception decision

Evaluate a commercial grid only if measured requirements cannot be met safely with the shared stack. The decision record must include:

- Exact blocked workflows and datasets.
- Accessibility and mobile evidence.
- Bundle, licensing, procurement, security, and long-term migration cost.
- Tenant/RBAC/redaction integration design.
- Export and evidence compatibility.
- A containment plan limiting the grid to named analytical surfaces.

## Migration order

| Order | Surface | Archetype | Why first/next |
| ---: | --- | --- | --- |
| 1 | Shared shell and contracts | Cross-cutting | Fixes propagation and semantics before route migration. |
| 2 | Inventory items | Master/reference | Existing shared-table precedent and manageable risk. |
| 3 | Purchase orders | Work queue | Proves status views, guarded actions, and bulk scope. |
| 4 | Payment reconciliation | Evidence/work queue | Proves audit-safe filters and exports. |
| 5 | Finance statements and ledgers | Statement/evidence | High enterprise value and dense-layout requirements. |
| 6 | Payroll/HRIS | Master/work queue/evidence | High privacy and country-pack complexity. |
| 7 | POS/cash/inventory history | Operational/evidence | Requires mobile/offline sensitivity. |
| 8 | Remaining sales/admin/compliance | Mixed | Migrate with proven presets and low bespoke risk. |

## Cross-cutting release gates

| Gate | Required proof |
| --- | --- |
| Query correctness | URL, visible rows, count, selection, and export use the same authorized query definition. |
| Authorization | Route, row action, bulk action, saved view, and export enforce tenant/RBAC/module/redaction independently. |
| Accessibility | Keyboard-only path, announced sort/filter/count/selection/state, visible focus, zoom, and representative screen-reader pass. |
| Responsive behavior | Approved desktop, tablet, and phone adaptation for the declared archetype. |
| Localization | EN/FR control copy and locale-safe dates, numbers, currency, and plural/range grammar. |
| Recovery | Partial failures, retries, corrections, idempotency, and stale-state handling are explicit. |
| Evidence | High-risk action/export carries actor, scope, query/version, time, and domain evidence identifier. |
| Performance | Representative dataset meets approved budget; no accidental all-row client fetch. |
| Regression | Focused component/contract tests plus authenticated route smoke where credentials are approved. |

## Risks and controls

| Risk | Control |
| --- | --- |
| Shared component becomes over-configurable | Enforce archetype presets and a small capability matrix. |
| Saved view leaks sensitive fields | Validate on write and read against current permission/redaction policy; fail closed. |
| URL exposes sensitive values | Store opaque IDs/tokens where needed; prohibit secrets and raw protected fields. |
| All-matching bulk action drifts | Use short-lived server selection tokens bound to normalized query, actor, tenant, and schema version. |
| Preference migration breaks pages | Version schemas and ignore unknown columns with a safe default fallback. |
| Inline editing bypasses controls | Limit to draft/reference archetypes and protected service commands. |
| Virtualization harms accessibility | Keep it exception-gated and require assistive-technology evidence. |
| Module migration changes business truth | Preserve services/actions; migrate presentation and orchestration only. |
| Dirty-worktree collision | Touch only approved files and isolate each pilot change set. |

## Ownership model

| Responsibility | Accountable role |
| --- | --- |
| Table contract and engine | Principal frontend/platform engineering |
| Archetype behavior and task views | Product design plus domain product owner |
| Query/read-model ownership | Domain backend/data owner |
| RBAC/module/redaction policy | Security and domain authorization owner |
| Financial/payroll evidence semantics | Accounting controls and payroll controls owners |
| Accessibility acceptance | Accessibility lead plus QA |
| Performance budgets | Platform performance lead plus domain owner |
| EN/FR language quality | Localization owner plus domain reviewer |
| Migration release | Module owner and release governance |

## Definition of done

The harmonization program is complete when:

- Every table-bearing route is registered and assigned a canonical archetype or approved exception.
- Query, count, selection, and export scopes cannot diverge silently.
- Shared and role-published views are permission-safe and schema-versioned.
- Dense finance/payroll users can persist useful layouts without creating inconsistent global defaults.
- Bulk actions communicate exact scope, eligibility, progress, partial failure, and recovery.
- Every archetype has an approved phone adaptation.
- Keyboard and screen-reader semantics are verified on representative routes.
- High-volume modes meet measured budgets without shipping unbounded datasets to the browser.
- Evidence exports are reproducible and auditable.
- New bespoke table shells are prevented by governance unless explicitly approved.

## Unresolved questions

- Which role defaults and personal-view synchronization model should ship in NOW?
- Which actions require all-matching selection, and which must remain explicit-ID only?
- What fresh-auth, dual-approval, and reason-code policies apply by action class?
- What exact production-like datasets can be used for performance and browser evidence?
- What saved-view/export retention periods apply across OHADA country packs?
- Which route becomes the analytical virtualization trial after the three pilots?

## Evidence limitations

- Roadmap estimates are sequencing recommendations, not committed dates.
- Performance budgets are proposals and require baseline measurement.
- Browser, screen-reader, and mobile evidence was not generated in this research-only task.
- Competitor capability evidence comes from public documentation, not controlled tenant comparisons.

## Decisions requiring approval

- Architecture: evolve TanStack and exception-gate any alternate grid.
- Product: approve archetypes, first saved role views, and mobile adaptations.
- Controls: approve selection token, action-policy, and export-evidence requirements.
- Delivery: approve the three NOW pilots and their order.
- Quality: approve the cross-cutting release gates and proposed measurement budgets.

## Recommended next implementation prompt

```text
Implement Stoquify table harmonization NOW slice N0-N1 only. Create the typed canonical table contract and archetype registry, then evolve the existing shared TanStack table shell, pagination, view options, robust states, and EN/FR control copy. Preserve all domain services, protected actions, tenant/RBAC/module/redaction boundaries, and unrelated dirty-worktree changes. Do not migrate module routes yet, do not add a new grid library, and do not add virtualization. Add focused contract tests for range/count truth, sort and keyboard semantics, filtered-empty states, responsive toolbar overflow, stable row identity, and versioned preference fallback. Save a dated implementation report with verification results and any blockers.
```


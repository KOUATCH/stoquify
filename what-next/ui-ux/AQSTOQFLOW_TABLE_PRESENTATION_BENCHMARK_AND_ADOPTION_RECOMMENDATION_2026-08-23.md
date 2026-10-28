# Stoquify Table Presentation Benchmark and Adoption Recommendation

Date: 2026-08-23

Decision: **B — incrementally improve the existing TanStack foundation, with a specialized analytical tier only if later evidence justifies it**

Scope: presentation, interaction, responsiveness, accessibility, localization, and client/server data-boundary audit. This document does not authorize application-code changes, data migration, broad backfill, or UI redesign.

## Executive decision

Stoquify should retain its existing semantic-table and TanStack Table foundation and normalize it incrementally. The current system already has the right broad anatomy—toolbar, headers, rows, actions, and attached pagination—and its visual language is closest to the established brand and unit tables. The largest gaps are behavioral consistency and responsive adaptation, not the absence of a capable grid library.

A wholesale MUI X or AG Grid migration is not recommended. Either could add richer analytical behavior, but Stoquify would pay for that capability through migration risk, brand drift, licensing or maintenance cost, a larger accessibility test surface, and a difficult rewrite of payroll, HR, finance, purchasing, POS, and evidence-specific behaviors. A later analytical tier remains reasonable for a narrow set of proven high-volume, comparison-heavy routes.

The recommended order is:

1. Fix shared table contracts: localized copy, accurate result ranges, functional filters only, selection-aware pagination, accessible sort state, and labels/captions.
2. Introduce responsive priority-column behavior and mobile row summaries/cards by table archetype instead of relying on a universal minimum width.
3. Move authoritative and large datasets to server-owned search, sort, date filtering, and pagination using a shared query-state contract.
4. Add density and versioned per-user column preferences.
5. Qualify a specialized analytical tier only against measured workflow and performance thresholds.

## Audit boundary and method

The workspace contained extensive pre-existing user-owned changes. This audit was isolated to read-only inspection of application code, existing graph reports, table contracts, and the prior normalization report. The only new files produced by this audit are documentation artifacts under what-next/ui-ux.

The inventory covers active application and component TSX files containing table renderings. It excludes tests, generated graph output, primitive definitions, legacy/public supplier and customer portals, and non-table card/list views. The inventory found:

| Measure | Count |
| --- | ---: |
| Table-bearing files | 57 |
| Table render occurrences | 74 |
| Shared DataTable adopters | 7 |
| Native/bespoke table files | 35 |
| Files with table-toolbar semantics | 37 |
| Files with pagination semantics | 32 |
| Files with search-like controls | 11 |
| Files with date-range controls | 9 |
| Files containing minimum-width table patterns | 44 |
| Files with explicit aria-sort found by static scan | 2 |

Category distribution:

| Category | Table-bearing files |
| --- | ---: |
| Finance/accounting | 14 |
| Payroll/HRIS | 14 |
| Inventory | 8 |
| Purchasing | 8 |
| Administration/reference data | 4 |
| POS | 2 |
| Other | 7 |

The existing graph evidence reinforces the fragmentation: DataTable.tsx and UnitsManagementDashboard.tsx appear in component community 0, while EnhancedBrandsManagement.tsx appears in community 85 and DataTablePagination.tsx in community 215. Shared anatomy exists, but pagination and table behavior have not converged into one cohesive system contract.

## Current-state findings

### What is already working

- Brand, category, unit, customer, supplier, user, and role routes demonstrate a recognizable Stoquify presentation language.
- The shared DataTable already uses TanStack sorting, filtering, pagination, and column visibility, so the recommended work can evolve existing code.
- Pagination is generally placed directly beneath the table, consistent with Carbon guidance.
- Payroll's HrPayrollTableControls has a stronger bilingual EN/FR baseline, resets the page when query state changes, and reports a visible result range.
- Several transaction-history hooks already model server/query-owned filtering with page size or cursors. Those are useful internal precedents for authoritative datasets.
- Empty, loading, and error states are present in many important workflows, although their presentation is not yet standardized.

### Highest-impact gaps

1. **Responsive behavior is dominated by horizontal scrolling.** Global CSS applies a 1040px minimum width to dashboard tables, and 44 of 57 table-bearing files contain minimum-width patterns. Payroll widths reach 1180–1680px. This preserves every column but does not prioritize identifiers, status, amount, or primary action on small screens.

2. **Sorting is visually present but not consistently exposed to assistive technology.** Sort buttons and icons are common, but only two files were found with an explicit aria-sort literal. Current-direction feedback is also inconsistent.

3. **The generic toolbar presents filters that are not a truthful data contract.** Its Active, Draft, and Archived options are hard-coded rather than supplied by typed column/filter configuration. Most shared-table consumers disable the toolbar and build bespoke controls, which is evidence that the generic abstraction is not sufficiently domain-aware.

4. **Pagination copy is incomplete.** The shared footer reports selection counts even when selection controls are not presented, uses English-only labels, and does not show a range such as 1–25 of 418.

5. **Localization is partial.** The payroll control layer has EN/FR copy, while shared table controls and several payroll date formatters are English-only.

6. **Client/server ownership is inconsistent.** Shared DataTable filters, sorts, and paginates the array already supplied to it. That is correct for bounded reference lists, but it can be incorrect when the array represents only one server page. No shared manualPagination, manualSorting, or manualFiltering boundary is present.

7. **Column settings are ephemeral.** Visibility exists but is not persisted, and column IDs can leak into user-facing labels.

8. **Density is fixed.** Dense payroll, finance, and purchasing work queues need a compact option; ordinary reference lists need a comfortable default. Toolbar and row density should remain matched.

### Live-browser evidence status

A route-level browser pass was attempted for the requested local routes and planned at 375px, 768px, 1280px, and 1536px widths. The desktop browser bridge failed during sandbox setup before a page could open. Therefore this report does not claim visual screenshot, keyboard, screen-reader, or automated accessibility evidence. The failure is recorded in the companion evidence manifest and is an explicit gate before implementation rollout.

## Table archetype policy

One component should not force identical controls onto every table. Stoquify should share presentation semantics and state contracts while allowing behavior to vary by archetype.

| Archetype | Representative surfaces | Appropriate behavior | Avoid |
| --- | --- | --- | --- |
| Master/reference data | Brands, categories, units, locations, tax, customers, suppliers, users, roles | Shared TanStack table; search when useful; sort; range/total pagination; responsive priorities; density and saved columns | Generic status filters with no typed field; unconditional selection text |
| Transaction work queue | Payroll workbenches, HR approvals, purchase orders, POS sessions | Server-owned query state; status/date filters; explicit primary actions; mobile row summary; evidence-aware bulk behavior | Filtering only the currently loaded server page; forcing all columns onto mobile |
| Finance/accounting statement | Accounts, journals, trial balance, statements | Native semantic table; aligned numeric columns; sticky totals/headers where useful; export traceability | Artificial search/pagination where the statement must be read as a whole |
| Analytical/high-volume ledger | Reconciliation, transaction histories, purchase analytics, dense trial-balance analysis | Server-side operations; optional virtualization after profiling; possible specialized tier for grouping/subtotals/comparison | Default virtualization; immediate third-party grid migration |
| Evidence/audit table | Close assurance, compliance, AP controls | Semantic table; caption/context; clear evidence/action state; stable export | Decorative controls that imply unsupported data operations |
| Editable line-item table | Purchase-order or journal editing | Form correctness, predictable focus, row validation, keyboard-safe editing | Generic pagination and grid roles without full composite-widget behavior |
| Bounded detail table | Dialogs and entity-detail summaries | Simple native table; no toolbar unless a real action exists | Mandatory search, filters, pagination, or column chooser |

## Capability benchmark

| Capability | Stoquify today | External benchmark | Option B recommendation |
| --- | --- | --- | --- |
| Anatomy | Toolbar/header/rows/footer broadly established | Carbon treats these as one coherent structure | Preserve anatomy; formalize shared slots and capabilities |
| Toolbar | Bespoke per route; generic placeholder filter exists | Carbon reserves toolbar for a small number of global actions | Only render configured, functional actions and filters; target no more than five global actions |
| Pagination | Attached footer, page size/page count; selection copy leaks | Carbon shows range/total and keeps pagination attached; responsive variants reduce controls | Show localized first–last of total; hide selection summary unless enabled; attach footer |
| Sorting | Common button/icon patterns; little aria-sort evidence | W3C expects sort state on the sorted header | Centralize sortable-header semantics, direction feedback, and labels |
| Responsive behavior | Horizontal scroll and 1040–1680px minimum widths | SAP retains key attributes and moves lower-priority data to pop-in/detail | Add essential/supporting/optional column metadata and mobile row summary/card behavior |
| Density | Fixed | Carbon matches toolbar/table density; MUI exposes compact/standard/comfortable | Add comfortable and compact modes; persist per user/table |
| Column preferences | Visibility available but not persisted | Mature grids support stable user preferences | Persist versioned visibility/order with stable table IDs |
| Data ownership | Mostly client-side arrays; some server hooks | TanStack supports either model but requires a consistent boundary | Bounded lists may stay client-side; authoritative/large lists use controlled server query state |
| Virtualization | Not shared/default | TanStack and MUI offer it; it reduces DOM work, not fetched data | Enable only after profiling and accessibility validation |
| Interactive grid behavior | Mostly semantic tables | W3C grid requires composite keyboard behavior | Keep native tables unless true cell-level interaction justifies a grid |
| Localization | Mixed EN/FR and hard-coded English | Mature systems localize labels, counts, dates, and numerals | Typed TableCopy/provider plus locale-aware formats |

## Decision scorecard

Scores use a 0–5 scale. Implementation/migration risk and licensing/maintenance are scored so that a higher score is safer or less costly.

| Criterion | Weight | A: retain as-is | B: incremental TanStack | C: specialized tier now | D: broad grid replacement |
| --- | ---: | ---: | ---: | ---: | ---: |
| Task efficiency | 20% | 3.0 | 4.2 | 4.3 | 4.5 |
| Accessibility | 20% | 2.5 | 4.2 | 3.8 | 4.2 |
| Responsive behavior | 15% | 2.0 | 4.0 | 3.5 | 3.8 |
| Dataset correctness | 15% | 2.5 | 4.2 | 4.5 | 4.5 |
| Performance | 10% | 3.0 | 4.0 | 4.5 | 4.6 |
| System consistency | 10% | 3.5 | 4.5 | 3.0 | 2.5 |
| Implementation/migration safety | 5% | 4.5 | 4.0 | 2.5 | 1.5 |
| Licensing/maintenance | 5% | 5.0 | 5.0 | 3.0 | 2.0 |
| **Weighted total** | **100%** | **2.90** | **4.21** | **3.85** | **3.87** |

Option B wins because it addresses the observed gaps while preserving brand, domain behavior, and current investment. The narrow analytical tier remains a conditional extension of B, not a competing system-wide foundation.

## Adoption options: pros and cons

### Existing TanStack foundation, incrementally improved — recommended

Pros:

- Lowest migration and regression risk.
- Headless model preserves Stoquify styling and domain-specific payroll, evidence, accounting, and purchasing behaviors.
- Supports controlled client or server state without a new dependency.
- Encourages semantic HTML for ordinary tables.
- Existing staff knowledge, tests, and table components remain useful.

Cons:

- Stoquify must own responsive patterns, preference persistence, accessible headers, and server-query contracts.
- Advanced grouping, pivoting, pinning, and virtualization require deliberate engineering.
- Bespoke tables need phased convergence rather than a single library switch.

### MUI X Data Grid

Pros:

- Mature density, virtualization, keyboard behavior, pinning, and server-data patterns.
- Strong documentation and a broad feature set.

Cons:

- Visual-system migration and CSS integration cost.
- Advanced capabilities can involve paid tiers.
- The grid interaction model adds accessibility and test complexity to ordinary read-only tables.
- Rebuilding current domain-specific flows would be substantial.

### AG Grid

Pros:

- Strong large-data, server-side, grouping, aggregation, and enterprise analytical capabilities.
- Suitable for genuine spreadsheet-like operational analysis.

Cons:

- Enterprise licensing for major capabilities.
- Significant theming and migration burden.
- Virtualization and server-row-model behavior introduce screen-reader and row-count tradeoffs that require explicit validation.
- Excessive for bounded reference and evidence tables.

### Specialized TanStack analytical tier later

Pros:

- Preserves the current headless foundation and brand.
- Can add server-owned query state, sticky regions, virtualization, grouping, and totals only where needed.
- Shares table copy, accessibility, preference, and responsive contracts with ordinary tables.

Cons:

- Stoquify owns more implementation and performance testing.
- Should not be built before a workflow proves the need.

### Responsive cards or pop-in details

Pros:

- Keeps identity, status, amount, and primary action visible on narrow screens.
- Avoids requiring users to discover horizontal scrolling.
- Better supports touch targets and progressive disclosure.

Cons:

- Requires explicit column priority and row-summary design per archetype.
- Cards are poor for dense cross-row comparison, so desktop tables must remain available.

### Pagination, infinite loading, and virtualization

- Pagination is the default for authoritative operational lists because location, total, and repeatable navigation remain explicit.
- Incremental loading can suit activity feeds, but it is weaker for page location, totals, audit repeatability, and bulk actions.
- Virtualization is a rendering optimization, not a data-access strategy. It should be introduced only after server querying and measurement show a DOM bottleneck.

## Prioritized backlog

### Must

1. Add a typed, localized TableCopy contract/provider covering search, filters, columns, density, ranges, page size, navigation, empty/loading/error states, and EN/FR date/number formatting.
2. Remove the generic Active/Draft/Archived filter. Render filters only from typed, functional configuration tied to real fields and URL/query state.
3. Change pagination to report first–last of filtered/total rows and show selected-row copy only when row selection is visibly enabled.
4. Centralize sortable-header behavior: aria-sort on the header cell, current direction icon, localized action label, and a stable keyboard target.
5. Require an accessible caption, aria-label, or aria-labelledby relationship for every table.
6. Define a controlled table-query contract for search, sort, page/cursor, page size, date range, and domain filters. Reset page/cursor when any narrowing input changes. Never filter only a loaded server-page subset while implying a global result.
7. Replace universal minimum-width behavior on responsive archetypes with essential/supporting/optional column priority and an accessible mobile row summary/card or disclosure.

### Should

1. Add comfortable and compact density with matching toolbar/header/row spacing.
2. Persist column visibility and order per user and stable table ID; version stored preferences so renamed columns fail safely.
3. Standardize robust loading, empty, no-match, error, permission, and partial-data states.
4. Show active filter summaries and a clear-all control on filter-heavy routes.
5. Use URL state for server-owned, shareable queries where appropriate.
6. Align numeric, currency, percentage, status, identifier, and action columns consistently.
7. Use sticky headers and desktop-only sticky identifier/action columns where wide comparisons justify them.

### Could

1. Add saved views with explicit user scope, stable versioning, and no claim that UI preferences are accounting or payroll truth.
2. Add virtualization to a measured analytical route after server-side query optimization.
3. Build a specialized analytical TanStack tier for grouping, subtotals, pinned comparisons, and high-volume ledgers after the qualification gate passes.

### Reject for this program

- A system-wide MUI X or AG Grid replacement.
- Applying role=grid to ordinary semantic tables.
- Artificial search, filtering, or pagination on bounded detail, statement, or editable line-item tables.
- Virtualization by default.
- UI-only filtering or sorting over a server-paged subset.
- Broad visual redesign, payroll backfill, database migration, or business-logic changes as part of table normalization.

## Analytical-tier qualification gate

A route may enter an analytical-tier pilot only when all of the following are evidenced:

1. A genuine comparison workflow requires grouping, subtotals, pinned cross-column inspection, or cell-level navigation that a semantic table cannot efficiently support.
2. The route routinely queries more than 10,000 rows, exposes more than 12 comparison-relevant columns, or still misses a p95 target after server-query optimization. Initial-interactive target: 2.5 seconds; local sort/filter feedback target: 500 milliseconds on agreed representative hardware and data.
3. A prototype passes keyboard, screen-reader, zoom, reflow, and automated accessibility checks.
4. Licensing, theming, maintenance, export, and audit-evidence costs are accepted explicitly.

Performance was not measured during this audit, so no current route is certified for this tier yet.

## Implementation phases

The companion phased prompt provides detailed file discovery, stop conditions, tests, and exit gates. The intended sequence is:

- Phase 0: unblock browser evidence and capture baseline screenshots, keyboard behavior, and accessibility results.
- Phase 1: shared copy, pagination, filtering, sorting, labeling, and capability contracts.
- Phase 2: responsive priorities, density, and preference persistence; pilot brand, unit, payroll compensation, and purchase-order tables.
- Phase 3: server-owned query state; pilot payroll employee, supplier, purchase-order, and transaction-history tables.
- Phase 4: analytical-tier qualification and, only if justified, one narrow prototype.
- Phase 5: archetype-led rollout and release gates.

## Review responsibilities

Required reviewers: frontend architecture, UI/design-system, product/workflow owners, accessibility, localization, QA, data/API owners, and SRE/performance for server-owned or virtualized routes. Security/privacy review is required for persisted payroll/HR table preferences and query URLs so sensitive filters or data are not exposed.

Not applicable to this presentation audit: payroll calculation rules, accounting policy, tax logic, database migrations, billing, AI behavior, and broad data backfill. Those areas need separate authorization if a later implementation affects them.

## Authoritative references

Accessed 2026-08-23:

- IBM Carbon, Data table usage: https://carbondesignsystem.com/components/data-table/usage/
- IBM Carbon, Pagination usage: https://carbondesignsystem.com/components/pagination/usage/
- SAP Fiori, Table overview: https://experience.sap.com/fiori-design-web/table-overview/
- SAP Fiori, Responsive table: https://experience.sap.com/fiori-design-web/responsive-table/
- W3C WAI-ARIA APG, Table pattern: https://www.w3.org/WAI/ARIA/apg/patterns/table/
- W3C WAI-ARIA APG, Grid pattern: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
- W3C WAI-ARIA APG, Grid and table properties: https://www.w3.org/WAI/ARIA/apg/practices/grid-and-table-properties/
- TanStack Table, Client-side vs server-side: https://tanstack.com/table/latest/docs/guide/client-side-vs-server-side
- TanStack Table, Virtualization: https://tanstack.com/table/latest/docs/framework/react/guide/virtualization
- MUI X Data Grid, Accessibility: https://mui.com/x/react-data-grid/accessibility/
- MUI X Data Grid, Virtualization: https://mui.com/x/react-data-grid/virtualization/
- MUI X Data Grid, Server-side data: https://v8.mui.com/x/react-data-grid/server-side-data/
- AG Grid, Accessibility: https://www.ag-grid.com/react-data-grid/accessibility/
- AG Grid, Server-side row model: https://www.ag-grid.com/react-data-grid/server-side-model/
- AG Grid, Server-side pagination: https://www.ag-grid.com/react-data-grid/server-side-model-pagination/
- Adobe React Spectrum, TableView: https://react-spectrum.adobe.com/react-spectrum/TableView.html
- Atlassian Design System, Dynamic table: https://atlassian.design/components/dynamic-table/

## Final gate

Recommendation status: **approved for planning, not yet approved for implementation rollout**.

Implementation should begin only after Phase 0 captures the missing browser evidence and confirms that the proposed shared contracts do not overwrite isolated user-owned edits. No new grid dependency, schema change, broad migration, payroll lifecycle change, or data backfill is included in this recommendation.

Audit verification completed on 2026-08-23:

- Existing focused presentation contracts: 2 suites passed, 5 tests passed.
- Machine-readable scorecard: parsed successfully; decision B and all four options present.
- Artifact boundary: four new documentation artifacts only; no application code was changed by this audit.
- Trailing-whitespace scan: passed.
- Typecheck and lint: not rerun because this audit made no application-code changes.
- Browser, keyboard, screenshot, and accessibility evidence: blocked as documented; not treated as passing.

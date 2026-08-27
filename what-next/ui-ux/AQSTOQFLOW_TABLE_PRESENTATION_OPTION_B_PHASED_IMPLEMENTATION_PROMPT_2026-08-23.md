Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses not applicable with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

# Refined Professional Prompt

Implement **Option B: incrementally improve Stoquify's existing TanStack and semantic-table foundation**, with no broad grid-library migration. Normalize table presentation and behavior in gated phases while preserving brand/unit presentation semantics, payroll and HR confidentiality, server-owned business truth, tenant boundaries, RBAC, and existing user-owned worktree changes.

Start from these audit artifacts:

- what-next/ui-ux/AQSTOQFLOW_TABLE_PRESENTATION_BENCHMARK_AND_ADOPTION_RECOMMENDATION_2026-08-23.md
- what-next/ui-ux/AQSTOQFLOW_TABLE_PRESENTATION_SCORECARD_2026-08-23.json
- what-next/ui-ux/table-presentation-benchmark-2026-08-23/README.md
- what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_06_TABLE_SYSTEM_NORMALIZATION_REPORT_2026-08-23.md
- graphify-out/graph_components.json
- graphify-out/graph_hooks.json
- graphify-out/graph_actions.json
- graphify-out/graph_app.json

## Objective

Create one coherent Stoquify table system contract for toolbar layout, functional search and filters, date ranges, accessible sorting, truthful result counts and pagination, responsive presentation, localization, density, column preferences, and server-owned query state where the dataset requires it.

Do not force every table into one component. Preserve the archetypes documented in the benchmark: master/reference data, transaction work queues, finance statements, analytical/high-volume ledgers, evidence/audit tables, editable line-item tables, and bounded detail tables.

## Mandatory ownership-safe preflight

Before changing code:

1. Inspect git status and diff for every candidate file.
2. Treat all existing modifications and untracked files as user-owned unless this run created them.
3. Record a candidate-file ownership matrix in the phase report: clean, user-modified but isolatable, overlapping, or excluded.
4. Inspect applicable AGENTS.md instructions and relevant graph communities.
5. Do not stash, reset, discard, reformat, or rewrite user work.
6. If a required file contains overlapping edits that cannot be isolated into a minimal hunk, **stop that phase and report the exact file and overlap**. Do not continue through an unsafe workaround.
7. Do not touch unrelated lint warnings or make opportunistic refactors.

## Phase 0 — browser evidence gate

Do not modify application code until this gate is complete.

Using the approved in-app browser workflow, capture baseline evidence for:

- /en/dashboard/purchases/suppliers
- /en/dashboard/payroll/compensation
- /en/dashboard/payroll/employees
- /en/dashboard/people
- /en/dashboard/purchase-orders
- the active brand and unit management routes
- one representative finance statement, inventory history, POS queue, and evidence/audit table

At 375px, 768px, 1280px, and 1536px, record:

- toolbar wrapping and whether all inputs fit a usable row at desktop widths;
- retained identifiers, status, amount, date, and primary action on narrow screens;
- horizontal overflow and minimum-width behavior;
- sort state, labels, captions, focus order, keyboard activation, zoom, and reflow;
- search, functional filters, date-range reset, result range, page size, page navigation, and URL/query behavior;
- loading, empty, no-match, error, permission, and partial-data states where safely reachable.

Run an automated accessibility smoke and a manual keyboard pass. Redact or avoid employee, payroll, supplier, and financial values in retained evidence. Save evidence under:

what-next/ui-ux/table-presentation-option-b-evidence/YYYY-MM-DD/

If the approved browser bridge remains unavailable, stop and report the blocker. Do not substitute an unapproved browser runner and do not begin Phase 1.

## Phase 1 — shared truth and accessibility contracts

Inspect first:

- components/DataTableComponents/DataTable.tsx
- components/DataTableComponents/DataTablePagination.tsx
- components/DataTableComponents/DataTableViewOptions.tsx
- components/DataTableColumns/SortableColumn.tsx
- components/hr-payroll/HrPayrollTableControls.tsx
- components/DataTableComponents/__tests__/SystemTablePresentation.contract.test.ts
- components/DataTableComponents/__tests__/TableDateRangeAdoption.contract.test.ts

Implement the smallest cohesive shared changes:

1. Add a typed table-copy contract or provider for EN/FR labels covering search, filters, columns, density, first–last of total, rows per page, page navigation, loading, no results, and clear/reset actions.
2. Remove the hard-coded Active/Draft/Archived filter from the generic toolbar. A filter must render only when its typed configuration is connected to a real field and state transition.
3. Report the visible result range and total. Hide selected-row copy unless a visible selection capability and selection column are enabled.
4. Centralize sortable-header semantics: aria-sort belongs on the correct header cell; expose current direction visually and in an accessible action label.
5. Require a caption, aria-label, or aria-labelledby contract. Prefer native semantic tables; do not add role=grid unless the widget implements the full composite keyboard contract.
6. Keep pagination directly attached below its table and match toolbar/header/row density.

Add focused unit and contract tests for copy, filter configuration, range boundaries, zero results, single page, selection disabled/enabled, sort cycles, keyboard activation, and accessible naming.

Phase 1 exit gate: focused tests pass; typecheck and lint reveal no new errors attributable to the changed files; browser evidence demonstrates EN/FR copy and keyboard/sort semantics on brand and unit pilots.

## Phase 2 — responsive priority, density, and preferences

Pilot only these surfaces unless evidence demands a narrower set:

- components/inventory/EnhancedBrandsManagement.tsx
- components/units/UnitsManagementDashboard.tsx
- components/payroll/PayrollCompensationWorkbench.tsx
- components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx

Implement:

1. Stable table IDs and typed capability metadata.
2. Column priority metadata: essential, supporting, optional.
3. A mobile row-summary/card or accessible disclosure for transaction/work-queue tables. Preserve identifiers, status, amount/date where material, and the primary action. Do not merely hide data that users need to decide or act.
4. Comfortable and compact density with corresponding toolbar, header, and row spacing.
5. Versioned per-user column visibility/order preferences. Treat preferences as UI state, never payroll, accounting, inventory, or audit truth. Do not place sensitive filter values in unsafe browser storage.
6. Desktop-only sticky headers or identifier/action columns only where evidence demonstrates comparison value.

Remove the universal 1040px minimum-width dependence only for migrated archetypes whose responsive alternative is complete. Do not globally delete overflow protection before every affected route has a safe fallback.

Test narrow widths, long translated labels, long identifiers, missing optional fields, zoom, RTL resilience where supported, and preference-version fallback. Capture before/after route evidence.

## Phase 3 — server-owned query state

Inspect route loaders, hooks, actions, and services before editing UI state. Reuse existing transaction-history cursor/query patterns where they preserve correct ownership.

Pilot candidates:

- components/payroll/PayrollEmployeeSourceWorkbench.tsx or the active payroll employee directory surface
- the active supplier table used by /en/dashboard/purchases/suppliers
- components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx
- one existing cursor-based transaction-history table

Define a controlled contract for:

- query/search text;
- sort column and direction from an allowlist;
- page/cursor and page size;
- from/to date range with timezone and inclusive-boundary semantics;
- typed status/domain filters;
- total count or explicit cursor-only semantics;
- loading, stale, error, retry, and partial-data state;
- URL state where sharing and back/forward behavior are appropriate.

Requirements:

- Reset page/cursor whenever a narrowing query input changes.
- Never filter, sort, or count only the currently loaded server page while presenting the result as global.
- Enforce tenant scope, RBAC, module entitlement, sort/filter allowlists, and safe parameter limits on the server.
- Preserve authoritative totals and deterministic tie-break sorting.
- Keep private payroll/HR search terms and sensitive filters out of logs, analytics, and shareable URLs unless explicitly approved.
- Do not alter payroll lifecycle, calculations, accounting posting, reconciliation truth, or audit evidence as part of this phase.

Add focused unit, hook/action, boundary, and concurrency tests appropriate to the touched layer. Include page-reset, stale-response ordering, duplicate request, invalid sort/filter, cross-tenant denial, and consistent-total cases.

## Phase 4 — analytical-tier qualification

Do not add MUI X, AG Grid, or another grid dependency by default.

Profile realistic data on agreed target hardware after Phase 3. A route qualifies for a specialized analytical prototype only if:

1. the workflow genuinely needs grouping, subtotals, pinned cross-column comparison, or cell-level navigation;
2. it routinely queries more than 10,000 rows, has more than 12 comparison-relevant visible columns, or still exceeds p95 2.5 seconds to initial interactivity or p95 500 milliseconds for local sort/filter feedback after server optimization;
3. a prototype passes keyboard, screen-reader, zoom, reflow, and automated accessibility tests; and
4. licensing, theming, export, audit-evidence, test, and maintenance costs are explicitly approved.

Compare these candidates before proposing a dependency:

- an enhanced TanStack analytical tier;
- MUI X Data Grid;
- AG Grid;
- a semantic paginated table with selective virtualization.

Save measured traces, dataset definitions, score calculations, and a go/no-go recommendation. If thresholds are not met, record no-go and retain the ordinary table architecture.

## Phase 5 — archetype-led rollout and release gates

Roll out by archetype, not by indiscriminate search-and-replace. For every batch:

1. Re-run ownership isolation.
2. Record the routes and files in scope.
3. Add or update focused tests.
4. Capture the same viewport, locale, keyboard, and accessibility evidence as the baseline.
5. Verify search, filters, date range, sorting, total/range, page reset, server ownership, density, and preference fallback as applicable.
6. Record deliberately omitted controls for bounded detail, statements, evidence tables, and line-item editors.
7. Stop the batch on unresolved data-correctness, authorization, accessibility, privacy, or user-edit overlap.

# Execution Checklist

- [ ] Read the benchmark, scorecard, prior report, graph artifacts, AGENTS.md, and current git state.
- [ ] Build and save an ownership matrix before each phase.
- [ ] Complete Phase 0 browser evidence before application edits.
- [ ] Preserve native table semantics for non-grid workflows.
- [ ] Keep every toolbar control functional and domain-configured.
- [ ] Provide localized range/total pagination and truthful selection copy.
- [ ] Implement explicit accessible sorting and table naming.
- [ ] Add responsive priority behavior before relaxing minimum widths.
- [ ] Keep bounded lists client-side only when the complete dataset is actually present.
- [ ] Use server-owned controlled state for authoritative or large datasets.
- [ ] Profile before virtualization or a specialized analytical tier.
- [ ] Preserve tenant, RBAC, module-entitlement, privacy, and audit boundaries.
- [ ] Save evidence, commands, results, and unresolved blockers under what-next/ui-ux.

# Evidence To Inspect

Repository evidence:

- current git status and diffs for all candidate files;
- active route-to-component mappings in app/ and graphify-out/graph_app.json;
- shared components and adopters in graphify-out/graph_components.json;
- data hooks/actions/services and existing cursor patterns;
- application CSS controlling dashboard table minimum widths;
- existing table tests and route-specific UI tests;
- EN/FR localization sources and date/number formatting utilities.

External primary guidance:

- Carbon Data Table and Pagination usage;
- SAP Fiori table overview and responsive table guidance;
- W3C WAI-ARIA APG table, grid, and grid/table-properties guidance;
- TanStack client/server and virtualization guidance;
- MUI X accessibility, virtualization, and server-side guidance;
- AG Grid accessibility and server-side-row-model guidance.

# Expected Artifacts

For each completed phase, save:

1. what-next/ui-ux/AQSTOQFLOW_TABLE_OPTION_B_PHASE_N_IMPLEMENTATION_REPORT_YYYY-MM-DD.md
2. what-next/ui-ux/table-presentation-option-b-evidence/YYYY-MM-DD/ with a manifest and redacted screenshots
3. a machine-readable route/capability matrix in JSON
4. focused tests next to the changed components/hooks/actions
5. performance traces and decision score only for Phase 4

Each report must include ownership status, exact files changed, test commands/results, route evidence, accessibility status, data-boundary status, known limitations, rollback path, and an explicit pass/conditional/block decision.

# Verification Commands

Use focused commands first and expand only in proportion to the changed risk:

    npm test -- --runInBand components/DataTableComponents/__tests__/SystemTablePresentation.contract.test.ts components/DataTableComponents/__tests__/TableDateRangeAdoption.contract.test.ts
    npm test -- --runInBand <changed-focused-test-files>
    npm run typecheck
    npm run lint
    git diff --check

For server-query changes, add focused hook/action/service tests and the relevant existing boundary suites. Do not run destructive database reset, seed, migration, or broad end-to-end commands without confirming their prerequisites and authorization.

# Risk Controls

- Ownership: stop on non-isolatable overlap; never reset or discard user changes.
- Scope: no broad UI redesign, broad table-library migration, database schema migration, or data backfill.
- Data truth: query, filtering, sorting, counts, authorization, and totals are server-owned for authoritative datasets.
- Privacy: redact employee/payroll/supplier/financial evidence; do not leak sensitive query state.
- Accessibility: do not claim compliance from static code or automated scans alone.
- Performance: do not claim improvement without representative measurements.
- Licensing: no commercial-grid dependency without an explicit total-cost decision.
- Release: every phase is independently reversible and gated; do not combine all routes into one high-risk change.

# Success Criteria

Option B is complete only when:

1. Every active table is classified by archetype and capability in a checked-in matrix.
2. Every rendered control is functional, localized, and connected to truthful state.
3. Sortable columns expose visible and programmatic state and pass keyboard tests.
4. Paginated tables show a localized visible range and total or explicitly declare cursor-only behavior.
5. Responsive work-queue tables preserve essential content without depending solely on horizontal scrolling.
6. Authoritative datasets use consistent server-owned query state and deterministic totals/order.
7. Density and column preferences are stable, scoped, versioned, and privacy-safe.
8. Browser evidence covers target routes, viewports, EN/FR, keyboard, zoom/reflow, and accessibility smoke.
9. Focused tests, typecheck, lint attribution, and diff checks pass for each phase.
10. No user-owned edits, payroll lifecycle rules, accounting truth, database data, or unrelated modules were overwritten.

# Non-Goals

- Replacing all tables with MUI X, AG Grid, or another grid.
- Redesigning Stoquify's visual identity or navigation.
- Adding generic filters, search, date ranges, or pagination to tables that do not need them.
- Modifying payroll approval/posting, calculation, payment, declaration, accounting-close, or evidence lifecycles.
- Changing tax, legal, OHADA/SYSCOHADA, billing, AI, or country-pack logic.
- Broad schema changes, backfills, seed rewrites, or unrelated lint cleanup.

# Applicable and immaterial review lenses

Applicable: frontend/design system, workflow UX, accessibility, localization, product operations, backend/API ownership, data integrity, privacy/security, QA/release assurance, observability/performance, and SaaS preference scoping.

Not applicable unless a later phase changes business logic: payroll calculation policy, tax/legal certification, OHADA/SYSCOHADA accounting policy, AI/agent governance, billing/packaging, offline provider behavior, and database migration engineering.

# Optional Next Prompts

1. Run Phase 0 only and produce the redacted browser evidence matrix; do not edit application code.
2. Run the Phase 1 ownership preflight only and report whether the shared table files can be isolated safely.
3. Implement Phase 1 only after Phase 0 passes; stop before responsive or server-query changes.
4. Profile one nominated analytical route against the Phase 4 gate without adding dependencies.

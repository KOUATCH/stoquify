# AQSTOQFLOW UI/UX Phase 06 — System Table Normalization Report

Date: 2026-08-23  
Status: Implemented and verified

## Scope

The audit covered the active dashboard application table surfaces under `app/` and `components/`: 57 table-bearing TSX files and 74 table-rendering occurrences. Test fixtures, generated graph output, legacy dashboard snapshots, public supplier/customer documents, and the shared table primitive definitions were excluded from the application-surface count.

The change is presentation-only. It does not change table data sources, permissions, workflow state, accounting behavior, payroll controls, or persistence. Static statements and bounded evidence/line-item tables remain static; search, sorting, date range, and pagination are required only where the grid already supports an interactive result set.

## Canonical table contract

- `dashboard-table-toolbar` is the semantic surface for interactive table controls.
- Shared `DataTable` controls use one desktop row by default and remain responsive below the desktop breakpoint.
- `FilterBar` uses the same desktop no-wrap behavior for search, filters, and actions.
- `dashboard-table-shell` / `dashboard-table-base` provide the shared border, header, row, spacing, and overflow semantics.
- `dashboard-table-pagination` is emitted by every shared and bespoke paginator and receives the same divider, surface, spacing, and control-height treatment.
- Paired from/to inputs on Stock Movements were replaced with `TableDateRangePicker`, matching the supplier and purchase-order query pattern.

## Normalized surfaces

Shared boundaries were normalized in:

- `components/DataTableComponents/DataTable.tsx`
- `components/DataTableComponents/DataTablePagination.tsx`
- `components/dashboard/primitives/command-center-primitives.tsx`
- `app/globals.css`

Bespoke interactive grids were aligned in trial balance, customer orders, invites, stock movements, inventory transfers, cash-drawer sessions, purchase-order analytics, and transaction history.

The audit also found 15 older native-table files across accounting, purchasing, compliance, and finance that relied only on their surrounding card. Their existing native table markup now declares `dashboard-table-base`; no artificial toolbar or pagination behavior was introduced.

## Ownership and isolation

The worktree already contained user-owned payroll, HRIS, finance, purchase-order, and infrastructure edits. Changes in overlapping files were limited to additive presentation classes, the shared date-range substitution, and focused contract coverage. No existing edits were reset, reformatted wholesale, or backfilled.

## Regression coverage

`SystemTablePresentation.contract.test.ts` recursively inventories active application tables and fails when:

- a table lacks the shared shell/base semantic;
- an interactive grid lacks the shared toolbar semantic; or
- a paginated grid lacks the shared pagination semantic.

`TableDateRangeAdoption.contract.test.ts` now includes Stock Movements and protects the shared date-range pattern from paired native date inputs.

## Verification

- Focused Jest: 8 suites passed, 22 tests passed.
- System presentation/date-range contracts: 2 suites passed, 5 tests passed.
- TypeScript: `npm run typecheck` passed.
- ESLint: `npm run lint` passed with 0 errors and 3 pre-existing warnings outside this table normalization scope.
- Diff whitespace check: passed; line-ending notices only.
- Live browser smoke: not completed because the desktop browser bridge failed to start with a sandbox setup error. This is a verification-tool limitation; no application runtime failure was observed.

## Deliberate exclusions

- No broad data backfill.
- No payroll lifecycle or authorization changes in this slice.
- No UI redesign or new visual language.
- No invented pagination for short, bounded, statement, evidence, print, or line-item tables.

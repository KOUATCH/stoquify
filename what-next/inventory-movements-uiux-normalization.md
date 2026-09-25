# Inventory movements UI/UX normalization

Date: 2026-09-19
Route: `/en/dashboard/inventory/movements` and its French equivalent.

## Outcome

Implemented a focused canonical ledger table for Inventory Movements. Server-owned inventory history remains the source of truth. The work preserves the existing dirty worktree; notably, the shared history shell, movement workbench, translations, and inventory read service already had edits before this task. Their entire Git diff must not be attributed to this task.

### Baseline evidence

- Browser-confirmed before changes: authenticated movements contained 56 matching movements with 50 loaded; the page displayed technical contract/proof copy, duplicate export controls, a live-data label, and checkboxes with no supported bulk operation. A baseline screenshot was viewed inline, but no screenshot file was saved.
- Code-confirmed: URL search was omitted from read requests; cursor history depended on component memory; export returned JSON without initiating a download; some filter options disagreed with Prisma's movement enum; decimal display used numeric conversion; `tableVariant="system"` used a separate table implementation.
- Canonical references inspected in source: inventory items, canonical contracts/boundaries/preferences, table controls, and the August 28 table harmonization reports. Graph node `dashboard_history_transactionhistoryworkbenchshell_tsx` and current imports identified cash/payment, receivables, and payables shared consumers. They retain the existing rendering path.
- Browser comparison of inventory items and another canonical reference did not complete because browser-control commands timed out. No visual comparison pass is claimed.

## Implementation

- Added `inventory.movements` version 1, ledger archetype, server-cursor ownership, stable transaction IDs, fixed server ordering, allowed filters/page sizes, mandatory identity/action columns, read/module/export policies, and no bulk selection. Registered the new table as canonical-adopted.
- Composed the existing TanStack engine, canonical boundary, versioned preferences, column menu, density control, date picker, table primitives, and shared pagination. Added optional cursor behavior and localized column labels to shared controls without replacing their defaults.
- Added an optional table-render slot to the shared history shell. Inventory uses that slot and one export entry point. Other consumers keep their prior table behavior. The slot receives the shell's drawer opener tracking for focus restoration.
- Removed unused row checkboxes and misleading technical proof/live claims from this page. Added a matching-scope count, explicit fixed-order description, compact snapshot/timezone context, operational completeness explanations, right-aligned precise quantities/values, and equivalent mobile detail access.
- Search is authorized server-side across English/French item names, SKU, reference number, and reference ID. Rows, aggregates, cursor scope hashes, and streamed exports share the same search predicate. Client search is debounced; filter changes cancel pending searches and reset cursor/detail state.
- Added signed backward traversal using the existing effective-time/recorded-time/ID tuple and snapshot. Previous/next URLs survive reloads and direct links. First-page navigation is available at small widths. There is no invented last-page action or client-only sort.
- Reconciled movement types with Prisma, preserving aliases for supported legacy bookmarks. Corrected outgoing and reservation badge semantics. Decimal formatting retains arbitrary integer/fraction precision and uses locale separators without converting the amount to a JavaScript number.
- Downloads the exact protected JSON artifact using its server filename and content type. Export covers all matching records, independent of the displayed cursor or opened row. A response is discarded if the initiating user/organization no longer has the active export context.
- Kept organization/module/read/export enforcement, fresh-auth checks, export limits, manifests, redaction, auditability, and inventory/accounting truth in their existing protected layers. No migrations, reseeding, deployments, valuation changes, or new dependencies were introduced.
- Updated English and French inventory-history copy. Query cache identity now includes user and organization; failed/unauthorized queries do not retain earlier rows as successful results.

## Verification

Initial focused regression command:

```powershell
npm test -- --runInBand "InventoryMovementHistoryWorkbench|useInventoryMovementHistoryWorkbench|TransactionHistoryWorkbenchShell|CanonicalTableContract|TableSystemRegistry|inventory-read.service.test"
```

Result: five suites/28 tests passed; the registry suite failed on three pre-existing unregistered table files listed below. The Windows npm invocation did not reliably retain the CLI flag, so subsequent runs invoked Jest directly.

Focused direct command (TS-node options affect loading Jest's TypeScript config):

```powershell
$env:TS_NODE_TRANSPILE_ONLY = 'true'
$env:TS_NODE_COMPILER_OPTIONS = '{"module":"commonjs","moduleResolution":"node"}'
node node_modules/jest/bin/jest.js --runInBand --roots components/inventory/movements hooks services/inventory components/DataTableComponents components/dashboard actions/inventory --testPathPatterns 'InventoryMovementHistory|useInventoryMovementHistoryWorkbench|TransactionHistoryWorkbenchShell|CanonicalTableContract|inventory-read.service.test|inventory-history-export.service.test'
```

Result before final permission/navigation refinements: **9 suites, 49 tests passed**. Coverage includes table contract/preferences/density, cursor controls, absent selection, debounced search, exact decimal formatting, movement enum agreement, search/summary/export scope, signed backward traversal, cursor filter mismatch, export limits/provenance, artifact download, and shared history shell behavior.

Final rerun used the same direct command with the pattern expanded to:

```text
InventoryMovementHistory|useInventoryMovementHistoryWorkbench|TransactionHistoryWorkbenchShell|CanonicalTableContract|TableSystemRegistry|inventory-read.service.test|inventory-history-export.service.test|inventoryMovementHistoryActions
```

Result: **55 tests passed, 1 failed; 9 suites passed, 1 failed** (136.781 seconds). The sole failure is the unchanged registry baseline below; the new movements table is not among the missing registrations. The new asynchronous regression confirms that an export finishing after an organization switch does not download or show success.

Focused ESLint passed with exit 0:

```powershell
node node_modules/eslint/bin/eslint.js hooks/useInventoryMovementHistoryWorkbench.ts components/inventory/movements/InventoryMovementHistoryTable.tsx components/inventory/movements/InventoryMovementHistoryWorkbench.tsx components/inventory/movements/inventoryMovementHistoryAdapter.ts components/DataTableComponents/DataTablePagination.tsx components/DataTableComponents/DataTableViewOptions.tsx components/DataTableComponents/inventory-movements-table-contract.ts components/DataTableComponents/table-system-registry.ts services/inventory/inventory-read.service.ts services/inventory/inventory-history-export.service.ts types/inventoryMovementHistory.ts components/dashboard/history/TransactionHistoryWorkbenchShell.tsx
```

After the final hook change, a second ESLint run over the hook and all four changed/new test files also passed with exit 0. JSON parsing and flattened-key comparison found 138 history keys in each locale with no missing EN/FR counterparts.

Scoped `git diff --check` passed; Git emitted only line-ending normalization warnings. `npm run build` was deliberately excluded because its script runs migrations. Typechecking uses `npm run typecheck` (`tsc --noEmit --pretty false`), which has no migration/reseed step.

**Full repository typecheck: passed, exit 0.** The run was slow under concurrent local workload and completed without TypeScript diagnostics.

### Existing registry failures

The registry scan identifies these existing unregistered files, outside this change:

- `app/[locale]/(dashboard)/dashboard/accounting/reports/financial-statements/financial-statement-lines-table.tsx`
- `components/inventory/transfers/TransferWorkflowPage.tsx`
- `components/reports/financial-summary-report.tsx`

### Browser evidence limitation

Post-change browser verification was attempted against both the existing tab and a fresh tab. Navigation and accessibility/DOM inspection repeatedly failed with browser-control timeouts (`Page.navigate` / `Emulation.setFocusEmulationEnabled`). The existing tab reached the inventory-items URL; the new tab reached the movements URL but did not return usable page content. A later screenshot attempt exposed a localhost `ERR_CONNECTION_REFUSED` error page, which the browser tool could not capture. Starting `node node_modules/next/dist/bin/next dev -p 3000` then returned `EADDRINUSE`; no existing listener was killed or replaced. This is not a passing route smoke test.

After the full typecheck finished and the port became available, the same direct Next.js command started successfully (ready in 23.7 seconds). The movements route compiled successfully in 118.1 seconds (4,467 modules). A fresh browser tab still timed out during navigation and subsequent DOM inspection, including after compilation. The development server is left running for local review. Compilation is verified; authenticated post-change browser behavior and screenshots are not.

Pending real-browser checks: desktop/tablet/mobile screenshots in EN/FR; a known search match beyond the first loaded page; browser back/forward/reload across cursor pages; actual downloaded file content; drawer keyboard/focus restoration; visible column/density persistence; module-disabled and access-loss states. Automated tests support the behavior, but they do not certify the visual or assistive-technology experience.

## Review boundaries

Platform/backend/data review: canonical contract and server cursor/search/export ownership; no schema change. Security/privacy: existing protected boundaries retained, cache identity scoped, obsolete export response discarded. Frontend/workflow/product: operating labels, coherent table controls, useful details, truthful counts, and responsive rendering. QA/release: focused regression evidence and explicit browser/baseline limitations. SRE/performance: bounded search text, debouncing, existing page/export bounds, no new infrastructure. SaaS packaging: inventory entitlement unchanged. Inventory/finance/audit: exact decimal display, mixed-unit/currency safeguards and server provenance preserved; no posting or valuation change.

Statutory/country-pack, payroll, offline/provider integration, AI/agent, billing, and growth changes are not applicable to this narrow read-only history normalization. No legal, accounting, security, accessibility, or release certification is claimed.

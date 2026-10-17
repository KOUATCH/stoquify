# POS, receivables, payables and sales usability audit

Latest continuation: **2026-10-13**. Purchasing access is now provisioned locally and AP ready-state has been verified in EN/FR; the earlier missing-grant statements below are historical. See the final continuation section and its evidence record for current limitations.

Date: 2026-10-12. Baseline: `6f7f6741` plus the shared working tree. This report distinguishes this task's changes from concurrent work. Existing untracked sales files and unrelated translation edits were preserved.

## Outcome

Implemented focused cashier keyboard/search improvements and consistent sales table search, pagination and presentation. Added regression coverage for two issues exposed by live inspection: sales detail losing focus when closed, and catalogue loading unmounting the scanner input.

Receivables and payables changed concurrently to the new scoped `OpenItemsDashboard`. That implementation was preserved and reviewed against current source. Earlier changes from this task to the legacy `FinanceSpecializedLedgerSurfaces` remain, but those legacy AR/AP surfaces are no longer mounted by the current routes. The current finance implementation is documented in `docs/finance/receivables-payables-dashboard-phases-0-1.md` and `docs/finance/receivables-payables-dashboard-phases-2-3.md`; its authorship is separate from this task.

The user signed in themselves. Browser verification used their existing development session without entering credentials, submitting sales/payments, changing module access or changing the cart. No cashier-speed improvement or full accessibility certification is claimed.

## Routes and roles

| Surface | Current route | Main task |
| --- | --- | --- |
| POS | `/en/dashboard/pos` | Cashier: find stock, choose customer, review cart and tender |
| Receivables | `/en/dashboard/finance/receivables` | Collections: prioritize due invoices and inspect remaining balances |
| Payables | `/en/dashboard/finance/payables` | AP/approver: inspect invoices, evidence and workflow blockers |
| Sales | `/en/dashboard/sales?view=performance` | Supervisor: compare sales, inspect records and products |

French equivalents use `/fr/`. The originally supplied `/en/sales/pos` returned 404; the implemented POS route above was used.

## Priorities and implemented changes

| Priority | Finding | Response |
| --- | --- | --- |
| P1 | POS global shortcuts interfered with browser commands and dialog input | Ignore modified keys, IME composition, handled events and dialog-owned events. Escape clears only focused product search; retain F4 customer and F8 tender shortcuts outside dialogs |
| P1 | Catalogue search replaced the whole POS workspace with loading, unmounting the scanner input | Use the existing catalogue-area loading skeleton while retaining the search input. Keep required workspace/permission loading gates and failed-read handling |
| P1 | Closing a sales record detail returned focus to BODY after table cells remounted | Give row buttons stable IDs and resolve the current trigger on close; fall back to the records heading if the row is absent |
| P2 | Sales record controls differed from system tables | Reuse DataTableSearch, DataTablePagination and table primitives, with 10/25/50 rows and cursor-aware First/Previous/Next |
| P2 | Product results lacked useful local search/paging | Search English/French names and SKU, clear search, recover from no results, and paginate 10/25/50 using shared controls |
| P2 | Table styling was inconsistent | Apply dashboard table tokens to records, product, trend and payment-method tables; preserve semantic headers and horizontal scroll regions |
| P2 | POS search and quantity fields needed accessible names and clearer guidance | Label fields, provide explicit search clear with focus return, expose shortcut help, and remove a fixed minimum search width |

Record search filters records only, not summary cards or trend; copy makes that scope explicit. Page-size and search changes restart cursor navigation. Record order remains server-owned date/ID descending. Product quantity sorting requires one known unit and exact decimal comparisons are preserved. Small complete summary tables do not acquire unnecessary pagination.

## Finance review and useful information

The current AR/AP explorer presents currency-separated current positions, due/overdue queues, invoice search, currency/aging/page-size filters, counterparty rankings and invoice detail with original, allocated, credit and remaining amounts. Unknown evidence remains unavailable. Receipt activity and AP workflow counts explain their independent scopes. Existing destinations expose history, approval, recovery and reconciliation without introducing financial action buttons.

This task's legacy finance changes suppress cached successful values on query errors, render zero-day terms correctly, display currency, explain bounded/top-eight/recent-payment coverage and link existing workspaces. These are historical legacy improvements, not a claim that the current AR/AP route uses those aggregates. The new scoped invoice read model and actor/organization/permission-partitioned cache supersede the initial AR/AP findings about capped legacy aggregates and unspecific cache keys. Those legacy services may still warrant review on other surfaces; they are not asserted as current invoice-dashboard defects.

## Verification

| Evidence class | Result |
| --- | --- |
| Workflow | Reviewed scripts and registry; `npm run agent:workflow:check` passed, reporting 198 unclassified scripts |
| Source | Current routes, components, hooks, services, permissions, table primitives, schema and design contracts inspected |
| Mocked tests | Original seven focused suites passed 110 tests. Latest reruns passed 24 sales UI tests across two suites and 38 POS tests, including both new focus regressions. Two additional current-finance component/hook suites passed 12 tests. Reruns overlap the original tests and are not additive totals |
| Lint | Seven changed implementation modules passed scoped ESLint; final sales focus and POS catalogue-loading changes also passed subsequent scoped runs |
| TypeScript | Full no-emit, non-incremental check passed with exit 0 and no diagnostics during final verification |
| Whitespace | Scoped tracked-file diff check passed; Windows line-ending warnings are separate |
| Real database integration | Later continuation: four AP read-model PostgreSQL tests passed on the verified disposable local target; details below. AR, payment execution and wider financial concurrency remain outside this evidence |
| Browser | Authenticated read-only checks against the existing development organization, detailed below. Admin observations do not certify cashier/finance role isolation |

### Rendered checks

- **Receivables:** ready state with three overdue invoices and currency-separated totals. Searching a known invoice narrowed the table to one row. Its detail displayed original, allocated and remaining amounts, with missing credit evidence unavailable. Escape closed detail; clearing filters restored the list. At the effective narrow DOM width of 585 CSS pixels, document scroll width was 562, with no horizontal document overflow. The requested viewport was 390, but browser scaling changed the effective width; this is not a 390 CSS-pixel certification.
- **Payables:** French module-disabled state rendered for the current organization. Ready-state AP remains unverified in this session. Access/module settings were not changed to bypass that state.
- **Sales:** ready summary, trend, records, collections, receivables and products. Product SKU search returned the expected item; a nonexistent query displayed recovery guidance. Selecting ten rows and Next showed the eleventh product; Previous worked. Record search narrowed two records to one without changing summary totals. Clearing restored records; changing record page size updated the URL to `pageSize=10`. Detail amounts loaded. The focus bug was reproduced, covered by a previously failing regression, fixed, and verified live: Escape returned focus to the current row button.
- **POS:** ready state showed active shift/register, stock availability and empty cart. SKU search returned the expected product; F4 opened the customer chooser. Escape closed it without clearing the product query. The initial search exposed whole-workspace loading. After the fix, changing SKU retained the mounted, focused input while products loaded, then displayed the expected new product. Escape from the input cleared it and retained focus. The effective 585 CSS-pixel narrow view had equal document client/scroll widths of 562 pixels; register, shift and search controls stacked without document overflow. The viewport override was reset. Existing offline-close and receipt-access notices were preserved; no conflict was resolved or shift closed.

Screenshots in `evidence/pos-finance-sales-2026-10-12/`: `receivables-desktop.jpg`, `payables-fr-module-state.jpg`, `sales-records-desktop.jpg`, `pos-desktop.jpg`, and `pos-narrow.jpg`.

Earlier browser-control timeouts and lengthy loading states were real observations, but later successful reads supersede the earlier statement that authentication/rendered checks were blocked. The existing development server was left running for shared sessions.

## Remaining acceptance limits and next priorities

1. Verify AP ready-state with an organization already entitled to purchasing, and verify representative cashier/finance roles. Current tests do not certify role isolation end to end.
2. Extend database evidence beyond the four AP read-model tests now completed below: AR lifecycle, allocations/payment races and wider workflow behavior still need their dedicated acceptance suites. No financial writes were used for visual verification.
3. Complete device-size and screen-reader acceptance beyond the measured narrow observation. EN/FR component coverage is not equivalent to fully rendered bilingual coverage.
4. Measure representative cashier/collections tasks before claiming efficiency gains. No speculative credit scores, margin estimates, bulk posting or reminders were added.

## Scope and reproducibility

Owned changes: POS component/interaction tests; legacy specialized finance surface/tests; sales records, performance and insights components/tests; bounded page-size scope/service/tests; surgical EN/FR copy; sales page contract; this report and screenshots. Unrelated work remains untouched. Current design master, page contracts, UI constitution, component registry and tokens were followed. Dated graph evidence was used only for discovery; current source supports behavior claims.

Reviewed commands used:

```text
node node_modules/jest/bin/jest.js --config jest.payroll-trust-spine.config.cjs --runInBand --runTestsByPath <focused POS, finance and sales tests>
node node_modules/jest/bin/jest.js --config jest.open-items-dashboard.config.cjs --runInBand --runTestsByPath components/finance/__tests__/OpenItemsDashboard.test.tsx hooks/finance/__tests__/useOpenItemsDashboard.test.tsx
node node_modules/eslint/bin/eslint.js <changed implementation modules>
node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false
```

No broad build, migration, seeding, deployment or financial-write test ran. An earlier reviewed development startup regenerated the Prisma client without migrating the database. Roll back only this task's hunks; do not restore entire dirty or preexisting untracked files. No schema/data rollback is needed.

## Continued acceptance review (2026-10-12)

Requested continuation: remaining priorities and AP verification in an organization with purchasing enabled.

### Completed in this continuation

- Workflow check passed again (198 unclassified package scripts).
- Six focused mocked finance suites passed **45 tests**: open-items read model, AP workflow read model, action authorization, supplemental hooks, supplemental components and invoice dashboard. This specifically exercises purchasing-module denial, fresh authority after reads, tenant mismatch, late responses after permission loss, restricted payment counters and incomplete balance evidence. These results do not establish real database concurrency or live role isolation.
- French receivables rendered with localized dates, decimal separators, queue labels, scope explanations and invoice detail. Using the keyboard, Enter opened invoice RDS001-AR-008, Shift+Tab moved from Close to the history link, Tab wrapped within the drawer, and Escape returned focus to the invoice trigger.
- A narrower responsive DOM check measured `innerWidth=342`, `documentElement.clientWidth=319`, and `scrollWidth=319` (browser scaling means the requested override was not the CSS viewport). No document-level horizontal overflow was present. Drawer keyboard access remained operable. The narrow screenshot was blank and is excluded from visual evidence. The override was reset. A valid desktop screenshot is saved as `evidence/pos-finance-sales-2026-10-12/receivables-fr-detail-desktop.jpg`.
- Applied ECC accessibility guidance and the project UI/UX focused search. Results from `ux-guidelines.csv`: Responsive / Table Handling and Accessibility / Compact Control Semantics. Current invoice tables have a named keyboard-focusable scroll region; review queues use native buttons with pressed state. No application changes were needed for the behaviors checked in this continuation.

Exact mocked command:

```text
node node_modules/jest/bin/jest.js --config jest.open-items-dashboard.config.cjs --runInBand --runTestsByPath services/finance/__tests__/open-items-dashboard.test.ts services/finance/__tests__/payables-workflow-dashboard.test.ts actions/finance/__tests__/open-items-dashboard.actions.test.ts hooks/finance/__tests__/useFinanceDashboardSupplements.test.tsx components/finance/__tests__/FinanceDashboardSupplements.test.tsx components/finance/__tests__/OpenItemsDashboard.test.tsx
```

### Inputs still needed

The signed-in account remains in **Wilkinson - Feeney 001**, where `/en/dashboard/finance/payables` renders module locked. Its account menu exposes no organization switcher; a focused current-source search did not find an implemented workspace-switch control. The user was asked to sign into an account in an already-enabled organization. No module was enabled, permission widened, account impersonated or session forged. The payables browser tab is retained for that handoff.

No disposable database target has been designated. Existing project PostgreSQL runners have explicit target requirements and may create/drop schemas or run migrations; they were inspected as an inventory, not executed against the application's database. The user was asked for a designated local database name/environment-variable name. Full screen-reader testing also remains pending: this session's browser tools expose DOM/keyboard checks, not a running assistive-technology session.

### Ready-to-run enabled-organization AP acceptance

1. Confirm displayed organization/role and the ready-state supplier-payables heading. Record locale, effective viewport, freshness and currency groups.
2. Check overdue/due-soon/missing-date/unverified queues, search and clear. Search must affect invoice rows only; currency and location changes must follow their declared balance scope.
3. Select 10/25/50 rows. Where the fixture spans multiple pages, check Next/Previous and evidence-revision recovery. Never claim multi-page verification from a one-page dataset.
4. Open one verified and, if available, one unverified invoice by keyboard. Confirm original/allocated/credit/remaining/due values, explicit unavailable evidence and clean focus return.
5. Inspect workflow counts and destination links; restricted counters must remain restricted. Visit existing read-only destinations without approving, releasing, posting or paying anything.
6. Repeat French and narrow-layout checks, then test a representative existing AP viewer/approver account if supplied. Do not change roles to manufacture a passing result.

### Representative task measurement protocol

Use the same approved fixture data and device for baseline and changed UI, with representative users rather than agent/browser-tool timing. Record elapsed user time, actions, corrections, help requests and completion separately for: find a SKU and review availability; inspect an overdue customer invoice; find a supplier invoice due soon and inspect its evidence; find a sales record and return to the same table scope. Run keyboard and pointer variants. Financial actions are outside this read-only protocol. No baseline or participant measurements have yet been collected, so efficiency improvement remains an unquantified design goal.

## rds-001 activation attempt and real PostgreSQL evidence

The user identified rds-001, authorized use of an existing designated disposable database, and explicitly authorized enabling purchasing for rds-001 locally.

### Purchasing activation outcome: blocked by application entitlement

Confirmed the signed-in rds-001 workspace is Wilkinson - Feeney 001. In `/en/dashboard/settings/modules`, selected Purchasing and requested Review configuration. The server reviewed revision 0 and proposed one added module, zero removals. It reported: **Purchasing needs an eligible access grant**. Apply configuration is disabled. The current workspace therefore remains unchanged; a local draft selection and review are not module activation. No grant was forged, no module guard disabled, and no direct application-database edit was used to bypass this result.

The normal configuration UI says it consumes existing access and does not purchase modules or change subscription terms. Source inspection confirms the legacy activation action refuses managed configurations and routes them to workspace review. The current UI/action surface inspected does not expose grant provisioning. An eligible purchasing grant must be provisioned through the supported administrator process before this review can apply. The review tab is retained, and its visible blocker is saved in `evidence/pos-finance-sales-2026-10-12/purchasing-activation-blocked.jpg`.

### PostgreSQL target and bounded fixture effects

Historical target records identified two local disposable databases. A read-only PostgreSQL catalog check confirmed both exist. Selected the newer `stoquify_local_ui_workflow_hris_20261007` on localhost:5432, previously documented by `what-next/platform-remediation/2026-09-30-run-01/runner/hris-time-postgres-bootstrap-20261007.json`. Verified it is distinct from the configured application database, `stoquify_replay_next_20260830`, and that the eight required AP tables exist.

Added `jest.open-items-postgres.config.cjs` and `tests/postgres/finance/open-items.postgres.test.ts`. The runner uses direct SWC and the server-only shim, without Next environment loading, migrations or bootstrap. The production read service is bound to a real Prisma client on the validated disposable target. A query extension supplies a deterministic barrier for one concurrent-write test; all rows and transaction results come from PostgreSQL, with no simulated persistence responses.

Created two uniquely named synthetic organizations, one supplier, two invoices and one ledger-evidence row. Cleanup deletes only this run's IDs and verifies both synthetic organizations are absent. No schema reset, migration or application-data mutation occurred.

**Result: 1 suite, 4 tests passed, 9.943 seconds.**

1. Verified XAF balance remains exact and separate from an EUR invoice with unverified evidence; record search leaves currency totals intact.
2. Organization filtering returns no foreign invoices; an out-of-scope location is rejected.
3. A second connection commits a due-date change after the dashboard transaction has established its snapshot. The in-flight read retains the old date and revision; the next read sees the committed date; continuation with the old revision is rejected.
4. An aborted invoice update is absent from subsequent dashboard values and revision.

```powershell
$env:RUN_OPEN_ITEMS_POSTGRES='1'
$env:UI_WORKFLOW_POSTGRES_DATABASE='stoquify_local_ui_workflow_hris_20261007'
node node_modules/jest/bin/jest.js --config jest.open-items-postgres.config.cjs --runInBand
```

The environment flags were set only in the test command process. Target resolution requires localhost, the explicitly reviewed database name and separation from the application DB; live `current_database()` identity is checked before fixtures. Tests skip without the opt-in flag, and that skip must never be reported as passing PostgreSQL evidence. Local database connectivity required sandbox escalation; it was approved. No automatic approval rejection remains unresolved.

This is AP dashboard read-model evidence, not authentication/browser role certification, payment execution certification, statutory correctness, or complete financial-release acceptance. Payables ready-state browser verification still awaits the missing purchasing grant despite the user's authorization to activate the module.

## Blocked checkout follow-up — 2026-10-12

Live POS at Wouri Warehouse / Seed POS Terminal 011 retained cart `POS-RDS001-TERM-011-20261012-IXVT3`: four lines, total XAF 4,889. A failed Close shift dialog displayed `POS_CHECKOUT_OFFLINE_PENDING`. Dismissing it and requesting Resume cart did not release the checkout: unresolved offline work correctly fences the lifecycle command. No charge, cart clearing, shift closure, review acknowledgement or conflict resolution was submitted.

Source inspection found that every successful checkout lease refresh also cleared a rejected cart-command message. Added a regression that failed before the change, then separated ownership errors from command errors. Successful lease renewal clears ownership failures but preserves cart-command failures until another command is attempted or scope changes. EN/FR guidance now explicitly covers resume, park and shift close, names the conflict review action and confirms cart preservation. Shift-close feedback translates this known blocker instead of displaying its internal code.

Verification: workflow contract passed; mocked POS component/hook run passed 44 tests across two suites, followed by the final hook run passing 6 tests (including renewed-ownership recovery). The component suite has 39 tests; these counts overlap and are not additive across runs. Scoped ESLint reported no errors and one existing `generation.current` cleanup warning. EN/FR JSON parsing and scoped diff whitespace checks passed. No real-database test or full typecheck was run for this feedback-only follow-up.

Rendered evidence: reopened the authenticated English POS after the original tab closed, verified the same four-line cart and total, retried Resume and observed the new message remaining through background renewal. Conflict review identifies `rds_org_001_pos_offline_sync_conflict_011`, issue `IDEMPOTENCY_PAYLOAD_MISMATCH`, with no linked source event. Read-only Check recorded outcome states that this conflict needs a different correction; the existing recorded-replay resolution is not eligible. Evidence: `evidence/pos-finance-sales-2026-10-12/pos-checkout-offline-blocker.jpg`. At this checkpoint checkout remained blocked; the feedback fix alone did not resolve it. The subsequent user-approved local fixture repair below completed recovery.

### User-approved fixture repair and resumed cart

The user confirmed Terminal 011's offline records were disposable test data, reviewed the prepared scope and explicitly approved application without payment or shift closure. A guarded local transaction rejected the seed-only event, dismissed its unlinked test conflict and expired the test certificate with closeBlocker false. All records were retained, with repair metadata and an audit before-image. Initial attempts rolled back on timestamp-format mismatch; read-only investigation confirmed driver timezone conversion, and exact native PostgreSQL timestamps corrected the snapshot checks without weakening them.

Actual PostgreSQL checks confirmed the repair and unchanged cart/shift. Browser acceptance then succeeded: same order, four lines, displayed FCFA 4,889; Resume controls removed; quantity editing and Charge enabled; offline counters all zero. A final read-only check after Resume confirmed DRAFT/PENDING order, no payment or POS commit, and ACTIVE shift with no end time. No payment or close action was submitted. Backups, exact apply/rollback statements, database evidence and screenshot are linked in [the completed repair record](evidence/pos-finance-sales-2026-10-12/terminal-011-repair/README.md).

## Purchasing access resolved and continued acceptance — 2026-10-13

Source baseline: HEAD `6f7f6741` plus the shared dirty working tree. Preserved unrelated changes. Read the workflow, current module authority/composition services, finance hooks/components, page contracts and reviewed command configurations. Applied ECC security-review guidance and the project UI/UX contract. Focused UI/UX search returned Form Labels and Table Handling from `ux-guidelines.csv`; these support existing labelled controls and table scrolling, not a new visual design.

### Implemented

- Provisioned one user-authorized local `manual_override` Purchasing grant for `rds_org_001` with exact-target guards, native-JSON backup, serializable organization lock, unchanged-other-grants assertions and a retained audit. No user role or application security guard changed. Payables is now accessible.
- The normal workspace review now accepts Purchasing authority. Its Apply action requests fresh password confirmation. The user was asked to complete this themselves; no credentials were read or supplied. Full workspace activation is not claimed, and existing unrelated setup requirements remain visible.
- Fixed raw supplier invoice status codes in the detail drawer: Draft, Matched and Cancelled now have EN/FR labels. A live French draft displays Brouillon.
- Fixed AR/AP search drafts surviving restoration of a different URL search. Browser navigation now clears the obsolete draft and displays the restored scope; applying Search submits that scope. Added a regression for this behavior.

### Verification classes

| Evidence class | Executed result |
| --- | --- |
| Source/workflow | Workflow contract passed; 198 unclassified package scripts. Scoped ESLint passed for changed finance components/tests and local access scripts. No full typecheck or build executed. |
| Mocked finance | Six focused suites passed 58 tests before the two UI fixes; final OpenItemsDashboard suite passed 12 tests after the fixes. Overlapping runs are not additive. |
| Mocked POS | `jest.pos-checkout-feedback.config.cjs`: 2 suites, 45 tests passed. |
| Mocked sales | Performance dashboard and insights panels under the reviewed trust-spine config: 2 suites, 24 tests passed. |
| Real PostgreSQL | Existing `jest.open-items-postgres.config.cjs` rerun against designated disposable `stoquify_local_ui_workflow_hris_20261007`: 4 passed in 10.968 seconds, including snapshot/concurrent commit/revision rejection, tenant isolation and rollback; exact UUID fixture cleanup. |
| Local application data | Purchasing grant transaction committed with backup/audit; 11 other grants and module configuration unchanged by that transaction. This is distinct from disposable test writes. |
| Rendered browser | AP now loads under the existing Super Admin account in EN/FR. Verified 10-row/two-page navigation, exact search, empty overdue queue, clear recovery, unverified balances, workflow/period panels, keyboard invoice opening/focus trap/return, French detail and formatting. See linked record. |

[Detailed access, screenshots, browser scope and rollback record](evidence/pos-finance-sales-2026-10-13/README.md).

Remaining acceptance limits: no lower-privilege cashier/AP viewer account was supplied, so live role isolation remains unverified; this fixture contains no verified AP balance for a ready verified-invoice browser case. The requested narrow viewport override did not take effect and was reset, so no new responsive pass is claimed. Screen-reader acceptance and representative-user efficiency measurements still need their own sessions. Wider AR allocation/payment-race acceptance remains outside the four AP read-model database tests. Existing POS fixture recovery was not reapplied; no payment or shift-close action was performed in this continuation.

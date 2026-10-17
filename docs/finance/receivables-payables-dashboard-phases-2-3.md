# Receivables/payables phases 2–3 implementation

Date: 2026-10-12. Baseline: `6f7f6741` plus the pre-existing dirty tree. The saved phase 0–1 contracts describe later deliverables but do not retain a numbered later-phase breakdown. This slice maps phase 2 to receivables review/receipt activity and phase 3 to payables review/workflow visibility, as stated in the implementation update. It does not implement later release, export or saved-view capabilities.

## Delivered behavior

1. Shared invoice explorer: search, currency, aging and page size; overdue, next-seven-day, next-thirty-day, missing-date and AP unverified queues. Counts are computed before table filtering/paging and explicitly overlap. Search, queue, aging and counterparty filters leave current-position totals unchanged. Location/currency scope still controls totals.
2. Five largest counterparties per currency from the full bounded source population. Exact decimal aggregation, deterministic ordering, no ranking when that currency has unverified invoice balances. Clicking a counterparty scopes the invoice table.
3. Existing `DetailDrawer` shows invoice original, allocated/settled, verified credits, remaining amount, due date and status; null remains unavailable. It links to existing history with an explicit broader-scope note, without inventing unsupported invoice/location query parameters.
4. Independent receipt-period panel: organization-calendar month default; explicit start/end; receipt methods, processed refunds, reversals and net; missing-time and restricted states. Applied period survives changes to invoice filters. The panel follows location, not invoice currency/search/queue. Its figures include cash sales as well as customer settlements and are not presented as a reconciliation of current open balances.
5. Independent AP workflow panel: current organization-wide draft invoice, draft payment request, approved payment, matching exception, pending bank change, ledger blocker, reconciliation blocker, payment-pending invoice and released-payment counts. Existing AP workbench definitions are reused in a repeatable-read transaction. The result returns counts only, omitting bank details and raw blocker messages.
6. Existing workflow destinations for approval, execution, invoice ledger recovery, payment recovery, AP history and reconciliation. No action buttons execute payments, send reminders, approve records or modify financial data.

## Access and truth controls

- Phase 1 tenant, module, strict-input, bounded-population, currency, unknown-evidence and revision controls remain.
- AP workflow data requires AP dashboard access, purchasing module availability and `purchasing.ap.invoice.view`, matching the existing workbench. Draft payment counts additionally require `purchasing.ap.payment.approve`; approved payment counts require `purchasing.ap.payment.release`. An absent permission produces null/restricted, not zero. All relevant permissions and actor/organization are rechecked before returning the report.
- Receipt activity retains its separate payment-read requirement. Both independent panel responses carry trusted organization identity; client caches are partitioned by actor, organization, permission set and scope, and are hidden on failed refresh, permission uncertainty or workspace mismatch.
- Draft/approved counts describe status candidates, not proof of review/execution readiness. Released count is not a reconciliation success count. Aggregate workflow counters may overlap and are not a financial total.
- AP workbench reads are loaded only after the AP workflow authorization checks. They are not run by AR invoice reads.

## Source and design review

Current services/actions were inspected before reuse. Dated graph discovery located `purchasing_apcontrolworkbench_tsx` in components community 25 and `purchasing_ap_control_actions_ts` in actions community 26; current source, not graph age/counts, determines behavior. Existing history pages do not consume invoice/location query parameters, so the new links disclose their broader scope.

Applied project UI/UX Pro Max and ECC security-review/verification-loop guidance. Focused local search: `python -B .agents/skills/ui-ux-pro-max/scripts/search.py 'dashboard filters empty state keyboard' --domain ux --max-results 2`. Results from `ux-guidelines.csv`: Feedback/Empty States and Accessibility/Compact Control Semantics. Adopted explicit empty guidance and native buttons with `aria-pressed`; no palette/framework replacement. Existing dashboard tokens, Card/Button/DetailDrawer and EN/FR copy conventions remain.

## Changed scope and rollback

Owned changes: open-items contract/service/action/dashboard; new explorer, receipts and AP workflow components; independent-panel hooks; AP workflow read service; scoped tests/Jest config and page/evidence contracts. Existing sales collections, financial posting, payment commands, legacy shared finance surfaces, reconciliation components and unrelated edits are preserved. No schema migration, seed, settings/access change, staging or commit.

Rollback only this slice's hunks/files, restoring the phase 1 focused pages and access boundary. Do not restore broad AR/AP payloads or discard pre-existing untracked work.

## Verification

Verification commands were reviewed against the project registry and their current definitions. The Jest runner uses SWC, mocked persistence and a direct mapping to the installed Lucide CJS build; no Next env setup or database bootstrap. TypeScript is no-emit/non-incremental; lint uses the existing configuration. Build/migration/seed commands were not used.

- `npm run agent:workflow:check`: passed at start and final validation (198 scripts outside the reviewed registry).
- `node node_modules/typescript/bin/tsc -p tsconfig.open-items-dashboard.json --noEmit --incremental false`: passed after the final application changes.
- `node node_modules/jest/bin/jest.js --config jest.open-items-dashboard.config.cjs --runInBand --no-cache`: **11 suites, 81 tests passed** after the final application changes. Initial component execution failed on the installed Lucide ESM entry; the scoped runner now maps to its installed CJS artifact. No test was removed to resolve that failure.
- Scoped ESLint across the ten changed application files passed; lint was rerun successfully for the three UI files subsequently adjusted to preserve form drafts.
- Owned application/config files have no trailing whitespace. Repository-wide `git diff --check` reports an unrelated existing trailing space in `components/purchase-orders/PurchaseReceivingWorkbench.tsx:152`; it was preserved.

Mock coverage includes source-complete queues/rankings, unknown AP evidence, existing AP allocation/financial regression tests, denied workflow reads, independent payment permissions and revocation, tenant mismatch/late responses, bilingual restricted states, date application, drawer content and existing-workflow links. Mocks do not certify real database snapshot isolation, rollback or concurrency.

### Final observations

Source inspection: supplemental panels reuse the parent actor/organization/permission identity rather than subscribing independently to the global permission hook. Browser testing exposed a mount/refetch/unmount loop caused by the additional subscriptions; removing them resolved it, with a regression test preventing new subscriptions. Server authorization and return-time permission checks remain authoritative. Search and receipt date drafts are held in the parent and partitioned by actor/organization so permission refreshes do not discard in-progress input.

Rendered/browser checks (existing authenticated development organization, read-only):

- English receivables reached its ready state with three open/overdue invoices, currency-separated balance cards, counterparty rankings and independent receipt activity.
- Selecting the empty seven-day queue displayed the filtered-empty message while leaving the current balance cards unchanged.
- Invoice detail displayed original, settled and remaining amounts and unavailable credit evidence. Escape closed the drawer and focus returned to its invoice trigger.
- French labels, number formatting and receipt panel rendered. Keyboard editing and submitting the date form applied `2026-09-01` through `2026-10-12`, confirmed in the returned report period. Automated native-date `fill()` attempts did not persist reliably; keyboard input completed this check.
- A narrow viewport check requested 390 × 844; the browser's effective DOM width was 271 CSS pixels under its current scaling. The page had no document-level horizontal overflow (`scrollWidth === clientWidth`), and the narrow header/form layout was inspected. This is not a comprehensive device or screen-reader audit. The viewport override was reset.
- Payables rendered the existing “MODULE LOCKED / This module is not enabled” state in the current organization. No module or permission settings were changed to bypass it.

Mocked unit tests, source inspection and rendered observations are separate evidence. No disposable PostgreSQL target was supplied; database integration/snapshot-isolation/concurrency tests remain not run. Full AP ready-state browser verification requires an organization with the purchasing module enabled; existing access controls were not changed. No release certification is claimed.

Subsequent verification: the user authorized the current database for a read-only follow-up. See the [2026-10-12 verification record](receivables-payables-dashboard-verification-2026-10-12.md) for nine real PostgreSQL read tests, expanded mocked access tests and remaining AP browser/write-concurrency limits. The paragraph above records the original implementation session's evidence.
